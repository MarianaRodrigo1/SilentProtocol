import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { palette } from '../../styles/theme';

export const TerminalCursor: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  const cursorAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [cursorAnim, visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.cursor,
        {
          opacity: cursorAnim,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  cursor: {
    width: 10,
    height: 20,
    backgroundColor: palette.matrixGreen,
    marginLeft: 2,
  },
});
