import { useEffect } from 'react';
import { buildCustomBrandThemeCss } from '@inithium/ui';
import { useIsDarkModeFeatureEnabled, useCustomBrandColors } from '@inithium/api-client';
import { useCurrentUser } from './useCurrentUser';
import App from './app';
// inithium:anchor:imports

// The single place mounted on every route, public site and (when a plugin adds one) any other
// top-level area alike - see the dark-mode/custom-brand-color effect below for why that matters.
export function RootRouter() {
  const { currentUser } = useCurrentUser();

  // Lives here rather than inside App - RootRouter is the one thing mounted on every route,
  // so this is the only place a data-theme stamp reliably reaches all of them (see theme.css's
  // own dark-mode override block, which is keyed off this attribute). Kill-switch pattern: the
  // admin setting gates the feature entirely, matching profile.route.ts's own
  // isDarkModeFeatureEnabled().
  const darkModeFeatureEnabled = useIsDarkModeFeatureEnabled();
  const isDarkMode = darkModeFeatureEnabled && Boolean(currentUser?.darkMode);
  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // Also lives here rather than inside App, for the identical reason as the data-theme effect
  // above. Rendered as a plain <style> tag (rather than a useEffect DOM mutation like the
  // data-theme stamp) since a `:root { ... }` rule applies to the whole document regardless of
  // where in the tree the <style> element itself is - React can own its lifecycle declaratively
  // instead of this component manually creating/removing a DOM node. An admin who hasn't
  // customized any color yields an empty string here, so theme.css's own static defaults keep
  // applying untouched.
  const customBrandColors = useCustomBrandColors();
  const customBrandThemeCss = buildCustomBrandThemeCss(customBrandColors);

  // inithium:anchor:route-branches

  return (
    <>
      {customBrandThemeCss && <style>{customBrandThemeCss}</style>}
      <App />
    </>
  );
}

export default RootRouter;
