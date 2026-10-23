/**
 * toothDeductionHandler.ts — Handles transactional stock deduction for single tooth treatments.
 */

import type { DbExecutor } from "../types.js";
import { toValidUuid } from "../types.js";
import type {
	DeductForToothTreatmentParams,
	StockDeductionResult,
} from "./stockDeductionTypes.js";
import {
	resolveRequiredMaterialsForServices,
	resolveServicesMetadata,
} from "./stockFefoBatchSelector.js";
import {
	acquireToothDeductionLock,
	checkIdempotentToothDeduction,
	resolveAndLockInventoryItems,
} from "./stockDeductionDbOperations.js";
import {
	buildToothDeductionNote,
	executeFefoDeductionLoop,
} from "./stockDeductionOverdraftHandler.js";

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

	await acquireToothDeductionLock(tx, organizationId, treatmentItemId);
	const idempotentResult = await checkIdempotentToothDeduction(
		tx,
		organizationId,
		treatmentItemId,
		clientMutationId,
		transactionType,
	);
	if (idempotentResult) return idempotentResult;

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

	const resolvedEntries = await resolveAndLockInventoryItems(tx, organizationId, rawRequiredMaterials);
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
