/**
 * ClinicalViewRouter — Маршрутизатор клинических представлений (приём, смена, снимки) (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { viewLabels } from "../../../workspaceShell";
import { AppLoadingState } from "../../../AppBootState";
import { WorkspaceRouteErrorBoundary } from "../../../workspaceRouteErrorBoundary";
import { ClinicalErrorBoundary } from "../../common/ClinicalErrorBoundary";
import { loadStoredTeethData } from "../../odontogram/odontogramStorage";
import type { AppViewRouterProps } from "../types";

const VisitView = lazyWithRetry(() =>
	import("../../../VisitView").then((m) => ({ default: m.VisitView })),
);
const ShiftView = lazyWithRetry(() =>
	import("../../../ShiftView").then((m) => ({ default: m.ShiftView })),
);
const PatientCockpit = lazyWithRetry(() =>
	import("../../../ShiftView").then((m) => ({ default: m.PatientCockpit })),
);
const ImagingView = lazyWithRetry(() =>
	import("../../../ImagingView").then((m) => ({ default: m.ImagingView })),
);
const TreatmentPlanModule = lazyWithRetry(() =>
	import("../../treatment-plans/TreatmentPlanModule").then((m) => ({
		default: m.TreatmentPlanModule,
	})),
);
const OrthodonticPerspectiveView = lazyWithRetry(() =>
	import("../../orthodontics/OrthodonticPerspectiveView").then((m) => ({
		default: m.OrthodonticPerspectiveView,
	})),
);

export function ClinicalViewRouter({
	currentView,
	dashboard,
	activeVisitPatient,
	activePatient,
	activePatientInsight,
	activeCommunicationTasks,
	activeImagingStudies,
	activeUsableDocuments,
	patientId,
	perspective,
	appLogicValue,
}: AppViewRouterProps) {
	if (currentView === "shift") {
		return (
			<>
				<WorkspaceRouteErrorBoundary view="shift" label={viewLabels.shift} panelClassName="panel shift-panel" panelId="shift">
					<Suspense fallback={<AppLoadingState message="Загрузка смены..." />}>
						<ShiftView />
					</Suspense>
				</WorkspaceRouteErrorBoundary>
				<WorkspaceRouteErrorBoundary view="shift" label="Карточка пациента" panelClassName="patient-cockpit" panelId="patient-cockpit">
					<Suspense fallback={<AppLoadingState message="Загрузка карточки пациента..." />}>
						<PatientCockpit
							activePatient={activeVisitPatient || activePatient}
							activePatientInsight={activePatientInsight}
							dashboard={dashboard}
							activeCommunicationTasks={activeCommunicationTasks}
							activeImagingStudies={activeImagingStudies}
							activeUsableDocuments={activeUsableDocuments}
						/>
					</Suspense>
				</WorkspaceRouteErrorBoundary>
			</>
		);
	}

	if (currentView === "imaging") {
		return (
			<WorkspaceRouteErrorBoundary view="imaging" label={viewLabels.imaging} panelClassName="panel imaging-panel" panelId="imaging">
				<Suspense fallback={<AppLoadingState message="Загрузка снимков пациента..." />}>
					<ImagingView {...(appLogicValue as any)} activePatient={activePatient} activeImagingStudies={activeImagingStudies} currentView={currentView} />
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	if (currentView === "visit") {
		return (
			<WorkspaceRouteErrorBoundary view="visit" label={viewLabels.visit} panelClassName="panel visit-panel" panelId="visit">
				<Suspense fallback={<AppLoadingState message="Загрузка клинического приёма..." />}>
					{perspective === "orthodontic" ? (
						<OrthodonticPerspectiveView />
					) : perspective === "presentation" ? (
						<TreatmentPlanModule
							patientId={patientId || "anonymous"}
							patientName={activePatient?.fullName || "Пациент"}
							teethData={(patientId && loadStoredTeethData(patientId)) || []}
						/>
					) : (
						<ClinicalErrorBoundary workspaceName="Приём пациента" workspaceKey="visit" visitId={dashboard?.activeVisit?.id}>
							<VisitView />
						</ClinicalErrorBoundary>
					)}
				</Suspense>
			</WorkspaceRouteErrorBoundary>
		);
	}

	return null;
}
