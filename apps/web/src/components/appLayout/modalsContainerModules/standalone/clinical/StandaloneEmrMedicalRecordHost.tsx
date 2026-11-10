/**
 * StandaloneEmrMedicalRecordHost — Честный хост Электронной Медицинской Карты приёма (Мандат 8b <= 80 строк).
 * Позволяет открыть каноническую медицинскую карту приёма (?emr=1, #emr, ?medical-card=1).
 */

import React, { useState } from "react";
import { MedicalRecordStudioModal } from "../../../../emr/MedicalRecordStudioModal";
import { DEFAULT_MEDICAL_CARD_DATA } from "../../../../emr/medicalCardCatalogData";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode";
import type { MedicalRecordData } from "../../../../emr/types/recordDataTypes";

function getInitialEmrTab(): "overview" | "diaries" {
	if (typeof window === "undefined") return "overview";
	const h = (window.location.hash || "").toLowerCase();
	const s = (window.location.search || "").toLowerCase();
	if (h.includes("diary") || s.includes("diary") || h.includes("diaries") || s.includes("diaries")) {
		return "diaries";
	}
	return "overview";
}

export const StandaloneEmrMedicalRecordHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const resolvedName = useLauncherPatientName(patientId);
	const isDemo = isDemoShowcaseMode();
	const patientName = resolvedName || (isDemo ? "Смирнова Екатерина Андреевна" : "");

	const [data, setData] = useState<MedicalRecordData>(() => ({
		...DEFAULT_MEDICAL_CARD_DATA,
		passport: {
			...DEFAULT_MEDICAL_CARD_DATA.passport,
			patientFullName: patientName,
			patientBirthDate: isDemo ? "1990-05-14" : "",
			patientPhone: isDemo ? "+7 (926) 555-12-34" : "",
			patientGender: isDemo ? "female" : "unknown",
			patientAddress: isDemo ? "г. Москва, ул. Тверская, д. 12, кв. 45" : "",
			medicalCardNumber: isDemo ? "ЭМК-2026-043" : "",
			attendingDoctorFullName: isDemo ? "Д-р Воронов Алексей Владимирович" : "",
			attendingDoctorSpecialty: isDemo ? "Врач-стоматолог-терапевт" : "",
		},
	}));

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)] flex items-center justify-center"
			data-testid="emr-medical-record-standalone-root"
		>
			<MedicalRecordStudioModal
				isOpen={true}
				onClose={onClose}
				initialData={data}
				onSave={setData}
				isLocked={false}
				isDraft={true}
				initialTab={getInitialEmrTab()}
			/>
		</div>
	);
};
