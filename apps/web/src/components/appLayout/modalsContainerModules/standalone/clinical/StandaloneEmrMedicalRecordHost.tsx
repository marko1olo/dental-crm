/**
 * StandaloneEmrMedicalRecordHost — Честный хост Электронной Медицинской Карты приёма (Мандат 8b <= 80 строк).
 * Позволяет открыть каноническую медицинскую карту приёма (?emr=1, #emr, ?medical-card=1).
 */

import React, { useState } from "react";
import { MedicalRecordPrintModal } from "../../../../emr/record/MedicalRecordPrintModal";
import { DEFAULT_MEDICAL_CARD_DATA } from "../../../../emr/medicalCardCatalogData";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";
import type { MedicalRecordData } from "../../../../emr/types/recordDataTypes";

export const StandaloneEmrMedicalRecordHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const patientName = useLauncherPatientName(patientId) || "Смирнова Екатерина Андреевна";
	const [data, setData] = useState<MedicalRecordData>(() => ({
		...DEFAULT_MEDICAL_CARD_DATA,
		passport: {
			...DEFAULT_MEDICAL_CARD_DATA.passport,
			patientFullName: patientName,
			patientBirthDate: "1990-05-14",
			patientPhone: "+7 (926) 555-12-34",
			patientGender: "female",
			patientAddress: "г. Москва, ул. Тверская, д. 12, кв. 45",
			medicalCardNumber: "ЭМК-2026-043",
			attendingDoctorFullName: "Д-р Воронов Алексей Владимирович",
			attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
		},
	}));

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#0f172a)] flex items-center justify-center"
			data-testid="emr-medical-record-standalone-root"
		>
			<MedicalRecordPrintModal
				isOpen={true}
				onClose={onClose}
				initialData={data}
				onSave={setData}
				isLocked={false}
				isDraft={true}
			/>
		</div>
	);
};
