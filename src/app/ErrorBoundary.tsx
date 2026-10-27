import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorFallbackProps {
  readonly error: Error;
  readonly onReload: () => void;
}

function ErrorFallback({ error, onReload }: ErrorFallbackProps) {
  const { t } = useTranslation();

  return (
    <div className="error-panel" role="alert">
      <h2>{t('error.title')}</h2>
      <p className="muted">{t('error.description')}</p>
      <details>
        <summary className="text-sm">{t('error.details')}</summary>
        <pre className="mono text-xs">{error.stack ?? error.message}</pre>
      </details>
      <button type="button" className="btn btn--primary" onClick={onReload}>
        {t('error.reload')}
      </button>
    </div>
  );
}

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Console only: this application never sends anything anywhere.
    console.error('OpenRotor Lab UI error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onReload={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
