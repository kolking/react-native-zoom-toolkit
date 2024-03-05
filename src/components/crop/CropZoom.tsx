import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useVector } from '../../commons/hooks/useVector';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSizeVector } from '../../commons/hooks/useSizeVector';
import { getRotatedSize } from '../../commons/utils/getRotatedSize';
import { usePanCommons } from '../../commons/hooks/usePanCommons';
import { usePinchCommons } from '../../commons/hooks/usePinchCommons';
import { getMaxScale } from '../../commons/utils/getMaxScale';
import { canvasToSize } from './utils';
import { PanMode, type BoundsFuction, ScaleMode } from '../../commons/types';
import type { CropZoomType, CropZoomProps, CropContextResult } from './types';

const detectorColor = 'rgba(50, 168, 82, 0.5)';
const containerColor = 'rgba(255, 242, 105, 0.5)';

const CropZoom = forwardRef<CropZoomType, CropZoomProps>((props, ref) => {
  const {
    debug,
    cropSize,
    resolution,
    children,
    maxScale: userMaxScale = -1,
    scaleMode = ScaleMode.BOUNCE,
    panMode = PanMode.FREE,
    panWithPinch = true,
    onGestureActive,
  } = props;

  const translate = useVector(0, 0);
  const offset = useVector(0, 0);
  const origin = useVector(0, 0);

  const rotation = useSharedValue<number>(0);
  const rotate = useVector(0, 0);

  const delta = useVector(0, 0);
  const scale = useSharedValue<number>(1);
  const scaleOffset = useSharedValue<number>(1);

  const container = useSizeVector(1, 1);
  const detector = useSizeVector(1, 1);
  const sizeAngle = useSharedValue<number>(0);

  const detectorTranslate = useVector(0, 0);
  const detectorScale = useSharedValue<number>(1);

  const maxScale = useDerivedValue(() => {
    const { width, height } = container;
    const scaleValue = getMaxScale(
      { width: width.value, height: height.value },
      resolution
    );

    return userMaxScale < 0 ? scaleValue : userMaxScale;
  }, [container, userMaxScale]);

  useDerivedValue(() => {
    const size = getRotatedSize({
      size: cropSize,
      aspectRatio: resolution.width / resolution.height,
      angle: sizeAngle.value,
    });

    const isFlipped = rotation.value % Math.PI !== 0;
    const render1 = container.width.value === 1 && container.height.value === 1;

    container.width.value = render1 ? size.width : withTiming(size.width);
    container.height.value = render1 ? size.height : withTiming(size.height);

    detector.width.value = isFlipped ? size.height : size.width;
    detector.height.value = isFlipped ? size.width : size.height;
  }, [cropSize, resolution, sizeAngle, rotation]);

  useDerivedValue(() => {
    onGestureActive?.({
      width: container.width.value,
      height: container.height.value,
      translateX: translate.x.value,
      translateY: translate.y.value,
      scale: scale.value,
      rotate: rotation.value,
      rotateX: rotate.x.value,
      rotateY: rotate.y.value,
    });
  }, [container, translate, scale, rotate, rotation]);

  const boundsFn: BoundsFuction = (scaleValue: number) => {
    'worklet';
    let size = { width: container.width.value, height: container.height.value };

    const isInInverseAspectRatio = rotation.value % Math.PI !== 0;
    if (isInInverseAspectRatio) {
      size = { width: size.height, height: size.width };
    }

    const boundX = Math.max(0, size.width * scaleValue - cropSize.width) / 2;
    const boundY = Math.max(0, size.height * scaleValue - cropSize.height) / 2;
    return { x: boundX, y: boundY };
  };

  const { onPinchStart, onPinchUpdate, onPinchEnd } = usePinchCommons({
    detector,
    detectorTranslate,
    detectorScale,
    translate,
    offset,
    origin,
    scale,
    scaleOffset,
    maxScale,
    delta,
    panWithPinch,
    scaleMode,
    boundFn: boundsFn,
  });

  const { onPanStart, onChange, onPanEnd } = usePanCommons({
    translate,
    offset,
    scale,
    detectorTranslate,
    detectorScale,
    panMode,
    boundFn: boundsFn,
  });

  const pinch = Gesture.Pinch()
    .onStart(onPinchStart)
    .onUpdate(onPinchUpdate)
    .onEnd(onPinchEnd);

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onStart(onPanStart)
    .onChange(onChange)
    .onEnd(onPanEnd);

  const detectorStyle = useAnimatedStyle(() => {
    return {
      width: detector.width.value,
      height: detector.height.value,
      position: 'absolute',
      zIndex: 1,
      backgroundColor: debug ? detectorColor : undefined,
      transform: [
        { translateX: detectorTranslate.x.value },
        { translateY: detectorTranslate.y.value },
        { scale: detectorScale.value },
      ],
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      width: container.width.value,
      height: container.height.value,
      position: 'absolute',
      transform: [
        { translateX: translate.x.value },
        { translateY: translate.y.value },
        { scale: scale.value },
        { rotate: `${rotation.value}rad` },
        { rotateX: `${rotate.x.value}rad` },
        { rotateY: `${rotate.y.value}rad` },
      ],
    };
  });

  // Reference handling section
  const canAnimate = useSharedValue<boolean>(true);

  const resetDetectorTransformations = () => {
    'worklet';
    detectorTranslate.x.value = 0;
    detectorTranslate.y.value = 0;
    detectorScale.value = 1;
  };

  const handleRotate = (animate: boolean = true) => {
    if (!canAnimate.value) {
      return;
    }

    canAnimate.value = false;

    const toAngle = rotation.value + Math.PI / 2;
    sizeAngle.value = toAngle;
    if (animate) {
      translate.x.value = withTiming(0);
      translate.y.value = withTiming(0);
      scale.value = withTiming(1);
      resetDetectorTransformations();

      rotation.value = withTiming(toAngle, undefined, (_) => {
        canAnimate.value = true;
        if (rotation.value === Math.PI * 2) {
          rotation.value = 0;
        }
      });

      return;
    }

    translate.x.value = 0;
    translate.y.value = 0;
    scale.value = 1;
    resetDetectorTransformations();
  };

  const handleFlipHorizontal = (animate: boolean = true) => {
    if (animate) {
      const toAngle = rotate.y.value !== Math.PI ? Math.PI : 0;
      rotate.y.value = withTiming(toAngle);
      return;
    }

    rotate.y.value = rotate.y.value !== Math.PI ? 0 : Math.PI;
  };

  const handleFlipVertical = (animate: boolean = true) => {
    if (animate) {
      const toAngle = rotate.x.value !== Math.PI ? Math.PI : 0;
      rotate.x.value = withTiming(toAngle);
      return;
    }

    rotate.x.value = rotate.x.value !== Math.PI ? 0 : Math.PI;
  };

  const handleReset = (animate: boolean = true) => {
    if (animate) {
      translate.x.value = withTiming(0);
      translate.y.value = withTiming(0);
      rotation.value = withTiming(0);
      rotate.x.value = withTiming(0);
      rotate.y.value = withTiming(0);
      scale.value = withTiming(1);
      return;
    }

    translate.x.value = 0;
    translate.y.value = 0;
    rotation.value = 0;
    rotate.x.value = 0;
    rotate.y.value = 0;
    scale.value = 1;
  };

  const handleCrop = (fixedWidth?: number): CropContextResult => {
    const angle = rotation.value;
    const flipHorizontal = rotate.y.value === Math.PI;
    const flipVertical = rotate.x.value === Math.PI;

    return canvasToSize({
      cropSize: cropSize,
      resolution: resolution,
      canvas: { width: container.width.value, height: container.height.value },
      position: { x: translate.x.value, y: translate.y.value },
      scale: scale.value,
      context: { rotationAngle: angle, flipHorizontal, flipVertical },
      fixedWidth,
    });
  };

  useImperativeHandle(ref, () => ({
    rotate: handleRotate,
    flipHorizontal: handleFlipHorizontal,
    flipVertical: handleFlipVertical,
    reset: handleReset,
    crop: handleCrop,
  }));

  const root: ViewStyle = {
    minWidth: cropSize.width,
    minHeight: cropSize.height,
  };

  const cropStyle: ViewStyle = {
    width: cropSize.width,
    height: cropSize.height,
  };

  const reflectionSyle: ViewStyle = {
    backgroundColor: debug ? containerColor : undefined,
  };

  return (
    <View style={[root, styles.root]}>
      <View style={[cropStyle, styles.center]}>
        <Animated.View style={containerStyle}>{children}</Animated.View>
        <View style={[reflectionSyle, StyleSheet.absoluteFill]} />
        <GestureDetector gesture={Gesture.Race(pinch, pan)}>
          <Animated.View style={detectorStyle} />
        </GestureDetector>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CropZoom;
