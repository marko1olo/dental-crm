/**
 * inventoryReorderEngine.ts — Automated Inventory Reorder Point (ROP) & Supplier Reliability Rating.
 *
 * Wave 120 — Warehouse Reorder & Supplier Rating Adapter.
 *
 * Reference implementation adapted from DentalPin:
 * - backend/app/modules/inventory_reorder/service.py
 * - backend/app/modules/supplier_ratings/service.py
 *
 * INVARIANTS:
 * 1. Zero Mocks & Zero Dead-Ends:
 *    - Fully typed with Zod contracts and pure deterministic calculations.
 * 2. Kopeck-Exact Valuation:
 *    - Integer kopecks for financial valuations (unitPriceKopecks, totalEstimatedCostKopecks).
 * 3. Robust Division Safety:
 *    - Strict guard rails against division by zero (0 lookback days, 0 usage, 0 lead time, 0 deliveries).
 * 4. Priority Categorization:
 *    - URGENT_OUT_OF_STOCK (stock <= 0)
 *    - CRITICAL_REORDER (stock <= leadTimeDemand)
 *    - STANDARD_REORDER (stock < reorderPoint)
 *    - OPTIMAL (available >= reorderPoint)
 * 5. Supplier Risk Tiers:
 *    - RELIABLE (compositeScore >= 4.2)
 *    - MODERATE_RISK (3.0 <= compositeScore < 4.2)
 *    - HIGH_RISK (compositeScore < 3.0)
 */

import { z } from "zod";

// ─── 1. STATUTORY & ALGORITHMIC CONSTANTS ─────────────────────────────────────

/** Default historical consumption lookback period in days (90 days). */
export const DEFAULT_LOOKBACK_DAYS = 90;

/** Default stock buffer cover period in days (30 days). */
export const DEFAULT_COVER_DAYS = 30;

/** Default safety stock buffer ratio relative to lead time demand (20%). */
export const DEFAULT_SAFETY_STOCK_RATIO = 0.2;

// ─── 2. STATUS & RISK TIER SCHEMAS ────────────────────────────────────────────

export const reorderStatusSchema = z.enum([
	"URGENT_OUT_OF_STOCK",
	"CRITICAL_REORDER",
	"STANDARD_REORDER",
	"OPTIMAL",
]);
export type ReorderStatus = z.infer<typeof reorderStatusSchema>;

export const REORDER_STATUS_LABELS_RU: Record<ReorderStatus, string> = {
	URGENT_OUT_OF_STOCK: "Срочно: нулевой остаток",
	CRITICAL_REORDER: "Критический повторный заказ (меньше срока поставки)",
	STANDARD_REORDER: "Стандартный повторный заказ",
	OPTIMAL: "Остаток в норме",
};

export const supplierRiskTierSchema = z.enum([
	"RELIABLE",
	"MODERATE_RISK",
	"HIGH_RISK",
]);
export type SupplierRiskTier = z.infer<typeof supplierRiskTierSchema>;

export const SUPPLIER_RISK_TIER_LABELS_RU: Record<SupplierRiskTier, string> = {
	RELIABLE: "Надежный поставщик",
	MODERATE_RISK: "Умеренный риск",
	HIGH_RISK: "Высокий риск",
};

// ─── 3. REORDER CALCULATION CONTRACTS ─────────────────────────────────────────

export const reorderCalculationParamsSchema = z.object({
	inventoryItemId: z.string().optional(),
	itemName: z.string().optional(),
	category: z.string().optional(),
	unit: z.string().optional(),
	stockQuantity: z.number(),
	onOrderQuantity: z.number().default(0),
	usageLookbackTotal: z.number(),
	lookbackDays: z.number().positive().default(DEFAULT_LOOKBACK_DAYS),
	leadTimeDays: z.number().nonnegative().default(0),
	minQuantity: z.number().nonnegative().default(0),
	coverDays: z.number().positive().default(DEFAULT_COVER_DAYS),
	safetyStockRatio: z
		.number()
		.nonnegative()
		.default(DEFAULT_SAFETY_STOCK_RATIO),
	unitPriceKopecks: z.number().int().nonnegative().optional(),
	supplierId: z.string().optional().nullable(),
	supplierName: z.string().optional().nullable(),
	includeOptimal: z.boolean().default(false),
});
export type ReorderCalculationParams = z.infer<
	typeof reorderCalculationParamsSchema
