import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { crtMotion, crtScanlineStyles as styles } from '../../styles/crt';

const CRTScanlinesInner: React.FC = () => {
  const scanlineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanlineAnim, {
          toValue: 1,
          duration: crtMotion.scanlineSweepDurationMs,
          useNativeDriver: true,
        }),
        Animated.timing(scanlineAnim, {
          toValue: 0,
          duration: crtMotion.scanlineSweepResetMs,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scanlineAnim]);

  const { scanlineCount, movingScanlineTranslateMin, movingScanlineTranslateMax } = crtMotion;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.scanlinesContainer}>
        {Array.from({ length: scanlineCount }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.scanline,
              {
                top: `${(i / scanlineCount) * 100}%`,
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
                  outputRange: [movingScanlineTranslateMin, movingScanlineTranslateMax],
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
};

export const CRTScanlines = React.memo(CRTScanlinesInner);
CRTScanlines.displayName = 'CRTScanlines';
