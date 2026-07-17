// This is the base RTK Query "service" for the TRAKT API. It knows nothing
// about movies/genres/etc. by itself - it just knows the base URL and the
// authentication headers every single Trakt request must carry. Individual
// features (discover.ts, genre.ts) "inject" their own endpoints into this
// base service using traktApi.injectEndpoints({ ... }).
import { TRAKT_API_URL, TRAKT_CLIENT_ID } from "src/constant";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const traktApi = createApi({
  // "reducerPath" is the key this slice's cache lives under in the Redux store.
  reducerPath: "traktApi",
  baseQuery: fetchBaseQuery({
    // Every request made through this API starts with https://api.trakt.tv
    baseUrl: TRAKT_API_URL,
    // "prepareHeaders" runs before every single request and lets us attach
    // the headers Trakt requires to identify our application:
    prepareHeaders: (headers) => {
      // Tell Trakt we're sending/expecting JSON.
      headers.set("Content-Type", "application/json");
      // Trakt's API is versioned - "2" is the current stable version. Without
      // this header Trakt rejects every request with a 406 Not Acceptable.
      headers.set("trakt-api-version", "2");
      // Our application's Client ID (from .env) - this is how Trakt knows
      // which app is making the request. It does NOT require the user to
      // log in for public data like trending/popular/search.
      headers.set("trakt-api-key", TRAKT_CLIENT_ID);
      return headers;
    },
  }),
  // No endpoints defined here on purpose - see discover.ts and genre.ts,
  // which each call traktApi.injectEndpoints({ ... }) to add their own.
  endpoints: () => ({}),
});
