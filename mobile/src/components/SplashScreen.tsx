import * as SplashScreenNative from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { CRTScanlines, GlitchText } from './crt';
import { t } from '../i18n';
import { palette, typography } from '../styles/theme';
import { fireAndForget } from '../utils/async';

let logoSource: number | undefined;
try {
  logoSource = require('../../assets/logo.png');
} catch (_error: unknown) {
  logoSource = undefined;
}

if (typeof SplashScreenNative.preventAutoHideAsync === 'function') {
  fireAndForget(SplashScreenNative.preventAutoHideAsync());
}

const MIN_DISPLAY_MS = 2200;

interface SplashScreenProps {
  isReady: boolean;
  children: React.ReactNode;
}

export function SplashScreen({ isReady, children }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, logoScale]);

  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!isReady) return;

    const hideSplash = async () => {
      try {
        const elapsed = Date.now() - mountedAt.current;
        const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
        await new Promise((r) => setTimeout(r, remaining));
        if (typeof SplashScreenNative.hideAsync === 'function') {
          await SplashScreenNative.hideAsync();
        }
        Animated.timing(fadeOutAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      } catch (_error: unknown) {
        setShowSplash(false);
      }
    };

    void hideSplash();
  }, [isReady, fadeOutAnim]);

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View style={[styles.overlay, { opacity: fadeOutAnim }]}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <CRTScanlines />
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
            {logoSource != null ? (
              <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            ) : null}
            <GlitchText style={styles.title} glitchIntensity="high">
              {t.splash.title}
            </GlitchText>
            <Text style={styles.subtitle}>{t.splash.subtitle}</Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bgPrimary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xxl,
    color: palette.matrixGreen,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xs,
    color: palette.textMuted,
    letterSpacing: 2,
  },
});
