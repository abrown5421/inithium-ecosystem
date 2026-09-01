import { useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Box, Button, Icon, IconButton, Text } from '@inithium/ui';
import type { AuthUser } from '@inithium/api-client';
import { cmsModules } from './modules/registry';
import { ModuleRenderer } from './ModuleRenderer';

export interface CmsShellProps {
  readonly currentUser: AuthUser;
  readonly onLogout: () => void;
}

const EXPANDED_WIDTH = 'w-60';
const COLLAPSED_WIDTH = 'w-16';

// Paths below are absolute ("/cms", not "/") because RootRouter (in apps/web) reaches CmsRoot
// via a manual pathname check rather than a parent <Route path="/cms/*">, so these <Routes>
// match against the full current pathname, not a stripped-down remainder.
export const CmsShell = ({ currentUser, onLogout }: CmsShellProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const firstModuleId = cmsModules[0]?.id;

  return (
    <Box flex={{ direction: 'row' }} className="min-h-screen w-full">
      <Box
        as="nav"
        flex={{ direction: 'col', gap: 4 }}
        bgColor={{ color: 'surface', intensity: 900 }}
        padding={{ base: 16 }}
        className={`${isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH} shrink-0 overflow-hidden transition-all duration-200`}
      >
        <Box
          flex={{ direction: 'row', align: 'center', justify: isCollapsed ? 'center' : 'between' }}
          margin={{ bottom: 16 }}
        >
          {isCollapsed ? null : (
            <Text as="h2" className="text-lg font-bold text-surface-100 whitespace-nowrap">
              Inithium CMS
            </Text>
          )}
          <IconButton
            icon="List"
            label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            textColor={{ color: 'surface', intensity: 100 }}
            iconSize={22}
            onClick={() => setIsCollapsed((prev) => !prev)}
          />
        </Box>

        <Box flex={{ direction: 'col', gap: 4 }} className="flex-1">
          {cmsModules.map((cmsModule) => (
            <Button
              key={cmsModule.id}
              asChild
              variant={{ kind: 'ghost', color: 'surface' }}
              textColor={{ color: 'surface', intensity: 100 }}
              className={isCollapsed ? 'justify-center' : 'justify-start'}
              aria-label={cmsModule.navLabel}
            >
              <Link to={`/cms/${cmsModule.id}`} className="flex flex-row items-center gap-2">
                <Icon name={cmsModule.icon} size={20} />
                {isCollapsed ? null : cmsModule.navLabel}
              </Link>
            </Button>
          ))}
        </Box>

        {isCollapsed ? null : (
          <Box flex={{ direction: 'col', gap: 8 }}>
            <Text as="p" className="text-sm text-surface-400">
              {currentUser.email}
            </Text>
            <Button variant={{ kind: 'filled', color: 'red' }} onClick={onLogout}>
              Log out
            </Button>
          </Box>
        )}
      </Box>

      <Box bgColor={{ color: 'surface', intensity: 100 }} className="flex-1 min-w-0">
        <Routes>
          {firstModuleId ? (
            <Route path="/cms" element={<Navigate to={`/cms/${firstModuleId}`} replace />} />
          ) : null}
          <Route path="/cms/:moduleId" element={<ModuleRenderer />} />
        </Routes>
      </Box>
    </Box>
  );
};
