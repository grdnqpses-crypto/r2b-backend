import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** If true, show a retry button instead of just the error message */
  retryable?: boolean;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary that catches render crashes and shows a fallback UI
 * instead of killing the entire app. Wrap any crash-prone section with this.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn("[ErrorBoundary] Caught crash:", error.message);
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          {this.props.retryable && (
            <Pressable
              onPress={this.handleRetry}
              style={({ pressed }) => [
                styles.retryBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary that silently hides crashed children.
 * Use for non-critical UI elements like particles, decorations, etc.
 */
export class SilentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[SilentErrorBoundary] Suppressed crash:", error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#1a1a2e",
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 8 },
  message: {
    fontSize: 14,
    color: "#9BA1A6",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: "#0a7ea4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});
