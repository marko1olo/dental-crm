/**
 * PatientDetailsStandaloneLauncher.tsx
 * Standalone лаунчер фасадной модалки медицинской карты пациента (PatientDetailsModal).
 * Соответствует Mandate 8b (Layer 5 Facade, <= 120 строк) и Mandate 8aq (монтирование в живой UI).
 */

import React, { useState } from "react";
import { PatientDetailsModal } from "../../../../patient/PatientDetailsModal";
import type { PatientClinicalSafetyProfile } from "../../../../patients/safetyMath";
import type { PatientGeneralInfo } from "../../../../patients/tabs/PatientGeneralInfoTab";

const DEMO_PATIENT: PatientGeneralInfo = {
	id: "demo_pat_001",
	fullName: "Иванова Марина Викторовна",
	birthDate: "1992-07-15",
	gender: "female",
	phone: "+7 (916) 789-01-23",
	address: "г. Москва, Ленинский пр-т, д. 45, кв. 112",
	notes: "Первичный приём. Отягощенный аллергоанамнез.",
	medicalCardNumber: "043-У/89",
	patientBalanceRub: 14500,
};

const DEMO_SAFETY: PatientClinicalSafetyProfile = {
	allergyPenicillin: true,
	allergyLatex: false,
	allergyLocalAnesthetics: false,
	allergyIodine: false,
	allergyAspirin: false,
	otherAllergies: "Амоксициллин",
	cardiovascularRisk: false,
	diabetes: false,
	bleedingDisorder: false,
	anticoagulants: false,
	bisphosphonates: false,
	pregnancyOrLactation: false,
	bronchialAsthma: false,
	hepatitisOrHiv: false,
	notes: "Контролировать анестетик без антибиотиков группы пенициллинов",
};

export function renderPatientDetailsLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (!s.includes("patient_details") && !h.includes("patient_details")) {
		return null;
	}

	return (
		<PatientDetailsModal
			isOpen={true}
			onClose={() => {
				const u = new URL(window.location.href);
				u.searchParams.delete("patient_details");
				window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("patient_details") ? "" : u.hash));
			}}
			patient={DEMO_PATIENT}
			safetyProfile={DEMO_SAFETY}
		/>
	);
}
