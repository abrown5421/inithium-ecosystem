import { Link } from 'react-router-dom';
import type { AvatarConfig, PageEntity } from '@inithium/db';
import { Avatar, Box, Button, Divider, Icon, Text } from '../components';
import { drawer } from '../drawer/drawer';
import type { DrawerRenderContext } from '../drawer/drawerStore';
import type { IconName } from '../tokens/icon';
import type { PresenceStatus } from '../tokens/avatar';
import { mergeClassNames } from '../theme/mergeClassNames';
import { resolveAvatarConfigProps } from './resolveAvatarConfigProps';

export interface NavbarLogo {
  readonly src: string;
  readonly alt?: string;
}

export interface NavbarUser {
  readonly firstName: string;
  readonly lastName?: string;
  readonly avatar: AvatarConfig;
  // Deliberately not routed through resolveAvatarConfigProps - that bridge is purely visual
  // config, while presence is a live signal from an entirely separate layer
  // (@inithium/realtime via @inithium/api-client). Optional so a host that hasn't wired presence
  // yet keeps working unchanged.
  readonly status?: PresenceStatus;
}

export interface NavbarProps {
  // Pre-filtered by the app host (one `useGetNavPagesQuery` call per location) rather than a
  // single unfiltered list Navbar filters itself — keeps this component a pure consumer of
  // already-shaped data instead of duplicating the server's own location filtering/sorting.
  readonly primaryNavPages: PageEntity[];
  readonly profileNavPages: PageEntity[];
  readonly currentUser?: NavbarUser | null;
  readonly onLogin?: () => void;
  readonly onLogout?: () => void;
  readonly logo?: NavbarLogo;
  readonly title?: string;
  // Px height of the bar - also the value a sibling PageShell's `navbarHeight` should be given
  // so its `100vh - NavbarHeight` sizing actually lines up with this element's real height.
  readonly height?: number;
  readonly className?: string;
}

const DEFAULT_HEIGHT = 64;

const NavLink = ({ page, onNavigate }: { page: PageEntity; onNavigate: () => void }) => (
  // variant stays color: 'accent' so the 'link' kind's own hover:border-b-accent-500 (already
  // safelisted in theme.css) resolves correctly - textColor is a separate override that always
  // wins over whatever the variant computed, so the resting text can be near-black without
  // touching the hover border color the variant's `color` also drives.
  <Button
    asChild
    variant={{ kind: 'link', color: 'accent' }}
    textColor={{ color: 'surface', intensity: 950 }}
    onClick={onNavigate}
  >
    <Link to={page.routePattern}>
      {page.navigation.icon ? <Icon name={page.navigation.icon as IconName} size={16} /> : null}
      {page.navigation.label}
    </Link>
  </Button>
);

const NavLinkStack = ({ pages, onNavigate }: { pages: PageEntity[]; onNavigate: () => void }) => (
  <Box flex={{ direction: 'col', align: 'start', gap: 4 }}>
    {pages.map((page) => (
      <NavLink key={page.id} page={page} onNavigate={onNavigate} />
    ))}
  </Box>
);

const AuthenticatedDrawerContent = ({
  primaryNavPages,
  profileNavPages,
  onLogout,
  close,
}: {
  primaryNavPages: PageEntity[];
  profileNavPages: PageEntity[];
  onLogout?: () => void;
  close: () => void;
}) => (
  // flex-1 (not h-full) - this Box is a flex sibling of Drawer's real-height Title element
  // inside the panel's own flex-col, so it needs to fill whatever space Title *didn't* take,
  // not 100% of the whole panel (which would overflow past the visible drawer and make mt-auto
  // push the button off-screen instead of to the panel's actual visible bottom edge). min-h-0
  // lets it shrink below its content's natural height instead of forcing the panel to grow.
  <Box flex={{ direction: 'col', gap: 16 }} className="min-h-0 flex-1">
    {/* Primary links + divider are only part of the *md-and-below* matrix row - on lg the top
        nav row already shows them, so this block is hidden there via CSS alone (no JS
        breakpoint detection exists anywhere in this codebase; see resolveFlexClasses/theme.css
        for how every other responsive concern here is handled the same way). */}
    <Box className="lg:hidden" flex={{ direction: 'col', gap: 16 }}>
      <NavLinkStack pages={primaryNavPages} onNavigate={close} />
      <Divider />
    </Box>
    <NavLinkStack pages={profileNavPages} onNavigate={close} />
    <Box className="mt-auto" padding={{ top: 16 }}>
      <Button
        variant={{ kind: 'filled', color: 'primary' }}
        className="w-full"
        onClick={() => {
          onLogout?.();
          close();
        }}
      >
        Logout
      </Button>
    </Box>
  </Box>
);

