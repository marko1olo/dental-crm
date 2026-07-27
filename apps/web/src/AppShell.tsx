import { Component, lazy, Suspense, type ErrorInfo, type ReactNode, useEffect } from "react";
import { GlobalToast } from "./components/GlobalToast";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { useThemeStore } from "./store/themeStore";

const DentalWorkspace = lazy(() => import("./App").then((module) => ({ default: module.App })));

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

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    if (!import.meta.env.PROD) {
      console.error("DENTE boot failed full stack", error, errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="boot-state boot-state-error" role="alert" aria-live="assertive">
          <h1>DENTE</h1>
          <p>Не удалось открыть рабочее место клиники.</p>
          <p>{this.state.detail}</p>
          <button type="button" onClick={requestDenteStaleAppRefresh}>
            Обновить рабочее место
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

function ThemeController() {
  const themeMode = useThemeStore((state) => state.themeMode);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      // Разрешение темы вынесено в lib/themeClasses.ts и покрыто тестами: здесь
      // жила ошибка, из-за которой в ночной теме не оставалось ни класса dark,
      // ни light, и варианты Tailwind `dark:` в ней не срабатывали.
      applyThemeToRoot(document.documentElement, resolveTheme(themeMode, media.matches));
    };

    applyTheme();
    if (themeMode !== "auto") return undefined;

    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  return null;
}

export function AppShell() {
  return (
    <AppShellErrorBoundary>
      <ThemeController />
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
