/**
 * StandaloneClinicalTemplatesHost — Честный хост клинических протоколов приёма (Мандат 8b <= 120 строк).
 * Позволяет открыть канонические протоколы (?protocols=1, #protocols) и генератор (?protocols=1&generator=1).
 */

import React from "react";
import { ClinicalDiaryTemplatesModal } from "../../../../emr/templates/ClinicalDiaryTemplatesModal";
import { EmrProtocolGeneratorModal } from "../../../../emr/protocolGenerator/EmrProtocolGeneratorModal";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

export const StandaloneClinicalTemplatesHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const patientName = useLauncherPatientName(patientId);
	const isGenerator = typeof window !== "undefined" && (window.location.search.includes("generator") || window.location.hash.includes("generator"));

	if (isGenerator) {
		return (
			<div
				className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)] flex items-center justify-center"
				data-testid="emr-protocol-standalone-root"
			>
				<EmrProtocolGeneratorModal
					isOpen={true}
					onClose={onClose}
					patientFullName={patientName || "Смирнов Алексей Павлович"}
					medicalCardNumber="043-7821"
					doctorFullName="Д-р Воронов Алексей Владимирович"
					doctorSpecialty="Врач-стоматолог-терапевт"
					initialToothNumber={16}
					initialIcd10Code="K02.1"
				/>
			</div>
		);
	}

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
