import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { palette } from '../../styles/theme';

interface EncryptionProgressProps {
  progress: number;
  label?: string;
}

function generateFakeHash(progress: number): string {
  const chars = '0123456789ABCDEF';
  const length = Math.floor((progress / 100) * 32);
  let hash = '';
  const seed = Math.floor(progress * 31) % 16;
  for (let i = 0; i < length; i++) {
    hash += chars[(seed + i) % 16];
  }
  return hash || '...';
}

export const EncryptionProgress: React.FC<EncryptionProgressProps> = ({
  progress,
  label = 'ENCRYPTING DATA',
}) => {
  const glitchAnim = useRef(new Animated.Value(0)).current;
  const displayHash = useMemo(() => generateFakeHash(progress), [progress]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glitchAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(glitchAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [glitchAnim]);

  return (
    <View style={styles.progressContainer}>
      <Animated.Text
        style={[
          styles.progressLabel,
          {
            opacity: glitchAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.7],
            }),
          },
        ]}
      >
        [{label}]
      </Animated.Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]}>
          <Animated.View
            style={[
              styles.progressGlitch,
              {
                opacity: glitchAnim,
              },
            ]}
          />
        </View>
        <View style={styles.progressTicks}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={styles.progressTick} />
          ))}
        </View>
      </View>
      <View style={styles.progressStats}>
        <Animated.Text
          style={[
            styles.progressPercentage,
            {
              opacity: glitchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.8],
              }),
            },
          ]}
        >
          {progress.toFixed(1)}%
        </Animated.Text>
        <Animated.Text
          style={[
            styles.progressHash,
            {
              opacity: glitchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 0.9],
              }),
            },
          ]}
        >
          {displayHash}
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    width: '100%',
    paddingVertical: 16,
  },
  progressLabel: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: palette.matrixGreen,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: palette.bgCard,
    borderWidth: 1,
    borderColor: palette.borderPrimary,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: palette.matrixGreen,
    position: 'relative',
  },
  progressGlitch: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.textSecondary,
  },
  progressTicks: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  progressTick: {
    width: 1,
    height: '100%',
    backgroundColor: palette.bgPrimary,
    opacity: 0.3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressPercentage: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: palette.matrixGreen,
    fontWeight: 'bold',
  },
  progressHash: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: palette.textMuted,
    flex: 1,
    marginLeft: 12,
  },
});
