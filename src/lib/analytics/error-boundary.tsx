import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';

import { captureException } from './sentry-client';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Top-level error boundary. Renders a kitchen-styled fallback and reports
 * the underlying error to Sentry. The raw error message is intentionally
 * NOT shown to the user — both because it would leak content and because
 * the friendly fallback is what we want production users to see.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo): void {
    try {
      captureException(error);
    } catch {
      // Reporter must never re-throw out of a boundary.
    }
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.title}>Something burned in the kitchen</Text>
        <Text style={styles.body}>
          We hit an unexpected error and the app stopped this screen. Your saved data is safe on
          this device. Try again — and if it keeps happening, restart the app.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset error and try again"
          onPress={this.reset}
          style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: KitchenDesign.spacing.lg,
    paddingVertical: KitchenDesign.spacing.xxl,
    backgroundColor: KitchenDesign.colors.cream,
    gap: KitchenDesign.spacing.md,
    justifyContent: 'center',
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: KitchenDesign.type.title,
    lineHeight: 36,
    fontWeight: '900',
  },
  body: {
    color: KitchenDesign.colors.muted,
    fontSize: KitchenDesign.type.body,
    lineHeight: 22,
  },
  button: {
    alignSelf: 'flex-start',
    minHeight: 50,
    borderRadius: KitchenDesign.radius.button,
    paddingHorizontal: KitchenDesign.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  buttonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 18,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
  },
});
