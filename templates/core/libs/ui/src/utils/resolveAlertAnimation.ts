import type { AnimationSpec, AnimSpeed } from '../tokens/animation';
import type { AlertPosition } from '../tokens/alert';

// Top positions drop into place and float back up on exit; bottom positions rise into place
// and sink back down - entrance/exit mirror the screen edge the alert visually belongs to.
const DEFAULT_ANIMATIONS: Record<AlertPosition, AnimationSpec> = {
  'top-right': { entrance: 'animate__fadeInDown', exit: 'animate__fadeOutUp' },
  'top-left': { entrance: 'animate__fadeInDown', exit: 'animate__fadeOutUp' },
  'bottom-right': { entrance: 'animate__fadeInUp', exit: 'animate__fadeOutDown' },
  'bottom-left': { entrance: 'animate__fadeInUp', exit: 'animate__fadeOutDown' },
};

// Alert is the one primitive in this package with a non-optional default animation - a toast
// that doesn't animate in/out reads as broken, unlike Text/Box/Icon/Button where animation is
// opt-in. `animation` (the public prop) still fully overrides this when supplied.
export const resolveAlertAnimation = (
  position: AlertPosition,
  animation: AnimationSpec | undefined,
): AnimationSpec => animation ?? DEFAULT_ANIMATIONS[position];

// animate.css's own duration per speed modifier class. resolveAnimationClasses defaults to
// 'animate__fast' when a spec has no explicit speed - AlertContainer needs that same duration
// in milliseconds to know how long to keep a closing alert mounted so its exit animation
// actually gets to play before the record is removed from the store.
const SPEED_MS: Record<AnimSpeed, number> = {
  animate__slower: 3000,
  animate__slow: 2000,
  animate__fast: 800,
  animate__faster: 500,
};
const DEFAULT_SPEED_MS = SPEED_MS.animate__fast;

export const resolveExitDurationMs = (animation: AnimationSpec): number =>
  animation.speed ? SPEED_MS[animation.speed] : DEFAULT_SPEED_MS;
