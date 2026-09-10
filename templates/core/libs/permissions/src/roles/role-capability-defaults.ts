import type { Role } from '@inithium/db';

// Each plugin contributes its own capability keys to whichever role tier(s) make sense via a
// merge-strategy injection anchored at the end of that role's array - a capability key sitting
// unused here is inert (nothing ever checks it unless the plugin owning its routes is actually
// installed), so listing a key for an absent plugin never risks anything; the anchors exist
// purely so multiple plugins can append to the same role's array without clobbering each other.
export const ROLE_CAPABILITY_DEFAULTS: Record<Role, readonly string[]> = {
  user: [],
  contributor: [
    // inithium:anchor:contributor
  ],
  editor: [
    // inithium:anchor:editor
  ],
  // users:managePermissions is deliberately absent even from admin - granting the ability to
  // edit *other users'* capability grants is a different trust tier than any content/admin
  // capability, so it's owner-granted-only by default (see libs/permissions/src/index.ts's
  // requireOwner and the Permissions module's own gating).
  admin: [
    // inithium:anchor:admin
  ],
};
