/**
 * StandaloneEmrProtocolHost — Честный хост генератора клинических протоколов приёма (Мандат 8b <= 120 строк).
 * Позволяет открыть канонический генератор протоколов по глубокой ссылке (?emr-protocol=1, #emr-protocol).
 */

import React from "react";
import { EmrProtocolGeneratorModal } from "../../../../emr/protocolGenerator/EmrProtocolGeneratorModal";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

export const StandaloneEmrProtocolHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const patientName = useLauncherPatientName(patientId);

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
};
