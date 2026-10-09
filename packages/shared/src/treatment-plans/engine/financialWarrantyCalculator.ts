/**
 * DENTE Dental CRM — Multi-Option Treatment Plan & Phased Clinical Estimate Engine
 * Layer 1: Financial & Warranty Calculator
 *
 * Fully compliant with:
 * - Налоговый кодекс РФ (ст. 219 НК РФ: 13% вычет на стандартное лечение Код 01 с лимитом 150 000 ₽ и дорогостоящее Код 02 без лимита)
 * - Закон РФ «О защите прав потребителей» (ст. 29: гарантийные обязательства на стоматологические конструкции и реставрации)
 * - Правила округления целочисленной копеечной арифметики DENTE Zero Fractional Loss
 */

import {
	type Kopecks,
	percentageOfKopecks,
	splitKopecks,
	formatKopecksRu,
} from "../../utils/money.js";
import { ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 } from "../../finance/taxDeduction.js";
import { integerToRussianWords } from "../../sanpin/sanpinRegistryEngine.js";
import {
	PLAN_TIER_CONFIGS,
	type PlanTierKey,
	type PlanInstallmentSchedule,
	type PlanNdflDeductionSummary,
	type TreatmentPlanItem,
} from "./types.js";

/**
 * Расчет пропорционального разделения стоимости на работу и материалы
 * с гарантией точного совпадения суммы с общей ценой (в целых копейках).
 */
export function splitLaborAndMaterials(
	netCostKopecks: Kopecks,
	tierKey: PlanTierKey,
	explicitLaborKopecks?: Kopecks,
	explicitMaterialsKopecks?: Kopecks,
): { laborKopecks: Kopecks; materialsKopecks: Kopecks } {
	if (netCostKopecks <= 0) {
		return { laborKopecks: 0, materialsKopecks: 0 };
	}

	if (
		typeof explicitLaborKopecks === "number" &&
		typeof explicitMaterialsKopecks === "number" &&
		explicitLaborKopecks + explicitMaterialsKopecks === netCostKopecks
	) {
		return {
			laborKopecks: explicitLaborKopecks,
			materialsKopecks: explicitMaterialsKopecks,
		};
	}

	const config = PLAN_TIER_CONFIGS[tierKey];
	const laborBasisPoints = Math.round(config.defaultLaborRatio * 10000);
	const labor = percentageOfKopecks(netCostKopecks, laborBasisPoints);
	const materials = netCostKopecks - labor;

	return {
		laborKopecks: labor,
		materialsKopecks: materials,
	};
}

/**
 * Расчет графика беспроцентной рассрочки 0% без потери копеек.
 */
export function calculateTierInstallments(
	totalCostKopecks: Kopecks,
): Record<3 | 6 | 12 | 24, PlanInstallmentSchedule> {
	const periods: Array<3 | 6 | 12 | 24> = [3, 6, 12, 24];
	const result = {} as Record<3 | 6 | 12 | 24, PlanInstallmentSchedule>;

	for (const months of periods) {
		if (totalCostKopecks <= 0) {
			result[months] = {
				months,
				monthlyPaymentKopecks: 0,
				monthlyPaymentRu: "0 ₽",
				partsKopecks: Array(months).fill(0),
				remainderKopecks: 0,
				isZeroPercentInterest: true,
			};
			continue;
		}

		const parts = splitKopecks(totalCostKopecks, months);
		const firstPart = parts[0] ?? 0;
		result[months] = {
			months,
			monthlyPaymentKopecks: firstPart,
			monthlyPaymentRu: formatKopecksRu(firstPart),
			partsKopecks: parts,
			remainderKopecks: 0,
			isZeroPercentInterest: true,
		};
	}

	return result;
}

/**
 * Расчет 13% налогового вычета НДФЛ по смете.
 */
export function calculateTierNdflDeduction(
	items: readonly TreatmentPlanItem[],
): PlanNdflDeductionSummary {
	let code01BaseKopecks = 0;
	let code02BaseKopecks = 0;

	for (const item of items) {
		if (item.isHighCostCode02) {
			code02BaseKopecks += item.totalCostKopecks;
		} else {
			code01BaseKopecks += item.totalCostKopecks;
		}
	}

	const annualLimitKopecks = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 * 100;
	const cappedCode01Kopecks = Math.min(code01BaseKopecks, annualLimitKopecks);
	const totalEligibleBaseKopecks = cappedCode01Kopecks + code02BaseKopecks;

	// 13% НДФЛ в базисных пунктах (1300 б.п.)
	const refundKopecks = percentageOfKopecks(totalEligibleBaseKopecks, 1300);
	const totalPlanKopecks = code01BaseKopecks + code02BaseKopecks;
	const netCostAfterNdflKopecks = Math.max(0, totalPlanKopecks - refundKopecks);

	return {
		standardCode01BaseKopecks: code01BaseKopecks,
		standardCode01CappedKopecks: cappedCode01Kopecks,
		expensiveCode02BaseKopecks: code02BaseKopecks,
		totalEligibleBaseKopecks,
		refundKopecks,
		refundRu: formatKopecksRu(refundKopecks),
		netCostAfterNdflKopecks,
		annualLimitKopecks,
	};
}

export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function formatRublesFromKopecks(kopecks: Kopecks): string {
	const whole = Math.trunc(kopecks / 100);
	const frac = Math.abs(kopecks % 100);
	const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
	return `${grouped},${String(frac).padStart(2, "0")}\u00A0₽`;
}

export function convertKopecksToRussianWords(kopecks: Kopecks): string {
	const n = Math.max(0, Math.floor(kopecks / 100));
	const kop = Math.abs(kopecks % 100);
	const words = integerToRussianWords(n);
	const capitalized = words.charAt(0).toUpperCase() + words.slice(1);

	let rubWord = "рублей";
	const mod10 = n % 10;
	const mod100 = n % 100;
	if (mod10 === 1 && mod100 !== 11) rubWord = "рубль";
	else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) rubWord = "рубля";

	let kopWord = "копеек";
	const kMod10 = kop % 10;
	const kMod100 = kop % 100;
	if (kMod10 === 1 && kMod100 !== 11) kopWord = "копейка";
	else if (kMod10 >= 2 && kMod10 <= 4 && (kMod100 < 10 || kMod100 >= 20)) kopWord = "копейки";

	return `${capitalized} ${rubWord} ${String(kop).padStart(2, "0")} ${kopWord}`;
}
