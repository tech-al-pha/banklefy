import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error boundary caught an error:", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-2xl border border-primary/20 bg-surface-elevated/60 p-6 text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Something went wrong</p>
          <h1 className="text-2xl font-semibold text-foreground">We hit a snag</h1>
          <p className="text-sm text-muted-foreground">
            Please refresh the page. If the issue continues, try returning to the home screen.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-destructive/80 break-words">{this.state.error.message}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button
              variant="outline"
              className="border-primary/40"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
