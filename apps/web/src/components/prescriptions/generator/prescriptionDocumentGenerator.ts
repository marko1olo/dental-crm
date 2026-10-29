/**
 * prescriptionDocumentGenerator.ts — Clinical Prescription Document Synthesis
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y & Mandate 8b <= 120 lines).
 */

import {
	calculatePrescriptionExpiration,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
} from "@dental/shared";
import type {
	PrescriptionDocument,
	PrescriptionDocumentInput,
	PrescriptionRenderedItem,
} from "./prescriptionEngineTypes";
import { DENTAL_MEDICATIONS_CATALOG } from "./prescriptionPresets";

export function generatePrescriptionDocument(
	input: PrescriptionDocumentInput,
): PrescriptionDocument {
	const items: PrescriptionRenderedItem[] = [];

	let count = 1;
	for (const id of input.selectedMedicationIds) {
		const med =
			DENTAL_MEDICATIONS_CATALOG.find((m) => m.id === id) ||
			DENTAL_PRESCRIPTION_DRUG_CATALOG.find((m) => m.id === id);
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
			? "15 дней (Срочный / ПКУ)"
			: input.validityDays === 30
				? "30 дней (Льготный)"
				: input.validityDays === 365
					? "1 год (Хронические / По спец. назначению)"
					: "60 дней (Стандарт)";

	const expiresAtIso = calculatePrescriptionExpiration(
		input.dateIso,
		input.validityDays,
	);

	return {
		header: {
			seriesNumber: input.prescriptionSeriesNumber,
			dateLabelRu: input.dateIso,
			validityPeriodLabelRu: validityLabel,
			expiresAtIso,
			clinicName: input.clinicName,
			clinicOgrn: input.clinicOgrn,
			clinicAddress: input.clinicAddress,
			...(input.clinicInn ? { clinicInn: input.clinicInn } : {}),
			...(input.medicalLicenseNumber
				? { medicalLicenseNumber: input.medicalLicenseNumber }
				: {}),
		},
		patient: {
			fullName: input.patientFullName,
			birthDate: input.patientBirthDate,
			cardNum: input.patientMedicalCardNumber,
			...(input.patientAddress ? { address: input.patientAddress } : {}),
		},
		doctor: {
			fullName: input.doctorFullName,
			specialty: input.doctorSpecialty,
			...(input.doctorSnils ? { snils: input.doctorSnils } : {}),
		},
		items,
		ukepSignature: input.ukepSignature || null,
		isChronicSpecialCare: input.isChronicSpecialCare || false,
		...(input.chronicPeriodicity
			? { chronicPeriodicity: input.chronicPeriodicity }
			: {}),
	};
}

/** Canonical alias for backwards compatibility */
export const generateForm107Prescription = generatePrescriptionDocument;
