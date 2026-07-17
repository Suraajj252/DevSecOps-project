// This is the root Redux store. It wires together:
//   - discoverReducer: our own plain Redux slice that tracks pagination state
//   - traktApi: RTK Query's auto-generated cache/reducer for Trakt requests
//   - omdbApi:  RTK Query's auto-generated cache/reducer for OMDb poster lookups
import { configureStore } from "@reduxjs/toolkit";
import { traktApi } from "./slices/apiSlice";
import { omdbApi } from "./slices/omdbApiSlice";
import discoverReducer from "./slices/discover";

const store = configureStore({
  reducer: {
    discover: discoverReducer,
    // [X.reducerPath]: X.reducer registers each RTK Query service's cache
    // under its own key in the store, e.g. state.traktApi, state.omdbApi.
    [traktApi.reducerPath]: traktApi.reducer,
    [omdbApi.reducerPath]: omdbApi.reducer,
  },
  // Each RTK Query service ships its own middleware, which handles caching,
  // deduping in-flight requests, and cache invalidation. Both must be added
  // here or their hooks (useGetXQuery, etc.) simply won't work.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(traktApi.middleware, omdbApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
