const CONTACT_CAPTCHA_ENABLED_KEY = 'contact.captchaEnabled';

// Defaults false (off unless an admin opts in) - same fallback direction as
// useIsDarkModeFeatureEnabled, and must stay in sync with contact.route.ts's own
// isCaptchaRequired() check and the setting's own `default` in
// libs/cms/src/settings/definitions/contact-captcha-enabled.setting.ts.
export const useIsContactCaptchaEnabled = (): boolean => {
  const { data } = useGetPublicSettingQuery(CONTACT_CAPTCHA_ENABLED_KEY);
  return data?.type === 'boolean' ? data.value : false;
};

const CONTACT_CAPTCHA_SITE_KEY_KEY = 'contact.captchaSiteKey';

// The Turnstile site key is meant to be public (unlike the matching secret key, which is
// server-only and never stored as a setting - see contact.route.ts) - read the same way as any
// other client-visible config in this app, through the public-settings API rather than a Vite
// env var (this app has no existing VITE_* usage to follow instead).
export const useContactCaptchaSiteKey = (): string => {
  const { data } = useGetPublicSettingQuery(CONTACT_CAPTCHA_SITE_KEY_KEY);
  return data?.type === 'string' ? data.value : '';
};

// inithium:anchor:exports