>;
export type ReorderCalculationInput = z.input<
	typeof reorderCalculationParamsSchema
>;

export const reorderSuggestionSchema = z.object({
	inventoryItemId: z.string().optional(),
	itemName: z.string().optional(),
	category: z.string().optional(),
	unit: z.string().optional(),
	dailyUsage: z.number(),
	leadTimeDemand: z.number(),
	reorderPoint: z.number(),
	available: z.number(),
	stockQuantity: z.number(),
	onOrderQuantity: z.number(),
	coverDays: z.number(),
	cover: z.number(),
	suggestedQuantity: z.number(),
	status: reorderStatusSchema,
	estimatedStockDepletionDays: z.number(),
	safetyStock: z.number().optional(),
	unitPriceKopecks: z.number().int().optional(),
	totalEstimatedCostKopecks: z.number().int().optional(),
	supplierId: z.string().optional().nullable(),
	supplierName: z.string().optional().nullable(),
});
export type ReorderSuggestion = z.infer<typeof reorderSuggestionSchema>;

// ─── 4. SUPPLIER RATING CONTRACTS ─────────────────────────────────────────────

export const supplierRatingWeightsSchema = z.object({
	onTimeWeight: z.number().positive().optional(),
	qualityWeight: z.number().positive().optional(),
	reviewWeight: z.number().positive().optional(),
});
export type SupplierRatingWeights = z.infer<typeof supplierRatingWeightsSchema>;

export const supplierRatingInputSchema = z.object({
	supplierId: z.string().optional(),
	supplierName: z.string().optional(),
	totalReceivedDeliveries: z.number().int().nonnegative().default(0),
	onTimeDeliveries: z.number().int().nonnegative().default(0),
	defectDeliveries: z.number().int().nonnegative().default(0).optional(),
	onTimeDeliveryRatePct: z.number().min(0).max(100).optional(),
	defectRatePct: z.number().min(0).max(100).optional(),
	manualReviewScore: z.number().min(1).max(5).optional(),
	weights: supplierRatingWeightsSchema.optional(),
});
export type SupplierRatingInput = z.infer<typeof supplierRatingInputSchema>;

export const supplierRatingScoreSchema = z.object({
	supplierId: z.string().optional(),
	supplierName: z.string().optional(),
	totalReceivedDeliveries: z.number().int().nonnegative(),
	onTimeDeliveries: z.number().int().nonnegative(),
	defectDeliveries: z.number().int().nonnegative(),
	onTimeDeliveryRatePct: z.number(),
	defectRatePct: z.number(),
	compositeScore: z.number(),
	riskTier: supplierRiskTierSchema,
	manualReviewScore: z.number().optional(),
	breakdown: z
		.object({
			onTimeScore: z.number(),
			qualityScore: z.number(),
			reviewScore: z.number().optional(),
		})
		.optional(),
});
export type SupplierRatingScore = z.infer<typeof supplierRatingScoreSchema>;

// ─── 5. PURE CALCULATION ALGORITHMS ───────────────────────────────────────────

