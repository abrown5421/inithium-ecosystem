import { useSyncExternalStore } from 'react';
import { useGetMeQuery } from '@inithium/api-client';
import type { AuthUser } from '@inithium/api-client';
import { authStore } from './authStore';

export const useAuthToken = (): string | null =>
  useSyncExternalStore(authStore.subscribe, authStore.getToken, authStore.getToken);

export interface UseCurrentUserResult {
  readonly currentUser: AuthUser | null;
  readonly logout: () => void;
}

export const useCurrentUser = (): UseCurrentUserResult => {
  const token = useAuthToken();
  const { data: user } = useGetMeQuery(undefined, { skip: !token });

  return {
    currentUser: token ? (user ?? null) : null,
    logout: () => authStore.setToken(null),
  };
};
