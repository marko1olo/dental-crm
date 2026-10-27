/**
 * packages/shared/src/finance/payrollModules/payrollRules.ts
 * Clinical category commission percentages, assistant shifts and KPI bonus tiers.
 * Mandate 8b: <= 120 lines.
 */

import type { AssistantShiftRateRule, KpiBonusTier } from "./payrollPresetTypes.js";

export const ASSISTANT_SHIFT_RULE: AssistantShiftRateRule = {
	baseShiftRateKop: 350000,
	radiographBonusKop: 15000,
	surgeryAssistanceBonusKop: 20000,
	overtimeHourlyRateKop: 50000,
};

export const KPI_BONUS_TIERS: readonly KpiBonusTier[] = [
	{
		minRevenueKop: 100000000,
		bonusPercentage: 5,
		badgeLabelRu: "Топ-выручка (+5% премия)",
	},
	{
		minRevenueKop: 50000000,
		bonusPercentage: 2,
		badgeLabelRu: "Личный план выполнен (+2% премия)",
	},
	{
		minRevenueKop: 0,
		bonusPercentage: 0,
		badgeLabelRu: "Базовая ставка",
	},
];

export const CLINICAL_CATEGORY_COMMISSION_PERCENT: Record<
	"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric",
	number
> = {
	therapy: 30,
	orthopedics: 30,
	surgery: 22,
	orthodontics: 25,
	hygiene: 30,
	retail_hygiene: 10,
	pediatric: 25,
};

export const DEFAULT_CATEGORY_COMMISSION_PERCENT: Record<
	"therapy" | "orthopedics" | "surgery" | "orthodontics" | "hygiene" | "retail_hygiene" | "pediatric",
	number
> = {
	therapy: 30,
	orthopedics: 30,
	surgery: 20,
	orthodontics: 25,
	hygiene: 30,
	retail_hygiene: 10,
	pediatric: 25,
};
