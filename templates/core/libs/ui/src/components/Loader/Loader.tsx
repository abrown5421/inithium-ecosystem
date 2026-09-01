import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import type { ColorSpec } from '../../contracts/color.contract';
import type { SpacingProps } from '../../tokens/spacing';
import { mergeClassNames } from '../../theme/mergeClassNames';
import { resolveColorClass } from '../../theme/resolveColorClass';
import { resolveMargin, resolvePadding } from '../../utils/resolveSpacing';

export type LoaderVariant = 'spinner' | 'dots' | 'pulse';

export interface LoaderProps
  extends Omit<HTMLAttributes<HTMLElement>, 'color'>,
    SpacingProps {
  readonly as?: ElementType;
  readonly variant?: LoaderVariant;
  readonly color?: ColorSpec;
  readonly bgColor?: ColorSpec;
  readonly size?: number | string;
  readonly label?: string;
  readonly className?: string;
}

const DEFAULT_VARIANT: LoaderVariant = 'spinner';
const DEFAULT_COLOR: ColorSpec = { color: 'primary', intensity: 600 };
const DEFAULT_SIZE = '1.5rem';

const toCssSize = (val: number | string): string =>
  typeof val === 'number' ? `${val}px` : val;

const resolveVariantTemplate = (
  variant: LoaderVariant,
  color?: ColorSpec,
  bgColor?: ColorSpec,
): ReactNode => {
  const textColorClass = resolveColorClass('text', color);
  const bgColorClass = resolveColorClass('bg', color);
  const borderBgClass = resolveColorClass('border', bgColor) ?? 'border-transparent';

  const renderers: Record<LoaderVariant, () => ReactNode> = {
    spinner: () => (
      <svg
        className={mergeClassNames('animate-spin w-full h-full', textColorClass)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className={mergeClassNames('opacity-25', borderBgClass)}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    ),
    dots: () => (
      <span className="flex items-center justify-between w-full h-full px-[5%]">
        {[0, 160, 320].map((delay) => (
          <span
            key={delay}
            className={mergeClassNames(
              'w-1/3 h-1/3 rounded-full animate-bounce shrink-0 scale-110',
              bgColorClass,
            )}
            style={{
              animationDelay: `${delay}ms`,
              animationDuration: '0.8s',
            }}
          />
        ))}
      </span>
    ),
    pulse: () => (
      <span
        className={mergeClassNames(
          'block w-full h-full rounded-full animate-ping opacity-75',
          bgColorClass,
        )}
      />
    ),
  };

  return (renderers[variant] ?? renderers.spinner)();
};

export const Loader = ({
  as: Component = 'span',
  variant = DEFAULT_VARIANT,
  color = DEFAULT_COLOR,
  bgColor,
  size = DEFAULT_SIZE,
  label = 'Loading...',
  margin,
  padding,
  className,
  style,
  ...rest
}: LoaderProps) => {
  const cssSize = toCssSize(size);

  const containerClasses = mergeClassNames(
    'inline-flex items-center justify-center shrink-0 overflow-visible',
    resolveMargin(margin),
    resolvePadding(padding),
    className,
  );

  const containerStyle = {
    width: cssSize,
    height: cssSize,
    ...style,
  };

  return (
    <Component
      role="status"
      aria-label={label}
      className={containerClasses}
      style={containerStyle}
      {...rest}
    >
      {resolveVariantTemplate(variant, color, bgColor)}
      <span className="sr-only">{label}</span>
    </Component>
  );
};