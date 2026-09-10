/**
 * reorderEngine.ts — Predictive Inventory Reorder Point & Purchase Suggestion Engine.
 *
 * Implements the DentalPin predictive reorder model:
 * - LOOKBACK_DAYS = 90 (90-day historical consumption window)
 * - COVER_DAYS = 30 (30-day stock cover buffer)
 * - daily_usage = usage_90d / 90 (quantized to 0.01)
 * - lead_time_demand = ceil(daily_usage * lead_time_days)
 * - reorder_point = max(min_quantity, lead_time_demand)
 * - available = stock_quantity + on_order
 * - If available < reorder_point:
 *     cover = ceil(daily_usage * 30)
 *     suggested_quantity = reorder_point + cover - available
 * - Kopeck-exact purchase valuations (Math.round to integer kopecks).
 */

import { z } from "zod";

export const REORDER_LOOKBACK_DAYS = 90;
export const REORDER_COVER_DAYS = 30;

/**
 * Input contract for calculating reorder parameters for an inventory item.
 */
export const reorderItemInputSchema = z.object({
	inventoryItemId: z.string().min(1, "ID материала обязателен"),
	itemName: z.string().min(1, "Наименование материала обязательно"),
	category: z.string().default("material"),
	unit: z.string().default("шт"),
	stockQuantity: z.number(),
	minQuantity: z.number().nonnegative().default(0),
	usage90d: z.number().nonnegative().default(0),
	onOrder: z.number().nonnegative().default(0),
	leadTimeDays: z.number().int().nonnegative().default(0),
	supplierId: z.string().nullable().optional(),
	supplierName: z.string().nullable().optional(),
	unitPriceRub: z.number().nonnegative().default(0),
	isPreferredSupplier: z.boolean().default(false).optional(),
});

export type ReorderItemInput = z.infer<typeof reorderItemInputSchema>;

/**
 * Output contract representing a single reorder suggestion.
 */
export const reorderSuggestionSchema = z.object({
	inventoryItemId: z.string(),
	itemName: z.string(),
	category: z.string(),
	unit: z.string(),
	usage90d: z.number(),
	dailyUsage: z.number(),
	leadTimeDays: z.number(),
	leadTimeDemand: z.number(),
	minQuantity: z.number(),
	reorderPoint: z.number(),
	stockQuantity: z.number(),
	onOrder: z.number(),
	availableQuantity: z.number(),
	coverDays: z.number(),
	coverQuantity: z.number(),
	suggestedQuantity: z.number(),
	needsReorder: z.boolean(),
	supplierId: z.string().nullable().optional(),
	supplierName: z.string().nullable().optional(),
	unitPriceRub: z.number(),
	unitPriceKopecks: z.number().int(),
	estimatedCostKopecks: z.number().int(),
	estimatedCostRub: z.number(),
});

export type ReorderSuggestion = z.infer<typeof reorderSuggestionSchema>;

export const reorderSuggestionsSummarySchema = z.object({
	totalItemsEvaluated: z.number().int(),
	itemsNeedingReorder: z.number().int(),
	totalSuggestedQuantity: z.number(),
	totalEstimatedCostKopecks: z.number().int(),
	totalEstimatedCostRub: z.number(),
});

export type ReorderSuggestionsSummary = z.infer<
	typeof reorderSuggestionsSummarySchema
>;

export const reorderSuggestionsResponseSchema = z.object({
	summary: reorderSuggestionsSummarySchema,
	suggestions: z.array(reorderSuggestionSchema),
});

export type ReorderSuggestionsResponse = z.infer<
	typeof reorderSuggestionsResponseSchema
>;

/**
 * Calculates average daily consumption from 90-day usage quantized to 0.01 precision.
 */
export function calculateDailyUsage(
	usage90d: number,
	lookbackDays: number = REORDER_LOOKBACK_DAYS,
): number {
	if (!Number.isFinite(usage90d) || usage90d <= 0 || lookbackDays <= 0) {
		return 0;
	}
	const raw = usage90d / lookbackDays;
	return Math.round(raw * 100) / 100;
}

/**
 * Calculates lead time demand = ceil(daily_usage * lead_time_days).
 */
export function calculateLeadTimeDemand(
	dailyUsage: number,
	leadTimeDays: number,
): number {
	if (!Number.isFinite(dailyUsage) || dailyUsage <= 0 || leadTimeDays <= 0) {
		return 0;
	}
	return Math.ceil(dailyUsage * leadTimeDays);
}

/**
 * Calculates reorder point = max(min_quantity, lead_time_demand).
 */
export function calculateReorderPoint(
	minQuantity: number,
	leadTimeDemand: number,
): number {
	const min = Number.isFinite(minQuantity) && minQuantity > 0 ? minQuantity : 0;
	const ltd = Number.isFinite(leadTimeDemand) && leadTimeDemand > 0 ? leadTimeDemand : 0;
	return Math.max(min, ltd);
}

/**
 * Calculates suggested replenishment quantity and buffer quantities.
 */
