/**
 * ReportsStandaloneLauncher — Автономный запуск аналитики и отчётов руководителя (Мандат 8b, <= 120 строк).
 */

import React, { Suspense, useEffect, useState } from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { lazyWithRetry } from "../../../../lib/lazyWithRetry";

const AnalyticsDashboardView = lazyWithRetry(() =>
	import("../../../../pages/analyticsDashboard/AnalyticsDashboardView").then((module) => ({
		default: module.AnalyticsDashboardView,
	})),
);

export const shouldOpenReports = (): boolean => {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("reports") ||
		h.includes("reports") ||
		s.includes("analytics=direct") ||
		s.includes("dashboard=direct") ||
		s.includes("analytics=1") ||
		h === "#analytics" ||
		h.startsWith("#analytics?") ||
		h.startsWith("#reports")
	);
};

export const DirectReportsLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(shouldOpenReports);

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);
		const handleHashChange = () => setIsOpen(shouldOpenReports());

		window.addEventListener("dente:open-analytics", handleOpen);
		window.addEventListener("dente-open-analytics", handleOpen);
		window.addEventListener("dente:open-reports", handleOpen);
		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);

		return () => {
			window.removeEventListener("dente:open-analytics", handleOpen);
			window.removeEventListener("dente-open-analytics", handleOpen);
			window.removeEventListener("dente:open-reports", handleOpen);
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<main
			id="standalone-analytics-root"
			className="w-full min-h-screen bg-[var(--canvas)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
			role="main"
			aria-label="Автономный пульт аналитики и отчётов"
		>
			<Suspense fallback={<AppLoadingState message="Загрузка аналитического пульта..." />}>
				<AnalyticsDashboardView />
			</Suspense>
		</main>
	);
};

export function renderReportsStandaloneLauncher(): React.ReactElement | null {
	if (!shouldOpenReports()) return null;
	return <DirectReportsLauncher />;
}
