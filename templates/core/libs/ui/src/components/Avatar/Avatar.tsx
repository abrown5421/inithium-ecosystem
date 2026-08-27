import type { CSSProperties } from 'react';
import { mergeClassNames } from '../../theme/mergeClassNames';
import { resolveColorClass } from '../../theme/resolveColorClass';
import { resolveContrastColor } from '../../utils/resolveContrastColor';
import { resolveAvatarInitials } from '../../utils/resolveAvatarInitials';
import { resolveAvatarShapeClasses } from '../../utils/resolveAvatarShapeClasses';
import { resolveDicebearUrl } from '../../utils/resolveDicebearUrl';
import { DEFAULT_AVATAR_STYLE } from '../../tokens/avatar';
import type { AvatarSource, AvatarStyleConfig } from '../../tokens/avatar';

export interface AvatarProps {
  readonly source: AvatarSource;
  readonly styleConfig?: AvatarStyleConfig;
  // Pixel size of the square/circle box; the initials font and both dimensions scale with it,
  // so this comfortably ranges from small inline avatars up to a large ~200px profile avatar.
  readonly size?: number;
  readonly onClick?: () => void;
  readonly className?: string;
}

const DEFAULT_SIZE = 40;
const INITIALS_FONT_RATIO = 0.4;

// Fully prop-driven and stateless - the caller (a profile page reading a user's stored avatar
// config, a member list, a comment thread) decides everything: which source variant renders,
// the bg/font colors, the shape, the size. This component never fetches data and knows nothing
// about `@inithium/db`'s UserEntity - it only renders whatever AvatarSource/AvatarStyleConfig
// it's handed, matching the same decoupling every other libs/ui primitive keeps from
// persistence/domain concerns.
//
// `image` and `dicebear` are rendering-ready even though no picker/upload flow exists yet to
// produce them - AvatarSource is a discriminated union today so a future customization UI only
// has to start passing a different `source`, not wait on changes here.
export const Avatar = ({ source, styleConfig, size = DEFAULT_SIZE, onClick, className }: AvatarProps) => {
  const bgColor = styleConfig?.bgColor ?? DEFAULT_AVATAR_STYLE.bgColor;
  const shape = styleConfig?.shape ?? DEFAULT_AVATAR_STYLE.shape;
  // No explicit fontColor customization yet - resolveContrastColor keeps initials legible
  // against whatever bgColor was picked, the same fallback Switch/Checkbox/RadioGroup use for
  // their own indicator-on-fill contrast.
  const fontColor = styleConfig?.fontColor ?? resolveContrastColor(bgColor);

  const sharedClasses = mergeClassNames(
    'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
    resolveAvatarShapeClasses(shape),
  );

  const dimensionStyle: CSSProperties = { width: `${size}px`, height: `${size}px` };

  const content =
    source.variant === 'image' ? (
      <img src={source.url} alt={source.alt ?? ''} className="h-full w-full object-cover" />
    ) : source.variant === 'dicebear' ? (
      <img src={resolveDicebearUrl(source)} alt={source.alt ?? ''} className="h-full w-full object-cover" />
    ) : (
      <span
        className={mergeClassNames('font-medium leading-none', resolveColorClass('text', fontColor))}
        style={{ fontSize: `${size * INITIALS_FONT_RATIO}px` }}
      >
        {resolveAvatarInitials(source.name)}
      </span>
    );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={dimensionStyle}
        className={mergeClassNames(
          sharedClasses,
          'border-0 bg-transparent p-0 cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          resolveColorClass('bg', bgColor),
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div style={dimensionStyle} className={mergeClassNames(sharedClasses, resolveColorClass('bg', bgColor), className)}>
      {content}
    </div>
  );
};
