export type EntranceAnim =
  | 'animate__fadeIn'
  | 'animate__fadeInDown'
  | 'animate__fadeInLeft'
  | 'animate__fadeInRight'
  | 'animate__fadeInUp'
  | 'animate__zoomIn'
  | 'animate__slideInDown'
  | 'animate__slideInUp'
  | 'animate__slideInLeft'
  | 'animate__slideInRight'
  | 'animate__bounceIn';

export type ExitAnim =
  | 'animate__fadeOut'
  | 'animate__fadeOutDown'
  | 'animate__fadeOutLeft'
  | 'animate__fadeOutRight'
  | 'animate__fadeOutUp'
  | 'animate__zoomOut'
  | 'animate__slideOutDown'
  | 'animate__slideOutUp'
  | 'animate__slideOutLeft'
  | 'animate__slideOutRight'
  | 'animate__bounceOut';

export type AnimDelay =
  | 'animate__delay-1s'
  | 'animate__delay-2s'
  | 'animate__delay-3s'
  | 'animate__delay-4s'
  | 'animate__delay-5s';

export type AnimSpeed = 'animate__slow' | 'animate__slower' | 'animate__fast' | 'animate__faster';

export type AnimationTrigger = 'entrance' | 'exit';

export interface AnimationSpec {
  readonly entrance?: EntranceAnim;
  readonly exit?: ExitAnim;
  readonly delay?: AnimDelay;
  readonly speed?: AnimSpeed;
  readonly repeat?: 'animate__infinite';
}
