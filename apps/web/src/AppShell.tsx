import { lazy, Suspense, useEffect } from "react";
import { Stethoscope } from "lucide-react";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { DiagnosticDrawer } from "./components/diagnostics/DiagnosticDrawer";
import { CopilotGlobalHost } from "./components/copilot/CopilotGlobalHost";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { useThemeStore } from "./store/themeStore";

const DentalWorkspace = lazy(() =>
	import("./App").then((module) => ({ default: module.App })),
);

function ThemeController() {
	const themeMode = useThemeStore((state) => state.themeMode);

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const applyTheme = () => {
			applyThemeToRoot(
				document.documentElement,
				resolveTheme(themeMode, media.matches),
			);
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
		<BootErrorBoundary audience="clinic">
			<ThemeController />
			<Suspense
				fallback={
					<main className="boot-state" aria-busy="true">
						<Stethoscope aria-hidden="true" className="boot-logo" />
						<h1 className="boot-title">DENTE</h1>
						<p className="boot-subtitle">Загрузка CRM</p>
					</main>
				}
			>
				<DentalWorkspace />
			</Suspense>
			<GlobalToast />
			<DiagnosticDrawer showTriggerButton={false} />
			<CopilotGlobalHost />
		</BootErrorBoundary>
	);
}
