import type { CreatePageInput } from '../contracts/page.contract';
import homePageSeed from './home.page-seed';
import docsPageSeed from './docs.page-seed';
import loginPageSeed from './login.page-seed';
import signupPageSeed from './signup.page-seed';
import privacyPolicyPageSeed from './privacy-policy.page-seed';
import profilePageSeed from './profile.page-seed';
import blogPageSeed from './blog.page-seed';
import blogPostPageSeed from './blog-post.page-seed';

// Every page the app should always have a Page DB record for, reconciled once at API startup by
// ensureSeededPages(). Keyed by slug at reconcile time - slug is the one field the CMS's Pages
// module treats as immutable (see PageEditDialog's "not editable here" note), so it's the
// natural idempotency key: a page already present is left completely alone, even if every other
// field has since been hand-edited by an admin.
//
// A plugin adding its own page(s) overwrites this file wholesale to add its own seed(s) to the
// array (this copy is core's version plus the blog plugin's own "blog"/"blog-post" entries) -
// the same whole-file-overwrite convention already used for registering a plugin's routes into
// libs/api-core/src/index.ts, since there's no Vite-style import.meta.glob equivalent available
// on the Node-run backend for zero-edit auto-discovery.
export const pageSeeds: CreatePageInput[] = [
  homePageSeed,
  docsPageSeed,
  loginPageSeed,
  signupPageSeed,
  privacyPolicyPageSeed,
  profilePageSeed,
  blogPageSeed,
  blogPostPageSeed,
];
