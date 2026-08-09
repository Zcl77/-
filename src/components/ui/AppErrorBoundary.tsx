import { Component, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import StatusNotice from './StatusNotice';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(): void {
    // The visible fallback is the reporting boundary until remote telemetry is configured.
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-dvh items-center justify-center bg-studio-canvas p-5">
        <StatusNotice
          tone="error"
          title="页面遇到未预期错误"
          description={this.state.error.message || '请重新加载页面。如果问题持续，请记录出现问题前的操作。'}
          className="w-full max-w-xl"
          action={(
            <button type="button" className="button-secondary" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" />重新加载
            </button>
          )}
        />
      </main>
    );
  }
}
