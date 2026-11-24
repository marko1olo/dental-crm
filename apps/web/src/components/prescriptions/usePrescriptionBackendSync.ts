/**
 * usePrescriptionBackendSync.ts — Background Persistence to Fastify API
 */

import { useCallback } from "react";
import { clientLogger } from "../../services/logging/clientLogger";
import { showToast } from "../GlobalToast";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usePrescriptionBackendSync(p: PrescriptionBackendSyncParams) {
	const persistPrescriptionToBackend = useCallback(async () => {
		const patientId = p.patientId?.trim();
		if (!patientId || !UUID_RE.test(patientId)) {
			if (patientId) {
				clientLogger.warn("[PrescriptionCockpit] Skip backend sync: non-UUID patientId", { patientId });
			}
			return;
		}
		const doctorId = p.doctorId?.trim();
		const validDoctorId = doctorId && UUID_RE.test(doctorId) ? doctorId : null;
		const visitId = p.visitId?.trim();
		const validVisitId = visitId && UUID_RE.test(visitId) ? visitId : null;
		try {
			const isSpecial =
				p.activeForm === "special" || p.activeForm === "148-1u-88";
			const payload: CreatePrescriptionApiPayload = {
				patientId,
				visitId: validVisitId,
				prescribingDoctorId: validDoctorId,
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
				ukepSignature: p.ukepSignature ?? null,
			};
			const res = await savePrescriptionToBackend(payload);
			if (p.onPrescriptionCreated) p.onPrescriptionCreated(res.prescription);
		} catch (e) {
			clientLogger.warn("[PrescriptionCockpit] backend sync failed:", e);
			showToast(
				e instanceof Error ? e.message : "Не удалось сохранить рецепт на сервере",
				"error",
			);
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
