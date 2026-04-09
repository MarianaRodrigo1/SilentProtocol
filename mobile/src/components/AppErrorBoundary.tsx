import { Component, type ReactNode } from 'react';
import { Button, Text, View } from 'react-native';
import { appErrorBoundaryStyles as styles } from '../styles/appChrome';
import { clearGameSession } from '../storage/gameSession';
import { runBestEffort } from '../utils/promiseUtils';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  restartKey: number;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, restartKey: 0 };

  static getDerivedStateFromError = (): Partial<AppErrorBoundaryState> => ({ hasError: true });

  handleRestart = async (): Promise<void> => {
    await runBestEffort(() => clearGameSession());
    this.setState((prev) => ({ hasError: false, restartKey: prev.restartKey + 1 }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.message}>Something went wrong.</Text>
          <Button title="Restart app" onPress={this.handleRestart} />
        </View>
      );
    }
    return (
      <View key={this.state.restartKey} style={styles.root}>
        {this.props.children}
      </View>
    );
  }
}
