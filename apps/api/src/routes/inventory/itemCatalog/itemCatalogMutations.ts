import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { inventoryItems } from "../../../db/schema.js";
import {
	INVALID_DATE,
	inventoryCreateBodySchema,
	inventoryUpdateBodySchema,
	normalizedExpirationDate,
} from "../types.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handleCreateInventoryItem = async (
	organizationId: string,
	rawBody: unknown,
	_request: FastifyRequest,
	reply: FastifyReply,
) => {
	const parsedBody = inventoryCreateBodySchema.safeParse(rawBody ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "NameRequired",
			message: "Укажите название материала.",
		});
	}
	const {
		name,
		criticalThreshold = 0,
		unitCostRub = 0,
		stockQuantity = 0,
		sku = null,
		barcode = null,
		lotNumber = null,
		expirationDate = null,
	} = parsedBody.data;
	if (!name?.trim()) {
		return reply.status(400).send({
			error: "NameRequired",
			message: "Укажите название материала.",
		});
	}
	/*
	 * Умолчание порога снижено с 5 до 0.
	 *
	 * Пятёрка бралась с потолка: не приславший поле клиент получал в базу
	 * выдуманный минимальный остаток, и склад начинал сигналить о дефиците
	 * материала, для которого никто порога не задавал. Ноль означает «порог не
	 * задан» и ни о чём не сигналит.
	 */
	const expiration = normalizedExpirationDate(expirationDate);
	if (expiration === INVALID_DATE) {
		return reply.status(400).send({
			error: "ExpirationDateInvalid",
			message: "Срок годности указывается датой, например 31.03.2027.",
		});
	}

	const newItem = await db
		.insert(inventoryItems)
		.values({
			organizationId,
			name: name.trim(),
			criticalThreshold: String(Math.max(0, criticalThreshold)),
			unitCostRub: String(Math.max(0, unitCostRub)),
			stockQuantity: String(Math.max(0, stockQuantity)),
			sku: sku?.trim() || null,
			barcode: barcode?.trim() || null,
			lotNumber: lotNumber?.trim() || null,
			expirationDate: expiration,
		})
		.returning();

	const created = newItem[0];
	if (!created)
		return reply.status(500).send({
			error: "InventoryItemNotSaved",
			message:
				"Позиция склада не создана: сервер не сохранил запись. Проверьте название и повторите; если снова не выйдет — сообщите администратору клиники.",
		});
	return created;
};

export const handleUpdateInventoryItem = async (
	organizationId: string,
	itemId: string,
	rawBody: unknown,
	reply: FastifyReply,
) => {
	const parsedUpdate = inventoryUpdateBodySchema.safeParse(rawBody ?? {});
	if (!parsedUpdate.success) {
		return reply.status(400).send({
			error: "NameRequired",
			message: "Укажите название материала.",
		});
	}
	const {
		name,
		criticalThreshold = 0,
		unitCostRub = 0,
		sku = null,
		barcode = null,
		lotNumber = null,
		expirationDate = null,
	} = parsedUpdate.data;
	if (!name?.trim()) {
		return reply.status(400).send({
			error: "NameRequired",
			message: "Укажите название материала.",
		});
	}
	const expiration = normalizedExpirationDate(expirationDate);
	if (expiration === INVALID_DATE) {
		return reply.status(400).send({
			error: "ExpirationDateInvalid",
			message: "Срок годности указывается датой, например 31.03.2027.",
		});
	}

	if (!itemId || !UUID_PATTERN.test(itemId.trim())) {
		return reply.status(404).send({ error: "Item not found" });
	}

	const [existing] = await db
		.select({ id: inventoryItems.id })
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.limit(1);
	if (!existing) return reply.status(404).send({ error: "Item not found" });

	const [updated] = await db
		.update(inventoryItems)
		.set({
			name: name.trim(),
			criticalThreshold: String(Math.max(0, criticalThreshold)),
			unitCostRub: String(Math.max(0, unitCostRub)),
			sku: sku?.trim() || null,
			barcode: barcode?.trim() || null,
			lotNumber: lotNumber?.trim() || null,
			expirationDate: expiration,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.returning();

	if (!updated)
		return reply.status(500).send({
			error: "InventoryItemNotSaved",
			message:
				"Позиция склада не сохранена: сервер не записал изменения. Проверьте данные и повторите; если снова не выйдет — сообщите администратору клиники.",
		});
	return updated;
};

export const handlePatchInventoryItem = async (
	organizationId: string,
	itemId: string,
	rawBody: unknown,
	reply: FastifyReply,
) => {
	const parsedPatch = inventoryUpdateBodySchema.safeParse(rawBody ?? {});
	if (!parsedPatch.success) {
		return reply.status(400).send({
			error: "InvalidBody",
			message: "Некорректные параметры обновления позиции склада.",
		});
	}

	if (!itemId || !UUID_PATTERN.test(itemId.trim())) {
		return reply.status(404).send({ error: "Item not found" });
	}

	const [existing] = await db
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.limit(1);
	if (!existing) return reply.status(404).send({ error: "Item not found" });

	const data = parsedPatch.data;
	const patchData: Record<string, any> = { updatedAt: new Date() };

	if (data.name !== undefined) {
		if (!data.name?.trim()) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		patchData.name = data.name.trim();
	}
	if (data.criticalThreshold !== undefined) {
		patchData.criticalThreshold = String(Math.max(0, data.criticalThreshold));
	}
	if (data.unitCostRub !== undefined) {
		patchData.unitCostRub = String(Math.max(0, data.unitCostRub));
	}
	if (data.stockQuantity !== undefined) {
		patchData.stockQuantity = String(data.stockQuantity);
		patchData.currentQty = String(data.stockQuantity);
	}
	if (data.packageMultiplier !== undefined) {
		patchData.packageMultiplier = String(data.packageMultiplier);
	}
	if (data.sku !== undefined) {
		patchData.sku = data.sku?.trim() || null;
	}
	if (data.barcode !== undefined) {
		patchData.barcode = data.barcode?.trim() || null;
	}
	if (data.lotNumber !== undefined) {
		patchData.lotNumber = data.lotNumber?.trim() || null;
	}
	if (data.expirationDate !== undefined) {
		const expiration = normalizedExpirationDate(data.expirationDate);
		if (expiration === INVALID_DATE) {
			return reply.status(400).send({
				error: "ExpirationDateInvalid",
				message: "Срок годности указывается датой, например 31.03.2027.",
			});
		}
		patchData.expirationDate = expiration;
	}

	const [updated] = await db
		.update(inventoryItems)
		.set(patchData)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.returning();

	if (!updated) {
		return reply.status(500).send({
			error: "InventoryItemNotSaved",
			message: "Позиция склада не сохранена.",
		});
	}
	return updated;
};

export const handleDeleteInventoryItem = async (
	organizationId: string,
	itemId: string,
	reply: FastifyReply,
) => {
	if (!itemId || !UUID_PATTERN.test(itemId.trim())) {
		return reply.status(404).send({ error: "Item not found" });
	}

	const [existing] = await db
		.select({ id: inventoryItems.id })
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.limit(1);
	if (!existing) return reply.status(404).send({ error: "Item not found" });

	const [deleted] = await db
		.delete(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, itemId),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.returning({ id: inventoryItems.id });
	if (!deleted) return reply.status(404).send({ error: "Item not found" });
	return { success: true };
};

export { registerItemCatalogMutations } from "./itemCatalogMutationRoutes.js";
