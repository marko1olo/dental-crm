/**
 * @file procedureBomResolver.ts
 * Единый резолвер расходных материалов для стоматологической процедуры (Мандат 8b).
 */

import type { DbTransaction } from "./types.js";
import { resolveServiceMeta, findDbProcedureItems } from "./procedureBomDbResolver.js";
import { resolveDefaultFallbackItems } from "./procedureBomDefaultFallback.js";

export async function resolveItemsToDeductForProcedure(
	tx: DbTransaction,
	organizationId: string,
	serviceId: string,
	serviceQuantity: number,
): Promise<Array<{ inventoryItemId: string; quantity: number }>> {
	const meta = await resolveServiceMeta(tx, organizationId, serviceId);
	const dbItems = await findDbProcedureItems(tx, organizationId, serviceId, meta, serviceQuantity);

	if (dbItems.length > 0) {
		return dbItems;
	}

	return resolveDefaultFallbackItems(tx, organizationId, serviceId, meta, serviceQuantity);
}
