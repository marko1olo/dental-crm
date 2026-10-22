/**
 * prescriptionMemoFormatter.ts — Helper to format patient prescription memo
 * Mandate 8b: <= 120 lines.
 */

import { formatPatientPrescriptionMemo } from "./generator";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";

export interface BuildMemoParams {
	readonly clinic: string;
	readonly phone: string;
	readonly patientName: string;
	readonly docName: string;
	readonly prescriptionDate: string;
	readonly activeItems: readonly PrescriptionDrugItem[];
}

export function buildPatientMemoText(p: BuildMemoParams): string {
	const medications = p.activeItems.map((item) => ({
		id: item.id,
		tradeNameRu: item.tradeName,
		activeSubstanceRu: item.tradeName,
		category: item.category || "other",
		categoryLabelRu: "Препарат",
		latinRp: item.latinName,
		formRu: item.form,
		dosageRu: item.dosage,
		quantityLabel: item.quantity,
		dispenseLatin: item.dispenseLatin,
		signaRu: item.signaRussian,
		validityDays: 60,
	}));

	return formatPatientPrescriptionMemo({
		clinicName: p.clinic,
		clinicPhone: p.phone,
		patientName: p.patientName || "Пациент",
		doctorName: p.docName,
		prescriptionDate:
			p.prescriptionDate || new Date().toISOString().slice(0, 10),
		medications,
	});
}
