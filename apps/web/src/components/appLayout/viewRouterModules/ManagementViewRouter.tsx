/**
 * ManagementViewRouter — Аналитика, канбан обращений, лаборатория и воронка (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { viewLabels } from "../../../workspaceShell";
import { AppLoadingState } from "../../../AppBootState";
import { WorkspaceRouteErrorBoundary } from "../../../workspaceRouteErrorBoundary";
import { useWorkspaceProfile } from "../../../hooks/useWorkspaceProfile";
import { hasCapability, resolveClinicMode } from "../../../lib/clinicCapabilities";
import { useAppStore } from "../../../store/appStore";
import { ClinicalErrorBoundary } from "../../common/ClinicalErrorBoundary";
import { BusinessOperationsViewRouter } from "./BusinessOperationsViewRouter";
import type { AppViewRouterProps } from "../types";

const AnalyticsDashboardView = lazyWithRetry(() =>
	import("../../../pages/analyticsDashboard/AnalyticsDashboardView").then((m) => ({ default: m.AnalyticsDashboardView })),
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
	const featureFlags = useWorkspaceProfile();
	const clinicMode = resolveClinicMode(dashboard?.clinicSettings?.profile?.mode);
	const allowMarketingAndLeads = hasCapability(clinicMode, "marketingSection") && featureFlags.hasLeadsKanban !== false;

	if (currentView === "analytics") {
		return (
			<WorkspaceRouteErrorBoundary view="analytics" label="Аналитика" panelClassName="panel analytics-panel" panelId="analytics">
				<Suspense fallback={<AppLoadingState message="Загрузка аналитики..." />}>
					<AnalyticsDashboardView />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "leads") {
		if (!allowMarketingAndLeads) {
			return (
				<div className="m-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 shadow-xs flex flex-col items-start gap-3 max-w-lg" role="alert">
					<h2 className="text-base font-semibold text-[var(--ink)]">Раздел недоступен в текущем режиме клиники</h2>
					<p className="text-sm text-[var(--ink-muted)]">Воронка обращений отключена для соло-практики: входящие обращения сразу оформляются в расписании.</p>
					<button
						type="button"
						onClick={() => useAppStore.getState().setCurrentView("schedule")}
						className="h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center shrink-0 cursor-pointer"
					>
						Перейти в расписание
					</button>
				</div>
			);
		}
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
