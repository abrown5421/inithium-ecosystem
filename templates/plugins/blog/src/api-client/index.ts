export { baseApi } from './baseApi';
export {
  pageApi,
  useGetPageByRouteQuery,
  useGetNavPagesQuery,
  useListPagesQuery,
  useUpdatePageMutation,
} from './endpoints/page.endpoints';
export type { PageSearchField, ListPagesParams, ListPagesResult, UpdatePageInput } from './endpoints/page.endpoints';
export { usePageParams } from './usePageParams';
export { authApi, useGetMeQuery, useLoginMutation, useRegisterMutation } from './endpoints/auth.endpoints';
export type { AuthUser, LoginCredentials, RegisterInput, AuthResponse } from './endpoints/auth.endpoints';
export { ACCESS_TOKEN_STORAGE_KEY, getStoredAccessToken, setStoredAccessToken } from './tokenStorage';

export { presenceApi, useGetUserPresenceQuery } from './endpoints/presence.endpoints';
export { usePresence } from './realtime/usePresence';
export type { UsePresenceOptions } from './realtime/usePresence';
export {
  connectRealtimeClient,
  disconnectRealtimeClient,
  getRealtimeConnectionStatus,
  subscribeToRealtimeStatus,
  subscribeToRealtimeChannel,
  setPresenceStatus,
} from './realtime/realtimeClientStore';
export type { RealtimeConnectionStatus } from './realtime/realtimeClientStore';
export { useRealtimeConnectionStatus } from './realtime/useRealtimeConnectionStatus';
export type { PresenceStatus, PresenceRecord } from '@inithium/realtime';

export {
  notificationsApi,
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from './endpoints/notifications.endpoints';
export { useNotificationCenter } from './notifications/useNotificationCenter';
export type { UseNotificationCenterOptions, UseNotificationCenterResult } from './notifications/useNotificationCenter';
export type { NotificationEntity } from '@inithium/notifications';

export {
  usersApi,
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserRegistrationsOverTimeQuery,
} from './endpoints/users.endpoints';
export type {
  AdminUser,
  UserSearchField,
  ListUsersParams,
  ListUsersResult,
  CreateUserInput,
  UpdateUserInput,
  UserRegistrationCount,
} from './endpoints/users.endpoints';

export {
  settingsApi,
  useListSettingsQuery,
  useUpsertSettingMutation,
  useGetPublicSettingQuery,
  useAppName,
  useShowPersistentNotificationCenter,
  SETTING_TYPES,
} from './endpoints/settings.endpoints';
export type { SettingType, SettingEntity, UpsertSettingInput } from './endpoints/settings.endpoints';

export {
  blogApi,
  useListBlogPostsQuery,
  useGetBlogPostQuery,
  useCreateBlogPostMutation,
  useUpdateBlogPostMutation,
  useDeleteBlogPostMutation,
  useAddBlogCommentMutation,
  useReplyToBlogCommentMutation,
  useDeleteBlogCommentMutation,
  useListBlogCategoriesQuery,
  useListBlogAuthorsQuery,
} from './endpoints/blog.endpoints';
export type {
  BlogPostEntity,
  CommentEntity,
  ListBlogPostsParams,
  ListBlogPostsResult,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from './endpoints/blog.endpoints';
