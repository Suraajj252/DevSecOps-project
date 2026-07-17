// Fetches the real list of genres from Trakt. Trakt's genre list only
// has {name, slug} - no
// numeric id - so we generate a stable pseudo-id for each one and remember
// the slug it came from, using the shared genreIdToSlug map in
// traktAdapters.ts. That map is what lets discover.ts later turn a numeric
// genreId back into the real slug Trakt needs for filtering.
import { Genre } from "src/types/Genre";
import { MEDIA_TYPE } from "src/types/Common";
import { traktApi } from "./apiSlice";
import { genreIdToSlug, hashSlugToId, slugToLabel } from "./traktAdapters";

// The raw shape Trakt sends back for each genre.
type TraktGenre = {
  name: string;
  slug: string;
};

export const extendedApi = traktApi.injectEndpoints({
  endpoints: (build) => ({
    // Usage:
    //   useGetGenresQuery(MEDIA_TYPE.Movie)
    getGenres: build.query<Genre[], string>({
      query: (mediaType) => ({
        url: `/genres/${mediaType === MEDIA_TYPE.Movie ? "movies" : "shows"}`,
      }),
      transformResponse: (response: TraktGenre[]) => {
        return response.map((genre) => {
          // Turn the text slug into a stable number so the rest of the app
          // (which expects a numeric Genre.id) keeps working.
          const id = hashSlugToId(genre.slug);
          // Remember which slug this number came from, so a later request
          // for "genreId <id>" can be translated back into "?genres=<slug>".
          genreIdToSlug.set(id, genre.slug);
          return { id, name: genre.name || slugToLabel(genre.slug) };
        });
      },
    }),
  }),
});

export const { useGetGenresQuery, endpoints: genreSliceEndpoints } =
  extendedApi;
