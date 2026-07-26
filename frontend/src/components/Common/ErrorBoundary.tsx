import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Error handling for ErrorBoundary
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <AlertTriangle className="w-16 h-16 mb-4" style={{ color: 'var(--alert-red)' }} />
          <h2 className="text-xl font-semibold text-text-primary mb-2">An unexpected error occurred</h2>
          <p className="text-text-tertiary mb-6 text-center max-w-md">
            We were unable to load this page. Please try refreshing, or contact support if the issue persists.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 bg-[rgba(0,212,255,0.15)] text-white rounded-lg hover:bg-[rgba(0,212,255,0.08)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
