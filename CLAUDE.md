# Inithium Ecosystem & CLI Master Blueprint

## 1. Executive Summary & Core Philosophy
Inithium is an a la carte, modular full-stack monorepo scaffolding ecosystem. It consists of a single master repository hosting a CLI tool (`bin/` & `src/`), a lean Nx-powered starter blueprint (`templates/core`), and plug-and-play extension modules (`templates/plugins`).

### Architectural Principles
- **Pure Functional Programming:** Avoid OOP classes, mutating state, or `this` contexts. Write pure deterministic functions, functional compositions, factory functions, and immutability primitives.
- **Thin Orchestrator Applications:** Applications in `apps/` act strictly as thin consumption hosts (bootstrapping, environment loading, route mounting, server listening). All core business logic, database infrastructure, state stores, and UI libraries live inside reusable packages under `libs/`.
- **Heavy Abstraction & Scalable Encapsulation:** Decouple domain logic from platform infrastructure. Wrap raw DB queries, HTTP transports, third-party libraries, and UI components behind abstract interfaces exported via workspace packages.
- **Pragmatic Commenting Standard:** Write comments *only* where they add value to complex logic, non-obvious algorithms, or code tracing. Strictly avoid redundant, self-evident comments that restate what the code clearly expresses.
- **Plugin Eject Model:** Plugins inject raw TypeScript source code directly into consuming workspace targets via the CLI. Plugins must never act as black-box dependencies; they are customizable blueprints.

---

## 2. Technology Stack Standards

### Backend Architecture (`apps/api` + `libs/db`, `libs/api-core`)
- **Runtime & Server:** Node.js (v20+), Express.js (thin host in `apps/api`)
- **Validation:** Zod for runtime schema validation (environment variables, HTTP request bodies, headers, and query params)
- **Database & ODM:** MongoDB with Mongoose via `@inithium/db` package (strict schema typing, connection pooling, lean queries by default)
- **Authentication:** JWT (JSON Web Tokens) with stateless bearer token authorization middleware in `@inithium/auth`
- **TypeScript:** Strict mode enabled (`noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`)

### Frontend Architecture (`apps/web` + `libs/ui`, `libs/state`)
- **UI Engine & Templating:** React (v18+), TypeScript (thin shell host in `apps/web`)
- **State & Data Fetching:** 
  - Redux Toolkit (RTK) for complex client-side state slices inside `@inithium/state`
  - RTK Query (`baseApi`) for unified server-side data fetching, caching, and tag-based cache invalidation
- **Design System & Styling:** Tailwind CSS v4, custom theme engine with CSS variable tokens via `@inithium/ui`
- **UI Primitives:** Headless, accessible primitives via Radix UI (`@radix-ui/*`) inside `@inithium/ui`

---

## 3. Directory Layout & Repository Boundaries

```text
inithium/
├── bin/                       # Executable Node CLI entrypoint (npx inithium)
├── src/                       # CLI engine logic (Commander, degit, file manipulators)
│   ├── commands/              # 'init' and 'add' command handlers
│   └── utils/                 # File manipulators, package.json mergers, git helpers
├── templates/
│   ├── core/                  # Clean Nx Monorepo Starter Template (@inithium/source)
│   │   ├── apps/
│   │   │   ├── api/           # Thin Express orchestrator (server listener & route mounting)
│   │   │   └── web/           # Thin React orchestrator (app router & global providers)
│   │   ├── libs/              # Shared domain workspace packages
│   │   │   ├── db/            # Provider-agnostic contracts & default MongoDB driver
│   │   │   ├── ui/            # Tailwind theme, Radix primitives, and UI components
│   │   │   ├── auth/          # JWT helpers, hashing utilities, and auth middleware
│   │   │   └── api-client/    # RTK Query baseApi and endpoint slices
│   │   ├── package.json       # Scope configured as "@inithium/source"
│   │   ├── tsconfig.base.json # Defines "@inithium/*" path aliases pointing to libs/*
│   │   └── nx.json            # Nx workspace execution config
│   └── plugins/               # Ejectable feature blueprints
│       └── example/           # Modular extensions (contains code + manifest.json)
├── CLAUDE.md                  # System Blueprint & AI Operational Guide
├── package.json               # Root CLI package ("name": "@inithium/cli")
└── tsconfig.json              # Root TypeScript config for CLI engine
```

---

## 4. Contract Specifications & Extension Patterns

### Package Architecture & Configuration Standards (`libs/*`)
All shared packages created under `libs/` must follow these strict setup guidelines to prevent build warnings or type resolution failures:

1. **Package Manifest (`package.json`):** Must explicitly specify `"type": "module"` to align ESM exports across build outputs.
2. **Nx Project Configuration (`project.json`):** Must explicitly define both `build` and `type-check` targets:
```json
{
  "name": "package-name",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/package-name/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/package-name",
        "main": "libs/package-name/src/index.ts",
        "tsConfig": "libs/package-name/tsconfig.lib.json"
      }
    },
    "type-check": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc --noEmit -p libs/package-name/tsconfig.lib.json"
      }
    }
  }
}
```
3. **TypeScript Path Aliases (`tsconfig.base.json`):** Under `"moduleResolution": "bundler"`, all path alias target values must start explicitly with `./` (e.g., `"@inithium/db": ["./libs/db/src/index.ts"]`).

### Database Provider Abstraction Pattern
The `@inithium/db` package strictly decouples domain entities and repository contracts from concrete database drivers:
- **Contracts (`libs/db/src/contracts/`):** Pure TypeScript interfaces (`UserEntity`, `UserRepository`) defining domain data types and repository operations.
- **Providers (`libs/db/src/providers/`):** Driver-specific adapters (MongoDB/Mongoose default).
- **Service Injection:** Domain services consume generic repository interfaces, ensuring database providers (e.g., Postgres, Firebase) can be swapped or augmented via CLI plugins without refactoring API controllers or business logic.

### Plugin Architecture & `manifest.json` Contract
Every plugin inside `templates/plugins/[plugin-name]/` must include a `manifest.json` defining its injection targets into `libs/` or `apps/`:

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
      "target": "libs/db/src/schemas",
      "source": "db/schemas"
    },
    {
      "target": "libs/api-client/src/endpoints",
      "source": "web/endpoints"
    }
  ]
}
```

### Thin App Orchestrator Pattern (Backend Example)
`apps/api/src/main.ts` simply imports infrastructure from `@inithium/*` workspace packages and starts the server:

```typescript
import express from 'express';
import { connectDatabase } from '@inithium/db';
import { registerCoreRoutes } from '@inithium/api-core';

const app = express();
app.use(express.json());

await connectDatabase({ uri: process.env['MONGO_URI'] });
registerCoreRoutes(app);

app.listen(3000, () => console.log('API running on port 3000'));
```

### Frontend RTK Query Endpoint Injection Contract
- Core provides a single `baseApi` instance inside `libs/api-client/src/baseApi.ts`.
- Plugins and custom features **must never** instantiate secondary API slices. They must inject endpoints into `@inithium/api-client`:

```typescript
import { baseApi } from './baseApi';

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

---

## 5. Developer & AI Assistant Workflow Instructions

### Application Verification
Server restarts, builds, and browser testing are handled **manually by the developer**. AI agents must **not** attempt to run dev servers or execute browser automation steps.

Developer commands used after completing code changes:
```bash
# Run type checking across a specific package
npx nx run db:type-check

# Build a specific package or application
npx nx build db

# Build all apps and packages in the workspace
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