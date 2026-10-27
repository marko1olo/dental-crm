/**
 * @file procedureDeduction.ts
 * Пакетное списание расходных материалов по выполненной услуге приёма (Мандат 8b, 8e, 8n).
 */

import type {
	DbTransaction,
	DeductForProcedureParams,
	DeductForProcedureResult,
	FefoDeductionResult,
} from "./types.js";
import { resolveItemsToDeductForProcedure } from "./procedureBomResolver.js";
import { deductFefo } from "./fefoDeductionCore.js";

/**
 * Автоматическое списание по технологической карте процедуры (BOM).
 */
export async function deductForProcedure(
	tx: DbTransaction,
	params: DeductForProcedureParams,
): Promise<DeductForProcedureResult> {
	const {
		organizationId,
		serviceQuantity = 1,
		warehouseId,
		visitId,
		userId,
		allowOverdraft = true,
		transactionType = "procedure_bom_deduct",
		notes,
	} = params;
	const serviceId = params.serviceId ?? params.serviceIdOrCode ?? "";

	const itemsToDeduct = await resolveItemsToDeductForProcedure(
		tx,
		organizationId,
		serviceId,
		serviceQuantity,
	);

	if (itemsToDeduct.length === 0) {
		const emptyResults = Object.assign([] as FefoDeductionResult[], {
			totalMaterials: 0,
			hasOverdraft: false,
		});
		return emptyResults;
	}

	// Сортировка ID для предотвращения взаимных блокировок (Row Lock Ordering Deadlock)
	const sortedItems = [...itemsToDeduct].sort((a, b) =>
		a.inventoryItemId.localeCompare(b.inventoryItemId),
	);

	const results: FefoDeductionResult[] = [];

	for (const it of sortedItems) {
		const res = await deductFefo(tx, {
			organizationId,
			inventoryItemId: it.inventoryItemId,
			requiredQty: it.quantity,
			warehouseId: warehouseId ?? undefined,
			visitId: visitId ?? undefined,
			userId: userId ?? undefined,
			allowOverdraft,
			transactionType,
			notes,
		});
		results.push(res);
	}

	return Object.assign(results, {
		totalMaterials: results.length,
		hasOverdraft: results.some((r) => r.isOverdraft),
	});
}
