/**
 * ReportsStandaloneLauncher — Автономный запуск аналитики и отчётов руководителя (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../AppBootState";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import { lazyWithRetry } from "../../../../lib/lazyWithRetry";

const AnalyticsDashboardView = lazyWithRetry(() =>
	import("../../../../pages/AnalyticsDashboardView").then((module) => ({
		default: module.AnalyticsDashboardView,
	})),
);

export function renderReportsStandaloneLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) return null;

	const search = window.location.search || "";
	const hash = window.location.hash || "";
	const isReportsRoute =
		search.includes("reports") ||
		hash.includes("reports") ||
		search.includes("analytics") ||
		hash.includes("analytics");

	if (!isReportsRoute) return null;

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
}
