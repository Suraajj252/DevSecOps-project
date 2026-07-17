import { Company, Country, Language } from './Common';
import { Genre } from './Genre';

// One item inside a movie/show's "videos" list (used for the trailer). We
// synthesize this from Trakt's single "trailer" URL field - see
// traktAdapters.ts's mapTraktSummaryToDetail().
export type Appended_Video = {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  official: boolean;
  published_at: string;
  site: string;
  size: number;
  type: string;
};

// The full detail record shown in DetailModal / used by HeroSection to
// find a trailer. poster_path/backdrop_path are not part of this shape:
// Trakt has no images, so artwork is fetched live inside each card
// component via useGetPosterByImdbIdQuery(video.imdb_id) instead of being
// stored here.
export type MovieDetail = {
  adult: boolean;
  belongs_to_collection: null;
  budget: number;
  genres: Genre[];
  homepage: string;
  id: number;
  imdb_id: string;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  production_companies: Company[];
  production_countries: Country[];
  release_date: string;
  revenue: number;
  runtime: number;
  spoken_languages: Language[];
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  videos: { results: Appended_Video[] };
  vote_average: number;
  vote_count: number;
};

// The lightweight record used everywhere a card/row/grid renders a title
// (VideoSlider, GridWithInfiniteScroll, SimilarVideoCard, etc). Notably:
//   - no poster_path / backdrop_path fields (Trakt has no images)
//   - imdb_id is present (this is what each card uses to fetch its own
//     poster image from OMDb, via useGetPosterByImdbIdQuery(video.imdb_id))
export type Movie = {
  id: number;
  imdb_id: string | null;
  adult: boolean;
  overview: string;
  release_date: string;
  genre_ids: number[];
  original_title: string;
  original_language: string;
  title: string;
  popularity: number;
  vote_count: number;
  video: boolean;
  vote_average: number;
};
