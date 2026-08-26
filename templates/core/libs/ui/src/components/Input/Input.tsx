import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { resolveColorClass } from '../../theme/resolveColorClass';
import { mergeClassNames } from '../../theme/mergeClassNames';
import { FieldShell } from '../FieldShell/FieldShell';
import type { ColorSpec } from '../../contracts/color.contract';
import type { FieldProps } from '../../tokens/field';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'color' | 'disabled' | 'required'>,
    FieldProps {
  readonly color?: ColorSpec;
}

const DEFAULT_BORDER_COLOR: ColorSpec = { color: 'surface', intensity: 300 };
const DEFAULT_RING_COLOR: ColorSpec = { color: 'primary', intensity: 500 };
const ERROR_COLOR: ColorSpec = { color: 'red', intensity: 500 };

// `color` drives both the border and the focus-visible ring (see resolveColorClass) at
// whatever intensity the caller supplies; `error` overrides both to a fixed red-500
// regardless of `color`, and an unset `color` falls back to a neutral surface border with
// a primary focus ring rather than leaving the control unstyled.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, disabled, error, helperText, color, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const helperTextId = helperText !== undefined ? `${inputId}-helper` : undefined;

    const borderColor = error ? ERROR_COLOR : (color ?? DEFAULT_BORDER_COLOR);
    const ringColor = error ? ERROR_COLOR : (color ?? DEFAULT_RING_COLOR);

    const classes = mergeClassNames(
      'w-full rounded-md border bg-transparent px-3 py-2 text-sm text-surface-foreground-900 transition-colors placeholder:text-surface-400',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      resolveColorClass('border', borderColor),
      `focus-visible:${resolveColorClass('ring', ringColor)}`,
      className,
    );

    return (
      <FieldShell
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        helperTextId={helperTextId}
        htmlFor={inputId}
      >
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={error || undefined}
          aria-describedby={helperTextId}
          className={classes}
          {...rest}
        />
      </FieldShell>
    );
  },
);

Input.displayName = 'Input';
