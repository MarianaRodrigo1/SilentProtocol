import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface GlitchTextProps {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof Animated.Text>['style'];
  glitchIntensity?: 'low' | 'medium' | 'high';
}

export const GlitchText: React.FC<GlitchTextProps> = React.memo(
  ({ children, style, glitchIntensity = 'low' }) => {
    const glitchAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const intensity = {
        low: 5000,
        medium: 2000,
        high: 800,
      }[glitchIntensity];

      const glitchSequence = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glitchAnim, {
              toValue: Math.random() * 10 - 5,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.7,
              duration: 50,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(glitchAnim, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 50,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      };

      const interval = setInterval(glitchSequence, intensity + Math.random() * 2000);
      return () => clearInterval(interval);
    }, [glitchAnim, opacityAnim, glitchIntensity]);

    return (
      <Animated.Text
        style={[
          style,
          {
            transform: [{ translateX: glitchAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.Text>
    );
  },
);
