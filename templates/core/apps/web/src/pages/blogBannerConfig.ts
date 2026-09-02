import { createSeededRandom, resolveComputedColorHex, resolveStringHash } from '@inithium/ui';
import type { BannerTrianglifyConfig } from '@inithium/ui';

// This app's own brand tokens, not arbitrary hex - keeps every generated mesh on-brand no matter
// which combination gets picked, and theme-override-aware since resolveComputedColorHex reads
// whatever these CSS variables currently resolve to (see theme/theme.css).
const BRAND_COLOR_TOKENS = ['primary', 'secondary', 'accent', 'tertiary', 'quaternary', 'surface'] as const;
const COLOR_INTENSITIES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const FALLBACK_HEX = '#94a3b8';

const pickBrandHex = (random: () => number): string => {
  const token = BRAND_COLOR_TOKENS[Math.floor(random() * BRAND_COLOR_TOKENS.length)];
  const intensity = COLOR_INTENSITIES[Math.floor(random() * COLOR_INTENSITIES.length)];
  return resolveComputedColorHex(`--color-${token}-${intensity}`) ?? FALLBACK_HEX;
};

const pickColorStops = (random: () => number): [string, ...string[]] => {
  const count = 2 + Math.floor(random() * 2); // 2 or 3 gradient stops
  const stops = Array.from({ length: count }, () => pickBrandHex(random));
  return stops as [string, ...string[]];
};

// A different Trianglify mesh per post that has no image - two posts without one should never
// look identical. Seeded from the post's own id (the same createSeededRandom/resolveStringHash
// pair Banner's own mesh generation uses internally) rather than plain Math.random(), so the
// same post renders the same mesh on every visit while distinct posts render visibly distinct
// ones - a page reload or a re-render from an unrelated state change never causes the banner to
// visibly change under the reader.
export const generateBlogBannerConfig = (seed: string): BannerTrianglifyConfig => {
  const random = createSeededRandom(resolveStringHash(seed));
  return {
    cellSize: 20 + Math.floor(random() * 61), // 20-80
    variance: 0.1 + random() * 0.9, // 0.1-1.0
    xColors: pickColorStops(random),
    yColors: pickColorStops(random),
  };
};
