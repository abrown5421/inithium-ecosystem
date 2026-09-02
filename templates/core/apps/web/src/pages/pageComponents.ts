import type { PageComponentMap } from '@inithium/ui';
import { HomePage } from './HomePage';
import { DocsPage } from './DocsPage';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { BlogIndexPage } from './BlogIndexPage';
import { BlogPostPage } from './BlogPostPage';

// Keyed by Page.slug - matching the records ensureSeededPages() (libs/db/src/page-seeds)
// reconciles into existence on every API boot: home ("/"), docs ("/docs"), login ("/login"),
// signup ("/signup"), privacy-policy ("/privacy-policy"). The blog plugin adds its own seeds for
// "blog" ("/blog") and "blog-post" ("/blog/:id") to that same registry - a plugin needing its own
// page(s) always goes through page-seeds/registry.ts, never a manual API call.
export const pageComponents: PageComponentMap = {
  home: HomePage,
  docs: DocsPage,
  login: LoginPage,
  signup: SignupPage,
  'privacy-policy': PrivacyPolicyPage,
  blog: BlogIndexPage,
  'blog-post': BlogPostPage,
};
