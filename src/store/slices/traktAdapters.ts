// ============================================================================
// traktAdapters.ts
//
// WHY THIS FILE EXISTS:
// Trakt's API sends data back in its own shape (nested "ids" objects, genre
// SLUGS instead of numeric ids, "first_aired" instead of "release_date", a
// single "trailer" URL instead of a list of appended videos, etc).
//
// Rather than rewriting every single component in the app to understand
// Trakt's raw format, this file is a translation layer: every function below
// takes "what Trakt/OMDb actually sent us" and returns "the same Movie /
// MovieDetail / Genre shape the rest of this codebase was already built
// around". This keeps the blast radius of the migration small and keeps
// components like VideoSlider, GridWithInfiniteScroll, DetailModal etc.
// working exactly as before, with almost no changes to their code.
// ============================================================================

import { MEDIA_TYPE } from "src/types/Common";
import { Movie, MovieDetail, Appended_Video } from "src/types/Movie";
import type { FetchBaseQueryMeta } from "@reduxjs/toolkit/query/react";

// ----------------------------------------------------------------------------
// RAW TRAKT SHAPES (only the fields this app actually reads are declared;
// Trakt's real payload has more fields than this, we simply ignore the rest)
// ----------------------------------------------------------------------------

// Every movie/show on Trakt is identified by a bundle of ids across different
// databases (Trakt's own id, a URL-friendly "slug", and a cross-reference to
// IMDb). We only care about "trakt" (used to fetch full detail) and "imdb"
// (used to fetch a poster image from OMDb) - Trakt's response includes a few
// other cross-reference ids too, but since this app never reads them we
// don't bother declaring them here.
export type TraktIds = {
  trakt: number;
  slug: string;
  imdb?: string;
  tvdb?: number;
};

// Fields present on a Movie when we ask Trakt for "extended=full" data.
export type TraktMovieSummary = {
  title: string;
  year: number | null;
  ids: TraktIds;
  tagline?: string;
  overview?: string;
  released?: string; // e.g. "2013-01-01"
  runtime?: number;
  trailer?: string | null; // a full YouTube/Vimeo URL, or null if none exists
  homepage?: string | null;
  status?: string;
  rating?: number; // Trakt's own community rating, 0-10
  votes?: number;
  language?: string; // ISO 639-1 code, e.g. "en"
  genres?: string[]; // an array of genre SLUGS, e.g. ["action", "science-fiction"]
};

// Fields present on a TV Show when we ask Trakt for "extended=full" data.
export type TraktShowSummary = {
  title: string;
  year: number | null;
  ids: TraktIds;
  overview?: string;
  first_aired?: string; // an ISO datetime, e.g. "2011-04-17T00:00:00.000Z"
  runtime?: number;
  trailer?: string | null;
  homepage?: string | null;
  status?: string;
  rating?: number;
  votes?: number;
  language?: string;
  genres?: string[];
};

// Several Trakt list endpoints (trending, anticipated, box office, search)
// don't return the movie/show directly - they wrap it inside an object that
// also carries endpoint-specific metadata (how many people are watching it,
// how many lists it's on, last week's box-office revenue, a search score...).
// This type represents "any of those wrapper shapes, or no wrapper at all".
export type TraktRawListEntry = {
  movie?: TraktMovieSummary;
  show?: TraktShowSummary;
  watchers?: number;
  list_count?: number;
  revenue?: number;
  score?: number;
} & Partial<TraktMovieSummary>;

// ----------------------------------------------------------------------------
// GENRE ID <-> SLUG TRANSLATION
//
// Trakt identifies genres by a text "slug" (e.g. "science-fiction"), but the
// rest of this app (GenreBreadcrumbs, GridPage, withPagination, etc.) was
// built expecting a numeric `Genre.id`.
//
// To avoid touching every one of those components, we generate a STABLE
// number from each slug (the same slug always hashes to the same number),
// and we remember the slug<->id pairing in this in-memory Map so that when a
// component asks to fetch "genreId 12345", we can look up which real Trakt
// genre slug that corresponds to.
// ----------------------------------------------------------------------------
export const genreIdToSlug = new Map<number, string>();

