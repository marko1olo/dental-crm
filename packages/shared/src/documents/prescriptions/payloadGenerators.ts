import { generatePrescriptionSeriesNumber } from "../../utils/idGenerators.js";
import type {
	Form107_1uPayload,
	Form148_1u88Payload,
	PrescriptionDoctorUkep,
	PrescriptionDrugItem,
} from "./types.js";
import {
	type DentalPrescriptionDrugPreset,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	CONTROLLED_DRUG_PRESETS,
} from "./drugCatalog.js";

/** ═══════════════════════════════════════════════════════════════════════════
 * ГЕНЕРАТОРЫ PAYLOAD ДЛЯ БЛАНКОВ
 * ═══════════════════════════════════════════════════════════════════════════ */

export function generatePrescriptionPayloadFromSoap(options: {
	readonly clinic: {
		readonly fullName: string;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly ogrn?: string | null;
		readonly inn?: string | null;
		readonly medicalLicenseNumber?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly medicalCardNumber: string;
		readonly address?: string | null;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | null;
		readonly snils?: string | null;
	};
	readonly diagnosisIcd10?: string | null;
	readonly treatmentText?: string | null;
	readonly drugIds?: readonly string[];
	readonly explicitDrugIds?: readonly string[];
	readonly customSeriesNumber?: string;
	readonly validityDays?: "15" | "30" | "60" | "365";
	readonly isChronicSpecialCare?: boolean;
	readonly chronicPeriodicity?: string | null;
	readonly ukepSignature?: PrescriptionDoctorUkep | null;
	readonly withStampAndSignature?: boolean;
}): Form107_1uPayload {
	const icd = (options.diagnosisIcd10 || "K02.1").toUpperCase().trim();
	const seriesNum = generatePrescriptionSeriesNumber("РЕЦ", {
		customSeriesNumber: options.customSeriesNumber,
		seedKey: `${options.patient.medicalCardNumber}:${options.patient.fullName}`,
	});

	let selectedDrugs: DentalPrescriptionDrugPreset[] = [];
	const requestedDrugIds = options.drugIds || options.explicitDrugIds;

	if (requestedDrugIds && requestedDrugIds.length > 0) {
		selectedDrugs = requestedDrugIds
			.map((id) => DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === id))
			.filter((d): d is DentalPrescriptionDrugPreset => Boolean(d));
	} else {
		selectedDrugs = DENTAL_PRESCRIPTION_DRUG_CATALOG.filter((d) =>
			d.recommendedForIcd10.some((code) => icd.startsWith(code)),
		);
		if (selectedDrugs.length === 0) {
			selectedDrugs = [DENTAL_PRESCRIPTION_DRUG_CATALOG[0]!];
		} else if (selectedDrugs.length > 3) {
			selectedDrugs = selectedDrugs.slice(0, 3);
		}
	}

	const drugItems: PrescriptionDrugItem[] = selectedDrugs.map((d, index) => ({
		id: `drug-${index + 1}-${d.id}`,
		latinName: d.latinRp,
		tradeName: d.tradeNameRu,
		form: d.formRu,
		dosage: d.dosageRu,
		quantity: d.quantityLabel,
		dispenseLatin: d.dispenseLatin,
		signaRussian: d.signaRu,
		category: d.category,
	}));

	return {
		formNumber: "107-1/у",
		clinicLegalName: options.clinic.fullName,
		clinicAddress: options.clinic.address || null,
		clinicPhone: options.clinic.phone || null,
		clinicOgrn: options.clinic.ogrn || null,
		clinicInn: options.clinic.inn || null,
		medicalLicenseNumber: options.clinic.medicalLicenseNumber || null,
		prescriptionSeriesNumber: seriesNum,
		prescriptionDate: new Date().toISOString().slice(0, 10),
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог",
		validityDays: options.validityDays || "60",
		isChronicSpecialCare: options.isChronicSpecialCare || false,
		chronicPeriodicity: options.chronicPeriodicity || null,
		items: drugItems,
		diagnosisIcd10Code: icd,
		ukepSignature: options.ukepSignature || null,
		withStampAndSignature: options.withStampAndSignature ?? true,
	};
}

export function generateForm148_1u88Payload(options: {
	readonly clinic: {
		readonly fullName: string;
		readonly address?: string | null;
		readonly phone?: string | null;
		readonly ogrn?: string | null;
		readonly inn?: string | null;
		readonly medicalLicenseNumber?: string | null;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly medicalCardNumber: string;
		readonly address: string;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty?: string | null;
	};
	readonly headOfDepartmentFullName?: string | null;
	readonly diagnosisIcd10?: string | null;
	readonly explicitDrugId?: string;
	readonly customSeriesNumber?: string;
	readonly ukepSignature?: PrescriptionDoctorUkep | null;
}): Form148_1u88Payload {
	const seriesNum = generatePrescriptionSeriesNumber("ПКУ", {
		customSeriesNumber: options.customSeriesNumber,
		seedKey: `${options.patient.medicalCardNumber}:${options.patient.fullName}`,
	});

	const fallbackDrug = CONTROLLED_DRUG_PRESETS[0] || DENTAL_PRESCRIPTION_DRUG_CATALOG[0]!;
	const drug =
		(options.explicitDrugId ? DENTAL_PRESCRIPTION_DRUG_CATALOG.find((d) => d.id === options.explicitDrugId) : null) ||
		fallbackDrug;

	const item: PrescriptionDrugItem = {
		id: `drug-pku-${drug.id}`,
		latinName: drug.latinRp,
		tradeName: drug.tradeNameRu,
		form: drug.formRu,
		dosage: drug.dosageRu,
		quantity: drug.quantityLabel,
		dispenseLatin: drug.dispenseLatin,
		signaRussian: drug.signaRu,
		category: "controlled_pku",
	};

	return {
		formNumber: "148-1/у-88",
		clinicLegalName: options.clinic.fullName,
		clinicAddress: options.clinic.address || null,
		clinicPhone: options.clinic.phone || null,
		clinicOgrn: options.clinic.ogrn || null,
		clinicInn: options.clinic.inn || null,
		medicalLicenseNumber: options.clinic.medicalLicenseNumber || null,
		prescriptionSeriesNumber: seriesNum,
		prescriptionDate: new Date().toISOString().slice(0, 10),
		patientFullName: options.patient.fullName,
		patientBirthDate: options.patient.birthDate,
		patientAddress: options.patient.address,
		medicalCardNumber: options.patient.medicalCardNumber,
		doctorFullName: options.doctor.fullName,
		doctorSpecialty: options.doctor.specialty || "Врач-стоматолог-хирург",
		headOfDepartmentFullName: options.headOfDepartmentFullName || null,
		validityDays: "15",
		items: [item],
		diagnosisIcd10Code: options.diagnosisIcd10 || "K08.1",
		ukepSignature: options.ukepSignature || null,
	};
}

export { generatePrescriptionPayloadFromSoap as generateForm107_1uPayload };

