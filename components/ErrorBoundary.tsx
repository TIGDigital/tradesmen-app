import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null; componentStack: string | null };

/**
 * Top-level React error boundary.
 *
 * Catches render/commit-phase errors — the class of failure the
 * ErrorUtils-based crash trap (services/crash-trap.ts) provably cannot
 * see (the 19 Jul "Maximum update depth exceeded" AuthGate loop crashed
 * straight through it). Instead of the app dying to the home screen,
 * testers get a screenshot-able error screen.
 *
 * Deliberately styled inline with no theme imports so a broken theme
 * module can never take the boundary down with it.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Phase hit an error</Text>
          <Text style={styles.hint}>
            Please screenshot this screen and send it to Todd, then force-close
            and reopen the app.
          </Text>
          <Text style={styles.message}>
            {this.state.error.name}: {this.state.error.message}
          </Text>
          {this.state.componentStack ? (
            <Text style={styles.stack}>
              {this.state.componentStack.split('\n').slice(0, 14).join('\n')}
            </Text>
          ) : null}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingTop: 80 },
  title: { fontSize: 22, fontWeight: '700', color: '#A13A23', marginBottom: 8 },
  hint: { fontSize: 15, color: '#444444', marginBottom: 20, lineHeight: 21 },
  message: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 12 },
  stack: { fontSize: 11, color: '#666666', fontFamily: 'Courier', lineHeight: 16 },
});
