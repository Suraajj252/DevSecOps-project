// This file has two jobs:
//   1. A small Redux slice ("discoverSlice") that remembers, for every
//      genre/row on screen, which page of results we've already loaded so
//      infinite-scroll can keep asking for "the next page".
//   2. A set of Trakt-powered RTK Query endpoints that actually fetch the
//      movie/show data: trending, popular, box office, anticipated,
//      detail-by-id, and related/similar titles.
//
// NOTE: the exported hook names (useGetVideosByMediaTypeAndGenreIdQuery etc.)
// were kept stable on purpose, so that HomePage,
// HeroSection, VideoSlider, GridPage, withPagination and DetailModal did not
// need to be touched at all - only what happens INSIDE these endpoints changed.
import { traktApi } from "./apiSlice";
import { MEDIA_TYPE, PaginatedMovieResult } from "src/types/Common";
import { MovieDetail } from "src/types/Movie";
import { createSlice, isAnyOf } from "@reduxjs/toolkit";
import {
  buildPaginatedResult,
  genreIdToSlug,
  mapTraktSummaryToDetail,
  mapTraktSummaryToMovie,
} from "./traktAdapters";
import type { TraktMovieSummary, TraktRawListEntry } from "./traktAdapters";

const initialState: Record<string, Record<string, PaginatedMovieResult>> = {};
export const initialItemState: PaginatedMovieResult = {
  page: 0,
  results: [],
  total_pages: 0,
  total_results: 0,
};

const discoverSlice = createSlice({
  name: "discover",
  initialState,
  reducers: {
    setNextPage: (state, action) => {
      const { mediaType, itemKey } = action.payload;
      state[mediaType][itemKey].page += 1;
    },
    initiateItem: (state, action) => {
      const { mediaType, itemKey } = action.payload;
      if (!state[mediaType]) {
        state[mediaType] = {};
      }
      if (!state[mediaType][itemKey]) {
        state[mediaType][itemKey] = initialItemState;
      }
    },
  },
  extraReducers(builder) {
    builder.addMatcher(
      isAnyOf(
        extendedApi.endpoints.getVideosByMediaTypeAndCustomGenre.matchFulfilled,
        extendedApi.endpoints.getVideosByMediaTypeAndGenreId.matchFulfilled
      ),
      (state, action) => {
        const {
          page,
          results,
          total_pages,
          total_results,
          mediaType,
          itemKey,
        } = action.payload;
        state[mediaType][itemKey].page = page;
        state[mediaType][itemKey].results.push(...results);
        state[mediaType][itemKey].total_pages = total_pages;
        state[mediaType][itemKey].total_results = total_results;
      }
    );
  },
});

export const { setNextPage, initiateItem } = discoverSlice.actions;
export default discoverSlice.reducer;

// A tiny helper: Trakt calls its two catalogs "movies" and "shows" in its
// URLs, while this app's MEDIA_TYPE enum uses "movie" and "tv". This keeps
// that one string difference in a single place.
const resourceFor = (mediaType: MEDIA_TYPE) =>
  mediaType === MEDIA_TYPE.Movie ? "movies" : "shows";

