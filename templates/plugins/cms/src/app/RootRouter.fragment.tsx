import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Loader } from '@inithium/ui';
import { authStore } from './authStore';
import { useAuthToken } from './useCurrentUser';

const LazyCmsRoot = lazy(() =>
  import('@inithium/cms').then((module) => ({ default: module.CmsRoot })),
);

const CmsBootLoader = () => (
  <Box
    bgColor={{ color: 'surface', intensity: 950 }}
    className="min-h-screen w-full"
    flex={{ direction: 'row', justify: 'center', align: 'center' }}
  >
    <Loader variant="spinner" size="3rem" color={{ color: 'primary', intensity: 600 }} label="Loading CMS..." />
  </Box>
);
// inithium:anchor:imports

  // Reserves /cms as an admin area separate from the public site's data-driven Page routing in
  // app.tsx: branching here, above App, means App's public-site hooks (page/nav queries) never
  // mount while browsing the CMS, and @inithium/cms is only ever fetched - as its own lazy chunk -
  // once a visitor actually navigates to /cms. `token` is passed through so the CMS can run its own
  // CmsRealtimeBoundary/notification wiring rather than sharing App's.
  const location = useLocation();
  const { isResolving, logout } = useCurrentUser();
  const token = useAuthToken();

  if (location.pathname === '/cms' || location.pathname.startsWith('/cms/')) {
    return (
      <>
        {customBrandThemeCss && <style>{customBrandThemeCss}</style>}
        <Suspense fallback={<CmsBootLoader />}>
          <LazyCmsRoot
            currentUser={currentUser}
            isResolving={isResolving}
            onLoginSuccess={(token: string) => authStore.setToken(token)}
            onLogout={logout}
            token={token}
          />
        </Suspense>
      </>
    );
  }
// inithium:anchor:route-branches
