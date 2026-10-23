/**
 * recipeMutations.ts — Layer 2: Mutation operations for consumable links (create, update, delete).
 */

import { type ConsumableLinkCreate, type ConsumableLinkUpdate, isDeductibleQuantity } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { inventoryItems, procedureMaterialRules, serviceCatalogItems } from "../../../db/schema.js";
import { type DbExecutor, TreatmentConsumablesServiceError } from "../types.js";
import { getLink } from "./recipeQueries.js";

export async function createLink(executor: DbExecutor, organizationId: string, payload: ConsumableLinkCreate) {
	if (!isDeductibleQuantity(payload.quantity)) {
		throw new TreatmentConsumablesServiceError("Количество должно быть положительным числом", 400, "InvalidQuantity");
	}

	const [service] = await executor
		.select()
		.from(serviceCatalogItems)
		.where(and(eq(serviceCatalogItems.id, payload.serviceId), eq(serviceCatalogItems.organizationId, organizationId)))
		.limit(1);

	if (!service) throw new TreatmentConsumablesServiceError("Услуга не найдена в прейскуранте", 404, "ServiceNotFound");

	const [item] = await executor
		.select()
		.from(inventoryItems)
		.where(and(eq(inventoryItems.id, payload.inventoryItemId), eq(inventoryItems.organizationId, organizationId)))
		.limit(1);

	if (!item) throw new TreatmentConsumablesServiceError("Расходный материал не найден на складе", 404, "ItemNotFound");

	const [existing] = await executor
		.select()
		.from(procedureMaterialRules)
		.where(
			and(
				eq(procedureMaterialRules.organizationId, organizationId),
				eq(procedureMaterialRules.serviceId, payload.serviceId),
				eq(procedureMaterialRules.inventoryItemId, payload.inventoryItemId),
			),
		)
		.limit(1);

	if (existing) throw new TreatmentConsumablesServiceError("Эта услуга уже содержит данный материал в рецепте", 409, "LinkAlreadyExists");

	const [created] = await executor
		.insert(procedureMaterialRules)
		.values({
			organizationId,
			serviceId: service.id,
			inventoryItemId: item.id,
			serviceCode: service.code,
			materialItemId: item.id,
			materialName: item.name,
			quantityToDeduct: String(payload.quantity),
			requiredQty: String(payload.quantity),
		})
		.returning();

	if (!created) throw new TreatmentConsumablesServiceError("Не удалось сохранить связь", 500, "SaveFailed");
	const detailed = await getLink(executor, organizationId, created.id);
	if (!detailed) throw new TreatmentConsumablesServiceError("Связь создана, но не найдена", 500, "FetchFailed");
	return detailed;
}

export async function updateLink(executor: DbExecutor, organizationId: string, linkId: string, payload: ConsumableLinkUpdate) {
	const [existing] = await executor
		.select()
		.from(procedureMaterialRules)
		.where(and(eq(procedureMaterialRules.id, linkId), eq(procedureMaterialRules.organizationId, organizationId)))
		.limit(1);

	if (!existing) throw new TreatmentConsumablesServiceError("Связь не найдена", 404, "LinkNotFound");

	if (payload.quantity !== undefined) {
		if (!isDeductibleQuantity(payload.quantity)) {
			throw new TreatmentConsumablesServiceError("Количество должно быть положительным числом", 400, "InvalidQuantity");
		}
		await executor
			.update(procedureMaterialRules)
			.set({ quantityToDeduct: String(payload.quantity), requiredQty: String(payload.quantity) })
			.where(and(eq(procedureMaterialRules.id, linkId), eq(procedureMaterialRules.organizationId, organizationId)));
	}

	const updated = await getLink(executor, organizationId, linkId);
	if (!updated) throw new TreatmentConsumablesServiceError("Не удалось получить обновлённые данные", 500, "FetchFailed");
	return updated;
}

export async function deleteLink(executor: DbExecutor, organizationId: string, linkId: string) {
	const [deleted] = await executor
		.delete(procedureMaterialRules)
		.where(and(eq(procedureMaterialRules.id, linkId), eq(procedureMaterialRules.organizationId, organizationId)))
		.returning({ id: procedureMaterialRules.id });

	if (!deleted) throw new TreatmentConsumablesServiceError("Связь не найдена", 404, "LinkNotFound");
	return { success: true };
}
