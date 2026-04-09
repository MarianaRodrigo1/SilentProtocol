import { useCallback, useRef } from 'react';
import { Animated } from 'react-native';

export function useFadeInSequence(durationMs = 500) {
  const opacity = useRef(new Animated.Value(0)).current;

  const trigger = useCallback(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: true,
    }).start();
  }, [durationMs, opacity]);

  return { opacity, trigger };
}
