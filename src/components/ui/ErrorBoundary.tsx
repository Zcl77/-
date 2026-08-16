import { Component, ErrorInfo, ReactNode } from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught application error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback />;
  }
}

function ErrorFallback() {
  const { t } = useI18n();
  return (
    <main className="page-shell flex min-h-dvh items-center">
      <div className="page-inner w-full">
        <section className="mx-auto max-w-xl border-y border-studio-line py-10 text-center" role="alert">
          <CircleAlert className="mx-auto h-6 w-6 text-studio-warning" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl font-semibold text-studio-ink">
            {t('页面暂时无法继续显示')}
          </h1>
          <p className="mt-3 text-sm leading-7 text-studio-muted">
            {t('已保留当前服务状态。重新载入页面后可以再次尝试。')}
          </p>
          <button type="button" onClick={() => window.location.reload()} className="button-primary mt-6">
            <RotateCcw className="h-4 w-4" />
            {t('重新载入')}
          </button>
        </section>
      </div>
    </main>
  );
}
