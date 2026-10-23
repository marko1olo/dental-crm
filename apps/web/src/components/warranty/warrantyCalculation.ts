/**
 * CLINICAL DENTAL WARRANTY ENGINE — TERMS & CHECKUP CALCULATION
 * Честный клинический расчет гарантии по нормативам СтАР и Закону РФ № 2300-1.
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import { getWarrantyPreset, type WarrantyCategory } from "./warrantyPresets.js";
import type {
	CheckupScheduleItem,
	WarrantyCalculationResult,
	WarrantyItem,
	WarrantyRiskFactors,
} from "./warrantyEngineTypes.js";
import { addMonthsToDate, formatShortDate } from "./warrantyDateUtils.js";
import { evaluateClinicalRiskFactors } from "./warrantyRiskEvaluator.js";

export function calculateWarrantyTerms(input: {
	category: WarrantyCategory;
	baseWarrantyMonths?: number | undefined;
	baseServiceLifeMonths?: number | undefined;
	customWarrantyMonths?: number | undefined;
	customServiceLifeMonths?: number | undefined;
	issueDate?: string | Date | undefined;
	riskFactors?: WarrantyRiskFactors | undefined;
	teethCount?: number | undefined;
}): WarrantyCalculationResult {
	const preset = getWarrantyPreset(input.category);
	const baseWarranty = input.baseWarrantyMonths ?? preset.baseWarrantyMonths;
	const baseServiceLife = input.baseServiceLifeMonths ?? preset.baseServiceLifeMonths;

	const issueDateIso = input.issueDate
		? typeof input.issueDate === "string"
			? input.issueDate.slice(0, 10)
			: input.issueDate.toISOString().slice(0, 10)
		: new Date().toISOString().slice(0, 10);

	const riskData = evaluateClinicalRiskFactors(input.category, preset.standardCheckupIntervalMonths, input.riskFactors);

	const rawAdjustedWarranty = Math.round(baseWarranty * riskData.totalRiskMultiplier);
	const calculatedWarranty = Math.max(preset.minWarrantyMonths, Math.min(preset.maxWarrantyMonths, rawAdjustedWarranty));
	const adjustedWarrantyMonths = input.customWarrantyMonths ?? calculatedWarranty;

	const rawAdjustedServiceLife = Math.round(baseServiceLife * Math.max(0.5, riskData.totalRiskMultiplier));
	const adjustedServiceLifeMonths = input.customServiceLifeMonths ?? Math.max(adjustedWarrantyMonths, rawAdjustedServiceLife);

	const warrantyExpirationDate = addMonthsToDate(issueDateIso, adjustedWarrantyMonths);
	const serviceLifeExpirationDate = addMonthsToDate(issueDateIso, adjustedServiceLifeMonths);
	const nextCheckupDueDate = addMonthsToDate(issueDateIso, riskData.checkupIntervalMonths);

	const checkupSchedule: CheckupScheduleItem[] = [];
	const totalCheckupsCount = Math.max(1, Math.floor(adjustedWarrantyMonths / riskData.checkupIntervalMonths));
	for (let i = 1; i <= Math.min(12, totalCheckupsCount + 1); i++) {
		const dueDate = addMonthsToDate(issueDateIso, i * riskData.checkupIntervalMonths);
		checkupSchedule.push({
			index: i,
			dueDate,
			formattedDate: formatShortDate(dueDate),
			recommendedProcedures: [
				"Контрольный осмотр и окклюзионный контроль",
				"Оценка краевого прилегания и целостности конструкций",
				"Профессиональная ультразвуковая чистка и AirFlow",
				"Определение гигиенического индекса OHI-S",
			],
			isMandatory: true,
		});
	}

	return {
		baseWarrantyMonths: baseWarranty,
		baseServiceLifeMonths: baseServiceLife,
		adjustedWarrantyMonths,
		adjustedServiceLifeMonths,
		totalRiskMultiplier: riskData.totalRiskMultiplier,
		riskLevel: riskData.riskLevel,
		warrantyStatus: riskData.warrantyStatus,
		checkupIntervalMonths: riskData.checkupIntervalMonths,
		issueDate: issueDateIso,
		warrantyExpirationDate,
		serviceLifeExpirationDate,
		nextCheckupDueDate,
		checkupSchedule,
		riskFactorsApplied: riskData.appliedFactors,
		clinicalRationale: riskData.clinicalRationale,
		specialProvisions: riskData.specialProvisions,
	};
}

export function calculateMultiItemWarrantyTerms(
	items: WarrantyItem[],
	riskFactors?: WarrantyRiskFactors | undefined,
	issueDateInput?: string | Date,
): WarrantyCalculationResult {
	if (items.length === 0) {
		return calculateWarrantyTerms({ category: "composite_restoration", riskFactors, issueDate: issueDateInput });
	}

	let primaryCategory: WarrantyCategory = items[0]?.category ?? "composite_restoration";
	if (items.some((it) => it.category === "implant_fixture")) primaryCategory = "implant_fixture";
	else if (items.some((it) => it.category === "ceramic_crown_veneer")) primaryCategory = "ceramic_crown_veneer";
	else if (items.some((it) => it.category === "orthodontic_aligners")) primaryCategory = "orthodontic_aligners";

	const maxCustomWarranty = items.reduce<number | undefined>((max, it) => {
		if (it.customWarrantyMonths !== undefined) {
			return max === undefined ? it.customWarrantyMonths : Math.max(max, it.customWarrantyMonths);
		}
		return max;
	}, undefined);

	return calculateWarrantyTerms({
		category: primaryCategory,
		customWarrantyMonths: maxCustomWarranty,
		riskFactors,
		issueDate: issueDateInput,
		teethCount: items.length,
	});
}
