import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { mergeClassNames } from '../../theme/mergeClassNames';
import { resolveFieldColorClasses } from '../../utils/resolveFieldColorClasses';
import { FieldShell } from '../FieldShell/FieldShell';
import type { ColorSpec } from '../../contracts/color.contract';
import type { FieldProps } from '../../tokens/field';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'color' | 'disabled' | 'required'>,
    FieldProps {
  readonly color?: ColorSpec;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, disabled, error, helperText, color, className, id, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const helperTextId = helperText !== undefined ? `${inputId}-helper` : undefined;

    const { border, focusRing } = resolveFieldColorClasses(color, error);

    const classes = mergeClassNames(
      'w-full rounded-md border bg-transparent px-3 py-2 text-sm text-surface-900 transition-colors placeholder:text-surface-400',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      border,
      focusRing,
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
