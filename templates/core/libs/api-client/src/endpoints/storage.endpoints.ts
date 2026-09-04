import type { ApiResponse } from '@inithium/api-utils';
import { baseApi } from '../baseApi';

export interface UploadAssetResult {
  url: string;
  assetId: string;
}

export interface UploadAssetInput {
  file: File;
  altText?: string;
}

export const storageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadAsset: builder.mutation<UploadAssetResult, UploadAssetInput>({
      query: ({ file, altText }) => {
        // fetchBaseQuery passes a FormData body through untouched (no JSON.stringify, the
        // browser sets the multipart boundary), so no baseApi.ts change is needed for this.
        const formData = new FormData();
        formData.append('file', file);
        if (altText) {
          formData.append('altText', altText);
        }
        return { url: '/api/storage/upload', method: 'POST', body: formData };
      },
      transformResponse: (response: ApiResponse<UploadAssetResult>) => response.data,
    }),
    deleteAsset: builder.mutation<void, string>({
      query: (assetId) => ({ url: `/api/storage/assets/${assetId}`, method: 'DELETE' }),
    }),
  }),
});

export const { useUploadAssetMutation, useDeleteAssetMutation } = storageApi;
