import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";

const DentalWorkspace = lazy(() => import("./App").then((module) => ({ default: module.App })));
import { GlobalToast } from "./components/GlobalToast";


type AppShellErrorBoundaryState = {
  hasError: boolean;
  detail: string;
};

function appShellErrorDetail(error: unknown): string {
  if (error instanceof Error && /chunk|import|loading/i.test(error.message)) {
    return "Файлы интерфейса не загрузились. Обычно помогает обновление страницы после восстановления сети.";
  }

  return "Интерфейс остановлен до перезагрузки, чтобы не показывать неполное рабочее место.";
}

function requestDenteStaleAppRefresh(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: "DENTE_CLEAR_SHELL_CACHE" });
  window.setTimeout(() => window.location.reload(), 50);
}

class AppShellErrorBoundary extends Component<{ children: ReactNode }, AppShellErrorBoundaryState> {
  state: AppShellErrorBoundaryState = { hasError: false, detail: "" };

  static getDerivedStateFromError(error: unknown): AppShellErrorBoundaryState {
    return { hasError: true, detail: appShellErrorDetail(error) };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("DENTE boot failed STACK:", error?.stack || error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="boot-state boot-state-error" role="alert" aria-live="assertive">
          <h1>DENTE</h1>
          <p>Не удалось открыть оболочку клиники.</p>
          <small>{this.state.detail}</small>
          <button type="button" onClick={requestDenteStaleAppRefresh}>
            Обновить оболочку
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

export function AppShell() {
  return (
    <AppShellErrorBoundary>
      <Suspense
        fallback={
          <main className="boot-state" aria-busy="true">
            <h1>DENTE</h1>
            <p>Загрузка CRM</p>
          </main>
        }
      >
        <DentalWorkspace />
      </Suspense>
      <GlobalToast />
    </AppShellErrorBoundary>
  );
}

