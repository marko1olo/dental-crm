/**
 * StandalonePatientCardHost.tsx — Честный standalone хост комплексной карты пациента PatientCardModal (Мандат 8b <= 50 строк).
 * Позволяет мгновенно открыть каноническую карточку пациента (?patient_card=1, #patient-card).
 */

import React from "react";
import {
	PatientCardModal,
	DEMO_SHOWCASE_MODAL_PATIENT,
	DEMO_SHOWCASE_MODAL_SAFETY,
} from "../../../../patients/PatientCardModal";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

export const StandalonePatientCardHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const patientName = useLauncherPatientName(patientId) || DEMO_SHOWCASE_MODAL_PATIENT.fullName;

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-0 sm:p-4"
			data-testid="patient-card-standalone-root"
		>
			<PatientCardModal
				isOpen={true}
				onClose={onClose}
				patient={{
					...DEMO_SHOWCASE_MODAL_PATIENT,
					fullName: patientName,
				}}
				safetyProfile={DEMO_SHOWCASE_MODAL_SAFETY}
			/>
		</div>
	);
};

export default StandalonePatientCardHost;
