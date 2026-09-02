import type { PageComponentMap } from '@inithium/ui';
import { HomePage } from './HomePage';
import { DocsPage } from './DocsPage';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { BlogIndexPage } from './BlogIndexPage';
import { BlogPostPage } from './BlogPostPage';

// Keyed by Page.slug — matching the records seeded via the Postman collection's "Pages"
// folder (or created directly against POST /api/pages): home ("/"), docs ("/docs"),
// login ("/login"), signup ("/signup"), privacy-policy ("/privacy-policy"). The blog plugin
// adds "blog" ("/blog") and "blog-post" ("/blog/:id") - like every other entry here, the
// actual Page record for each must still be created via the CMS Pages module (no seed
// mechanism exists in this codebase to do that automatically).
export const pageComponents: PageComponentMap = {
  home: HomePage,
  docs: DocsPage,
  login: LoginPage,
  signup: SignupPage,
  'privacy-policy': PrivacyPolicyPage,
  blog: BlogIndexPage,
  'blog-post': BlogPostPage,
};
