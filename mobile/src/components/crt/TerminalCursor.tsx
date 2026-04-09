import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { crtMotion, terminalCursorStyles as styles } from '../../styles/crt';

export const TerminalCursor: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  const cursorAnim = useRef(new Animated.Value(1)).current;
  const { terminalCursorBlinkHalfMs } = crtMotion;

  useEffect(() => {
    if (!visible) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, {
          toValue: 0,
          duration: terminalCursorBlinkHalfMs,
          useNativeDriver: true,
        }),
        Animated.timing(cursorAnim, {
          toValue: 1,
          duration: terminalCursorBlinkHalfMs,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [cursorAnim, visible, terminalCursorBlinkHalfMs]);

  if (!visible) return null;

  return <Animated.View style={[styles.cursor, { opacity: cursorAnim }]} />;
};
