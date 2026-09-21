import { Stethoscope } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { useThemeStore } from "./store/themeStore";

const DentalWorkspace = lazy(() =>
	import("./App").then((module) => ({ default: module.App })),
);

const DiagnosticDrawer = lazy(() =>
	import("./components/diagnostics/DiagnosticDrawer").then((module) => ({
		default: module.DiagnosticDrawer,
	})),
);

const CopilotGlobalHost = lazy(() =>
	import("./components/copilot/CopilotGlobalHost").then((module) => ({
		default: module.CopilotGlobalHost,
	})),
);

function ThemeController() {
	const themeMode = useThemeStore((state) => state.themeMode);
	const isAccessibilityMode = useThemeStore(
		(state) => state.isAccessibilityMode,
	);
	const a11yFontSize = useThemeStore((state) => state.a11yFontSize);

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const applyTheme = () => {
			applyThemeToRoot(
				document.documentElement,
				resolveTheme(themeMode, media.matches, {
					isAccessibilityMode,
					a11yFontSize,
				}),
			);
		};

		applyTheme();
		if (themeMode !== "auto") return undefined;

		media.addEventListener("change", applyTheme);
		return () => media.removeEventListener("change", applyTheme);
	}, [themeMode, isAccessibilityMode, a11yFontSize]);

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
			<Suspense fallback={null}>
				<DiagnosticDrawer showTriggerButton={false} />
				<CopilotGlobalHost />
			</Suspense>
		</BootErrorBoundary>
	);
}
