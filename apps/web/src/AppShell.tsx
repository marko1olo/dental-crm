import React, { Suspense, useEffect, useState } from "react";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { GlobalToast } from "./components/GlobalToast";
import { Omnibar } from "./components/Omnibar";
import { CopilotGlobalHost } from "./components/copilot/CopilotGlobalHost";
import { DirectShiftLauncher } from "./components/shift/DirectShiftLauncher";
import { ThemeBackground } from "./components/theme";
import { applyThemeToRoot, resolveTheme } from "./lib/themeClasses";
import { useAppStore } from "./store/appStore";
import { useThemeStore } from "./store/themeStore";
import {
	extractHashRouteToken,
	isStandaloneActive,
	isStandalonePatientCardActive,
} from "./appModules/appRoutingHelpers";
import "./theme.css";

export { extractHashRouteToken, isStandaloneActive, isStandalonePatientCardActive };

const DentalWorkspace = lazyWithRetry(() =>
	import("./App").then((m) => ({ default: m.App })),
);

const DiagnosticDrawer = lazyWithRetry(() =>
	import("./components/diagnostics/DiagnosticDrawer").then((m) => ({
		default: m.DiagnosticDrawer,
	})),
);

function ThemeController() {
	const themeMode = useThemeStore((s) => s.themeMode);
	const isAccessibilityMode = useThemeStore((s) => s.isAccessibilityMode);
	const a11yFontSize = useThemeStore((s) => s.a11yFontSize);

	useEffect(() => {
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const syncTheme = () => {
			applyThemeToRoot(
				document.documentElement,
				resolveTheme(themeMode, media.matches, {
					isAccessibilityMode,
					a11yFontSize,
				}),
			);
		};
		syncTheme();
		if (themeMode !== "auto") return undefined;
		media.addEventListener("change", syncTheme);
		return () => media.removeEventListener("change", syncTheme);
	}, [themeMode, isAccessibilityMode, a11yFontSize]);

	return null;
}

function GlobalKeyboardShortcuts() {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key === "k" || e.key === "K" || e.key === "л" || e.key === "Л" || e.code === "KeyK")
			) {
				e.preventDefault();
				useAppStore.getState().setOmnibarOpen(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);
	return null;
}

export function AppShell() {
	const [isBootstrapped, setIsBootstrapped] = useState(false);

	useEffect(() => {
		setIsBootstrapped(true);
	}, []);

	if (!isBootstrapped) {
		return null;
	}

	return (
		<>
			<ThemeController />
			<ThemeBackground />
			<GlobalKeyboardShortcuts />
			<Suspense
				fallback={
					<div className="min-h-screen bg-[var(--paper)] text-[var(--ink-muted)] flex items-center justify-center text-sm font-medium">
						Загрузка рабочего места…
					</div>
				}
			>
				<DentalWorkspace />
			</Suspense>
			<DirectShiftLauncher />
			<GlobalToast />
			<CopilotGlobalHost />
			<Omnibar />
			<Suspense fallback={null}>
				<DiagnosticDrawer />
			</Suspense>
		</>
	);
}
