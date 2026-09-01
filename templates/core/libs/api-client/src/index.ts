export { baseApi } from './baseApi';
export { pageApi, useGetPageByRouteQuery, useGetNavPagesQuery } from './endpoints/page.endpoints';
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
