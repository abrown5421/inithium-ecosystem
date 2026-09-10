import type { PageComponentMap } from '@inithium/ui';
import { HomePage } from './HomePage';
import { DocsPage } from './DocsPage';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { ProfilePage } from './ProfilePage';
// inithium:anchor:imports

// Keyed by Page.slug, matching libs/db/src/page-seeds/registry.ts's own seeded records: home
// ("/"), docs ("/docs"), login ("/login"), signup ("/signup"), privacy-policy
// ("/privacy-policy"), profile ("/profile/:id"). A plugin that adds its own page(s) appends its
// own slug(s) here via a merge-strategy injection - every entry here has a corresponding
// page-seed reconciled by ensureSeededPages() at API boot, and must still be added here by hand
// alongside its seed (no mechanism auto-derives this map from the seed registry).
export const pageComponents: PageComponentMap = {
  home: HomePage,
  docs: DocsPage,
  login: LoginPage,
  signup: SignupPage,
  'privacy-policy': PrivacyPolicyPage,
  profile: ProfilePage,
  // inithium:anchor:components
};
