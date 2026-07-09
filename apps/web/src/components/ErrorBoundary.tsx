import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in ${this.props.moduleName || 'a component'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-container flex flex-col items-center justify-center p-8 m-4 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-4 text-red-500">
            <AlertTriangle className="w-8 h-8" />
            <h3 className="text-xl font-medium tracking-tight">Ошибка рендеринга</h3>
          </div>
          <p className="text-sm text-foreground/70 mb-6 text-center max-w-md">
            Не удалось загрузить раздел {this.props.moduleName ? `«${this.props.moduleName}»` : ''}.
            <br />
            {this.state.error?.message}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Повторить загрузку
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
