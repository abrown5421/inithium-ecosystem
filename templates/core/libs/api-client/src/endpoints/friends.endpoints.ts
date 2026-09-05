import type { ApiResponse } from '@inithium/api-utils';
import type { AvatarConfig } from '@inithium/db';
import { baseApi } from '../baseApi';

export type FriendStatus = 'sent' | 'pending' | 'accepted';
export type FriendDirection = 'incoming' | 'outgoing';

export interface FriendUserSummary {
  id: string;
  firstName: string;
  lastName?: string;
  avatar: AvatarConfig;
  // Only present in the caller's own-list contexts (My Friends / Add Friends / Pending
  // Requests) - see friends.route.ts's toUserSummary. Never present on another user's list.
  email?: string;
}

export interface FriendListEntry {
  friendId: string;
  status: FriendStatus;
  // Relative to the caller - 'outgoing' means the caller sent it, 'incoming' means they received
  // it. Drives the Pending Requests view's sent-vs-pending row treatment.
  direction: FriendDirection;
  requestedAt: string;
  acceptedAt?: string;
  user: FriendUserSummary;
}

export interface FriendOfUserEntry {
  acceptedAt?: string;
  user: FriendUserSummary;
}

export interface FriendStatusResult {
  exists: boolean;
  friendId?: string;
  status?: FriendStatus;
  direction?: FriendDirection;
  requestedAt?: string;
  acceptedAt?: string;
}

interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListFriendsParams {
  view: 'friends' | 'pending';
  search?: string;
  page: number;
  pageSize: number;
}
export type ListFriendsResult = PageMeta & { items: FriendListEntry[] };

export interface ListFriendCandidatesParams {
  search?: string;
  page: number;
  pageSize: number;
}
export type ListFriendCandidatesResult = PageMeta & { items: FriendUserSummary[] };

export interface ListUserFriendsParams {
  userId: string;
  view: 'all' | 'mutual';
  search?: string;
  page: number;
  pageSize: number;
}
export type ListUserFriendsResult = PageMeta & { items: FriendOfUserEntry[] };

const toPageResult = <T>(response: ApiResponse<T[]>): PageMeta & { items: T[] } => ({
  items: response.data,
  page: (response.meta?.['page'] as number) ?? 1,
  pageSize: (response.meta?.['pageSize'] as number) ?? response.data.length,
  total: (response.meta?.['total'] as number) ?? response.data.length,
  totalPages: (response.meta?.['totalPages'] as number) ?? 1,
});

const buildParams = (input: Record<string, string | number | undefined>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
};

export const friendsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMyFriends: builder.query<ListFriendsResult, ListFriendsParams>({
      query: ({ view, search, page, pageSize }) => `/api/friends?${buildParams({ view, search, page, pageSize })}`,
      transformResponse: (response: ApiResponse<FriendListEntry[]>) => toPageResult(response),
      providesTags: ['Friend'],
    }),
    listFriendCandidates: builder.query<ListFriendCandidatesResult, ListFriendCandidatesParams>({
      query: ({ search, page, pageSize }) => `/api/friends/candidates?${buildParams({ search, page, pageSize })}`,
      transformResponse: (response: ApiResponse<FriendUserSummary[]>) => toPageResult(response),
      providesTags: ['Friend'],
    }),
    listUserFriends: builder.query<ListUserFriendsResult, ListUserFriendsParams>({
      query: ({ userId, view, search, page, pageSize }) =>
        `/api/friends/of/${userId}?${buildParams({ view, search, page, pageSize })}`,
      transformResponse: (response: ApiResponse<FriendOfUserEntry[]>) => toPageResult(response),
      providesTags: ['Friend'],
    }),
    getFriendStatus: builder.query<FriendStatusResult, string>({
      query: (userId) => `/api/friends/status/${userId}`,
      transformResponse: (response: ApiResponse<FriendStatusResult>) => response.data,
      providesTags: ['Friend'],
    }),
    sendFriendRequest: builder.mutation<void, string>({
      query: (requesteeId) => ({ url: '/api/friends/requests', method: 'POST', body: { requesteeId } }),
      invalidatesTags: ['Friend'],
    }),
    acceptFriendRequest: builder.mutation<void, string>({
      query: (friendId) => ({ url: `/api/friends/requests/${friendId}/accept`, method: 'POST' }),
      invalidatesTags: ['Friend'],
    }),
    // Covers rescind/decline/unfriend - all three are "delete this relationship row" on the
    // backend, see friends.route.ts's DELETE /requests/:id.
    deleteFriendRequest: builder.mutation<void, string>({
      query: (friendId) => ({ url: `/api/friends/requests/${friendId}`, method: 'DELETE' }),
      invalidatesTags: ['Friend'],
    }),
    markFriendRequestsSeen: builder.mutation<{ count: number }, void>({
      query: () => ({ url: '/api/friends/requests/seen', method: 'PATCH' }),
      transformResponse: (response: ApiResponse<{ count: number }>) => response.data,
      invalidatesTags: ['Friend'],
    }),
  }),
});

export const {
  useListMyFriendsQuery,
  useListFriendCandidatesQuery,
  useListUserFriendsQuery,
  useGetFriendStatusQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeleteFriendRequestMutation,
  useMarkFriendRequestsSeenMutation,
} = friendsApi;
