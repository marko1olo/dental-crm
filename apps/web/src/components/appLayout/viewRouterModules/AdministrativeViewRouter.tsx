/**
 * AdministrativeViewRouter — Маршрутизатор расписания, пациентов, кассы и документов (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { viewLabels } from "../../../workspaceShell";
import { AppLoadingState } from "../../../AppBootState";
import { WorkspaceRouteErrorBoundary } from "../../../workspaceRouteErrorBoundary";
import { ClinicalErrorBoundary } from "../../common/ClinicalErrorBoundary";
import type { AppViewRouterProps } from "../types";

const ScheduleView = lazyWithRetry(() =>
	import("../../../ScheduleView").then((m) => ({ default: m.ScheduleView })),
);
const PatientsView = lazyWithRetry(() =>
	import("../../../PatientsView").then((m) => ({ default: m.PatientsView })),
);
const DocumentsView = lazyWithRetry(() =>
	import("../../../DocumentsView").then((m) => ({ default: m.DocumentsView })),
);
const FinanceView = lazyWithRetry(() =>
	import("../../../FinanceView").then((m) => ({ default: m.FinanceView })),
);
const CommunicationsView = lazyWithRetry(() =>
	import("../../../CommunicationsView").then((m) => ({ default: m.CommunicationsView })),
);

export function AdministrativeViewRouter({ currentView, dashboard, appLogicValue }: AppViewRouterProps) {
	if (currentView === "schedule") {
		return (
			<WorkspaceRouteErrorBoundary view="schedule" label={viewLabels.schedule} panelClassName="panel schedule-panel" panelId="schedule">
				<Suspense fallback={<AppLoadingState message="Подготовка модулей расписания..." />}>
					<ClinicalErrorBoundary workspaceName="Расписание приёмов" workspaceKey="schedule">
						<ScheduleView
							dashboard={dashboard}
							patientName={appLogicValue?.patientName}
							loadDashboard={appLogicValue?.loadDashboard}
							lockScheduleAdminSession={() => appLogicValue?.lockTelegramAdminSession?.("schedule")}
							unlockScheduleAdminSession={() => appLogicValue?.unlockTelegramAdminSession?.("schedule")}
						/>
					</ClinicalErrorBoundary>
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "patients") {
		return (
			<WorkspaceRouteErrorBoundary view="patients" label={viewLabels.patients} panelClassName="panel patients-panel" panelId="patients">
				<ClinicalErrorBoundary workspaceName="Реестр пациентов" workspaceKey="patients">
					<Suspense fallback={<AppLoadingState message="Подготовка картотеки пациентов..." />}>
						<PatientsView />
					</Suspense>
				</ClinicalErrorBoundary>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "documents") {
		return (
			<WorkspaceRouteErrorBoundary view="documents" label={viewLabels.documents} panelClassName="panel documents-panel" panelId="documents">
				<Suspense fallback={<AppLoadingState message="Загрузка документов..." />}>
					<DocumentsView />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "finance") {
		return (
			<WorkspaceRouteErrorBoundary view="finance" label={viewLabels.finance} panelClassName="finance-panel border-0 bg-transparent p-0 shadow-none" panelId="finance">
				<Suspense fallback={<AppLoadingState message="Загрузка кассы и оплат..." />}>
					<FinanceView />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "communications") {
		return (
			<WorkspaceRouteErrorBoundary view="communications" label={viewLabels.communications} panelClassName="panel communications-panel" panelId="communications">
				<Suspense fallback={<AppLoadingState message="Загрузка обращений..." />}>
					<CommunicationsView />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	return null;
}
