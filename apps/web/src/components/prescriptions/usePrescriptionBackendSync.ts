/**
 * usePrescriptionBackendSync.ts — Background Persistence to Fastify API
 */

import { useCallback } from "react";
import type {
	PrescriptionDrugItem,
	PrescriptionFormType,
} from "./prescriptionPreviewTypes";
import {
	type CreatePrescriptionApiPayload,
	savePrescriptionToBackend,
} from "./prescriptionApiClient";

export interface PrescriptionBackendSyncParams {
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly doctorId?: string | null | undefined;
	readonly activeForm: PrescriptionFormType;
	readonly validityDays: "15" | "30" | "60" | "365";
	readonly isChronicSpecialCare: boolean;
	readonly chronicPeriodicity: string;
	readonly patientAddress: string;
	readonly patientSnils: string;
	readonly patientOmsPolicy: string;
	readonly diagnosisIcd10?: string | null | undefined;
	readonly customSeriesNumber: string;
	readonly activeItems: readonly PrescriptionDrugItem[];
	readonly ukepSignature?: unknown;
	readonly onPrescriptionCreated?:
		| ((prescription: unknown) => void)
		| undefined;
}

export function usePrescriptionBackendSync(p: PrescriptionBackendSyncParams) {
	const persistPrescriptionToBackend = useCallback(async () => {
		if (!p.patientId) return;
		try {
			const isSpecial =
				p.activeForm === "special" || p.activeForm === "148-1u-88";
			const payload: CreatePrescriptionApiPayload = {
				patientId: p.patientId,
				visitId: p.visitId || null,
				prescribingDoctorId:
					p.doctorId || "00000000-0000-0000-0000-000000000001",
				formType: isSpecial ? "form_148_1_u_88" : "form_107_1_u",
				validityPeriod:
					p.validityDays === "15"
						? "days_15"
						: p.validityDays === "30"
							? "days_30"
							: p.validityDays === "365"
								? "year_1"
								: "days_60",
				isSpecialChronicIndication: p.isChronicSpecialCare,
				chronicDispenseFrequencyNotes: p.chronicPeriodicity || null,
				patientAddress: p.patientAddress || null,
				patientSnils: p.patientSnils || null,
				patientOmsPolicy: p.patientOmsPolicy || null,
				clinicalDiagnosisMkb10: p.diagnosisIcd10 || null,
				notes: `Рецепт выписан в амбулаторном модуле (${p.customSeriesNumber})`,
				items: p.activeItems.map((item) => ({
					catalogDrugId: item.id.replace(/^item-\d+-/, ""),
					innLatin: item.latinName.replace(/^Rp\.:\s*/, "") || item.tradeName,
					dosageFormLatin: item.form || "таблетки",
					dosageDoseConcentration: item.dosage || "стандартная",
					dispenseInstructionLatin: item.dispenseLatin || "D.t.d. N 1",
					signatureDirectionRussian: item.signaRussian || "По назначению врача",
					tradeName: item.tradeName || null,
					quantityPackages: 1,
					durationDays: 7,
					frequencyTimesPerDay: 2,
					mealRelation: "after_meal",
				})),
				ukepSignature: (p.ukepSignature as any) || null,
			};
			const res = await savePrescriptionToBackend(payload);
			if (p.onPrescriptionCreated) p.onPrescriptionCreated(res.prescription);
		} catch (e) {
			console.warn("[PrescriptionCockpit] backend sync notice:", e);
		}
	}, [
		p.patientId,
		p.visitId,
		p.doctorId,
		p.activeForm,
		p.validityDays,
		p.isChronicSpecialCare,
		p.chronicPeriodicity,
		p.patientAddress,
		p.patientSnils,
		p.patientOmsPolicy,
		p.diagnosisIcd10,
		p.customSeriesNumber,
		p.activeItems,
		p.ukepSignature,
		p.onPrescriptionCreated,
	]);

	return { persistPrescriptionToBackend };
}
