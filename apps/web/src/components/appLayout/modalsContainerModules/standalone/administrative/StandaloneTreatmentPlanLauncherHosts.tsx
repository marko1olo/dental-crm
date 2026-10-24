/**
 * StandaloneTreatmentPlanLauncherHosts — честные хосты планов лечения по deep-link (Мандат 8b).
 *
 * Пациент берётся ТОЛЬКО из ?patientId= и базы: имя — GET /api/patients/:id,
 * зубная формула — тот же локальный кэш одонтограммы, что и в живом холсте
 * (loadStoredTeethData). Без patientId — гид, никаких демо-подстановок.
 */

import type React from "react";
import { useMemo } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode";
import { useAppStore } from "../../../../../store/appStore";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import StandaloneTreatmentPlanWorkspaceShell from "../StandaloneTreatmentPlanWorkspaceShell";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";
import { loadStoredTeethData } from "../../../../odontogram/odontogramStorage";

const PlanScenarioComparisonModal = lazyWithRetry(() =>
	import("../../../../treatment-plans/PlanScenarioComparisonModal").then((m) => ({ default: m.PlanScenarioComparisonModal })),
);
const TreatmentEstimator = lazyWithRetry(() =>
	import("../../../../odontogram/TreatmentEstimator").then((m) => ({ default: m.TreatmentEstimator })),
);
const TreatmentPlanModule = lazyWithRetry(() =>
	import("../../../../treatment-plans/TreatmentPlanModule").then((m) => ({ default: m.TreatmentPlanModule })),
);

function MissingPatientGuard({ testId, onClose }: { testId: string; onClose: () => void }): React.ReactElement {
	return (
		<StandaloneDeepLinkMissingState
			title="Пациент не указан"
			message="Планы лечения и сметы составляются по конкретному пациенту. Откройте их из одонтограммы или добавьте ?patientId= в ссылку."
			testId={testId}
			onClose={onClose}
		/>
	);
}

export const StandaloneScenarioComparisonHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	const profile = useAppStore((s) => s.clinicProfileDraft);

	if (!patientId) return <MissingPatientGuard testId="standalone-scenarios-missing-state" onClose={onClose} />;
	if (patientName === null) return <AppLoadingState message="Загрузка карточки пациента..." />;

	return (
		<PlanScenarioComparisonModal
			isOpen={true}
			patientName={patientName}
			clinicName={profile?.legalName || profile?.clinicName || ""}
			isDemoMode={isDemoShowcaseMode()}
			onClose={onClose}
		/>
	);
};

export const StandaloneTreatmentEstimatorHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	if (!patientId) return <MissingPatientGuard testId="standalone-estimator-missing-state" onClose={onClose} />;
	return (
		<StandaloneTreatmentPlanWorkspaceShell title="Смета лечения" onClose={onClose}>
			<div className="w-full h-full p-3 md:p-6 bg-[var(--paper-soft)] flex items-center justify-center">
				<div className="w-full max-w-5xl h-[88vh] shadow-2xl rounded-2xl overflow-hidden bg-[var(--paper)] border border-[var(--line)]">
					<TreatmentEstimator patientId={patientId} currentTeeth={loadStoredTeethData(patientId) ?? []} />
				</div>
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};

export const StandaloneTreatmentPlansWorkspaceHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	const teeth = useMemo(() => (patientId ? loadStoredTeethData(patientId) ?? [] : []), [patientId]);

	if (!patientId) return <MissingPatientGuard testId="standalone-treatment-plans-missing-state" onClose={onClose} />;
	if (patientName === null) return <AppLoadingState message="Загрузка карточки пациента..." />;

	return (
		<StandaloneTreatmentPlanWorkspaceShell title="Планы лечения" onClose={onClose}>
			<div className="w-full p-3 sm:p-6 overflow-y-auto" data-testid="treatment-plans-standalone-workspace">
				<TreatmentPlanModule patientId={patientId} patientName={patientName} teethData={teeth} />
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};
