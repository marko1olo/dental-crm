/**
 * visitDeductionHandler.ts — Handles transactional stock deduction for visits.
 */

import { isDeductibleQuantity } from "@dental/shared";
import type { DbExecutor } from "../types.js";
import { toValidUuid } from "../types.js";
import type {
	DeductForVisitParams,
	RawRequiredMaterial,
	StockDeductionResult,
} from "./stockDeductionTypes.js";
import {
	resolveRequiredMaterialsForServices,
	resolveServicesMetadata,
} from "./stockFefoBatchSelector.js";
import {
	acquireVisitDeductionLock,
	checkIdempotentVisitDeduction,
	fetchAndCompleteTreatmentItemsForVisit,
	resolveAndLockInventoryItems,
} from "./stockDeductionDbOperations.js";
import {
	buildVisitDeductionNote,
	executeFefoDeductionLoop,
} from "./stockDeductionOverdraftHandler.js";

export async function deductForVisit(
	tx: DbExecutor,
	params: DeductForVisitParams,
): Promise<StockDeductionResult> {
	const { organizationId, visitId, userId = null, transactionType = "auto_deduct", clientMutationId = null } = params;
	const safeVisitId: string = toValidUuid(visitId);

	await acquireVisitDeductionLock(tx, organizationId, visitId);
	const idempotentResult = await checkIdempotentVisitDeduction(tx, organizationId, safeVisitId, clientMutationId, transactionType);
	if (idempotentResult) return idempotentResult;

	const targetItems = await fetchAndCompleteTreatmentItemsForVisit(tx, organizationId, safeVisitId);
	const servicesToProcess: Array<{ serviceToken: string; quantity: number }> = [];
	for (const item of targetItems) {
		if (item.serviceId) servicesToProcess.push({ serviceToken: item.serviceId, quantity: Number(item.quantity ?? 1) });
	}
	for (const srv of params.services ?? []) {
		if (srv.serviceId) servicesToProcess.push({ serviceToken: srv.serviceId, quantity: Number(srv.quantity ?? 1) });
	}

	const allServiceTokens = Array.from(new Set(servicesToProcess.map((s) => s.serviceToken)));
	const serviceMetadataMap = await resolveServicesMetadata(tx, organizationId, allServiceTokens);
	const rawRequiredMaterials = await resolveRequiredMaterialsForServices(tx, organizationId, servicesToProcess, serviceMetadataMap);

	for (const it of params.items ?? []) {
		if (it.inventoryItemId && isDeductibleQuantity(it.quantity)) {
			rawRequiredMaterials.push({ key: it.inventoryItemId, quantity: Number(it.quantity), unit: "pcs" });
		}
	}

	if (params.carpulesCount != null) {
		const isAnes = (m: RawRequiredMaterial) =>
			m.key === "mat-anes-art-100k" || m.unit === "carpule" || m.unit === "карпула" || (m.name != null && m.name.toLowerCase().includes("артикаин"));
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
			rawRequiredMaterials.push({
				key: "mat-anes-needle-g30",
				name: "Иглы карпульные стоматологические стерильные (0.3x21 мм G30 / 0.4x35 мм G27)",
				quantity: Math.max(1, Math.ceil(params.carpulesCount / 2)),
				unit: "pcs",
				defaultCostRub: 18,
			});
		}
	}

	if (rawRequiredMaterials.length === 0) {
		return { completedTreatmentItems: targetItems.length, deductions: [], warnings: [], isOverdraft: false };
	}

	const resolvedEntries = await resolveAndLockInventoryItems(tx, organizationId, rawRequiredMaterials);
	const deductionRes = await executeFefoDeductionLoop(tx, {
		resolvedEntries,
		organizationId,
		safeVisitId,
		userId,
		transactionType,
		allowOverdraft: params.allowOverdraft ?? true,
		noteText: (newStock, unit) => buildVisitDeductionNote({
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
