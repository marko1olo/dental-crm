/**
 * usePrescriptionPrintCoordinator.ts — Print HTML Generation Hook
 * Decomposed hook <= 120 lines (Mandate 8b).
 */

import { useCallback } from "react";
import type { PrescriptionDrugItem } from "./prescriptionPreviewTypes";
import { generatePrescriptionPrintHtml } from "./prescriptionPrintHtml";
import type { usePrescriptionFormMeta } from "./usePrescriptionFormMeta";

export interface PrescriptionPrintCoordinatorParams {
	readonly meta: ReturnType<typeof usePrescriptionFormMeta>;
	readonly clinic: string;
	readonly address: string;
	readonly phone: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly licNum: string;
	readonly patientName: string;
	readonly patientBirth: string;
	readonly patientCard: string;
	readonly docName: string;
	readonly docSpecialty: string;
	readonly docSnils: string;
	readonly activeItems: readonly PrescriptionDrugItem[];
}

export function usePrescriptionPrintCoordinator(
	p: PrescriptionPrintCoordinatorParams,
) {
	const generatePrintHtml = useCallback((): string => {
		return generatePrescriptionPrintHtml({
			customSeriesNumber: p.meta.customSeriesNumber,
			clinic: p.clinic,
			address: p.address,
			phone: p.phone,
			ogrn: p.ogrn,
			inn: p.inn,
			licNum: p.licNum,
			activeForm: p.meta.activeForm,
			prescriptionDate: p.meta.prescriptionDate,
			patientName: p.patientName,
			patientBirth: p.patientBirth,
			patientCard: p.patientCard,
			patientAddress: p.meta.patientAddress,
			docName: p.docName,
			docSpecialty: p.docSpecialty,
			activeItems: p.activeItems,
			validityDays: p.meta.validityDays,
			isChronicSpecialCare: p.meta.isChronicSpecialCare,
			chronicPeriodicity: p.meta.chronicPeriodicity,
			withStampAndSignature: p.meta.withStampAndSignature,
		});
	}, [p]);

	return {
		generatePrintHtml,
	};
}
