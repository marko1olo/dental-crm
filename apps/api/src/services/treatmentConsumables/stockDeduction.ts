/**
 * stockDeduction.ts — Layer 5: Canonical Facade for transactional stock deduction.
 *
 * Implements Mandate 8e (Doctor Autonomy) & Mandate 8n (Scale Sovereignty):
 * - Deadlock-free item locking in sorted UUID order
 * - Deterministic FEFO batch accounting
 * - Multi-tier BOM resolution (Tech cards -> Consumables mapping -> Procedure rules -> Statutory 804n)
 * - Soft overdraft support (zero blocking modals for doctors)
 * - Idempotency protection against network retries
 *
 * Decomposed in accordance with /decomposer and file-size constraints:
 * - stockDeductionModules/stockDeductionTypes.ts (Layer 0: Types & DTOs)
 * - stockFefoBatchSelector.ts (Layer 1/2: Multi-tier BOM & Service metadata)
 * - stockDeductionDbOperations.ts (Layer 2: Locking, Idempotency & Items Fetching)
 * - stockDeductionOverdraftHandler.ts (Layer 2: Notes & FEFO Step Execution)
 */

import { isDeductibleQuantity } from "@dental/shared";
import type { DbExecutor } from "./types.js";
import { toValidUuid } from "./types.js";
import type {
	DeductForToothTreatmentParams,
	DeductForVisitParams,
	RawRequiredMaterial,
	StockDeductionRecord,
	StockDeductionResult,
	StockDeductionWarning,
} from "./stockDeductionModules/stockDeductionTypes.js";
import {
	resolveRequiredMaterialsForServices,
	resolveServicesMetadata,
} from "./stockDeductionModules/stockFefoBatchSelector.js";
import {
	acquireToothDeductionLock,
	acquireVisitDeductionLock,
	checkIdempotentToothDeduction,
	checkIdempotentVisitDeduction,
	fetchAndCompleteTreatmentItemsForVisit,
	resolveAndLockInventoryItems,
} from "./stockDeductionModules/stockDeductionDbOperations.js";
import {
	buildToothDeductionNote,
	buildVisitDeductionNote,
	executeFefoDeductionLoop,
} from "./stockDeductionModules/stockDeductionOverdraftHandler.js";

export type {
	DeductForToothTreatmentParams,
	DeductForVisitParams,
	StockDeductionRecord,
	StockDeductionResult,
	StockDeductionWarning,
};

/**
 * Deduct batch quantities from warehouse stock when a visit is completed.
 * Fully compliant with Mandate 8e, Mandate 8n, FEFO batch accounting, and OKEI unit conversions.
 */
