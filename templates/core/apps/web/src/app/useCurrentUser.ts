import { useSyncExternalStore } from 'react';
import { useGetMeQuery, usePresence } from '@inithium/api-client';
import type { AuthUser, PresenceStatus } from '@inithium/api-client';
import { authStore } from './authStore';

export const useAuthToken = (): string | null =>
  useSyncExternalStore(authStore.subscribe, authStore.getToken, authStore.getToken);

export interface CurrentUser extends AuthUser {
  readonly status?: PresenceStatus;
}

export interface UseCurrentUserResult {
  readonly currentUser: CurrentUser | null;
  readonly logout: () => void;
}

export const useCurrentUser = (): UseCurrentUserResult => {
  const token = useAuthToken();
  const { data: user } = useGetMeQuery(undefined, { skip: !token });
  // Own live presence, not a friend's or stranger's - reuses the exact same usePresence hook a
  // future friends list would call per-friend, just pointed at "me" so the Navbar's own avatar
  // shows the same status other users would eventually see for this account.
  const status = usePresence(token ? user?.id : undefined);

  return {
    currentUser: token && user ? { ...user, status } : null,
    logout: () => authStore.setToken(null),
  };
};