const UnauthenticatedDrawerContent = ({
  primaryNavPages,
  onLogin,
  close,
}: {
  primaryNavPages: PageEntity[];
  onLogin?: () => void;
  close: () => void;
}) => (
  // flex-1 (not h-full) - this Box is a flex sibling of Drawer's real-height Title element
  // inside the panel's own flex-col, so it needs to fill whatever space Title *didn't* take,
  // not 100% of the whole panel (which would overflow past the visible drawer and make mt-auto
  // push the button off-screen instead of to the panel's actual visible bottom edge). min-h-0
  // lets it shrink below its content's natural height instead of forcing the panel to grow.
  <Box flex={{ direction: 'col', gap: 16 }} className="min-h-0 flex-1">
    <NavLinkStack pages={primaryNavPages} onNavigate={close} />
    <Box className="mt-auto" padding={{ top: 16 }}>
      <Button
        variant={{ kind: 'filled', color: 'primary' }}
        className="w-full"
        onClick={() => {
          onLogin?.();
          close();
        }}
      >
        Login
      </Button>
    </Box>
  </Box>
);

// Assembles Box/Button/Avatar/Drawer/Divider/Icon primitives into the app's top navigation bar.
// Purely presentational - the app host is responsible for fetching primaryNavPages/
// profileNavPages (one `useGetNavPagesQuery` call per location) and resolving `currentUser`,
// and passes them in as plain props.
export const Navbar = ({
  primaryNavPages,
  profileNavPages,
  currentUser,
  onLogin,
  onLogout,
  logo,
  title,
  height = DEFAULT_HEIGHT,
  className,
}: NavbarProps) => {
  const openAuthenticatedDrawer = () => {
    drawer.show(
      ({ close }: DrawerRenderContext) => (
        <AuthenticatedDrawerContent
          primaryNavPages={primaryNavPages}
          profileNavPages={profileNavPages}
          onLogout={onLogout}
          close={close}
        />
      ),
      { side: 'right', title: 'Menu' },
    );
  };

  const openUnauthenticatedDrawer = () => {
    drawer.show(
      ({ close }: DrawerRenderContext) => (
        <UnauthenticatedDrawerContent primaryNavPages={primaryNavPages} onLogin={onLogin} close={close} />
      ),
      { side: 'right', title: 'Menu' },
    );
  };

  return (
    <nav style={{ height }} className="w-full shrink-0">
      <Box
        flex={{ direction: 'row', justify: 'between', align: 'center' }}
        bgColor={{ color: 'surface', intensity: 100 }}
        borderColor={{ color: 'surface', intensity: 300 }}
        padding={{ left: 24, right: 24 }}
        className={mergeClassNames('h-full w-full border-b', className)}
      >
        <Link to="/" className="flex shrink-0 items-center gap-2">
          {logo ? <img src={logo.src} alt={logo.alt ?? ''} className="h-8 w-auto" /> : null}
          {title ? (
            <Text as="span" className="text-lg font-semibold">
              {title}
            </Text>
          ) : null}
        </Link>

        <Box flex={{ direction: 'row', align: 'center', gap: 24 }}>
          <Box className="hidden lg:flex" flex={{ direction: 'row', align: 'center', gap: 16 }}>
            {primaryNavPages.map((page) => (
              <NavLink key={page.id} page={page} onNavigate={() => undefined} />
            ))}
          </Box>

          {currentUser ? (
            <Avatar
              {...resolveAvatarConfigProps(
                currentUser.avatar,
                [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' '),
              )}
              size={36}
              status={currentUser.status}
              onClick={openAuthenticatedDrawer}
            />
          ) : (
            <>
              <Button
                className="hidden lg:inline-flex"
                variant={{ kind: 'filled', color: 'primary' }}
                onClick={onLogin}
              >
                Login
              </Button>
              <Button
                className="lg:hidden"
                variant={{ kind: 'ghost', color: 'surface' }}
                onClick={openUnauthenticatedDrawer}
                aria-label="Open menu"
              >
                <Icon name="List" size={22} />
              </Button>
            </>
          )}
        </Box>
      </Box>
    </nav>
  );
};