/**
 * Computes an inventory reorder recommendation based on historical consumption,
 * supplier lead time, stock on hand, and current outstanding purchase orders.
 *
 * FORMULAS:
 * - dailyUsage = usageLookbackTotal / lookbackDays (rounded to 2 decimal places)
 * - leadTimeDemand = Math.ceil(dailyUsage * leadTimeDays)
 * - reorderPoint = Math.max(minQuantity, leadTimeDemand)
 * - available = stockQuantity + onOrderQuantity
 * - If available >= reorderPoint:
 *     return null (or suggestion with status OPTIMAL if includeOptimal is true)
 * - If available < reorderPoint:
 *     cover = Math.ceil(dailyUsage * coverDays)
 *     suggestedQuantity = Math.max(1, reorderPoint + cover - available)
 *     status = URGENT_OUT_OF_STOCK (if stock <= 0),
 *              CRITICAL_REORDER (if stock <= leadTimeDemand),
 *              STANDARD_REORDER (otherwise)
 *     estimatedStockDepletionDays = dailyUsage > 0 ? Math.floor(stockQuantity / dailyUsage) : Infinity
 */
export function computeReorderSuggestion(
	params: ReorderCalculationInput,
): ReorderSuggestion | null {
	const stockQuantity = params.stockQuantity ?? 0;
	const onOrderQuantity = params.onOrderQuantity ?? 0;
	const usageLookbackTotal = Math.max(0, params.usageLookbackTotal ?? 0);
	const lookbackDays =
		params.lookbackDays !== undefined && params.lookbackDays > 0
			? params.lookbackDays
			: DEFAULT_LOOKBACK_DAYS;
	const leadTimeDays = Math.max(0, params.leadTimeDays ?? 0);
	const minQuantity = Math.max(0, params.minQuantity ?? 0);
	const coverDays =
		params.coverDays !== undefined && params.coverDays > 0
			? params.coverDays
			: DEFAULT_COVER_DAYS;
	const safetyStockRatio =
		params.safetyStockRatio !== undefined && params.safetyStockRatio >= 0
			? params.safetyStockRatio
			: DEFAULT_SAFETY_STOCK_RATIO;

	// 1. Daily consumption rate (rounded to 2 decimal places)
	const rawDailyUsage = lookbackDays > 0 ? usageLookbackTotal / lookbackDays : 0;
	const dailyUsage = Math.round(rawDailyUsage * 100) / 100;

	// 2. Expected demand during supplier lead time
	const leadTimeDemand = Math.ceil(dailyUsage * leadTimeDays);

	// 3. Reorder point (ROP)
	const reorderPoint = Math.max(minQuantity, leadTimeDemand);

	// 4. Total available inventory (on-hand + on-order)
	const available = stockQuantity + onOrderQuantity;

	// 5. Informational safety stock buffer
	const safetyStock = Math.ceil(leadTimeDemand * safetyStockRatio);

	// 6. Estimated days until stock depletion
	const estimatedStockDepletionDays =
		dailyUsage > 0
			? Math.max(0, Math.floor(stockQuantity / dailyUsage))
			: Infinity;

	// 7. Check if reorder is needed
	if (available >= reorderPoint) {
		if (params.includeOptimal) {
			const unitPriceKopecks = params.unitPriceKopecks;
			return {
				inventoryItemId: params.inventoryItemId,
				itemName: params.itemName,
				category: params.category,
				unit: params.unit,
				dailyUsage,
				leadTimeDemand,
				reorderPoint,
				available,
				stockQuantity,
				onOrderQuantity,
				coverDays,
				cover: 0,
				suggestedQuantity: 0,
				status: "OPTIMAL",
				estimatedStockDepletionDays,
				safetyStock,
				unitPriceKopecks,
				totalEstimatedCostKopecks: 0,
				supplierId: params.supplierId,
				supplierName: params.supplierName,
			};
		}
		return null;
	}

	// 8. Reorder required: compute target cover stock & suggested purchase quantity
	const cover = Math.ceil(dailyUsage * coverDays);
	const suggestedQuantity = Math.max(1, reorderPoint + cover - available);

	// 9. Determine urgency status
	let status: ReorderStatus;
	if (stockQuantity <= 0) {
		status = "URGENT_OUT_OF_STOCK";
	} else if (stockQuantity <= leadTimeDemand) {
		status = "CRITICAL_REORDER";
	} else {
		status = "STANDARD_REORDER";
	}

	// 10. Financial valuation (exact integer kopecks)
	const unitPriceKopecks = params.unitPriceKopecks;
	const totalEstimatedCostKopecks =
		unitPriceKopecks !== undefined
			? Math.round(suggestedQuantity * unitPriceKopecks)
			: undefined;

	return {
		inventoryItemId: params.inventoryItemId,
		itemName: params.itemName,
		category: params.category,
		unit: params.unit,
		dailyUsage,
		leadTimeDemand,
		reorderPoint,
		available,
		stockQuantity,
		onOrderQuantity,
		coverDays,
		cover,
		suggestedQuantity,
		status,
		estimatedStockDepletionDays,
		safetyStock,
		unitPriceKopecks,
		totalEstimatedCostKopecks,
		supplierId: params.supplierId,
		supplierName: params.supplierName,
	};
}

