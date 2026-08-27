import type { ApiResponse } from '@inithium/api-utils';
import type { NavLocation, PageEntity } from '@inithium/db';
import { baseApi } from '../baseApi';

export const pageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPageByRoute: builder.query<PageEntity, { route: string }>({
      query: ({ route }) => `/api/pages/resolve?route=${encodeURIComponent(route)}`,
      // Every core API response is wrapped as { success: true, data: T } by
      // createSuccessResponse — unwrap it here so the hook's declared return
      // type (PageEntity) matches what callers actually receive at runtime.
      transformResponse: (response: ApiResponse<PageEntity>) => response.data,
      providesTags: (result) => (result ? [{ type: 'Page', id: result.id }] : ['Page']),
    }),
    getNavPages: builder.query<PageEntity[], NavLocation>({
      query: (location) => `/api/pages/navigation/${location}`,
      transformResponse: (response: ApiResponse<PageEntity[]>) => response.data,
      providesTags: ['Page'],
    }),
  }),
});

export const { useGetPageByRouteQuery, useGetNavPagesQuery } = pageApi;
