import { Component, type ErrorInfo, type ReactNode } from "react";

export type LazyWorkspaceView = "schedule" | "patients" | "documents" | "finance" | "communications" | "settings" | "visit" | "imaging" | "marketing";

type WorkspaceRouteErrorBoundaryProps = {
  children: ReactNode;
  label: string;
  panelClassName: string;
  panelId: string;
  view: LazyWorkspaceView;
};

type WorkspaceRouteErrorBoundaryState = {
  detail: string;
  hasError: boolean;
};

function workspaceRouteErrorDetail(error: unknown): string {
  if (error instanceof Error && /chunk|import|loading/i.test(error.message)) {
    return "Файлы раздела не загрузились. Обычно помогает обновление после восстановления сети.";
  }

  return "Раздел остановлен до перезагрузки, чтобы не показывать неполные данные.";
}

function requestDenteStaleWorkspaceRefresh(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: "DENTE_CLEAR_SHELL_CACHE" });
  window.setTimeout(() => window.location.reload(), 50);
}

export class WorkspaceRouteErrorBoundary extends Component<
  WorkspaceRouteErrorBoundaryProps,
  WorkspaceRouteErrorBoundaryState
> {
  state: WorkspaceRouteErrorBoundaryState = { detail: "", hasError: false };

  static getDerivedStateFromError(error: unknown): WorkspaceRouteErrorBoundaryState {
    return { detail: workspaceRouteErrorDetail(error), hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    console.error(`DENTE route failed: ${this.props.view}`, error, errorInfo.componentStack);
  }

  componentDidUpdate(previousProps: WorkspaceRouteErrorBoundaryProps) {
    if (previousProps.view !== this.props.view && this.state.hasError) {
      this.setState({ detail: "", hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className={`${this.props.panelClassName} workspace-route-error`} id={this.props.panelId} role="alert" aria-live="assertive">
          <div className="panel-heading">
            <h2>{this.props.label}</h2>
            <span className="status-pill status-needs_review">не открылось</span>
          </div>
          <p>Раздел временно не открылся. Уже введенные данные не менялись.</p>
          <small>{this.state.detail}</small>
          <button className="secondary-button" type="button" onClick={requestDenteStaleWorkspaceRefresh}>
            Обновить рабочее место
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
