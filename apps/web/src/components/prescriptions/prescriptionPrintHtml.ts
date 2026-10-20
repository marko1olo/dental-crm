/**
 * prescriptionPrintHtml.ts — Dedicated HTML renderer for statutory medical prescriptions
 * Generates print-ready A5 portrait document for browser print frame.
 * Decomposed module <= 120 lines (Mandate 8b).
 */

import {
	formatCanonicalRpLatin,
	renderForm107_1uHtml,
	renderForm148_1u88Html,
} from "@dental/shared";
import type {
	PrescriptionDrugItem,
	PrescriptionFormType,
} from "./PrescriptionPrintModal";
import {
	cleanHumanInstruction,
	generatePatientMemoPrintHtml,
	type PatientMemoPrintHtmlOptions,
} from "./prescriptionPatientMemoHtml";

export type { PatientMemoPrintHtmlOptions };
export { cleanHumanInstruction, generatePatientMemoPrintHtml };

export interface PrescriptionPrintHtmlOptions {
	customSeriesNumber: string;
	clinic: string;
	address: string;
	phone: string;
	ogrn: string;
	inn: string;
	licNum: string;
	activeForm: PrescriptionFormType;
	prescriptionDate: string;
	patientName: string;
	patientBirth: string;
	patientCard: string;
	patientAddress: string;
	docName: string;
	docSpecialty: string;
	activeItems: readonly PrescriptionDrugItem[];
	validityDays: string;
	isChronicSpecialCare?: boolean;
	chronicPeriodicity?: string;
	withStampAndSignature?: boolean;
	ukepSignature?: unknown;
}

export function generatePrescriptionPrintHtml(
	opts: PrescriptionPrintHtmlOptions,
): string {
	const items = opts.activeItems.map((item) => ({
		latinName: formatCanonicalRpLatin(item.latinName),
		dispenseLatin: item.dispenseLatin,
		signaRussian: item.signaRussian,
		tradeName: item.tradeName,
		form: item.form,
	}));

	if (opts.activeForm === "148-1u-88") {
		return renderForm148_1u88Html({
			clinicLegalName: opts.clinic,
			clinicAddress: opts.address,
			clinicPhone: opts.phone,
			clinicOgrn: opts.ogrn,
			clinicInn: opts.inn,
			medicalLicenseNumber: opts.licNum,
			prescriptionSeriesNumber: opts.customSeriesNumber,
			prescriptionDate: opts.prescriptionDate,
			patientFullName: opts.patientName,
			patientBirthDate: opts.patientBirth,
			patientAddress: opts.patientAddress || "—",
			medicalCardNumber: opts.patientCard,
			doctorFullName: opts.docName,
			doctorSpecialty: opts.docSpecialty,
			validityDays: 15,
			items,
			withStampAndSignature: opts.withStampAndSignature !== false,
			ukepSignature: opts.ukepSignature,
		});
	}

	return renderForm107_1uHtml({
		clinicLegalName: opts.clinic,
		clinicAddress: opts.address,
		clinicPhone: opts.phone,
		clinicOgrn: opts.ogrn,
		clinicInn: opts.inn,
		medicalLicenseNumber: opts.licNum,
		prescriptionSeriesNumber: opts.customSeriesNumber,
		prescriptionDate: opts.prescriptionDate,
		patientFullName: opts.patientName,
		patientBirthDate: opts.patientBirth,
		medicalCardNumber: opts.patientCard,
		doctorFullName: opts.docName,
		doctorSpecialty: opts.docSpecialty,
		validityDays: opts.validityDays,
		isChronicSpecialCare: opts.isChronicSpecialCare,
		chronicPeriodicity: opts.chronicPeriodicity,
		items,
		withStampAndSignature: opts.withStampAndSignature !== false,
		ukepSignature: opts.ukepSignature,
	});
}
