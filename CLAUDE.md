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

## API Documentation & Testing Guidelines

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
│   ├── commands/              # 'init', 'add', and 'remove' command handlers
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

> Note: `.inithium/plugins.lock.json` is **not** part of this repo's tree. It is generated at runtime by `add`/`remove` inside a *consumer* workspace (the project scaffolded via `inithium init`) to track which plugins are installed there. See section 4 for its role in dependency resolution.

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
    },
    {
      "target": "libs/cms/src/modules/example-admin.module.tsx",
      "source": "cms/example-admin.module.tsx",
      "requires": "cms"
    }
  ]
}
```

**Extending the CMS:** `@inithium/cms` (the `cms` plugin) discovers admin modules by scanning `libs/cms/src/modules/*.module.tsx` at build time (via Vite's `import.meta.glob`) — any plugin that wants an admin module drops in one uniquely-named file default-exporting a `{ id, navLabel, icon, order?, Component }` descriptor. No shared file ever needs editing to add a module, so this extension point has none of the multi-plugin file-collision risk that applies to a shared file target — that's why the example above targets a single file (`example-admin.module.tsx`), not a directory, and gates on `"requires": "cms"` so it's skipped (not an error) in a workspace that never installed the CMS.

**Extending the CMS dashboard:** the same auto-discovery convention applies one level deeper, to the dashboard page's own widget slot system — `libs/cms/src/dashboard/widgets/*.widget.tsx`, default-exporting a `{ id, title?, order?, span?, Component }` descriptor (`DashboardWidget`). Any plugin that wants to surface something on the dashboard (a graph, a stat tile) drops in one uniquely-named `*.widget.tsx` file the same way an admin module does — no shared file edits, same `"requires": "cms"` gating. `span` (`1 | 2 | 3`, default `1`) is how many columns of the dashboard's responsive 3-column grid the widget occupies; the dashboard itself has zero knowledge of what any given widget renders.

### Plugin Dependency Resolution & the Install Lockfile
A plugin can declare two distinct kinds of dependency on another plugin, resolved by the CLI's `add`/`remove` commands against a generated `.inithium/plugins.lock.json` file inside the **consumer** workspace (never hand-edited by plugin authors, never part of this repo's own tree):

- **Hard dependency (`dependencies.plugins: string[]`):** The entire plugin requires another plugin to already be installed. `inithium add` aborts immediately, before touching any files, if a declared hard dependency is missing — it does not auto-install the dependency. `inithium remove` refuses to remove a plugin that other installed plugins hard-depend on unless `--force` is passed (which prints a warning about the now-broken dependents rather than repairing them).
- **Soft/per-injection dependency (`injections[].requires: string`):** A single injection block only copies if the named plugin is already installed. This is not an error if absent — it is the mechanism for a plugin to ship an always-on core feature alongside an optional module that only makes sense when another plugin (e.g. a CMS) is present. A deferred block is applied retroactively the moment its required plugin is later added, and reverted back to deferred if that required plugin is later removed — `remove` always sweeps and reverts dependents' gated blocks, regardless of `--force`, since this relationship never blocks removal.

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

## 5. Theming & Semantic Color Tokens

`@inithium/ui` ships a two-layer theme (`libs/ui/src/theme/theme.css`): a brand layer of `--ui-*` CSS custom properties, and a `@theme` block that registers each one into Tailwind v4's `--color-*` namespace. This makes every semantic token behave exactly like a built-in Tailwind color (`bg-primary-500`, `text-primary-foreground-500`, `border-surface-950/40`, ...). A consuming app rebrands the whole system by redefining the `--ui-*` variables — never by editing component code.

### The 11 semantic base colors
The palette's "base" is the 500-intensity, 100%-opacity shade of each token. There are 11:

- **5 raw brand colors** — `primary`, `secondary`, `accent`, `tertiary`, `quaternary`. These are direct branding colors meant to impart style, not to encode a priority order.
  - `primary` is the workhorse: buttons and other primary actions/CTAs.
  - `accent` is meant to be starkly contrasting and reserved for interaction affordances — hover states, highlights, focus rings — not general decoration.
  - `secondary`, `tertiary`, and `quaternary` are supplementary branding colors used minimally throughout the UI, at the developer's discretion. They are not a "2nd/3rd/4th most important action" hierarchy.
- **5 foreground colors** — `primary-foreground`, `secondary-foreground`, `accent-foreground`, `tertiary-foreground`, `quaternary-foreground`. Each is the immediate, opposite-contrast partner of its matching raw color, guaranteeing legible text/icons/borders on top of that raw color at the same intensity (e.g. `bg-primary-500` pairs with `text-primary-foreground-500`). Never pair a raw brand color with an arbitrary or mismatched foreground token.
- **1 surface color** — `surface`. This is the big differentiator from the other 10. `surface` has no branding intent and, unlike the 5 raw colors, is not paired with a dedicated foreground for contrast. Instead, `surface` leans on its own sliding intensity scale (`100` → `950`) to separate layers: a page background at `surface-100` next to a card at `surface-950` reads as a strong contrast; a navbar at `surface-200` sits just above the page; a sidebar at `surface-500` can be made to really pop. Pick surface contrast by moving along the surface scale, not by reaching for a brand color as a background fill.
  - *Technical exception:* `theme.css` and `color.contract.ts` also define a `surface-foreground` variant, used in exactly one place today (`Select.tsx`) where text sits directly on a surface fill. Treat this as a narrow escape hatch, not the standard pattern — default to surface-on-surface intensity contrast first.

### Intensity and opacity are parameters, not new colors
Components never hardcode a shade. They accept a `ColorSpec` (`libs/ui/src/contracts/color.contract.ts`):

```typescript
export interface ColorSpec {
  readonly color: string;        // a semantic token ('primary', 'surface', ...) or raw Tailwind color
  readonly intensity?: ColorIntensity; // 100 | 200 | ... | 950
  readonly opacity?: ColorOpacity;     // 10 | 20 | ... | 90
}
```

A component prop passes a `ColorSpec` — color, intensity, optional opacity — and `resolveColorClass` (`libs/ui/src/theme/resolveColorClass.ts`) resolves it into a real Tailwind class **per utility, per component**:

```typescript
resolveColorClass('bg', { color: 'primary', intensity: 500 });        // "bg-primary-500"
resolveColorClass('text', { color: 'primary-foreground', intensity: 500 }); // "text-primary-foreground-500"
resolveColorClass('border', { color: 'surface', intensity: 950, opacity: 40 }); // "border-surface-950/40"
```

This is why a component like `Button` takes separate `bgColor`, `textColor`, and `borderColor` `ColorSpec` props and resolves each independently — the same semantic token can (and often should) be dialed to a different intensity/opacity for each utility on the same element. Opacity is a modifier layered on top of a token (overlays, disabled states, subtle dividers) — it is never a substitute for choosing the right base token.

### Rules of thumb
- Never hardcode a hex value or reach for Tailwind's built-in palette (`bg-blue-500`, `text-red-600`, etc.) for anything that represents brand identity, a container background, or text-on-background contrast. Always resolve through a semantic token via `ColorSpec`/`resolveColorClass`.
- Use `primary` for primary actions; use `accent` sparingly and only for stark-contrast interaction states; use `secondary`/`tertiary`/`quaternary` minimally and discretionarily for brand texture.
- Pair a raw brand color with its matching `-foreground` token at the same intensity for anything drawn on top of it.
- For page/panel/container backgrounds, use `surface` and build contrast by moving along its intensity scale, not by mixing in a brand color as a fill.

---
## 6. API Documentation & Testing Guidelines

### Core API Route Modifications
When adding, modifying, or removing routes in the **Core API ONLY**:
- **Postman Collection Update Required:** You must update the Postman collection file located at:
  `templates/core/inithium_postman_import.json`[cite: 1]
- **Collection Standards:**
  - Place new endpoints inside their respective module folder within the `item` array[cite: 1].
  - Use variable placeholders (`{{baseUrl}}`, `{{accessToken}}`) for host, paths, and authorization headers[cite: 1].
  - Provide test scripts in the `event` array to validate response status codes where applicable[cite: 1].
---

---

## 7. Developer & AI Assistant Workflow Instructions

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