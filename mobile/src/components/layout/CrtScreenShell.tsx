import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { CRTScanlines } from '../crt';
import { shellStyles } from '../../styles/appChrome';

export interface CrtScreenShellProps {
  children: ReactNode;
  edges?: Edge[];
  safeAreaStyle?: StyleProp<ViewStyle>;
}

export function CrtScreenShell({ children, edges = ['top'], safeAreaStyle }: CrtScreenShellProps) {
  return (
    <View style={shellStyles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={[shellStyles.safeArea, safeAreaStyle]} edges={edges}>
        <CRTScanlines />
        {children}
      </SafeAreaView>
    </View>
  );
}
