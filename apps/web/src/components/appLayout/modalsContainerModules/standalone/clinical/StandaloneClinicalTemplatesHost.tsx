/**
 * StandaloneClinicalTemplatesHost — Честный хост клинических протоколов приёма (Мандат 8b <= 120 строк).
 * Позволяет открыть канонический модал протоколов по глубокой ссылке (?protocols=1, #protocols).
 */

import React from "react";
import { ClinicalDiaryTemplatesModal } from "../../../../emr/templates/ClinicalDiaryTemplatesModal";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

export const StandaloneClinicalTemplatesHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const patientName = useLauncherPatientName(patientId);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)]"
			data-testid="clinical-templates-standalone-root"
		>
			<ClinicalDiaryTemplatesModal
				isOpen={true}
				onClose={onClose}
				patientFullName={patientName || "Иванов Иван Иванович"}
				doctorFullName="Д-р Воронов Алексей Владимирович"
				doctorSpecialty="Врач-стоматолог-терапевт"
				initialToothNumber={16}
			/>
		</div>
	);
};
