import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { crtMotion } from '../../styles/crt';

interface GlitchTextProps {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof Animated.Text>['style'];
  glitchIntensity?: 'low' | 'medium' | 'high';
}

const GlitchTextInner: React.FC<GlitchTextProps> = ({ children, style, glitchIntensity = 'low' }) => {
    const glitchAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const baseIntervalMs = crtMotion.glitchIntensityBaseMs[glitchIntensity];
      const {
        glitchIntervalJitterMs,
        glitchPulseMs,
        glitchOpacityMid,
        glitchTranslateMax,
      } = crtMotion;

      const glitchSequence = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glitchAnim, {
              toValue: Math.random() * (2 * glitchTranslateMax) - glitchTranslateMax,
              duration: glitchPulseMs,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: glitchOpacityMid,
              duration: glitchPulseMs,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(glitchAnim, {
              toValue: 0,
              duration: glitchPulseMs,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: glitchPulseMs,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      };

      const interval = setInterval(
        glitchSequence,
        baseIntervalMs + Math.random() * glitchIntervalJitterMs,
      );
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
};

export const GlitchText = React.memo(GlitchTextInner);
GlitchText.displayName = 'GlitchText';