const extendedApi = traktApi.injectEndpoints({
  endpoints: (build) => ({
    // ------------------------------------------------------------------
    // Used for the per-GENRE rows on the homepage (e.g. "Action", "Comedy").
    // Trakt's /popular list accepts a "?genres=<slug>" filter, which is
    // exactly what we need for per-genre rows.
    // ------------------------------------------------------------------
    getVideosByMediaTypeAndGenreId: build.query<
      PaginatedMovieResult & {
        mediaType: MEDIA_TYPE;
        itemKey: number | string;
      },
      { mediaType: MEDIA_TYPE; genreId: number; page: number }
    >({
      query: ({ mediaType, genreId, page }) => {
        // Turn the numeric pseudo-id back into the real Trakt genre slug
        // (this map is filled in by genre.ts's getGenres call, which always
        // runs before this endpoint is used - see HomePage's loader).
        const slug = genreIdToSlug.get(genreId) || "";
        return {
          url: `/${resourceFor(mediaType)}/popular`,
          params: {
            genres: slug,
            extended: "full", // ask Trakt for overview/genres/rating/etc, not just title+year
            page,
            limit: 20,
          },
        };
      },
      transformResponse: (
        response: TraktRawListEntry[],
        meta,
        { mediaType, genreId, page }
      ) => ({
        ...buildPaginatedResult(response, mediaType, page, meta),
        mediaType,
        itemKey: genreId,
      }),
    }),

    // ------------------------------------------------------------------
    // Used for the 4 "special" rows at the top of the homepage: Popular,
    // Trending Now, Box Office Hits, Most Anticipated (see COMMON_TITLES
    // in src/constant/index.ts). "apiString" is one of:
    //   "popular" | "trending" | "boxoffice" | "anticipated"
    // ------------------------------------------------------------------
    getVideosByMediaTypeAndCustomGenre: build.query<
      PaginatedMovieResult & {
        mediaType: MEDIA_TYPE;
        itemKey: number | string;
      },
      { mediaType: MEDIA_TYPE; apiString: string; page: number }
    >({
      query: ({ mediaType, apiString, page }) => {
        const resource = resourceFor(mediaType);
        // Trakt's /boxoffice endpoint is a fixed "top 10 this weekend" list -
        // it does not accept page/limit/genres parameters at all.
        if (apiString === "boxoffice") {
          return { url: `/${resource}/boxoffice`, params: { extended: "full" } };
        }
        return {
          url: `/${resource}/${apiString}`,
          params: { extended: "full", page, limit: 20 },
        };
      },
      transformResponse: (
        response: TraktRawListEntry[],
        meta,
        { mediaType, apiString, page }
      ) => {
        return {
          ...buildPaginatedResult(response, mediaType, page, meta),
          mediaType,
          itemKey: apiString,
        };
      },
    }),

    // ------------------------------------------------------------------
    // Used by the Hero section and DetailModal to fetch full details
    // (overview, runtime, genres, trailer) for ONE specific title, given
    // Trakt's numeric id (which we already stored as Movie.id).
    // ------------------------------------------------------------------
    getAppendedVideos: build.query<
      MovieDetail,
      { mediaType: MEDIA_TYPE; id: number }
    >({
      query: ({ mediaType, id }) => ({
        url: `/${resourceFor(mediaType)}/${id}`,
        params: { extended: "full" },
      }),
      transformResponse: (
        response: TraktMovieSummary,
        _meta,
        { mediaType }
      ) => mapTraktSummaryToDetail(response, mediaType),
    }),

    // ------------------------------------------------------------------
    // Used by DetailModal's "More Like This" row, backed by Trakt's
    // /related endpoint (a plain array of movie/show summaries, no
    // wrapper object).
    // ------------------------------------------------------------------
    getSimilarVideos: build.query<
      PaginatedMovieResult,
      { mediaType: MEDIA_TYPE; id: number }
    >({
      query: ({ mediaType, id }) => ({
        url: `/${resourceFor(mediaType)}/${id}/related`,
        params: { extended: "full", limit: 12 },
      }),
      transformResponse: (
        response: TraktMovieSummary[],
        _meta,
        { mediaType }
      ): PaginatedMovieResult => ({
        page: 1,
        total_pages: 1,
        total_results: response.length,
        results: response.map((raw) => mapTraktSummaryToMovie(raw, mediaType)),
      }),
    }),

    // ------------------------------------------------------------------
    // NEW: free-text search, mapped onto Trakt's /search/movie and
    // /search/show endpoints (this app's SearchBox UI is not wired up to
    // dispatch a search yet - that's UI-layer work - but the data layer is
    // ready for it via useLazySearchVideosQuery()).
    // ------------------------------------------------------------------
    searchVideos: build.query<
      PaginatedMovieResult,
      { mediaType: MEDIA_TYPE; query: string; page: number }
    >({
      query: ({ mediaType, query, page }) => ({
        url: `/search/${mediaType === MEDIA_TYPE.Movie ? "movie" : "show"}`,
        params: { query, extended: "full", page, limit: 20 },
      }),
      transformResponse: (
        response: TraktRawListEntry[],
        meta,
        { mediaType, page }
      ): PaginatedMovieResult =>
        buildPaginatedResult(response, mediaType, page, meta),
    }),
  }),
});

export const {
  useGetVideosByMediaTypeAndGenreIdQuery,
  useLazyGetVideosByMediaTypeAndGenreIdQuery,
  useGetVideosByMediaTypeAndCustomGenreQuery,
  useLazyGetVideosByMediaTypeAndCustomGenreQuery,
  useGetAppendedVideosQuery,
  useLazyGetAppendedVideosQuery,
  useGetSimilarVideosQuery,
  useLazyGetSimilarVideosQuery,
  useSearchVideosQuery,
  useLazySearchVideosQuery,
} = extendedApi;
