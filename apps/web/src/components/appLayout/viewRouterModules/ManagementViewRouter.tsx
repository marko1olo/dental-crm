/**
 * ManagementViewRouter — Аналитика, канбан обращений, лаборатория и воронка (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { viewLabels } from "../../../workspaceShell";
import { AppLoadingState } from "../../../AppBootState";
import { WorkspaceRouteErrorBoundary } from "../../../workspaceRouteErrorBoundary";
import { ClinicalErrorBoundary } from "../../common/ClinicalErrorBoundary";
import { BusinessOperationsViewRouter } from "./BusinessOperationsViewRouter";
import type { AppViewRouterProps } from "../types";

const AnalyticsDashboardView = lazyWithRetry(() =>
	import("../../../pages/AnalyticsDashboardView").then((m) => ({ default: m.AnalyticsDashboardView })),
);
const ManagerReportsPanel = lazyWithRetry(() =>
	import("../../reports/ManagerReportsPanel").then((m) => ({ default: m.ManagerReportsPanel })),
);
const LeadsKanbanView = lazyWithRetry(() =>
	import("../../leads/LeadsKanbanView").then((m) => ({ default: m.LeadsKanbanView })),
);
const LabOrdersPage = lazyWithRetry(() =>
	import("../../../pages/LabOrdersPage").then((m) => ({ default: m.LabOrdersPage })),
);
const TreatmentPipeline = lazyWithRetry(() =>
	import("../../../pages/coordinator/TreatmentPipeline").then((m) => ({ default: m.TreatmentPipeline })),
);

export function ManagementViewRouter(props: AppViewRouterProps) {
	const { currentView, dashboard } = props;

	if (currentView === "analytics") {
		const isPayout = typeof window !== "undefined" && window.location.hash.includes("payout");
		return (
			<WorkspaceRouteErrorBoundary view="analytics" label="Аналитика" panelClassName="panel analytics-panel" panelId="analytics">
				<Suspense fallback={<AppLoadingState message="Загрузка аналитики..." />}>
					{!isPayout && <AnalyticsDashboardView />}
				</Suspense>
				<Suspense fallback={null}>
					<ManagerReportsPanel clinicMode={dashboard?.clinicSettings?.profile?.mode ?? null} />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "leads") {
		return (
			<WorkspaceRouteErrorBoundary view="leads" label={viewLabels.leads} panelClassName="panel leads-panel" panelId="leads">
				<Suspense fallback={<AppLoadingState message="Загрузка обращений..." />}>
					<ClinicalErrorBoundary workspaceName="Канбан обращений" workspaceKey="leads">
						<LeadsKanbanView />
					</ClinicalErrorBoundary>
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "lab") {
		return (
			<WorkspaceRouteErrorBoundary view="lab" label={viewLabels.lab} panelClassName="panel lab-panel p-2 sm:p-3 overflow-hidden max-w-full" panelId="lab">
				<Suspense fallback={<AppLoadingState message="Загрузка лаборатории..." />}>
					<LabOrdersPage />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "pipeline") {
		return (
			<WorkspaceRouteErrorBoundary view="pipeline" label={viewLabels.pipeline} panelClassName="panel pipeline-panel p-2 sm:p-4 overflow-hidden max-w-full" panelId="pipeline">
				<Suspense fallback={<AppLoadingState message="Загрузка воронки планов лечения..." />}>
					<TreatmentPipeline />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	return <BusinessOperationsViewRouter {...props} />;
}