// A tiny, deterministic string-hashing function (this is the standard
// "djb2"-style hash). It always turns the same input string into the same
// number, which is exactly what we need for a stable pretend-numeric-id.
export function hashSlugToId(slug: string): number {
  let hash = 5381;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 33) ^ slug.charCodeAt(i);
  }
  // ">>> 0" forces the result to be a positive 32-bit integer.
  return hash >>> 0;
}

// Turns a slug like "science-fiction" into a friendly label "Science Fiction"
// used as a fallback whenever Trakt doesn't give us a human-readable name.
export function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ----------------------------------------------------------------------------
// LANGUAGE CODE -> READABLE NAME
// Trakt only gives us a 2-letter ISO 639-1 code (e.g. "en", "hi", "ta"). The
// UI wants a readable language name, so we keep a small lookup table of the
// most common ones and fall back to the raw code (uppercased) for anything
// not in the list.
// ----------------------------------------------------------------------------
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  bn: "Bengali",
  mr: "Marathi",
  pa: "Punjabi",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ru: "Russian",
  ar: "Arabic",
};

export function getLanguageName(code?: string | null): string {
  if (!code) return "Unknown";
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}

// ----------------------------------------------------------------------------
// YOUTUBE TRAILER URL -> YOUTUBE VIDEO ID
// The video.js player in this app (VideoJSPlayer + the "videojs-youtube" tech)
// needs just the short YouTube video id (e.g. "L3oOldViIgY"), not a full URL.
// Trakt gives us a full URL like "http://youtube.com/watch?v=L3oOldViIgY", so
// this function pulls the "v=" query parameter out of it.
// ----------------------------------------------------------------------------
export function extractYoutubeId(trailerUrl?: string | null): string | null {
  if (!trailerUrl) return null;
  try {
    const url = new URL(trailerUrl);
    return url.searchParams.get("v");
  } catch {
    // If Trakt ever sends a malformed URL, fail safe instead of crashing.
    return null;
  }
}

// ----------------------------------------------------------------------------
// UNWRAPPING LIST RESPONSES
// /movies/trending, /movies/anticipated, /movies/boxoffice and /search/movie
// all wrap the real movie object inside a "movie" key. /movies/popular and
// /movies/{id}/related do NOT wrap it - they return the movie object plainly.
// This helper handles both cases so the rest of the code never has to think
// about which endpoint it came from.
// ----------------------------------------------------------------------------
export function unwrapListItem(
  raw: TraktRawListEntry,
  mediaType: MEDIA_TYPE
): TraktMovieSummary | TraktShowSummary {
  if (mediaType === MEDIA_TYPE.Movie) {
    return raw.movie ?? (raw as unknown as TraktMovieSummary);
  }
  return raw.show ?? (raw as unknown as TraktShowSummary);
}

// ----------------------------------------------------------------------------
// TRAKT SUMMARY -> APP-INTERNAL "Movie" (used everywhere a list/grid/row of
// cards is rendered: VideoSlider, GridWithInfiniteScroll, SimilarVideoCard...)
// ----------------------------------------------------------------------------
export function mapTraktSummaryToMovie(
  item: TraktMovieSummary | TraktShowSummary,
  mediaType: MEDIA_TYPE
): Movie {
  // Movies use a proper "released" date string; shows use "first_aired"
  // (which includes a time component we trim down to just the date part).
  const releaseDate =
    mediaType === MEDIA_TYPE.Movie
      ? (item as TraktMovieSummary).released || `${item.year ?? "0000"}-01-01`
      : (item as TraktShowSummary).first_aired?.substring(0, 10) ||
        `${item.year ?? "0000"}-01-01`;

  return {
    // Trakt's own numeric id - used later to fetch full detail / related titles.
    id: item.ids?.trakt ?? 0,
    // Trakt's cross-reference to IMDb - this is what lets us fetch a poster
    // image from OMDb later, inside the card components themselves.
    imdb_id: item.ids?.imdb ?? null,
    // Trakt does not expose an "adult content" flag - every catalogued title
    // here is mainstream, so this is always false.
    adult: false,
    overview: item.overview || "No overview available.",
    release_date: releaseDate,
    // Convert each genre SLUG ("science-fiction") into the numeric pseudo-id
    // the rest of the app expects (see hashSlugToId above).
    genre_ids: (item.genres || []).map(hashSlugToId),
    original_title: item.title,
    original_language: item.language || "en",
    title: item.title,
    // Trakt doesn't expose a single "popularity" score, so we use the vote
    // count as a reasonable stand-in.
    popularity: item.votes ?? 0,
    vote_count: item.votes ?? 0,
    // Always false: Trakt has no concept of a placeholder/non-real video
    // entry, so this field only exists to satisfy the shared Movie type.
    video: false,
    vote_average: item.rating ?? 0,
  };
}

