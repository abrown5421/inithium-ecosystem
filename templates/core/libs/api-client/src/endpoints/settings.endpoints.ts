import type { ApiResponse } from '@inithium/api-utils';
import { baseApi } from '../baseApi';

// Local mirror of @inithium/db's SETTING_TYPES/SettingEntity - every existing frontend import
// from @inithium/db is `import type` only (see page.endpoints.ts), since @inithium/db's barrel
// also re-exports the Mongo provider and its mongoose-dependent code. SETTING_TYPES is a runtime
// value the UI needs (to drive its type-dispatch), so it's redefined here rather than imported.
export const SETTING_TYPES = ['string', 'boolean', 'number', 'date', 'stringList', 'json'] as const;
export type SettingType = (typeof SETTING_TYPES)[number];

interface SettingBase {
  id: string;
  key: string;
  updatedAt: string;
}

export type SettingEntity =
  | (SettingBase & { type: 'string'; value: string })
  | (SettingBase & { type: 'boolean'; value: boolean })
  | (SettingBase & { type: 'number'; value: number })
  | (SettingBase & { type: 'date'; value: string })
  | (SettingBase & { type: 'stringList'; value: string[] })
  | (SettingBase & { type: 'json'; value: Record<string, unknown> });

export type UpsertSettingInput =
  | { key: string; type: 'string'; value: string }
  | { key: string; type: 'boolean'; value: boolean }
  | { key: string; type: 'number'; value: number }
  | { key: string; type: 'date'; value: string }
  | { key: string; type: 'stringList'; value: string[] }
  | { key: string; type: 'json'; value: Record<string, unknown> };

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listSettings: builder.query<SettingEntity[], void>({
      query: () => '/api/settings',
      transformResponse: (response: ApiResponse<SettingEntity[]>) => response.data,
      providesTags: ['Settings'],
    }),
    upsertSetting: builder.mutation<SettingEntity, UpsertSettingInput>({
      query: ({ key, ...input }) => ({ url: `/api/settings/${key}`, method: 'PATCH', body: input }),
      transformResponse: (response: ApiResponse<SettingEntity>) => response.data,
      invalidatesTags: ['Settings'],
    }),
    // Unauthenticated read, single key - safe for anonymous public visitors (Navbar, the CMS's
    // own pre-login screen). `query` intentionally has no error handling for a missing key: a
    // 404 is an expected, common case (nothing saved yet, still on the definition's default),
    // not a failure - callers read `data` and fall back themselves, never `error`.
    getPublicSetting: builder.query<SettingEntity, string>({
      query: (key) => `/api/settings/public/${key}`,
      transformResponse: (response: ApiResponse<SettingEntity>) => response.data,
      providesTags: (_result, _error, key) => [{ type: 'Settings', id: key }],
    }),
  }),
});

export const { useListSettingsQuery, useUpsertSettingMutation, useGetPublicSettingQuery } = settingsApi;

const DEFAULT_APP_NAME = 'Inithium';
const APP_NAME_KEY = 'app.name';

// The one shared place every "app.name" consumer (Navbar, Footer, browser tab title,
// CmsLoginPage, CmsShell, HomePage, ...) reads from - a single hook means the
// unset-yet/wrong-type fallback logic exists exactly once, not once per consumer.
export const useAppName = (): string => {
  const { data } = useGetPublicSettingQuery(APP_NAME_KEY);
  return data && data.type === 'string' ? data.value : DEFAULT_APP_NAME;
};
