import { lazy as lazyForTime, Suspense as SuspenseForTime } from 'react';
import { useLocation as useTimeLocation } from 'react-router-dom';
import { Box as TimeBox, Loader as TimeLoader } from '@inithium/ui';
import { authStore as timeAuthStore } from './authStore';
import { useCurrentUser as useTimeCurrentUserHook } from './useCurrentUser';

const LazyTimeRoot = lazyForTime(() =>
  import('@inithium/time').then((module) => ({ default: module.TimeRoot })),
);

const TimeBootLoader = () => (
  <TimeBox
    bgColor={{ color: 'surface', intensity: 950 }}
    className="min-h-screen w-full"
    flex={{ direction: 'row', justify: 'center', align: 'center' }}
  >
    <TimeLoader variant="spinner" size="3rem" color={{ color: 'primary', intensity: 600 }} label="Loading Time Clock..." />
  </TimeBox>
);
// inithium:anchor:imports

  // Reserves /time as a second admin-adjacent area, cloning the cms plugin's own branch-above-
  // <App/> pattern for /cms (see that fragment for the full rationale: App's public-site hooks
  // never mount while here, and @inithium/time is only ever fetched - as its own lazy chunk - once
  // a visitor actually navigates to /time). currentUser is the SAME variable already resolved at
  // the top of this function, not re-derived - only isResolving/logout need a second
  // useCurrentUser() call (cheap: backed by the same RTK Query cache entry), mirroring the cms
  // fragment's identical choice. Every new binding below is aliased (`*ForTime`/`Time*`)
  // specifically because this merge target is shared - the cms plugin's own fragment already
  // imports { lazy, Suspense } from 'react', { useLocation } from 'react-router-dom', and
  // { Box, Loader } from '@inithium/ui' into this exact anchor, and a second unaliased import of
  // any of those names in one file is a JS SyntaxError regardless of install order or whether cms
  // is even installed in this workspace.
  const timeLocation = useTimeLocation();
  const { isResolving: isTimeAuthResolving, logout: timeLogout } = useTimeCurrentUserHook();

  if (timeLocation.pathname === '/time' || timeLocation.pathname.startsWith('/time/')) {
    return (
      <>
        {customBrandThemeCss && <style>{customBrandThemeCss}</style>}
        <SuspenseForTime fallback={<TimeBootLoader />}>
          <LazyTimeRoot
            currentUser={currentUser}
            isResolving={isTimeAuthResolving}
            onLoginSuccess={(token: string) => timeAuthStore.setToken(token)}
            onLogout={timeLogout}
          />
        </SuspenseForTime>
      </>
    );
  }
// inithium:anchor:route-branches
