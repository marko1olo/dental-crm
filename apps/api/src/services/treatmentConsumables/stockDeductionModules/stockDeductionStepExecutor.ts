/**
 * stockDeductionStepExecutor.ts — Single-item FEFO deduction step with unit conversion and alerts.
 */

import {
	categorizeInventoryExpiry,
	convertInventoryUnit,
} from "@dental/shared";
import { fefoStockService } from "../../inventory/fefoStockService.js";
import type { DbExecutor } from "../types.js";
import type {
	ResolvedItemEntry,
	StockDeductionRecord,
	StockDeductionWarning,
} from "./stockDeductionTypes.js";

export async function executeFefoDeductionStep(
	tx: DbExecutor,
	params: {
		entry: ResolvedItemEntry;
		organizationId: string;
		safeVisitId?: string | null | undefined;
		userId?: string | null | undefined;
		transactionType: "auto_deduct" | "manual_writeoff";
		allowOverdraft?: boolean | undefined;
		noteText: (newStock: number, unit: string) => string;
	},
): Promise<{
	deduction: StockDeductionRecord | null;
	warnings: StockDeductionWarning[];
	isOverdraft: boolean;
}> {
	const { entry, organizationId, safeVisitId = null, userId = null, transactionType, allowOverdraft = true, noteText } = params;
	const inv = entry.item;
	const ruleUnit = entry.ruleUnit || inv.unit || "pcs";
	const invUnit = inv.unit || "pcs";

	const convertedRequiredQty = convertInventoryUnit(entry.requiredQty, ruleUnit, invUnit);
	if (convertedRequiredQty <= 0) {
		return { deduction: null, warnings: [], isOverdraft: false };
	}

	const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
	const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
	const newStock = Number((baseStock - convertedRequiredQty).toFixed(4));
	const threshold = Number(inv.criticalThreshold ?? inv.minQty ?? 0);
	const note = noteText(newStock, inv.unit ?? "шт");

	const fefoRes = await fefoStockService.deductFefo(tx as any, {
		organizationId,
		inventoryItemId: inv.id,
		requiredQty: convertedRequiredQty,
		visitId: safeVisitId,
		userId,
		allowOverdraft,
		transactionType,
		notes: note,
	});

	const effectiveBatch = fefoRes.batchesUsed[0]?.batchNumber ?? inv.lotNumber ?? null;
	const warnings: StockDeductionWarning[] = [];
	let isOverdraft = false;

	if (fefoRes.isOverdraft || newStock < 0) {
		isOverdraft = true;
		warnings.push({
			type: "out_of_stock",
			itemId: inv.id,
			itemName: inv.name,
			message: `Внимание: списание в дефицит по материалу «${inv.name}» (в наличии было ${baseStock}, списано ${convertedRequiredQty}, остаток: ${newStock} ${inv.unit ?? "шт"}). Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии, накладная ещё не внесена).`,
			currentStock: newStock,
			criticalThreshold: threshold,
			expirationDate: inv.expirationDate,
		});
	} else if (newStock <= threshold) {
		warnings.push({
			type: newStock === 0 ? "out_of_stock" : "low_stock",
			itemId: inv.id,
			itemName: inv.name,
			message: newStock === 0
				? `Материал «${inv.name}» полностью израсходован на складе.`
				: `Остаток материала «${inv.name}» снизился до критического порога (${newStock} ${inv.unit ?? "шт"}, порог: ${threshold}).`,
			currentStock: newStock,
			criticalThreshold: threshold,
			expirationDate: inv.expirationDate,
		});
	}

	if (inv.expirationDate) {
		const expiry = categorizeInventoryExpiry(inv.expirationDate);
		if (expiry.status === "expired") {
			warnings.push({
				type: "expired",
				itemId: inv.id,
				itemName: inv.name,
				message: `Внимание: партия материала «${inv.name}» просрочена (срок: ${inv.expirationDate}).`,
				expirationDate: inv.expirationDate,
			});
		} else if (expiry.status === "expiring_soon") {
			warnings.push({
				type: "expiring_soon",
				itemId: inv.id,
				itemName: inv.name,
				message: `Внимание: срок годности партии материала «${inv.name}» истекает через ${expiry.daysRemaining} дн. (${inv.expirationDate}).`,
				expirationDate: inv.expirationDate,
			});
		}
	}

	const deduction: StockDeductionRecord = {
		inventoryItemId: inv.id,
		inventoryItemName: inv.name,
		quantityChanged: String(-fefoRes.deductedQty),
		unitCostRub: inv.unitCostRub,
		lotNumber: effectiveBatch,
		remainingStock: newStock,
	};

	return { deduction, warnings, isOverdraft };
}
