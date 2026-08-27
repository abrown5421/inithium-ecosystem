import type { PageComponentMap } from '@inithium/ui';
import { HomePage } from './HomePage';
import { DocsPage } from './DocsPage';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';

// Keyed by Page.slug — matching the records seeded via the Postman collection's "Pages"
// folder (or created directly against POST /api/pages): home ("/"), docs ("/docs"),
// login ("/login"), signup ("/signup"), privacy-policy ("/privacy-policy").
export const pageComponents: PageComponentMap = {
  home: HomePage,
  docs: DocsPage,
  login: LoginPage,
  signup: SignupPage,
  'privacy-policy': PrivacyPolicyPage,
};
