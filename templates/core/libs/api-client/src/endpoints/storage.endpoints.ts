import type { ApiResponse } from '@inithium/api-utils';
import { baseApi } from '../baseApi';

export interface UploadAssetResult {
  url: string;
  assetId: string;
}

export interface UploadAssetInput {
  file: File;
  altText?: string;
  // Free-form, not a closed enum - see AssetEntity.purpose's own comment. Defaults server-side
  // to 'general' when omitted.
  purpose?: string;
}

// Frontend-facing shape, not @inithium/db's AssetEntity - dates cross the HTTP boundary as ISO
// strings, not Date instances, mirroring BlogPostEntity's own precedent in blog.endpoints.ts.
export interface AssetDto {
  id: string;
  url: string;
  purpose: string;
  altText?: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ListUserAssetsParams {
  userId: string;
  purposes?: string[];
}

export const storageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadAsset: builder.mutation<UploadAssetResult, UploadAssetInput>({
      query: ({ file, altText, purpose }) => {
        // fetchBaseQuery passes a FormData body through untouched (no JSON.stringify, the
        // browser sets the multipart boundary), so no baseApi.ts change is needed for this.
        const formData = new FormData();
        formData.append('file', file);
        if (altText) {
          formData.append('altText', altText);
        }
        if (purpose) {
          formData.append('purpose', purpose);
        }
        return { url: '/api/storage/upload', method: 'POST', body: formData };
      },
      transformResponse: (response: ApiResponse<UploadAssetResult>) => response.data,
      invalidatesTags: ['Asset'],
    }),
    listUserAssets: builder.query<AssetDto[], ListUserAssetsParams>({
      query: ({ userId, purposes }) => {
        const params = new URLSearchParams({ userId });
        if (purposes?.length) {
          params.set('purpose', purposes.join(','));
        }
        return `/api/storage/assets?${params.toString()}`;
      },
      transformResponse: (response: ApiResponse<AssetDto[]>) => response.data,
      providesTags: ['Asset'],
    }),
    deleteAsset: builder.mutation<void, string>({
      query: (assetId) => ({ url: `/api/storage/assets/${assetId}`, method: 'DELETE' }),
      // Also invalidates 'Profile'/'User' - deleting the asset behind a user's active
      // avatar/banner clears that reference server-side (see storage.route.ts's DELETE handler),
      // so the already-open profile view and the Navbar (useGetMeQuery, tagged 'User') both need
      // to refetch immediately rather than showing a dead image until a manual page reload.
      // Matches the exact pair updateMyProfile itself already invalidates.
      invalidatesTags: ['Asset', 'Profile', 'User'],
    }),
  }),
});

export const { useUploadAssetMutation, useListUserAssetsQuery, useDeleteAssetMutation } = storageApi;
