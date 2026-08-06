import { lazy, Suspense, useEffect } from "react";
import { BootErrorBoundary } from "./bootErrorBoundary";
import { GlobalToast } from "./components/GlobalToast";
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
			// Разрешение темы вынесено в lib/themeClasses.ts и покрыто тестами: здесь
			// жила ошибка, из-за которой в ночной теме не оставалось ни класса dark,
			// ни light, и варианты Tailwind `dark:` в ней не срабатывали.
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
						<h1>DENTE</h1>
						<p>Загрузка CRM</p>
					</main>
				}
			>
				<DentalWorkspace />
			</Suspense>
			<GlobalToast />
		</BootErrorBoundary>
	);
}
