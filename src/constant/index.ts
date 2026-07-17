// This file centralizes every "magic string" / configuration value the app
// needs, so nothing is hard-coded deep inside a component.
import { CustomGenre } from "src/types/Genre";

// --- TRAKT API CONFIG -------------------------------------------------
// These two values come from your .env file (see .env.example) and are
// injected at BUILD TIME by Vite because they start with "VITE_APP_".
// TRAKT_API_URL   -> the base address of every Trakt request, e.g. https://api.trakt.tv
// TRAKT_CLIENT_ID -> your personal Trakt application key, sent as a header
//                    on every request so Trakt knows who is calling it.
export const TRAKT_API_URL = import.meta.env.VITE_APP_TRAKT_API_URL;
export const TRAKT_CLIENT_ID = import.meta.env.VITE_APP_TRAKT_CLIENT_ID;

// --- OMDb API CONFIG ----------------------------------------------------
// OMDb is used for exactly one job in this app: turning an IMDb ID (which
// Trakt gives us for free) into a poster/backdrop image URL, because Trakt
// itself does not serve any images.
export const OMDB_API_URL = import.meta.env.VITE_APP_OMDB_API_URL;
export const OMDB_API_KEY = import.meta.env.VITE_APP_OMDB_API_KEY;

// --- ROUTE PATHS ---------------------------------------------------------
// Every place in the app that needs a URL path re-uses these constants
// instead of typing the raw string, so renaming a route is a one-line change.
export const MAIN_PATH = {
  root: "",
  browse: "browse",
  genreExplore: "genre",
  watch: "watch",
};

export const ARROW_MAX_WIDTH = 60;

// --- HOMEPAGE "CUSTOM" ROWS ----------------------------------------------
// These are the 4 rows shown at the very top of the homepage, ABOVE the
// per-genre rows. Each "apiString" maps 1:1 onto a real Trakt list endpoint:
//   popular     -> GET /movies/popular      (highest rated / most-rated titles)
//   trending    -> GET /movies/trending     (what people are watching RIGHT NOW)
//   boxoffice   -> GET /movies/boxoffice    (top 10 US box office last weekend)
//   anticipated -> GET /movies/anticipated  (most-watchlisted upcoming titles)
// These endpoints are specific to Trakt - see src/store/slices/discover.ts
// for how each one is called.
export const COMMON_TITLES: CustomGenre[] = [
  { name: "Popular", apiString: "popular" },
  { name: "Trending Now", apiString: "trending" },
  { name: "Box Office Hits", apiString: "boxoffice" },
  { name: "Most Anticipated", apiString: "anticipated" },
];

export const YOUTUBE_URL = "https://www.youtube.com/watch?v=";
export const APP_BAR_HEIGHT = 70;

export const INITIAL_DETAIL_STATE = {
  id: undefined,
  mediaType: undefined,
  mediaDetail: undefined,
};
