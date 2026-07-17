// This RTK Query service talks to OMDb, but ONLY for one purpose in this
// app: given an IMDb id (which we get for free from Trakt), fetch that
// title's poster image URL. Trakt has no image hosting of its own, so this
// is the one place OMDb is still involved after the Trakt migration.
import { OMDB_API_URL, OMDB_API_KEY } from "src/constant";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// The (trimmed down) shape OMDb sends back when you look a title up by id.
// OMDb uses PascalCase field names - this is the ONLY field we read from it.
type OmdbLookupResponse = {
  Poster?: string; // a full, ready-to-use image URL, or the literal string "N/A"
  Response: "True" | "False";
  Error?: string;
};

export const omdbApi = createApi({
  reducerPath: "omdbApi",
  baseQuery: fetchBaseQuery({
    // OMDb authenticates via a query-string API key rather than a header,
    // so there's no prepareHeaders step needed here - see the "params" below.
    baseUrl: OMDB_API_URL,
  }),
  endpoints: (build) => ({
    // Usage: useGetPosterByImdbIdQuery("tt1375666")
    // Returns either a full poster image URL, or null if OMDb has no poster
    // on file (or the title isn't in OMDb's database at all).
    getPosterByImdbId: build.query<string | null, string>({
      query: (imdbId) => ({
        url: "/", // OMDb's whole API lives at the root path, driven by query params
        params: {
          apikey: OMDB_API_KEY, // <-- your OMDb key from .env goes here automatically
          i: imdbId, // "i" = look up by IMDb ID (as opposed to "s" for a text search)
        },
      }),
      transformResponse: (response: OmdbLookupResponse) => {
        // OMDb returns the literal text "N/A" (not an empty value) when a
        // title has no poster on file - we normalize that into a real `null`
        // so the UI can do a simple truthy check.
        if (!response.Poster || response.Poster === "N/A") {
          return null;
        }
        return response.Poster;
      },
    }),
  }),
});

export const { useGetPosterByImdbIdQuery, useLazyGetPosterByImdbIdQuery } =
  omdbApi;
