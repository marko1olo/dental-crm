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
import { isDemoShowcaseMode } from "../../../../../lib/demoMode.js";

export const StandalonePatientCardHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const launcherPatientName = useLauncherPatientName(patientId);

	if (!patientId && !isDemoShowcaseMode()) {
		return (
			<div
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex flex-col items-center justify-center p-6 text-center"
				data-testid="patient-card-empty-state"
			>
				<h2 className="text-xl font-bold mb-2">Пациент не выбран</h2>
				<p className="text-sm text-[var(--muted)] mb-6 max-w-md">
					Укажите идентификатор пациента в строке адреса (?patient_id=...) для открытия медицинской карты.
				</p>
				<button
					type="button"
					onClick={onClose}
					className="px-4 py-2 bg-[var(--primary)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity"
				>
					Вернуться в картотеку
				</button>
			</div>
		);
	}

	const fallbackName = isDemoShowcaseMode() ? DEMO_SHOWCASE_MODAL_PATIENT.fullName : "Пациент";
	const patientName = launcherPatientName || fallbackName;

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-0 sm:p-4"
			data-testid="patient-card-standalone-root"
		>
			<PatientCardModal
				isOpen={true}
				onClose={onClose}
				patientId={patientId || (isDemoShowcaseMode() ? DEMO_SHOWCASE_MODAL_PATIENT.id : undefined)}
				patient={
					patientId && !isDemoShowcaseMode()
						? { id: patientId, fullName: patientName }
						: {
								...DEMO_SHOWCASE_MODAL_PATIENT,
								fullName: patientName,
						  }
				}
				safetyProfile={isDemoShowcaseMode() ? DEMO_SHOWCASE_MODAL_SAFETY : undefined}
			/>
		</div>
	);
};

export default StandalonePatientCardHost;
