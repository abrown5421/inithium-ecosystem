# ui

Design token contract, color resolution engine, and primitive components for
`@inithium/*` applications. Built on Tailwind CSS v4.

## Semantic color tokens

Eight brand-customizable tokens, each a full `100`-`950` shade ramp:

```
primary                secondary                accent                surface

primary-foreground     secondary-foreground     accent-foreground     surface-foreground
```

Every `*-foreground` token is meant to be read against its non-foreground
counterpart at the same shade (e.g. `primary-foreground-700` on
`primary-700`).

Tokens live as CSS custom properties in [`src/theme/theme.css`](./src/theme/theme.css):

- `--ui-{token}-{shade}` is the brand surface. Override these (in a consuming
  app's `:root`, or under a `data-theme` selector) to apply a custom brand
  theme.
- `@theme { --color-{token}-{shade}: var(--ui-{token}-{shade}); }` registers
  each token into Tailwind's own color namespace, so semantic tokens behave
  exactly like Tailwind's built-in palette (including the `/opacity`
  modifier).

To wire it into an app, import this file *after* Tailwind itself:

```css
@import "tailwindcss";
@import "@inithium/ui/theme.css"; /* or a relative path to the file */
```

## `ColorSpec` and `resolveColorClass`

```ts
import { resolveColorClass, type ColorSpec } from '@inithium/ui';

const spec: ColorSpec = { color: 'emerald', intensity: 400 };
resolveColorClass('text', spec); // 'text-emerald-400'

resolveColorClass('bg', { color: 'amber', intensity: 700, opacity: 70 });
// 'bg-amber-700/70'

resolveColorClass('border', { color: 'secondary', intensity: 500 });
// 'border-secondary-500'

resolveColorClass('bg', { color: 'accent', intensity: 500, opacity: 40 });
// 'bg-accent-500/40'
```

`resolveColorClass` doesn't distinguish semantic tokens from Tailwind's
built-in palette colors — both resolve through the same
`{prefix}-{color}-{intensity}` template, because semantic tokens are
registered into Tailwind's own theme namespace.

### A note on Tailwind's scanner

Tailwind v4 only generates CSS for class names it finds *literally* in
scanned source — pointing `@source` at a directory doesn't help here, because
it still just does a text search for that directory's *files*. It can't see
through the template interpolation inside `resolveColorClass`, since the
class string (`text-red-500`) only comes into existence at runtime; the
source only ever contains the data (`{ color: 'red', intensity: 500 }`). The
fix for a runtime-built class name is `@source inline(...)`, which
force-generates a set of classes regardless of whether they appear literally
anywhere.

`theme.css` ships two such safelists:

- Every `{text,bg,border,ring}-{semantic token}-{shade}[/opacity]`
  combination, so the 14 semantic tokens always render.
- Every `{text,bg,border,ring}-{standard Tailwind color family}-{shade}[/opacity]`
  combination, so passing a raw palette color (`'emerald'`, `'amber'`, ...)
  through `ColorSpec.color` works out of the box too.

This trades CSS weight for "any Tailwind color, fully dynamic" actually
working — Tailwind can't tree-shake force-generated candidates, so the
library ships every listed color/shade/prefix combination whether or not an
app uses it. If that cost matters more than the flexibility, scope the
prefix list or color family list down in `theme.css`, or drop back to
restricting `color` to a curated set and writing those exact classes
literally somewhere Tailwind scans.

## Animation tokens

`AnimationSpec` and `resolveAnimationClasses` (in
[`src/tokens/animation.ts`](./src/tokens/animation.ts) and
[`src/utils/resolveAnimationClasses.ts`](./src/utils/resolveAnimationClasses.ts))
wrap [Animate.css](https://animate.style) the same way the color contract
wraps Tailwind: strict union types matching Animate.css's `animate__*` class
names, resolved to a class string by a pure function.

```ts
import { resolveAnimationClasses } from '@inithium/ui';

resolveAnimationClasses({ entrance: 'animate__zoomIn', speed: 'animate__faster' }, 'entrance');
// 'animate__animated animate__zoomIn animate__faster'

resolveAnimationClasses(undefined, 'entrance'); // undefined - no spec, no animation
resolveAnimationClasses({}, 'exit'); // 'animate__animated animate__fadeOut animate__fast'
```

`resolveAnimationClasses` takes the trigger (`'entrance' | 'exit'`) as an
explicit second argument rather than inferring it, since a primitive
component decides *when* it's entering vs. exiting (mount, a `visible` prop
flipping, etc.) — the resolver just turns whichever state is active into the
right classes, filling in `entrance`/`exit`/`speed` defaults when the spec
doesn't specify them.

Unlike the color system, Animate.css ships its own plain stylesheet — no
JIT scanner, no safelist. It only needs to be imported once, alongside
Tailwind:

```css
@import "tailwindcss";
@import "@inithium/ui/theme.css";
@import "animate.css/animate.min.css";
```

## Spacing

`SpacingProp` (in [`src/tokens/spacing.ts`](./src/tokens/spacing.ts)) is either
a raw number (shorthand for uniform spacing on all four sides) or a
`DirectionalSpacing` object, where `top`/`right`/`bottom`/`left` each override
`base` on that one side. `resolveMargin`/`resolvePadding` (in
[`src/utils/resolveSpacing.ts`](./src/utils/resolveSpacing.ts)) turn that into
Tailwind arbitrary-value classes:

```ts
import { resolveMargin } from '@inithium/ui';

resolveMargin(5); // 'm-[5px]'
resolveMargin({ base: 5 }); // 'm-[5px]'
resolveMargin({ top: 5 }); // 'mt-[5px]'
resolveMargin({ base: 5, top: 3 }); // 'mt-[3px] mr-[5px] mb-[5px] ml-[5px]'
```

