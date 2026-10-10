/**
 * stockThresholdEngine.ts — Layer 1: Reorder Thresholds & Stock Forecasting.
 *
 * Pure algorithmic calculations for reorder point (ROP), safety stock buffers,
 * daily material consumption forecasting, and critical threshold evaluation
 * for dental consumables (impression materials, composites, burs, needles, gloves, disinfectants).
 *
 * Invariants:
 * - Pure functions, 0 side-effects, 0 DOM/DB dependencies.
 * - Robust division safety (handles 0 days, 0 usage, non-finite values).
 * - Exact non-negative integer math.
 */

import type {
	StockThresholdConfig,
	ReorderThresholdStatus,
} from "./types.js";

/** Default safety stock buffer factor relative to lead time demand (20%) */
export const DEFAULT_SAFETY_STOCK_FACTOR = 0.2;

/**
 * Calculates average daily consumption from historical consumption data.
 *
 * @param consumptionHistory - Array of consumption quantities per observation period.
 * @param totalDays - Total days spanned by the history.
 * @returns Average daily consumption rounded to 2 decimals.
 */
export function calculateAverageDailyConsumption(
	consumptionHistory: readonly number[],
	totalDays: number = 30,
): number {
	if (!Array.isArray(consumptionHistory) || consumptionHistory.length === 0 || totalDays <= 0) {
		return 0;
	}

	const validSum = consumptionHistory.reduce((sum, val) => {
		return Number.isFinite(val) && val > 0 ? sum + val : sum;
	}, 0);

	if (validSum <= 0) return 0;
	const avg = validSum / totalDays;
	return Math.round(avg * 100) / 100;
}

/**
 * Calculates safety stock buffer for high-turnover dental consumables.
 *
 * @param dailyConsumption - Average units consumed per day.
 * @param leadTimeDays - Supplier delivery lead time in days.
 * @param safetyFactor - Multiplier for unexpected surges or supplier delays (default 0.20 = +20%).
 * @returns Non-negative integer safety stock units.
 */
export function calculateSafetyStock(
	dailyConsumption: number,
	leadTimeDays: number,
	safetyFactor: number = DEFAULT_SAFETY_STOCK_FACTOR,
): number {
	if (
		!Number.isFinite(dailyConsumption) ||
		dailyConsumption <= 0 ||
		!Number.isFinite(leadTimeDays) ||
		leadTimeDays <= 0 ||
		!Number.isFinite(safetyFactor) ||
		safetyFactor <= 0
	) {
		return 0;
	}

	const rawBuffer = dailyConsumption * leadTimeDays * safetyFactor;
	return Math.ceil(rawBuffer);
}

/**
 * Calculates statutory Reorder Point (ROP):
 * ROP = (Daily Consumption * Lead Time Days) + Safety Stock.
 *
 * @param dailyConsumption - Average units consumed per day.
 * @param leadTimeDays - Supplier delivery lead time in days.
 * @param safetyStock - Static or calculated safety buffer.
 * @returns Reorder point in integer units.
 */
export function calculateStockReorderPoint(
	dailyConsumption: number,
	leadTimeDays: number,
	safetyStock: number = 0,
): number {
	if (!Number.isFinite(dailyConsumption) || dailyConsumption <= 0) {
		return Math.max(0, Math.ceil(safetyStock || 0));
	}

	const validLeadTime = Number.isFinite(leadTimeDays) && leadTimeDays > 0 ? leadTimeDays : 0;
	const validSafety = Number.isFinite(safetyStock) && safetyStock > 0 ? safetyStock : 0;

	const leadTimeDemand = dailyConsumption * validLeadTime;
	return Math.ceil(leadTimeDemand + validSafety);
}

/**
 * Evaluates whether current inventory item levels are below reorder thresholds
 * and determines reorder urgency tier.
 *
 * Priority tiers:
 * - CRITICAL: current stock <= 0 OR stock < lead time demand.
 * - STANDARD: current stock < reorderPoint.
 * - OPTIMAL: current stock >= reorderPoint.
 */
export function evaluateItemReorderThreshold(
	inventoryItemId: string,
	itemName: string,
	currentStock: number,
	config: StockThresholdConfig,
): ReorderThresholdStatus {
	const safeStock = Number.isFinite(currentStock) ? Math.max(0, currentStock) : 0;
	const isBelow = safeStock < config.reorderPoint;

	let urgency: "CRITICAL" | "STANDARD" | "OPTIMAL" = "OPTIMAL";
	if (safeStock <= 0 || safeStock < config.safetyStock) {
		urgency = "CRITICAL";
	} else if (isBelow) {
		urgency = "STANDARD";
	}

	// Suggested replenishment up to maxStock or 2x reorderPoint
	const targetLevel = config.maxStock > config.reorderPoint
		? config.maxStock
		: Math.max(config.reorderPoint * 2, 10);

	const suggestedQuantity = isBelow ? Math.max(0, Math.ceil(targetLevel - safeStock)) : 0;

	return {
		inventoryItemId,
		itemName,
		currentStock: safeStock,
		reorderPoint: config.reorderPoint,
		isBelowThreshold: isBelow,
		suggestedQuantity,
		urgency,
	};
}

/**
 * Batch evaluates inventory items against their configured thresholds.
 */
export function evaluateBatchReorderThresholds(
	items: readonly {
		readonly inventoryItemId: string;
		readonly itemName: string;
		readonly currentStock: number;
		readonly config: StockThresholdConfig;
	}[],
): ReorderThresholdStatus[] {
	return items.map((item) =>
		evaluateItemReorderThreshold(
			item.inventoryItemId,
			item.itemName,
			item.currentStock,
			item.config,
		),
	);
}
