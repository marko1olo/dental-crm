/**
 * treatmentPlanMultiOptionBuilder.ts — Создание многовариантного плана лечения (А, Б, В) DENTE.
 */

import { multiplyKopecks, percentageOfKopecks } from "../../utils/money.js";
import { generateTreatmentPlanId, generateTreatmentPlanNumber } from "../../utils/idGenerators.js";
import {
	DEFAULT_CLINIC_LEGAL_REQUISITES,
	type PlanTierKey,
	type TreatmentPlanTierEstimate,
	type MultiOptionTreatmentPlanInput,
	type MultiOptionTreatmentPlan,
	type ClinicLegalRequisites,
} from "./types.js";
import { calculateSingleTierEstimate } from "./treatmentPlanTierCalculator.js";

export function buildMultiOptionTreatmentPlan(
	input: MultiOptionTreatmentPlanInput,
): MultiOptionTreatmentPlan {
	const now = new Date();
	const createdAtIso = input.createdAtIso || now.toISOString();
	const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	const validUntilIso = input.validUntilIso || validUntil.toISOString();
	const planId = input.planId || generateTreatmentPlanId();
	const planNumber = input.planNumber || generateTreatmentPlanNumber(now, {
		seedKey: `${input.patientId}:${input.doctorFullName}`,
	});
	const clinicId = input.clinicId || "clinic_main";
	const clinicRequisites: ClinicLegalRequisites = {
		...DEFAULT_CLINIC_LEGAL_REQUISITES,
		...(input.clinicRequisites || {}),
	};

	let processedItems = input.items;
	if (typeof input.globalDiscountPercent === "number" && input.globalDiscountPercent > 0) {
		const bp = Math.min(10000, Math.max(0, Math.round(input.globalDiscountPercent * 100)));
		processedItems = input.items.map((it) => {
			const qty = it.quantity || 1;
			const gross = multiplyKopecks(it.unitPriceKopecks, qty);
			const discount = percentageOfKopecks(gross, bp);
			return { ...it, discountKopecks: discount };
		});
	}

	const tiers: Record<PlanTierKey, TreatmentPlanTierEstimate> = {
		economy: calculateSingleTierEstimate("economy", processedItems),
		optimum: calculateSingleTierEstimate("optimum", processedItems),
		premium: calculateSingleTierEstimate("premium", processedItems),
	};

	const availableTierKeys: PlanTierKey[] = ["economy", "optimum", "premium"];
	const selectedTierKey = input.selectedTierKey || "optimum";
	const selectedTier = tiers[selectedTierKey];
	const isPennyExact = Object.values(tiers).every((t) => t.isPennyExact);

	return {
		planId, planNumber, clinicId, patientId: input.patientId,
		patientFullName: input.patientFullName.trim(),
		patientBirthDate: input.patientBirthDate || "01.01.1985",
		patientPhone: input.patientPhone || "+7 (___) ___-__-__",
		patientPassport: input.patientPassport || "Паспорт РФ",
		doctorFullName: input.doctorFullName.trim(),
		doctorSpecialty: input.doctorSpecialty || "Врач-стоматолог общей практики",
		clinicalDiagnosisRu: input.clinicalDiagnosisRu.trim(),
		createdAtIso, validUntilIso, clinicRequisites, tiers,
		availableTierKeys, selectedTierKey, selectedTier, isPennyExact,
	};
}
