/**
 * types.ts — Контракты 1-кликового запуска цикла автоклавирования (Мандаты 8e, 8n, 8s).
 * Максимум 120 строк согласно Мандату 8b.
 */

import type { SterilizationLogRecord } from "@dental/shared";
import type { InventoryStockItem } from "../../../store/inventoryStore.js";

export interface SterilizationBatchPackageItem {
	readonly id: string;
	readonly name: string;
	readonly count: number;
	readonly craftPouchItemId: string;
	readonly pouchSize: string;
}

export interface SterilizationBatchCycleInput {
	readonly organizationId: string;
	readonly cycleNumber?: number | undefined;
	readonly operatorName?: string | undefined;
	readonly autoclaveDeviceName?: string | undefined;
	readonly packages: readonly SterilizationBatchPackageItem[];
	readonly indicatorPassed?: boolean | undefined;
	readonly warehouseItems?: readonly InventoryStockItem[] | undefined;
}

export interface StockDeductionSummaryItem {
	readonly id: string;
	readonly name: string;
	readonly quantity: number;
	readonly currentStock: number;
	readonly afterStock: number;
	readonly isOverdraft: boolean;
}

export interface SterilizationBatchCycleResult {
	readonly success: boolean;
	readonly cycleRecord: SterilizationLogRecord;
	readonly deductions: readonly StockDeductionSummaryItem[];
	readonly overdraftItems: readonly StockDeductionSummaryItem[];
	readonly isSoftOverdraft: boolean;
	readonly nurseWarningBanner?: string | undefined;
}

export const DEFAULT_AUTOCLAVE_REGIME = {
	nameRu: "Стандартный цикл 134°C / 2.1 bar, 45 мин",
	temperatureCelsius: 134.5,
	pressureBar: 2.12,
	durationMin: 45,
	indicatorClassRu: "Индикатор 5 класса (пар 134°C / 2.1 bar) — ✓ Тест пройден",
} as const;

export const DEFAULT_STERILIZATION_PACKAGES: readonly SterilizationBatchPackageItem[] =
	[
		{
			id: "therapy_trays",
			name: "Терапевтические наборы",
			count: 5,
			craftPouchItemId: "craft_pouch_100x200",
			pouchSize: "100×200 мм",
		},
		{
			id: "surgery_trays",
			name: "Хирургические наборы",
			count: 2,
			craftPouchItemId: "craft_pouch_150x250",
			pouchSize: "150×250 мм",
		},
	];
