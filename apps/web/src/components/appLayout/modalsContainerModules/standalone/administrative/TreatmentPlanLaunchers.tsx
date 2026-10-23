/**
 * TreatmentPlanLaunchers — Сравнение сценариев, сметы и планы лечения (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";

const PlanScenarioComparisonModal = lazyWithRetry(() =>
	import("../../../../treatment-plans/PlanScenarioComparisonModal").then((m) => ({ default: m.PlanScenarioComparisonModal })),
);
const LiveTreatmentPlanPresenterLauncher = lazyWithRetry(() =>
	import("../LiveTreatmentPlanPresenterLauncher").then((m) => ({ default: m.LiveTreatmentPlanPresenterLauncher })),
);
const TreatmentEstimator = lazyWithRetry(() =>
	import("../../../../odontogram/TreatmentEstimator").then((m) => ({ default: m.TreatmentEstimator })),
);
const TreatmentPlanModule = lazyWithRetry(() =>
	import("../../../../treatment-plans/TreatmentPlanModule").then((m) => ({ default: m.TreatmentPlanModule })),
);

export function renderTreatmentPlanLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isPlanScenariosDirectModalOpen, setIsPlanScenariosDirectModalOpen, isCasePresenterDirectModalOpen, setIsCasePresenterDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (isPlanScenariosDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка сравнения сценариев планов лечения..." />}>
				<PlanScenarioComparisonModal
					isOpen={true}
					patientName="Иванова Екатерина Сергеевна"
					doctorName="Д-р Воронов Алексей Владимирович"
					clinicName="DENTE Стоматология"
					isDemoMode={true}
					onClose={() => {
						setIsPlanScenariosDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("scenarios");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("scenarios") ? "" : u.hash));
					}}
				/>
			</Suspense>
		);
	}

	if (isCasePresenterDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка студии презентации плана лечения..." />}>
				<LiveTreatmentPlanPresenterLauncher
					isOpen={true}
					onClose={() => {
						setIsCasePresenterDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("presenter");
						u.searchParams.delete("patientId");
						u.searchParams.delete("planId");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("presenter") ? "" : u.hash));
					}}
				/>
			</Suspense>
		);
	}

	if (s.includes("estimator") || h.includes("estimator")) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка сметы плана лечения..." />}>
				<div className="w-screen h-screen p-3 md:p-6 bg-[var(--paper-soft,#f8fafc)] dark:bg-zinc-900 flex items-center justify-center">
					<div className="w-full max-w-5xl h-[88vh] shadow-2xl rounded-2xl overflow-hidden bg-[var(--paper,#ffffff)] dark:bg-zinc-950 border border-[var(--line,#e2e8f0)] dark:border-zinc-800">
						<TreatmentEstimator
							patientId="pat_mikhailov"
							currentTeeth={[
								{ toothNumber: 16, state: "Caries", clinicalData: {} },
								{ toothNumber: 36, state: "Pulpitis", clinicalData: {} },
								{ toothNumber: 46, state: "Crown", clinicalData: {} },
							]}
						/>
					</div>
				</div>
			</Suspense>
		);
	}

	if (s.includes("treatment-plans") || s.includes("treatment_plans") || h.includes("treatment-plans")) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка планов лечения..." />}>
				<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto" data-testid="treatment-plans-standalone-workspace">
					<TreatmentPlanModule patientId="pat-demo-01" patientName="Пациент" teethData={[]} />
				</div>
			</Suspense>
		);
	}

	return null;
}
