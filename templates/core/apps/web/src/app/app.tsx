import { useLocation } from 'react-router-dom';
import {
  AlertContainer,
  Box,
  DialogContainer,
  DrawerContainer,
  Navbar,
  PageShell,
  Text,
  useNavigateWithTransition,
} from '@inithium/ui';
import { useGetNavPagesQuery, useGetPageByRouteQuery } from '@inithium/api-client';
import { useCurrentUser } from './useCurrentUser';
import { pageComponents } from '../pages/pageComponents';
import { NotFoundPage } from '../pages/NotFoundPage';

// Kept in one place and passed to both Navbar (`height`) and PageShell (`navbarHeight`) so the
// two composites' sizing always stays in sync.
const NAVBAR_HEIGHT = 64;

// Routing here is entirely data-driven: react-router-dom only supplies history/location, not
// <Route> elements — every path change re-resolves the current Page record from the backend
// via useGetPageByRouteQuery, and PageShell maps its slug to the matching test page component.
export function App() {
  const location = useLocation();
  const route = `${location.pathname}${location.search}`;
  const navigate = useNavigateWithTransition();

  const { data: page, isLoading } = useGetPageByRouteQuery({ route });
  const { data: primaryNavPages = [] } = useGetNavPagesQuery('primary-nav');
  const { data: profileNavPages = [] } = useGetNavPagesQuery('profile-nav');
  const { currentUser, logout } = useCurrentUser();

  return (
    // The absolute top-level container: a near-black backdrop so the (mostly slate-100/surface)
    // pages have real contrast to fade or slide against — without this, a page fading toward
    // transparent (or sliding out) reveals nothing but a plain white gap instead of a visible
    // transition.
    <Box bgColor={{ color: 'surface', intensity: 950 }} className="min-h-screen w-full">
      <Navbar
        primaryNavPages={primaryNavPages}
        profileNavPages={profileNavPages}
        currentUser={currentUser}
        onLogin={() => navigate('/login')}
        onLogout={logout}
        title="Inithium"
        height={NAVBAR_HEIGHT}
      />

      {isLoading ? (
        <Box padding={{ base: 32 }}>
          <Text as="p">Loading…</Text>
        </Box>
      ) : page ? (
        <PageShell page={page} components={pageComponents} navbarHeight={NAVBAR_HEIGHT} fallback={<NotFoundPage />} />
      ) : (
        <NotFoundPage />
      )}

      <AlertContainer />
      <DialogContainer />
      <DrawerContainer />
    </Box>
  );
}

export default App;
