/**
 * DENTE Dental CRM — Statutory Prescription & Latin Rx Engine (Order 1094n)
 */

import {
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	calculatePrescriptionExpiration,
	verifyPrescriptionStatutoryValidity,
} from "@dental/shared";
import { DENTAL_MEDICATIONS_CATALOG, type DentalMedicationPreset } from "./prescriptionPresets";

export interface Form107PrescriptionInput {
	readonly prescriptionSeriesNumber: string;
	readonly dateIso: string;
	readonly validityDays: 15 | 30 | 60 | 365;
	readonly clinicName: string;
	readonly clinicOgrn: string;
	readonly clinicAddress: string;
	readonly clinicInn?: string;
	readonly medicalLicenseNumber?: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string;
	readonly patientMedicalCardNumber: string;
	readonly patientAddress?: string;
	readonly doctorFullName: string;
	readonly doctorSpecialty: string;
	readonly doctorSnils?: string;
	readonly selectedMedicationIds: readonly string[];
	readonly isChronicSpecialCare?: boolean;
	readonly chronicPeriodicity?: string;
	readonly ukepSignature?: {
		certificateSerialNumber?: string;
		certificateIssuer?: string;
		signedAt?: string;
		cryptoSignaturePkcs7?: string;
	} | null;
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
		readonly expiresAtIso: string;
		readonly clinicName: string;
		readonly clinicOgrn: string;
		readonly clinicAddress: string;
		readonly clinicInn?: string | undefined;
		readonly medicalLicenseNumber?: string | undefined;
	};
	readonly patient: {
		readonly fullName: string;
		readonly birthDate: string;
		readonly cardNum: string;
		readonly address?: string | undefined;
	};
	readonly doctor: {
		readonly fullName: string;
		readonly specialty: string;
		readonly snils?: string | undefined;
	};
	readonly items: readonly Form107RenderedItem[];
	readonly ukepSignature?: {
		certificateSerialNumber?: string | undefined;
		certificateIssuer?: string | undefined;
		signedAt?: string | undefined;
		cryptoSignaturePkcs7?: string | undefined;
	} | null | undefined;
	readonly isChronicSpecialCare?: boolean | undefined;
	readonly chronicPeriodicity?: string | undefined;
}

export function generateForm107Prescription(input: Form107PrescriptionInput): Form107PrescriptionDocument {
	const items: Form107RenderedItem[] = [];

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

	const expiresAtIso = calculatePrescriptionExpiration(input.dateIso, input.validityDays);

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
			...(input.medicalLicenseNumber ? { medicalLicenseNumber: input.medicalLicenseNumber } : {}),
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
		...(input.chronicPeriodicity ? { chronicPeriodicity: input.chronicPeriodicity } : {}),
	};
}