// ----------------------------------------------------------------------------
// TRAKT SUMMARY -> APP-INTERNAL "MovieDetail" (used by DetailModal and the
// Hero section's "get full details incl. trailer" call)
// ----------------------------------------------------------------------------
export function mapTraktSummaryToDetail(
  item: TraktMovieSummary | TraktShowSummary,
  mediaType: MEDIA_TYPE
): MovieDetail {
  const releaseDate =
    mediaType === MEDIA_TYPE.Movie
      ? (item as TraktMovieSummary).released || `${item.year ?? "0000"}-01-01`
      : (item as TraktShowSummary).first_aired?.substring(0, 10) ||
        `${item.year ?? "0000"}-01-01`;

  // Pull just the short YouTube id out of Trakt's full trailer URL, and build
  // it into the exact same "videos.results[0].key" shape the video player
  // component already expects (this is the field HeroSection/DetailModal
  // read to decide what to autoplay).
  const youtubeId = extractYoutubeId(item.trailer);
  const videos: { results: Appended_Video[] } = {
    results: youtubeId
      ? [
          {
            id: youtubeId,
            iso_639_1: "en",
            iso_3166_1: "US",
            key: youtubeId,
            name: "Trailer",
            official: true,
            published_at: "",
            site: "YouTube",
            size: 1080,
            type: "Trailer",
          },
        ]
      : [], // no trailer on Trakt for this title -> component falls back to its default clip
  };

  const languageName = getLanguageName(item.language);

  return {
    adult: false,
    belongs_to_collection: null,
    // Trakt does not expose box-office budget figures on this endpoint.
    budget: 0,
    genres: (item.genres || []).map((slug) => ({
      id: hashSlugToId(slug),
      name: slugToLabel(slug),
    })),
    homepage: item.homepage || "",
    id: item.ids?.trakt ?? 0,
    imdb_id: item.ids?.imdb || "",
    original_language: item.language || "en",
    original_title: item.title,
    overview: item.overview || "No overview available.",
    popularity: item.votes ?? 0,
    production_companies: [], // Trakt does not expose studio/production company data
    production_countries: [], // Trakt does not expose production country data
    release_date: releaseDate,
    revenue: 0, // Trakt does not expose box-office revenue on the detail endpoint
    runtime: item.runtime ?? 0,
    spoken_languages: [
      { iso_639_1: item.language || "en", english_name: languageName, name: languageName },
    ],
    status: item.status || "Released",
    tagline: (item as TraktMovieSummary).tagline || "",
    title: item.title,
    video: false,
    videos,
    vote_average: item.rating ?? 0,
    vote_count: item.votes ?? 0,
  };
}

// ----------------------------------------------------------------------------
// PAGINATION HELPER
// Trakt sends pagination info back as RESPONSE HEADERS (not in the JSON
// body): "x-pagination-page-count" and "x-pagination-item-count". This
// function reads those headers and builds the exact {page, results,
// total_pages, total_results} shape the rest of the app (GridWithInfiniteScroll,
// SlickSlider, the `discover` redux slice) already knows how to consume.
// ----------------------------------------------------------------------------
export function buildPaginatedResult(
  rawList: TraktRawListEntry[],
  mediaType: MEDIA_TYPE,
  page: number,
  meta: FetchBaseQueryMeta | undefined
) {
  const headers = meta?.response?.headers;
  const totalPages = Number(headers?.get("x-pagination-page-count")) || 1;
  const totalResults =
    Number(headers?.get("x-pagination-item-count")) || rawList.length;

  return {
    page,
    results: rawList.map((raw) =>
      mapTraktSummaryToMovie(unwrapListItem(raw, mediaType), mediaType)
    ),
    total_pages: totalPages,
    total_results: totalResults,
  };
}
