import {
	Component,
	type ErrorInfo,
	lazy,
	type ReactNode,
	Suspense,
	useEffect,
} from "react";

const DentalWorkspace = lazy(() =>
	import("./App").then((module) => ({ default: module.App })),
);
const OnboardingPreviewPage = lazy(() =>
	import("./OnboardingPreview").then((m) => ({ default: m.OnboardingPreview })),
);
const PublicBookingWidgetPage = lazy(() =>
	import("./pages/PublicBookingWidget").then((m) => ({
		default: m.PublicBookingWidget,
	})),
);

import { GlobalToast } from "./components/GlobalToast";
import { useOfflineQueue } from "./hooks/useOfflineQueue";

function useHighContrastTheme() {
	useEffect(() => {
		const handleStorage = () => {
			const isHighContrast =
				localStorage.getItem("dente_high_contrast") === "true";
			if (isHighContrast) {
				document.documentElement.classList.add("theme-accessibility");
			} else {
				document.documentElement.classList.remove("theme-accessibility");
			}
		};
		// Initial check
		handleStorage();
		// Listen for changes from settings
		window.addEventListener("storage", handleStorage);
		window.addEventListener("dente:theme-change", handleStorage);
		return () => {
			window.removeEventListener("storage", handleStorage);
			window.removeEventListener("dente:theme-change", handleStorage);
		};
	}, []);
}

function OfflineQueueManager() {
	useOfflineQueue();
	return null;
}

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
	navigator.serviceWorker?.controller?.postMessage({
		type: "DENTE_CLEAR_SHELL_CACHE",
	});
	window.setTimeout(() => window.location.reload(), 50);
}

class AppShellErrorBoundary extends Component<
	{ children: ReactNode },
	AppShellErrorBoundaryState
> {
	state: AppShellErrorBoundaryState = { hasError: false, detail: "" };

	static getDerivedStateFromError(error: unknown): AppShellErrorBoundaryState {
		return { hasError: true, detail: appShellErrorDetail(error) };
	}

	componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
		if (!import.meta.env.PROD) {
			console.error("DENTE boot failed", error, errorInfo.componentStack);
		}
	}

	render() {
		if (this.state.hasError) {
			return (
				<main
					className="boot-state boot-state-error"
					role="alert"
					aria-live="assertive"
				>
					<h1>DENTE</h1>
					<p>Не удалось открыть рабочее место клиники.</p>
					<small>{this.state.detail}</small>
					<button type="button" onClick={requestDenteStaleAppRefresh}>
						Обновить рабочее место
					</button>
				</main>
			);
		}

		return this.props.children;
	}
}

export function AppShell() {
	useHighContrastTheme();

	// Dev-only preview route — no auth, no dashboard needed
	const isPreview =
		typeof window !== "undefined" &&
		window.location.hash === "#onboarding-preview";

	const isBookingWidget =
		typeof window !== "undefined" &&
		window.location.hash.startsWith("#booking-widget");

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
				{isBookingWidget ? (
					<PublicBookingWidgetPage />
				) : isPreview ? (
					<OnboardingPreviewPage />
				) : (
					<DentalWorkspace />
				)}
			</Suspense>
			<GlobalToast />
			<OfflineQueueManager />
		</AppShellErrorBoundary>
	);
}
