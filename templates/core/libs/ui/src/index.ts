export type {
  ColorIntensity,
  ColorOpacity,
  ColorSpec,
  ColorUtilityPrefix,
  SemanticColorToken,
} from './contracts/color.contract';
export {
  COLOR_INTENSITIES,
  COLOR_OPACITIES,
  COLOR_UTILITY_PREFIXES,
  SEMANTIC_COLOR_TOKENS,
  isSemanticColorToken,
} from './contracts/color.contract';

export type {
  EntranceAnim,
  ExitAnim,
  AnimDelay,
  AnimSpeed,
  AnimationTrigger,
  AnimationSpec,
} from './tokens/animation';

export type { SpacingValue, DirectionalSpacing, SpacingProp, SpacingProps } from './tokens/spacing';

export type {
  FlexDirection,
  FlexWrap,
  JustifyContent,
  AlignItems,
  AlignContent,
  FlexSpec,
  FlexProps,
} from './tokens/flex';
export {
  FLEX_DIRECTIONS,
  FLEX_WRAPS,
  JUSTIFY_CONTENTS,
  ALIGN_ITEMS,
  ALIGN_CONTENTS,
} from './tokens/flex';

export { resolveColorClass } from './theme/resolveColorClass';
export { mergeClassNames } from './theme/mergeClassNames';
export { resolveAnimationClasses } from './utils/resolveAnimationClasses';
export { resolveMargin, resolvePadding } from './utils/resolveSpacing';
export { resolveFlexClasses } from './utils/resolveFlexClasses';

export { Text, Box, AnimateBox } from './components';
export type { TextProps, BoxProps, AnimateBoxProps } from './components';
