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

export const handleDeleteInventoryItem = async (
	organizationId: string,
	itemId: string,
	reply: FastifyReply,
) => {
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

export const registerItemCatalogMutations = (server: FastifyInstance): void => {
	// POST new inventory item (staff/admin only)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		const effectiveOrgId =
			organizationId === "current" || organizationId === "items"
				? resolvedOrgId
				: organizationId;
		if (resolvedOrgId !== effectiveOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(effectiveOrgId, request.body, request, reply);
	});

	// POST new inventory item alias /:organizationId/items (staff/admin only)
	server.post<{
		Params: { organizationId: string };
	}>("/:organizationId/items", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create items",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		const effectiveOrgId =
			organizationId === "current" || organizationId === "items"
				? resolvedOrgId
				: organizationId;
		if (resolvedOrgId !== effectiveOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleCreateInventoryItem(effectiveOrgId, request.body, request, reply);
	});

	// POST /items — unparameterized create item with session org (Zero Dead-Ends SSOT)
	server.post("/items", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory create items fallback",
		);
		if (!resolvedOrgId) return;
		const targetOrgId =
			(request.body as { organizationId?: string })?.organizationId ||
			resolvedOrgId;
		if (targetOrgId !== resolvedOrgId)
			return reply.code(403).send({ error: "Forbidden" });
		return handleCreateInventoryItem(targetOrgId, request.body, request, reply);
	});

	// PUT update inventory item details (staff/admin only)
	server.put<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleUpdateInventoryItem(organizationId, itemId, request.body, reply);
	});

	// PUT /:organizationId/items/:itemId alias
	server.put<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update alias",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleUpdateInventoryItem(organizationId, itemId, request.body, reply);
	});

	// PUT /items/:itemId — unparameterized update with session org
	server.put<{
		Params: { itemId: string };
	}>("/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory update fallback",
		);
		if (!resolvedOrgId) return;

		const { itemId } = request.params;
		return handleUpdateInventoryItem(resolvedOrgId, itemId, request.body, reply);
	});

	// DELETE inventory item (admin only)
	server.delete<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeleteInventoryItem(organizationId, itemId, reply);
	});

	// DELETE /:organizationId/items/:itemId alias
	server.delete<{
		Params: { organizationId: string; itemId: string };
	}>("/:organizationId/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete alias",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleDeleteInventoryItem(organizationId, itemId, reply);
	});

	// DELETE /items/:itemId — unparameterized delete with session org
	server.delete<{
		Params: { itemId: string };
	}>("/items/:itemId", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory delete fallback",
		);
		if (!resolvedOrgId) return;

		const { itemId } = request.params;
		return handleDeleteInventoryItem(resolvedOrgId, itemId, reply);
	});
};