export async function deductForVisit(
	tx: DbExecutor,
	params: DeductForVisitParams,
): Promise<StockDeductionResult> {
	const {
		organizationId,
		visitId,
		userId = null,
		transactionType = "auto_deduct",
		clientMutationId = null,
	} = params;

	const safeVisitId: string = toValidUuid(visitId);

	// 0. Transactional advisory lock & idempotency check
	await acquireVisitDeductionLock(tx, organizationId, visitId);
	const idempotentResult = await checkIdempotentVisitDeduction(
		tx,
		organizationId,
		safeVisitId,
		clientMutationId,
		transactionType,
	);
	if (idempotentResult) return idempotentResult;

	// 1. Fetch treatment items for visit and complete uncompleted ones
	const targetItems = await fetchAndCompleteTreatmentItemsForVisit(tx, organizationId, safeVisitId);

	// 2. Gather service tokens from visit items and direct parameters
	const servicesToProcess: Array<{ serviceToken: string; quantity: number }> = [];
	for (const item of targetItems) {
		if (item.serviceId) {
			servicesToProcess.push({ serviceToken: item.serviceId, quantity: Number(item.quantity ?? 1) });
		}
	}
	for (const srv of params.services ?? []) {
		if (srv.serviceId) {
			servicesToProcess.push({ serviceToken: srv.serviceId, quantity: Number(srv.quantity ?? 1) });
		}
	}

	const allServiceTokens = Array.from(new Set(servicesToProcess.map((s) => s.serviceToken)));

	// 3. Resolve service metadata and multi-tier BOM rules
	const serviceMetadataMap = await resolveServicesMetadata(tx, organizationId, allServiceTokens);
	const rawRequiredMaterials = await resolveRequiredMaterialsForServices(
		tx,
		organizationId,
		servicesToProcess,
		serviceMetadataMap,
	);

	// 4. Append directly passed items
	for (const it of params.items ?? []) {
		if (it.inventoryItemId && isDeductibleQuantity(it.quantity)) {
			rawRequiredMaterials.push({ key: it.inventoryItemId, quantity: Number(it.quantity), unit: "pcs" });
		}
	}

	// 5. Authoritative carpulesCount handling (overrides auto-generated anesthetics)
	if (params.carpulesCount != null) {
		const isAnes = (m: RawRequiredMaterial) =>
			m.key === "mat-anes-art-100k" ||
			m.unit === "carpule" ||
			m.unit === "карпула" ||
			(m.name != null && m.name.toLowerCase().includes("артикаин"));

		for (let i = rawRequiredMaterials.length - 1; i >= 0; i--) {
			if (rawRequiredMaterials[i] && isAnes(rawRequiredMaterials[i]!)) rawRequiredMaterials.splice(i, 1);
		}

		if (params.carpulesCount > 0) {
			rawRequiredMaterials.push({
				key: "mat-anes-art-100k",
				name: params.drugName || "Артикаин 4% с эпинефрином 1:100 000",
				quantity: params.carpulesCount,
				unit: "carpule",
				defaultCostRub: 145,
			});
		}
	}

	if (rawRequiredMaterials.length === 0) {
		return { completedTreatmentItems: targetItems.length, deductions: [], warnings: [], isOverdraft: false };
	}

	// 6. Safe Item Resolver & Lock (deadlock-free in sorted UUID order)
	const resolvedEntries = await resolveAndLockInventoryItems(tx, organizationId, rawRequiredMaterials);

	// 7. FEFO Deduction Loop
	const deductionRes = await executeFefoDeductionLoop(tx, {
		resolvedEntries,
		organizationId,
		safeVisitId,
		userId,
		transactionType,
		allowOverdraft: params.allowOverdraft ?? true,
		noteText: (newStock, unit) =>
			buildVisitDeductionNote({
				newStock,
				visitId,
				unit,
				paperJournalAcknowledged: params.paperJournalAcknowledged,
				clientMutationId,
			}),
	});

	return {
		completedTreatmentItems: targetItems.length,
		deductions: deductionRes.deductions,
		warnings: deductionRes.warnings,
		isOverdraft: deductionRes.isOverdraft,
	};
}

/**
 * Deduct batch quantities for a single tooth treatment item using FEFO and multi-tier BOM.
 */
export async function deductForToothTreatment(
	tx: DbExecutor,
	params: DeductForToothTreatmentParams,
): Promise<StockDeductionResult> {
	const {
		organizationId,
		treatmentItemId,
		serviceId,
		visitId = null,
		toothNumber = null,
		quantity = 1,
		userId = null,
		transactionType = "auto_deduct",
		clientMutationId = null,
	} = params;

	// 0. Transactional advisory lock & idempotency check
	await acquireToothDeductionLock(tx, organizationId, treatmentItemId);
	const idempotentResult = await checkIdempotentToothDeduction(
		tx,
		organizationId,
		treatmentItemId,
		clientMutationId,
		transactionType,
	);
	if (idempotentResult) return idempotentResult;

	// 1. Resolve service metadata and multi-tier BOM rules
	const serviceMetadataMap = await resolveServicesMetadata(tx, organizationId, [serviceId]);
	const rawRequiredMaterials = await resolveRequiredMaterialsForServices(
		tx,
		organizationId,
		[{ serviceToken: serviceId, quantity }],
		serviceMetadataMap,
	);

	if (rawRequiredMaterials.length === 0) {
		return { completedTreatmentItems: 1, deductions: [], warnings: [], isOverdraft: false };
	}

	// 2. Safe Item Resolver & Lock (deadlock-free in sorted UUID order)
	const resolvedEntries = await resolveAndLockInventoryItems(tx, organizationId, rawRequiredMaterials);

	// 3. FEFO Deduction Loop
	const deductionRes = await executeFefoDeductionLoop(tx, {
		resolvedEntries,
		organizationId,
		safeVisitId: visitId ? toValidUuid(visitId) : null,
		userId,
		transactionType,
		allowOverdraft: params.allowOverdraft ?? true,
		noteText: (newStock, unit) =>
			buildToothDeductionNote({
				newStock,
				treatmentItemId,
				toothNumber,
				unit,
				clientMutationId,
			}),
	});

	return {
		completedTreatmentItems: 1,
		deductions: deductionRes.deductions,
		warnings: deductionRes.warnings,
		isOverdraft: deductionRes.isOverdraft,
	};
}
