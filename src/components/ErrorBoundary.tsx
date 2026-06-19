import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ImmersiveKit UI error boundary captured an error', {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-white">
        <section className="w-full max-w-xl rounded-3xl border border-red-500/30 bg-slate-900 p-8 text-center shadow-2xl shadow-red-950/30" role="alert" aria-labelledby="error-boundary-title">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
            <AlertTriangle size={28} aria-hidden="true" />
          </div>
          <h1 id="error-boundary-title" className="text-2xl font-bold text-white">ImmersiveKit AI hit a display error.</h1>
          <p className="mt-3 leading-7 text-slate-300">
            Your account and saved rooms are still protected. Reload the app to start a clean session, or contact support if this keeps happening.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition-colors hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Reload ImmersiveKit AI
          </button>
        </section>
      </main>
    );
  }
}
