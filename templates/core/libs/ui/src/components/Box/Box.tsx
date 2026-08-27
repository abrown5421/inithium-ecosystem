import type { CSSProperties, ElementType, ReactNode } from 'react';
import { resolveColorClass } from '../../theme/resolveColorClass';
import { mergeClassNames } from '../../theme/mergeClassNames';
import { resolveFlexClasses } from '../../utils/resolveFlexClasses';
import { resolveMargin, resolvePadding } from '../../utils/resolveSpacing';
import type { ColorSpec } from '../../contracts/color.contract';
import type { FlexSpec } from '../../tokens/flex';
import type { SpacingProps } from '../../tokens/spacing';

export interface BoxProps extends SpacingProps {
  readonly as?: ElementType;
  readonly children?: ReactNode;
  readonly bgColor?: ColorSpec;
  readonly borderColor?: ColorSpec;
  readonly flex?: FlexSpec;
  readonly className?: string;
  // Escape hatch for continuous/runtime-computed values (a calc() expression, a CSS custom
  // property override, ...) that can't be expressed as a static Tailwind class — the same
  // inline-style approach Divider/Avatar/Dialog already use for their own arbitrary values.
  readonly style?: CSSProperties;
}

export const Box = ({
  as: Component = 'div',
  children,
  bgColor,
  borderColor,
  flex,
  margin,
  padding,
  className,
  style,
}: BoxProps) => {
  const classes = mergeClassNames(
    resolveColorClass('bg', bgColor),
    // border-color utilities are inert without a border-width utility alongside them.
    borderColor && 'border',
    resolveColorClass('border', borderColor),
    resolveFlexClasses(flex),
    resolveMargin(margin),
    resolvePadding(padding),
    className,
  );

  return (
    <Component className={classes} style={style}>
      {children}
    </Component>
  );
};
