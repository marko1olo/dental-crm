/**
 * DENTE Dental CRM — Form 107-1/u Statutory Prescription & Latin Rx Engine
 */

import { DENTAL_MEDICATIONS_CATALOG, type DentalMedicationPreset } from "./prescriptionPresets";

export interface Form107PrescriptionInput {
	readonly prescriptionSeriesNumber: string;
	readonly dateIso: string;
	readonly validityDays: 15 | 60 | 365;
	readonly clinicName: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientMedicalCardNumber: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly selectedMedicationIds: readonly string[];
}

export interface Form107RenderedItem {
	readonly itemNumber: number;
	readonly latinRp: string;
	readonly dispenseLatin: string;
	readonly signaRu: string;
	readonly tradeNameRu: string;
}

export interface Form107PrescriptionDocument {
	readonly header: {
		readonly seriesNumber: string;
		readonly dateLabelRu: string;
		readonly validityPeriodLabelRu: string;
		readonly clinicName: string;
		readonly clinicOgrn: string;
		readonly clinicAddress: string;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly cardNum: string;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty: string;
	};
	readonly items: readonly Form107RenderedItem[];
}

export function generateForm107Prescription(input: Form107PrescriptionInput): Form107PrescriptionDocument {
	const items: Form107RenderedItem[] = [];

	let count = 1;
	for (const id of input.selectedMedicationIds) {
		const med = DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === id);
		if (med) {
			items.push({
				itemNumber: count++,
				latinRp: med.latinRp,
				dispenseLatin: med.dispenseLatin,
				signaRu: med.signaRu,
				tradeNameRu: med.tradeNameRu,
			});
		}
	}

	const validityLabel =
		input.validityDays === 15
			? "15 дней (Срочный)"
			: input.validityDays === 365
			? "1 год (Хронические)"
			: "60 дней (Стандарт)";

	return {
		header: {
			seriesNumber: input.prescriptionSeriesNumber,
			dateLabelRu: input.dateIso,
			validityPeriodLabelRu: validityLabel,
			clinicName: input.clinicName,
			clinicOgrn: input.clinicOgrn,
			clinicAddress: input.clinicAddress,
		},
		patient: {
			fullName: input.patientFullName,
			birthDate: input.patientBirthDate,
			cardNum: input.patientMedicalCardNumber,
		},
		doctor: {
			fullName: input.doctorFullName,
			specialty: input.doctorSpecialty,
		},
		items,
	};
}
