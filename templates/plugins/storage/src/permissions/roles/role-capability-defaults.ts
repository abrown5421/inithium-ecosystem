import type { Role } from '@inithium/db';

// Hand-maintained per-plugin superset, same whole-file-overwrite convention already used by
// libs/db/src/page-seeds/registry.ts (no Vite-style import.meta.glob equivalent runs on the
// Node-executed API, so this can't be zero-shared-file-edit like the frontend capability
// registry). Ships the FULL union of every known plugin's capability keys rather than a chain
// assuming a fixed install order - a capability key sitting unused in this table is inert
// (nothing ever checks it unless the plugin owning its routes is actually installed), so there's
// no risk in listing keys for plugins that aren't present. This copy is cms's baseline plus
// storage's own 'storage:manageAssets' key, plus every other known plugin's keys so installing
// storage after blog/gallery/contact never regresses their access either.
export const ROLE_CAPABILITY_DEFAULTS: Record<Role, readonly string[]> = {
  user: [],
  contributor: ['blog:manage', 'gallery:manage'],
  editor: [
    'pages:manage',
    'blog:manage',
    'blog:manageComments',
    'gallery:manage',
    'contact:manageThreads',
    'storage:manageAssets',
  ],
  // users:managePermissions is deliberately absent even from admin - granting the ability to
  // edit *other users'* capability grants is a different trust tier than any content/admin
  // capability, so it's owner-granted-only by default (see libs/permissions/src/index.ts's
  // requireOwner and the Permissions module's own gating).
  admin: [
    'users:manage',
    'settings:manage',
    'pages:manage',
    'blog:manage',
    'blog:manageComments',
    'gallery:manage',
    'contact:manageThreads',
    'storage:manageAssets',
  ],
};