/**
 * Computes supplier performance rating and composite risk tier.
 *
 * METRICS:
 * - onTimeDeliveryRatePct = onTimeDeliveries / totalReceivedDeliveries * 100
 * - defectRatePct = defectDeliveries / totalReceivedDeliveries * 100
 * - compositeScore = weighted score mapped to 1.0–5.0
 * - riskTier:
 *     RELIABLE (>= 4.2)
 *     MODERATE_RISK (3.0..4.19)
 *     HIGH_RISK (< 3.0)
 */
export function computeSupplierRating(
	params: SupplierRatingInput,
): SupplierRatingScore {
	const totalReceived = Math.max(0, params.totalReceivedDeliveries ?? 0);
	const onTimeCount = Math.max(0, params.onTimeDeliveries ?? 0);
	const defectCount = Math.max(0, params.defectDeliveries ?? 0);

	// 1. Calculate on-time delivery rate percentage (0..100)
	let onTimeDeliveryRatePct: number;
	if (params.onTimeDeliveryRatePct !== undefined) {
		onTimeDeliveryRatePct = Math.max(0, Math.min(100, params.onTimeDeliveryRatePct));
	} else if (totalReceived > 0) {
		onTimeDeliveryRatePct =
			Math.round((onTimeCount / totalReceived) * 10000) / 100;
	} else {
		onTimeDeliveryRatePct = 0;
	}

	// 2. Calculate defect rate percentage (0..100)
	let defectRatePct: number;
	if (params.defectRatePct !== undefined) {
		defectRatePct = Math.max(0, Math.min(100, params.defectRatePct));
	} else if (totalReceived > 0) {
		defectRatePct =
			Math.round((defectCount / totalReceived) * 10000) / 100;
	} else {
		defectRatePct = 0;
	}

	// 3. Map sub-rates to 1.0–5.0 scale
	// On-time: 100% -> 5.0, 0% -> 1.0
	const onTimeScore =
		totalReceived > 0 || params.onTimeDeliveryRatePct !== undefined
			? 1.0 + (onTimeDeliveryRatePct / 100) * 4.0
			: 3.0; // neutral fallback when no deliveries exist

	// Quality: 0% defects -> 5.0, 100% defects -> 1.0
	const qualityScore =
		totalReceived > 0 || params.defectRatePct !== undefined
			? 1.0 + (Math.max(0, 100 - defectRatePct) / 100) * 4.0
			: 3.0;

	// 4. Calculate composite score with weights
	let compositeScore: number;
	const manualScore = params.manualReviewScore;

	if (totalReceived === 0 && params.onTimeDeliveryRatePct === undefined && params.defectRatePct === undefined) {
		// New unrated supplier with 0 deliveries
		compositeScore = manualScore !== undefined ? manualScore : 3.0;
	} else if (manualScore !== undefined) {
		const wOnTime = params.weights?.onTimeWeight ?? 0.45;
		const wQuality = params.weights?.qualityWeight ?? 0.35;
		const wReview = params.weights?.reviewWeight ?? 0.20;
		const totalWeight = wOnTime + wQuality + wReview;
		const rawScore =
			(onTimeScore * wOnTime +
				qualityScore * wQuality +
				manualScore * wReview) /
			(totalWeight > 0 ? totalWeight : 1);
		compositeScore = Math.round(Math.min(5.0, Math.max(1.0, rawScore)) * 100) / 100;
	} else {
		const wOnTime = params.weights?.onTimeWeight ?? 0.60;
		const wQuality = params.weights?.qualityWeight ?? 0.40;
		const totalWeight = wOnTime + wQuality;
		const rawScore =
			(onTimeScore * wOnTime + qualityScore * wQuality) /
			(totalWeight > 0 ? totalWeight : 1);
		compositeScore = Math.round(Math.min(5.0, Math.max(1.0, rawScore)) * 100) / 100;
	}

	// 5. Determine risk tier
	const riskTier = determineSupplierRiskTier(compositeScore);

	return {
		supplierId: params.supplierId,
		supplierName: params.supplierName,
		totalReceivedDeliveries: totalReceived,
		onTimeDeliveries: onTimeCount,
		defectDeliveries: defectCount,
		onTimeDeliveryRatePct,
		defectRatePct,
		compositeScore,
		riskTier,
		manualReviewScore: manualScore,
		breakdown: {
			onTimeScore: Math.round(onTimeScore * 100) / 100,
			qualityScore: Math.round(qualityScore * 100) / 100,
			reviewScore: manualScore,
		},
	};
}

