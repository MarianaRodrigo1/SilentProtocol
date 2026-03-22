import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { palette } from '../../styles/theme';

export const CRTScanlines: React.FC = React.memo(() => {
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanlineAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(scanlineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scanlineAnim]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.scanlinesContainer}>
        {Array.from({ length: 50 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.scanline,
              {
                top: `${(i / 50) * 100}%`,
              },
            ]}
          />
        ))}
      </View>
      <Animated.View
        style={[
          styles.movingScanline,
          {
            transform: [
              {
                translateY: scanlineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 1000],
                }),
              },
            ],
          },
        ]}
      />
      <View style={styles.vignette} />
      <View style={styles.crtGlow} />
    </View>
  );
});

const styles = StyleSheet.create({
  scanlinesContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: palette.scanline,
  },
  movingScanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: palette.matrixGreenGlow,
    shadowColor: palette.matrixGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    borderWidth: 60,
    borderColor: 'rgba(0, 0, 0, 0.4)',
  },
  crtGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.crtGlow,
  },
});
