# Inithium Ecosystem & CLI Master Blueprint

## 1. Executive Summary & Core Philosophy

Inithium is an a la carte, modular full-stack monorepo scaffolding ecosystem. It consists of a single master repository hosting a CLI tool (`bin/` & `src/`), a lean Nx-powered starter blueprint (`templates/core`), and plug-and-play extension modules (`templates/plugins`).

### Architectural Principles

- **Pure Functional Programming:** Avoid OOP classes, mutating state, or `this` contexts. Write pure deterministic functions, functional compositions, factory functions, and immutability primitives.
- **Heavy Abstraction & Scalable Encapsulation:** Decouple domain logic from platform infrastructure. Wrap raw DB queries, HTTP transports, third-party libraries, and UI components behind abstract interfaces.
- **Feature-Sliced Design (FSD):** Organize frontend and backend domain code by vertical feature slices rather than technical layers. Each slice cleanly encapsulates its own components/routes, schemas, state, and UI.
- **Pragmatic Commenting Standard:** Write comments *only* where they add value to complex logic, non-obvious algorithms, or code tracing. Strictly avoid redundant, self-evident comments that restate what the code clearly expresses (e.g., avoid writing `// fetch user` directly above `getCurrentUser()`).
- **Plugin Eject Model:** Plugins inject raw TypeScript source code directly into consuming applications via the CLI. Plugins must never act as black-box dependencies; they are customizable blueprints.

---

## 2. Technology Stack Standards

### Backend Architecture (`apps/api`)

- **Runtime & Server:** Node.js (v20+), Express.js
- **Validation:** Zod for runtime schema validation (environment variables, HTTP request bodies, headers, and query params)
- **Database & ODM:** MongoDB with Mongoose (strict schema typing, lean queries by default)
- **Authentication:** JWT (JSON Web Tokens) with stateless bearer token authorization middleware
- **TypeScript:** Strict mode enabled (`noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`)

### Frontend Architecture (`apps/web`)

- **UI Engine & Templating:** React (v18+), TypeScript
- **State & Data Fetching:**
  - Redux Toolkit (RTK) for complex client-side state slices
  - RTK Query (`baseApi`) for unified server-side data fetching, caching, and tag-based cache invalidation
- **Design System & Styling:** Tailwind CSS v4, custom theme engine with CSS variable tokens
- **UI Primitives:** Headless, accessible primitives via Radix UI (`@radix-ui/*`)

---

## 3. Directory Layout & Repository Boundaries

```text
inithium/
├── bin/                       # Executable Node CLI entrypoint (npx inithium)
├── src/                       # CLI engine logic (Commander, degit, AST injectors)
│   ├── commands/              # 'init' and 'add' command handlers
│   └── utils/                 # File manipulators, package.json mergers, git helpers
├── templates/
│   ├── core/                  # Clean Nx Monorepo Starter Template (@inithium/source)
│   │   ├── apps/
│   │   │   ├── api/           # Express + Mongo + Zod + JWT Backend app
│   │   │   └── web/           # React + RTK Query + Tailwind + Radix Frontend app
│   │   ├── libs/              # Shared core primitives (@inithium/ui, @inithium/auth)
│   │   ├── package.json       # Scope configured as "@inithium/source"
│   │   ├── tsconfig.base.json # Defines "@inithium/*" path aliases
│   │   └── nx.json            # Nx workspace execution config
│   └── plugins/               # Ejectable feature blueprints
│       └── example/           # Modular extensions (contains code + manifest.json)
├── CLAUDE.md                  # System Blueprint & AI Operational Guide
├── package.json               # Root CLI package ("name": "@inithium/cli")
└── tsconfig.json              # Root TypeScript config for CLI engine
```

## 4. Contract Specifications & Extension Patterns

### Plugin Architecture & `manifest.json` Contract

Every plugin inside `templates/plugins/[plugin-name]/` must include a `manifest.json` defining its injection targets and npm dependencies:

```json
{
  "name": "example-plugin",
  "version": "1.0.0",
  "description": "Blueprint for optional non-core functionality",
  "dependencies": {
    "npm": {
      "external-pkg": "^1.0.0"
    },
    "plugins": []
  },
  "injections": [
    {
      "target": "apps/api/src/routes",
      "source": "api/routes"
    },
    {
      "target": "apps/web/src/features",
      "source": "web/features"
    }
  ]
}
```

### Backend Feature-Sliced Pattern

- API routes must wrap handlers in an `asyncHandler` functional wrapper.
- All request parameters and payloads must pass through Zod `.parse()` before reaching domain logic.
- Route slices register dynamically with Express routers using pure factory functions.

### Frontend RTK Query Endpoint Injection Contract

- Core provides a single `baseApi` instance in `apps/web/src/api/baseApi.ts`.
- Plugins and custom features **must never** instantiate secondary API slices.
- Plugins and custom features must inject endpoints into `baseApi`:

```typescript
import { baseApi } from '../api/baseApi';

export const featureApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureData: builder.query<FeatureData, void>({
      query: () => '/feature-route',
      providesTags: ['Feature'],
    }),
  }),
});

export const { useGetFeatureDataQuery } = featureApi;
```

### UI Composition Slot Pattern

- Container pages must accept extension slots (props like `customTabs?: TabItem[]` or `headerActions?: ReactNode`).
- Plugins must expose unstyled layout shells and headless hooks, allowing consumer applications to inject custom UI components without modifying underlying plugin source code.

---

## 5. Developer & AI Assistant Workflow Instructions

### Application Verification

Server restarts, builds, and browser testing are handled **manually by the developer**. AI agents must **not** attempt to run dev servers or execute browser automation steps.

Developer commands used after completing code changes:

```bash
# Build all apps in the workspace
npx nx run-many -t=build --all

# Serve all apps in the workspace
npx nx run-many -t=serve --all
```

### Git & Pull Request Strategy

When task requirements are completed and verified via manual browser testing, follow this explicit Git workflow:

```bash
# 1. Create and switch to a dedicated feature branch
git checkout -b branch-name

# 2. Stage all modifications
git add .

# 3. Commit changes with a descriptive message
git commit -m 'feat: summary of implemented changes'

# 4. Push branch to remote GitHub repository
git push origin branch-name

# 5. OPEN PULL REQUEST MANUALLY IN GITHUB UI -> Merge into main

# 6. Return to local main branch and pull remote changes
git checkout main && git pull
```