export function calculateSuggestedQuantity(
	reorderPoint: number,
	dailyUsage: number,
	stockQuantity: number,
	onOrder: number = 0,
	coverDays: number = REORDER_COVER_DAYS,
): {
	suggestedQuantity: number;
	coverQuantity: number;
	availableQuantity: number;
	needsReorder: boolean;
} {
	const validStock = Number.isFinite(stockQuantity) ? stockQuantity : 0;
	const validOnOrder = Number.isFinite(onOrder) && onOrder > 0 ? onOrder : 0;
	const availableQuantity = validStock + validOnOrder;

	if (availableQuantity >= reorderPoint) {
		return {
			suggestedQuantity: 0,
			coverQuantity: 0,
			availableQuantity,
			needsReorder: false,
		};
	}

	const coverQuantity = Math.ceil(
		(dailyUsage > 0 ? dailyUsage : 0) * (coverDays > 0 ? coverDays : REORDER_COVER_DAYS),
	);

	const rawSuggested = reorderPoint + coverQuantity - availableQuantity;
	const suggestedQuantity = Math.max(0, Math.ceil(rawSuggested));

	return {
		suggestedQuantity,
		coverQuantity,
		availableQuantity,
		needsReorder: suggestedQuantity > 0,
	};
}

/**
 * Evaluates a single inventory item and generates a complete reorder suggestion.
 */
export function computeReorderSuggestion(
	rawInput: ReorderItemInput,
	options: {
		lookbackDays?: number;
		coverDays?: number;
	} = {},
): ReorderSuggestion {
	const input = reorderItemInputSchema.parse(rawInput);
	const lookbackDays = options.lookbackDays ?? REORDER_LOOKBACK_DAYS;
	const coverDays = options.coverDays ?? REORDER_COVER_DAYS;

	const dailyUsage = calculateDailyUsage(input.usage90d, lookbackDays);
	const leadTimeDemand = calculateLeadTimeDemand(dailyUsage, input.leadTimeDays);
	const reorderPoint = calculateReorderPoint(input.minQuantity, leadTimeDemand);

	const {
		suggestedQuantity,
		coverQuantity,
		availableQuantity,
		needsReorder,
	} = calculateSuggestedQuantity(
		reorderPoint,
		dailyUsage,
		input.stockQuantity,
		input.onOrder,
		coverDays,
	);

	const unitPriceRub = Number(input.unitPriceRub.toFixed(2));
	const unitPriceKopecks = Math.round(unitPriceRub * 100);
	const estimatedCostKopecks = Math.round(suggestedQuantity * unitPriceKopecks);
	const estimatedCostRub = Number((estimatedCostKopecks / 100).toFixed(2));

	return {
		inventoryItemId: input.inventoryItemId,
		itemName: input.itemName,
		category: input.category,
		unit: input.unit,
		usage90d: input.usage90d,
		dailyUsage,
		leadTimeDays: input.leadTimeDays,
		leadTimeDemand,
		minQuantity: input.minQuantity,
		reorderPoint,
		stockQuantity: input.stockQuantity,
		onOrder: input.onOrder,
		availableQuantity,
		coverDays,
		coverQuantity,
		suggestedQuantity,
		needsReorder,
		supplierId: input.supplierId ?? null,
		supplierName: input.supplierName ?? null,
		unitPriceRub,
		unitPriceKopecks,
		estimatedCostKopecks,
		estimatedCostRub,
	};
}

/**
 * Evaluates multiple inventory items, generates reorder suggestions, and produces a summary.
 */
export function computeReorderSuggestions(
	rawInputs: ReorderItemInput[],
	options: {
		lookbackDays?: number;
		coverDays?: number;
		onlyNeedingReorder?: boolean;
	} = {},
): ReorderSuggestionsResponse {
	const onlyNeedingReorder = options.onlyNeedingReorder ?? false;

	const suggestions: ReorderSuggestion[] = [];
	let totalSuggestedQuantity = 0;
	let totalEstimatedCostKopecks = 0;
	let itemsNeedingReorder = 0;

	for (const raw of rawInputs) {
		const suggestion = computeReorderSuggestion(raw, options);
		if (suggestion.needsReorder) {
			itemsNeedingReorder += 1;
			totalSuggestedQuantity += suggestion.suggestedQuantity;
			totalEstimatedCostKopecks += suggestion.estimatedCostKopecks;
		}
		if (!onlyNeedingReorder || suggestion.needsReorder) {
			suggestions.push(suggestion);
		}
	}

	suggestions.sort((a, b) => {
		if (a.needsReorder !== b.needsReorder) {
			return a.needsReorder ? -1 : 1;
		}
		return a.itemName.localeCompare(b.itemName, "ru");
	});

	const totalEstimatedCostRub = Number(
		(totalEstimatedCostKopecks / 100).toFixed(2),
	);

	return {
		summary: {
			totalItemsEvaluated: rawInputs.length,
			itemsNeedingReorder,
			totalSuggestedQuantity,
			totalEstimatedCostKopecks,
			totalEstimatedCostRub,
		},
		suggestions,
	};
}