/**
 * Determines supplier risk classification tier based on composite score:
 * - RELIABLE: score >= 4.2
 * - MODERATE_RISK: 3.0 <= score < 4.2
 * - HIGH_RISK: score < 3.0
 */
export function determineSupplierRiskTier(score: number): SupplierRiskTier {
	if (score >= 4.2) {
		return "RELIABLE";
	}
	if (score >= 3.0) {
		return "MODERATE_RISK";
	}
	return "HIGH_RISK";
}

// ─── 6. BATCH PROCESSING & PURCHASE ORDER GROUPING ────────────────────────────

/**
 * Computes reorder suggestions for an array of items, filtering out items that do not require reorder,
 * and sorting results by urgency: URGENT_OUT_OF_STOCK -> CRITICAL_REORDER -> STANDARD_REORDER.
 */
export function computeBatchReorderSuggestions(
	items: ReorderCalculationInput[],
): ReorderSuggestion[] {
	const suggestions: ReorderSuggestion[] = [];

	for (const item of items) {
		const suggestion = computeReorderSuggestion(item);
		if (suggestion !== null && suggestion.suggestedQuantity > 0) {
			suggestions.push(suggestion);
		}
	}

	// Priority sort: URGENT (0) -> CRITICAL (1) -> STANDARD (2) -> alphabetical
	const priorityWeight: Record<ReorderStatus, number> = {
		URGENT_OUT_OF_STOCK: 0,
		CRITICAL_REORDER: 1,
		STANDARD_REORDER: 2,
		OPTIMAL: 3,
	};

	suggestions.sort((a, b) => {
		const diff = priorityWeight[a.status] - priorityWeight[b.status];
		if (diff !== 0) return diff;
		const nameA = a.itemName ?? "";
		const nameB = b.itemName ?? "";
		return nameA.localeCompare(nameB);
	});

	return suggestions;
}

/**
 * Groups reorder suggestions by supplier ID for automated Draft Purchase Order generation.
 * Follows the DentalPin ReorderService.generate_orders pattern.
 */
export function groupSuggestionsBySupplier(
	suggestions: ReorderSuggestion[],
): Record<string, ReorderSuggestion[]> {
	const grouped: Record<string, ReorderSuggestion[]> = {};

	for (const suggestion of suggestions) {
		const supplierKey = suggestion.supplierId ?? "unassigned";
		if (!grouped[supplierKey]) {
			grouped[supplierKey] = [];
		}
		grouped[supplierKey].push(suggestion);
	}

	return grouped;
}
