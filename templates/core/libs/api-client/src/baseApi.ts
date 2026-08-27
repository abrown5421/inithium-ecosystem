import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// apps/web (Vite) may define VITE_API_URL in its own env files; wiring that
// env file into apps/web is out of scope here — this just falls back to the
// local dev API port when it isn't set.
const baseUrl = import.meta.env?.['VITE_API_URL'] ?? 'http://localhost:3000';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl }),
  tagTypes: ['Page'],
  endpoints: () => ({}),
});
