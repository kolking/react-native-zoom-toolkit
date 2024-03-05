import React, { useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import {
  CropZoom,
  PanMode,
  ScaleMode,
  type CropZoomType,
  type CropGestureCallBack,
} from '../../../../src';
import {
  Canvas,
  Image,
  useImage,
  vec,
  ColorMatrix,
  Lerp,
  useCanvasRef,
  type Transforms2d,
} from '@shopify/react-native-skia';
import { StatusBar } from 'expo-status-bar';
import { useImageSize } from '../../../../src/hooks/useImageSize';
import CropModal from '../commons/CropModal';
import CropOverlay, { cropSize } from '../commons/CropOverlay';
import EffectIndicator from './EffectIndicator';

const useVector = (x: number, y?: number) => {
  const first = useSharedValue(x);
  const second = useSharedValue(y ?? x);
  return { x: first, y: second };
};

const indentity = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

const blackAndWhite = [
  0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
];

const IMAGE =
  'https://assets-global.website-files.com/63634f4a7b868a399577cf37/64665685a870fadf4bb171c2_labrador%20americano.jpg';

const SkiaCropZoom: React.FC = ({}) => {
  const { size: resolution } = useImageSize({ uri: IMAGE });
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const ref = useRef<CropZoomType>(null);
  const canvasRef = useCanvasRef();

  const image = useImage(IMAGE);
  const [cropImage, setCropImage] = useState<string | undefined>(undefined);

  const progress = useSharedValue(0);

  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const translate = useVector(0, 0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const posX = useDerivedValue(
    () => (screenWidth - width.value) / 2,
    [width, screenWidth]
  );
  const posY = useDerivedValue(
    () => (screenHeight - height.value) / 2,
    [height, screenHeight]
  );

  const transform = useDerivedValue<Transforms2d>(() => {
    return [
      { translateX: translate.x.value },
      { translateY: translate.y.value },
      { scale: scale.value },
      { rotate: rotation.value },
    ];
  }, [translate, rotation, scale]);

  const onGestureActive: CropGestureCallBack = (e) => {
    'worklet';
    width.value = e.width;
    height.value = e.height;
    translate.x.value = e.translateX;
    translate.y.value = e.translateY;
    scale.value = e.scale;
    rotation.value = e.rotate;
  };

  if (image === null || resolution === undefined) {
    return null;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Canvas style={StyleSheet.absoluteFill} ref={canvasRef}>
        <Image
          x={posX}
          y={posY}
          width={width}
          height={height}
          image={image}
          fit={'cover'}
          origin={vec(screenWidth / 2, screenHeight / 2)}
          transform={transform}
        >
          <Lerp t={progress}>
            <ColorMatrix matrix={indentity} />
            <ColorMatrix matrix={blackAndWhite} />
          </Lerp>
        </Image>
      </Canvas>

      <View style={StyleSheet.absoluteFill}>
        <CropOverlay />
      </View>

      <CropZoom
        ref={ref}
        debug={false}
        cropSize={{ width: cropSize, height: cropSize }}
        resolution={resolution}
        onGestureActive={onGestureActive}
        scaleMode={ScaleMode.BOUNCE}
        panMode={PanMode.FREE}
        maxScale={-1}
        panWithPinch={true}
      />

      <EffectIndicator
        progress={progress}
        image={image}
        canvasRef={canvasRef}
        cropRef={ref}
        setCrop={setCropImage}
      />

      {cropImage !== undefined ? (
        <CropModal uri={cropImage} setCrop={setCropImage} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  flex: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
});

export default SkiaCropZoom;
