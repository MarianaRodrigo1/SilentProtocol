import { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { crtMotion, encryptionProgressStyles as styles } from '../../styles/crt';

interface EncryptionProgressProps {
  progress: number;
  label?: string;
}

function generateFakeHash(progress: number): string {
  const { hashChars, hashMaxLength, hashSeedModulo, hashProgressMultiplier } = crtMotion;
  const length = Math.floor((progress / 100) * hashMaxLength);
  let hash = '';
  const seed = Math.floor(progress * hashProgressMultiplier) % hashSeedModulo;
  const radix = hashChars.length;
  for (let i = 0; i < length; i += 1) {
    hash += hashChars[(seed + i) % radix]!;
  }
  return hash || '...';
}

export function EncryptionProgress({
  progress,
  label = 'ENCRYPTING DATA',
}: EncryptionProgressProps) {
  const glitchAnim = useRef(new Animated.Value(0)).current;
  const displayHash = useMemo(() => generateFakeHash(progress), [progress]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glitchAnim, {
          toValue: 1,
          duration: crtMotion.encryptionGlitchHalfCycleMs,
          useNativeDriver: true,
        }),
        Animated.timing(glitchAnim, {
          toValue: 0,
          duration: crtMotion.encryptionGlitchHalfCycleMs,
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
              outputRange: [crtMotion.labelOpacityMax, crtMotion.labelOpacityMin],
            }),
          },
        ]}
      >
        [{label}]
      </Animated.Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]}>
          <Animated.View style={[styles.progressGlitch, { opacity: glitchAnim }]} />
        </View>
        <View style={styles.progressTicks}>
          {Array.from({ length: crtMotion.progressTickCount }).map((_, i) => (
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
                outputRange: [crtMotion.percentageOpacityMax, crtMotion.percentageOpacityMin],
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
                outputRange: [crtMotion.hashOpacityMin, crtMotion.hashOpacityMax],
              }),
            },
          ]}
        >
          {displayHash}
        </Animated.Text>
      </View>
    </View>
  );
}
