import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
	type ProcedureSpecificConsentProcedure,
} from "../../legal/legalContractsAndConsents.js";
import {
	DEFAULT_CLINIC_LICENSE_DATE,
	DEFAULT_CLINIC_LICENSE_NUMBER,
} from "./constants.js";
import type {
	InformedConsent1051nPayload,
	InformedConsentType,
} from "./types.js";

/**
 * Генератор пресета ИДС по Приказу Минздрава РФ № 1051н для конкретной процедуры.
 */
export function generateStatutoryConsent1051nPayload(params: {
	consentType: InformedConsentType;
	patient: {
		fullName: string;
		birthDate: string;
		passport?: string | null;
		address?: string | null;
		phone?: string | null;
		snils?: string | null;
	};
	doctor: {
		fullName: string;
		specialty?: string | null;
	};
	clinic?: {
		legalName?: string;
		address?: string;
		ogrn?: string;
		inn?: string;
		medicalLicenseNumber?: string;
	};
	representative?: {
		fullName?: string | null;
		passport?: string | null;
		relation?: string | null;
	} | null;
	customNotes?: string | null;
}): InformedConsent1051nPayload {
	const c = params.clinic;
	const p = params.patient;
	const d = params.doctor;
	const rep = params.representative;

	let title = "ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО (ПРИКАЗ МЗ РФ № 1051н)";
	let intervention: string = BASE_INFORMED_CONSENT_PRESET.intervention;
	let diagnosis: string = BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication;
	let anesthesia: string | null | undefined = BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia;
	let materials: string | null | undefined = BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes;
	let risks: readonly string[] = BASE_INFORMED_CONSENT_PRESET.explainedRisks;
	let alternatives: readonly string[] = BASE_INFORMED_CONSENT_PRESET.alternatives;
	let aftercare: readonly string[] = BASE_INFORMED_CONSENT_PRESET.aftercareRequirements;

	if (params.consentType in CLINICAL_CONSENT_PRESETS) {
		const preset = CLINICAL_CONSENT_PRESETS[params.consentType as ProcedureSpecificConsentProcedure];
		if (preset) {
			title = `ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ: ${preset.procedureName.toUpperCase()}`;
			intervention = preset.procedureName;
			diagnosis = preset.diagnosisOrIndication;
			anesthesia = preset.plannedAnesthesia;
			materials = preset.materialsAndSystems;
			risks = preset.procedureSpecificRisks;
			alternatives = preset.alternatives;
			aftercare = preset.aftercareAndLimits;
		}
	}

	return {
		consentType: params.consentType,
		consentTitle: title,
		clinicLegalName: c?.legalName || 'ООО "Денте Клиник"',
		clinicAddress: c?.address || "",
		clinicOgrn: c?.ogrn || "",
		clinicInn: c?.inn || "",
		medicalLicenseNumber: c?.medicalLicenseNumber || DEFAULT_CLINIC_LICENSE_NUMBER,
		medicalLicenseDate: DEFAULT_CLINIC_LICENSE_DATE,
		patientFullName: p.fullName,
		patientBirthDate: p.birthDate,
		patientPassport: p.passport || "",
		patientAddress: p.address || "",
		patientPhone: p.phone || "",
		patientSnils: p.snils || null,
		representativeFullName: rep?.fullName || null,
		representativePassport: rep?.passport || null,
		representativeRelation: rep?.relation || null,
		attendingDoctorFullName: d.fullName,
		attendingDoctorSpecialty: d.specialty || "Врач-стоматолог",
		diagnosisOrIndication: diagnosis,
		interventionName: intervention,
		plannedAnesthesia: anesthesia,
		materialsAndSystems: materials,
		explainedRisks: [...risks],
		alternatives: [...alternatives],
		aftercareRequirements: [...aftercare],
		confirmedVoluntary: true,
		questionsAnswered: true,
		consentDate: new Date().toISOString().slice(0, 10),
	};
}
