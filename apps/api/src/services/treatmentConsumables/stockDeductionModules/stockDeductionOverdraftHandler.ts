/**
 * stockDeductionOverdraftHandler.ts — Layer 2: Soft overdraft, stock warnings & FEFO deduction step execution.
 *
 * Implements Mandate 8e (Doctor Autonomy) & Mandate 8n (Zero Dead-Ends):
 * If stock is exhausted, allows negative balance / soft overdraft with warehouse replenishment alert
 * without blocking clinical care or showing modal barriers to the practitioner.
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

/**
 * Builds standard audit note text for visit stock deduction.
 */
export function buildVisitDeductionNote(params: {
	newStock: number;
	visitId: string;
	unit?: string | null | undefined;
	paperJournalAcknowledged?: boolean | undefined;
	clientMutationId?: string | null | undefined;
}): string {
	const {
		newStock,
		visitId,
		unit = "ед.",
		paperJournalAcknowledged = false,
		clientMutationId = null,
	} = params;

	const paperSuffix = paperJournalAcknowledged
		? " (бумажный журнал учтён, старшая медсестра опциональна)"
		: "";

	const baseText =
		newStock < 0
			? `Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии, накладная ещё не внесена по приёму ${visitId}): дефицит ${Math.abs(newStock)} ${unit}${paperSuffix}`
			: `Автосписание по приёму ${visitId}${paperSuffix}`;

	return baseText + (clientMutationId ? ` [mutation:${clientMutationId}]` : "");
}

/**
 * Builds standard audit note text for tooth treatment stock deduction.
 */
export function buildToothDeductionNote(params: {
	newStock: number;
	treatmentItemId: string;
	toothNumber?: number | null | undefined;
	unit?: string | null | undefined;
	clientMutationId?: string | null | undefined;
}): string {
	const {
		newStock,
		treatmentItemId,
		toothNumber = null,
		unit = "ед.",
		clientMutationId = null,
	} = params;

	const noteMarkers = [
		`[treatmentItemId:${treatmentItemId}]`,
		toothNumber ? `[tooth:${toothNumber}]` : null,
		clientMutationId ? `[mutation:${clientMutationId}]` : null,
	]
		.filter(Boolean)
		.join(" ");

	return (
		newStock < 0
			? `Списано под операцию, требуется оприходование (мягкий овердрафт склада по позиции лечения ${treatmentItemId}${toothNumber ? ` зуб ${toothNumber}` : ""}): дефицит ${Math.abs(newStock)} ${unit} ${noteMarkers}`
			: `Списание по позиции лечения ${treatmentItemId}${toothNumber ? ` (зуб ${toothNumber})` : ""} ${noteMarkers}`
	).trim();
}

/**
 * Executes a single item deduction step using FEFO batches, statutory unit conversions,
 * soft overdraft handling, and expiration warning generation.
 */
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
	const {
		entry,
		organizationId,
		safeVisitId = null,
		userId = null,
		transactionType,
		allowOverdraft = true,
		noteText,
	} = params;

	const inv = entry.item;
	const ruleUnit = entry.ruleUnit || inv.unit || "pcs";
	const invUnit = inv.unit || "pcs";

	// Convert from recipe dose (e.g. carpule, gram) to warehouse stock unit (e.g. pack, syringe_g)
	const convertedRequiredQty = convertInventoryUnit(entry.requiredQty, ruleUnit, invUnit);
	if (convertedRequiredQty <= 0) {
		return { deduction: null, warnings: [], isOverdraft: false };
	}

	const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
	const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
	const newStock = Number((baseStock - convertedRequiredQty).toFixed(4));
	const threshold = Number(inv.criticalThreshold ?? inv.minQty ?? 0);

	const note = noteText(newStock, inv.unit ?? "шт");

	// Execute atomic FEFO batch deduction via fefoStockService
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
			message:
				newStock === 0
					? `Материал «${inv.name}» полностью израсходован на складе.`
					: `Остаток материала «${inv.name}» снизился до критического порога (${newStock} ${inv.unit ?? "шт"}, порог: ${threshold}).`,
			currentStock: newStock,
			criticalThreshold: threshold,
			expirationDate: inv.expirationDate,
		});
	}

	// Expiry alerts
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

/**
 * Executes FEFO deduction loop over multiple resolved items, aggregating records, warnings and overdrafts.
 */
export async function executeFefoDeductionLoop(
	tx: DbExecutor,
	params: {
		resolvedEntries: ResolvedItemEntry[];
		organizationId: string;
		safeVisitId?: string | null | undefined;
		userId?: string | null | undefined;
		transactionType: "auto_deduct" | "manual_writeoff";
		allowOverdraft?: boolean | undefined;
		noteText: (newStock: number, unit: string) => string;
	},
): Promise<{
	deductions: StockDeductionRecord[];
	warnings: StockDeductionWarning[];
	isOverdraft: boolean;
}> {
	const deductions: StockDeductionRecord[] = [];
	const warnings: StockDeductionWarning[] = [];
	let isOverdraft = false;

	for (const entry of params.resolvedEntries) {
		const stepRes = await executeFefoDeductionStep(tx, {
			entry,
			organizationId: params.organizationId,
			safeVisitId: params.safeVisitId,
			userId: params.userId,
			transactionType: params.transactionType,
			allowOverdraft: params.allowOverdraft ?? true,
			noteText: params.noteText,
		});

		if (stepRes.deduction) {
			deductions.push(stepRes.deduction);
		}
		if (stepRes.warnings.length > 0) {
			warnings.push(...stepRes.warnings);
		}
		if (stepRes.isOverdraft) {
			isOverdraft = true;
		}
	}

	return { deductions, warnings, isOverdraft };
}
