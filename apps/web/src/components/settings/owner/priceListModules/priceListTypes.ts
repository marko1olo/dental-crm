/**
 * priceListTypes.ts
 *
 * Канонические типы и интерфейсы для секции прейскуранта 804н и калькуляции маржинальности.
 * Все финансовые расчеты ведутся строго в целочисленных копейках (integer kopecks).
 */

import type {
	Order804nCategory,
	ServicePricelistItem,
} from "../../../catalog/pricelist/servicePricelistPresets";

export interface CustomServicePriceOverride {
	readonly serviceId: string;
	readonly customPriceKopecks: number;
	readonly customMaterialCostKopecks?: number;
	readonly customLabCostKopecks?: number;
}

export interface ServiceWithMargin extends ServicePricelistItem {
	readonly effectivePriceKopecks: number;
	readonly materialCostKopecks: number;
	readonly labCostKopecks: number;
	readonly totalDirectCostsKopecks: number;
	readonly netMarginKopecks: number;
	readonly marginPct: number;
}

export interface PriceListStats {
	readonly totalServices: number;
	readonly totalValueKopecks: number;
	readonly avgMarginPct: number;
	readonly highMarginCount: number;
	readonly lowMarginCount: number;
}

export interface CategoryOption {
	readonly key: string;
	readonly label: string;
}

export const PRICELIST_CATEGORIES: readonly CategoryOption[] = [
	{ key: "all", label: "Все" },
	{ key: "consultation", label: "Консультации" },
	{ key: "therapy", label: "Терапия" },
	{ key: "surgery", label: "Хирургия" },
	{ key: "orthopedics", label: "Ортопедия" },
	{ key: "orthodontics", label: "Ортодонтия" },
	{ key: "pediatric", label: "Детская" },
	{ key: "radiology", label: "Снимки и КТ" },
	{ key: "hygiene", label: "Гигиена" },
	{ key: "periodontics", label: "Пародонтология" },
	{ key: "anesthesia", label: "Анестезия" },
];