Note the last case expands to four directional classes rather than mixing
`m-[5px]` with `mt-[3px]` — a shorthand and a directional class targeting the
same side are both valid Tailwind, but which one wins depends on generated
stylesheet order, not intent. Expanding to four explicit sides is what makes
the result safe to hand to `mergeClassNames`/`twMerge` afterward: a
`className="mt-[10px]"` override then only replaces the `mt` conflict group,
leaving `mr`/`mb`/`ml` alone.

### The safelist can't cover this one fully

Numbers are an unbounded domain — unlike the finite semantic-token and
Tailwind-palette sets above, there's no way to enumerate "every integer" in a
safelist. `theme.css` inlines every pixel value from `0` to `128` per
direction (`@source inline("{m,mt,mr,mb,ml,p,pt,pr,pb,pl}-[{0..128}px]");`),
which covers ordinary spacing but is a real ceiling, not a formality — a
`resolveMargin`/`resolvePadding` value outside `0`-`128` (or negative, which
is valid for margin) won't render without extending that range, either in
`theme.css` or with an app-level `@source inline(...)`.

## Flexbox

`FlexSpec` (in [`src/tokens/flex.ts`](./src/tokens/flex.ts)) is a single
structured prop — `direction`, `wrap`, `justify`, `align`, `alignContent`,
`gap`/`rowGap`/`columnGap`, and `inline` — for controlling how a container
lays out its children, the same "one spec object" shape as `ColorSpec` and
`AnimationSpec`. `resolveFlexClasses` (in
[`src/utils/resolveFlexClasses.ts`](./src/utils/resolveFlexClasses.ts)) turns
it into Tailwind utility classes:

```ts
import { resolveFlexClasses } from '@inithium/ui';

resolveFlexClasses({ direction: 'row', justify: 'between', align: 'center', gap: 12 });
// 'flex flex-row justify-between items-center gap-[12px]'

resolveFlexClasses(undefined); // undefined - no spec, no flex layout
```

A container only becomes `display: flex` (or `inline-flex`, via
`inline: true`) when a `flex` spec is actually passed — `Box`/`AnimateBox`
stay plain, non-flex containers otherwise. `gap`/`rowGap`/`columnGap` share
the same `0`-`128` safelist ceiling as margin/padding (see `theme.css`), for
the same reason: they're arbitrary-value classes built at runtime.

## Components

```tsx
import { Text, Box, AnimateBox } from '@inithium/ui';

<Text
  textColor={{ color: 'primary-foreground', intensity: 500 }}
  bgColor={{ color: 'primary', intensity: 500 }}
  borderColor={{ color: 'primary', intensity: 700 }}
  animation={{ entrance: 'animate__fadeInUp' }}
  padding={{ base: 16 }}
>
  Hello world
</Text>

<Box
  bgColor={{ color: 'surface', intensity: 500 }}
  flex={{ direction: 'row', justify: 'between', align: 'center', gap: 16 }}
  padding={{ base: 16 }}
>
  <Text>Left</Text>
  <Text>Right</Text>
</Box>

<AnimateBox
  bgColor={{ color: 'surface', intensity: 500 }}
  flex={{ direction: 'col', align: 'center', gap: 8 }}
  animation={{ entrance: 'animate__zoomIn', speed: 'animate__faster' }}
  margin={{ base: 8, top: 24 }}
>
  Hello world
</AnimateBox>
```

`Text`, `Box`, and `AnimateBox` all implement `SpacingProps` (`margin?:
SpacingProp`, `padding?: SpacingProp`) — new primitives should extend that
interface instead of redeclaring the two props.

`Box` and `AnimateBox` both implement `FlexProps`/accept a `flex?: FlexSpec`
prop for controlling child layout. `AnimateBoxProps` extends `BoxProps`
directly, and `AnimateBox` composes `Box` rather than reimplementing its
class resolution — it resolves only `animation`/`trigger` into a `className`
and hands everything else through, so `Box` stays the single place that
resolves color/flex/spacing classes.

`Text` and `AnimateBox` take the same `animation?: AnimationSpec` and
`trigger?: AnimationTrigger` props (`trigger` defaults to `'entrance'`).
`Box` has no animation props — reach for `AnimateBox` when a container needs
to animate in/out.

### Variants (hover:, dark:, responsive, ...) and the `className` escape hatch

`ColorSpec` intentionally has no `modifier` field. A structured modifier would
multiply the `@source inline(...)` safelist combinatorially (every variant
you support doubles or triples the candidate count), for something a
semantic-token prop rarely needs. Instead, every primitive accepts a plain
`className` prop for one-off variants — write the class literally and
Tailwind's scanner picks it up for free from your own source file, no
safelist required:

```tsx
<Text
  textColor={{ color: 'primary', intensity: 500 }}
  className="hover:text-emerald-500"
>
  Hello world
</Text>
```

Primitives merge `className` in with [`mergeClassNames`](./src/theme/mergeClassNames.ts)
(a thin wrapper over [`tailwind-merge`](https://github.com/dcastil/tailwind-merge)),
not plain string concatenation. Tailwind's cascade is decided by generated
stylesheet order, not by position in a `className` string, so a naive
`[...resolved, className].join(' ')` can't guarantee `className` wins when it
targets the same utility group as a resolved color (e.g. two competing
`text-*` colors). `mergeClassNames` resolves that correctly, keeping the last
conflicting class — so `className` reliably overrides the structured color
props when they collide. New primitives should use `mergeClassNames` rather
than reimplementing class joining.

## Building

Run `nx build ui` to build the library. Run `nx run ui:type-check` to type-check it.
