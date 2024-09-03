import type {
  EasingFunction,
  EasingFunctionFactory,
  ReduceMotion,
} from 'react-native-reanimated';
import type { HitSlop } from 'react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon';

import type {
  CommonZoomState,
  PinchGestureCallbacks,
  SizeVector,
  TapGestureCallbacks,
} from '../../commons/types';

export type TimingConfig = Partial<{
  duration: number;
  easing: EasingFunction | EasingFunctionFactory;
  reduceMotion: ReduceMotion;
}>;

export type ResizeConfig = {
  size: SizeVector<number>;
  aspectRatio: number;
  scale: number;
};

export type SnapbackZoomState<T> = {
  x: T;
  y: T;
  resizedWidth: T | undefined;
  resizedHeight: T | undefined;
} & CommonZoomState<T>;

export type SnapBackZoomProps = React.PropsWithChildren<
  Partial<{
    resizeConfig: ResizeConfig;
    gesturesEnabled: boolean;
    onGestureEnd: () => void;
    onUpdate: (e: SnapbackZoomState<number>) => void;
    hitSlop: HitSlop;
    timingConfig: TimingConfig;
  }>
> &
  PinchGestureCallbacks &
  TapGestureCallbacks;
