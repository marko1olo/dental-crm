/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/sterilizationConsumablesTypes.ts
 *
 * Типы и контракты автоматического списания расходных материалов цикла автоклавирования.
 * Мандат 8b: строго <= 120 строк.
 */

export interface SterilizationDeductionParams {
	readonly organizationId: string;
	readonly userId?: string | null;
	readonly count?: number;
	readonly packagingType?: string | null;
	readonly indicatorType?: string | null;
	readonly cycleNumber?: number;
	readonly barcode?: string | null;
}

export interface SterilizationDeductionResult {
	readonly success: boolean;
	readonly deductedItems: Array<{
		readonly itemName: string;
		readonly quantityDeducted: number;
		readonly isOverdraft: boolean;
		readonly remainingStock: number;
	}>;
}

export interface SterilizationDeductionItem {
	readonly name: string;
	readonly qty: number;
	readonly category: string;
	readonly unit: string;
}

export function resolveConsumablesToDeduct(
	count: number,
	packagingType?: string | null,
	indicatorType?: string | null,
): SterilizationDeductionItem[] {
	const isKraftHeatSealed =
		packagingType?.includes("heat") ||
		packagingType === "kraft_heat_sealed" ||
		packagingType?.includes("laminat");

	const targetPouchName = isKraftHeatSealed
		? "Пакеты комбинированные термосвариваемые (стерилизация)"
		: "Крафт-пакеты самоклеящиеся 100х200 мм";

	const targetIndicatorName = indicatorType?.includes("6")
		? "Индикаторы стерилизации 6 класс (DGM / Винар)"
		: "Индикаторы стерилизации 5 класс интегратор (Винар МедИС / ИнТест)";

	return [
		{ name: targetPouchName, qty: count, category: "consumable", unit: "шт" },
		{ name: targetIndicatorName, qty: 1, category: "consumable", unit: "шт" }, // СТРОГО 1 ШТУКА НА КАМЕРУ!
	];
}

export function resolveSterilizationConsumableItems(
	count: number,
	targetPouchName = "Крафт-пакеты для стерилизации 100х200 мм",
	targetIndicatorName = "Индикаторы стерилизации 5 класс (пар)",
): SterilizationDeductionItem[] {
	return [
		{ name: targetPouchName, qty: count, category: "consumable", unit: "шт" },
		{ name: targetIndicatorName, qty: 1, category: "consumable", unit: "шт" }, // СТРОГО 1 ШТУКА НА КАМЕРУ!
	];
}
