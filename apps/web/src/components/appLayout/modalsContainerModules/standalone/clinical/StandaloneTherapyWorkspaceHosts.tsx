/**
 * StandaloneTherapyWorkspaceHosts — честные хосты терапевтических рабочих пространств (Мандат 8b).
 *
 * Гигиена, пародонтология, анамнез и реколлы работают по реальному ?patientId=
 * из базы (GET /api/patients/:id). Вбитые «Смирнова/Ковалёв», demo-пациенты
 * и вымышленные кандидаты реколлов выжжены: реколл-хаб грузит кандидатов из API.
 */

import React, { useMemo, useState } from "react";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import StandaloneTreatmentPlanWorkspaceShell from "../StandaloneTreatmentPlanWorkspaceShell";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";
import { clearUrlTokens } from "../deepLinkUrl";
import { HygieneIndicesPanel } from "../../../../hygiene/HygieneIndicesPanel";
import { PeriodontogramChart } from "../../../../perio/PeriodontogramChart";
import { PerioChartModal } from "../../../../perio/PerioChartModal";
import { EmkPerioSection } from "../../../../visit/emk/EmkPerioSection";
import { PatientAnamnesisTab } from "../../../../patient/PatientAnamnesisTab";
import { PatientRecallsHubModal } from "../../../../recalls/PatientRecallsHubModal";

export function MissingPatientGuard({ testId, onClose, message }: { testId: string; onClose: () => void; message: string }): React.ReactElement {
	return (
		<StandaloneDeepLinkMissingState
			title="Пациент не указан"
			message={message}
			testId={testId}
			onClose={onClose}
		/>
	);
}

const GUARD_MESSAGE =
	"Этот раздел работает по конкретному пациенту. Откройте его из карточки пациента или добавьте ?patientId= в ссылку.";

export const StandaloneHygieneHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	if (!patientId) return <MissingPatientGuard testId="standalone-hygiene-missing-state" onClose={onClose} message={GUARD_MESSAGE} />;
	if (patientName === null) return null;
	return (
		<StandaloneTreatmentPlanWorkspaceShell title="Индексы гигиены" onClose={onClose}>
			<div className="w-full p-3 sm:p-6 overflow-y-auto" data-testid="hygiene-standalone-workspace">
				<HygieneIndicesPanel patientId={patientId} patientName={patientName} />
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};

function PerioWorkspace({ patientId, patientName }: { patientId: string; patientName: string }) {
	const [diaryForm, setDiaryForm] = React.useState<Record<string, string>>({
		objectiveStatus: "",
		diagnosis: "",
		treatmentPlan: "",
	});
	return (
		<div className="w-full max-w-7xl mx-auto space-y-4">
			<EmkPerioSection
				visitNoteForm={diaryForm as any}
				updateVisitNoteField={(f, v) => setDiaryForm((p) => ({ ...p, [f]: v }))}
				patientId={patientId}
				patientName={patientName}
				activeTooth={16}
			/>
			<PeriodontogramChart patientId={patientId} patientName={patientName} />
		</div>
	);
}

export const StandalonePerioHost: React.FC<{ onClose: () => void; mode: string | null }> = ({ onClose, mode }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	if (!patientId) return <MissingPatientGuard testId="standalone-perio-missing-state" onClose={onClose} message={GUARD_MESSAGE} />;
	if (patientName === null) return null;
	if (mode === "modal") {
		return <PerioChartModal isOpen={true} onClose={onClose} patientId={patientId} patientName={patientName} />;
	}
	return (
		<StandaloneTreatmentPlanWorkspaceShell title="Пародонтограмма" onClose={onClose}>
			<div className="w-full p-3 sm:p-6 overflow-y-auto" data-testid="perio-standalone-workspace">
				<PerioWorkspace patientId={patientId} patientName={patientName} />
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};

export const StandaloneAnamnesisHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	if (!patientId) return <MissingPatientGuard testId="standalone-anamnesis-missing-state" onClose={onClose} message={GUARD_MESSAGE} />;
	if (patientName === null) return null;
	return (
		<StandaloneTreatmentPlanWorkspaceShell title="Соматический статус" onClose={onClose}>
			<div className="w-full p-3 sm:p-6 overflow-y-auto" data-testid="anamnesis-standalone-workspace">
				<div className="max-w-4xl mx-auto">
					<PatientAnamnesisTab patientId={patientId} patientName={patientName} />
				</div>
			</div>
		</StandaloneTreatmentPlanWorkspaceShell>
	);
};

export const StandaloneRecallsHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto" data-testid="recalls-standalone-workspace">
			<PatientRecallsHubModal
				isOpen={true}
				onClose={() => {
					clearUrlTokens(["recalls"]);
					onClose();
				}}
			/>
		</div>
	);
};
