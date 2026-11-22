import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
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
		unitCostRub,
		purchasePriceKopecks,
		unitPriceKopecks,
		purchasePricePerUnit,
		stockQuantity = 0,
		packageMultiplier = 1,
		unit = "шт",
		category = "material",
		notes = null,
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

	let effectiveCostRub = 0;
	if (purchasePriceKopecks !== undefined) {
		effectiveCostRub = kopecksToRubles(purchasePriceKopecks);
	} else if (unitPriceKopecks !== undefined) {
		effectiveCostRub = kopecksToRubles(unitPriceKopecks);
	} else if (purchasePricePerUnit !== undefined) {
		effectiveCostRub = purchasePricePerUnit;
	} else if (unitCostRub !== undefined) {
		effectiveCostRub = unitCostRub;
	}

	const stockQtyStr = String(Math.max(0, stockQuantity));
	const critThresholdStr = String(Math.max(0, criticalThreshold));
	const unitCostStr = String(Math.max(0, effectiveCostRub));
	const unitStr = unit?.trim() || "шт";
	const categoryStr = category?.trim() || "material";
	const notesStr = notes?.trim() || null;
	const multStr = String(packageMultiplier ?? 1);

	const created = await withTenantCtx(organizationId, async (tx) => {
		const newItem = await tx
			.insert(inventoryItems)
			.values({
				organizationId,
				name: name.trim(),
				category: categoryStr,
				unit: unitStr,
				criticalThreshold: critThresholdStr,
				minQty: critThresholdStr,
				unitCostRub: unitCostStr,
				pricePerUnit: unitCostStr,
				stockQuantity: stockQtyStr,
				currentQty: stockQtyStr,
				packageMultiplier: multStr,
				notes: notesStr,
				sku: sku?.trim() || null,
				barcode: barcode?.trim() || null,
				lotNumber: lotNumber?.trim() || null,
				expirationDate: expiration,
			})
			.returning();
		return newItem[0];
	});

	if (!created)
		return reply.status(500).send({
			error: "InventoryItemNotSaved",
			message:
				"Позиция склада не создана: сервер не сохранил запись. Проверьте название и повторите; если снова не выйдет — сообщите администратору клиники.",
		});

	const computedKopecks = rublesToKopecks(
		Number(created.unitCostRub ?? created.pricePerUnit ?? 0),
	);
	return {
		...created,
		purchasePriceKopecks: computedKopecks,
	};
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
		unitCostRub,
		purchasePriceKopecks,
		unitPriceKopecks,
		purchasePricePerUnit,
		stockQuantity,
		packageMultiplier,
		unit,
		category,
		notes,
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

	let effectiveCostRub: number | undefined;
	if (purchasePriceKopecks !== undefined) {
		effectiveCostRub = kopecksToRubles(purchasePriceKopecks);
	} else if (unitPriceKopecks !== undefined) {
		effectiveCostRub = kopecksToRubles(unitPriceKopecks);
	} else if (purchasePricePerUnit !== undefined) {
		effectiveCostRub = purchasePricePerUnit;
	} else if (unitCostRub !== undefined) {
		effectiveCostRub = unitCostRub;
	}

	const critStr = String(Math.max(0, criticalThreshold));
	const costStr = effectiveCostRub !== undefined ? String(Math.max(0, effectiveCostRub)) : "0";

	const updated = await withTenantCtx(organizationId, async (tx) => {
		const [existing] = await tx
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return null;

		const updatePayload: Partial<typeof inventoryItems.$inferInsert> = {
			name: name.trim(),
			criticalThreshold: critStr,
			minQty: critStr,
			unitCostRub: costStr,
			pricePerUnit: costStr,
			sku: sku?.trim() || null,
			barcode: barcode?.trim() || null,
			lotNumber: lotNumber?.trim() || null,
			expirationDate: expiration,
			updatedAt: new Date(),
		};
		if (unit !== undefined) {
			updatePayload.unit = unit?.trim() || "шт";
		}
		if (category !== undefined) {
			updatePayload.category = category?.trim() || "material";
		}
		if (notes !== undefined) {
			updatePayload.notes = notes?.trim() || null;
		}
		if (packageMultiplier !== undefined) {
			updatePayload.packageMultiplier = String(packageMultiplier);
		}
		if (stockQuantity !== undefined) {
			const qtyStr = String(Math.max(0, stockQuantity));
			updatePayload.stockQuantity = qtyStr;
			updatePayload.currentQty = qtyStr;
		}

		const [res] = await tx
			.update(inventoryItems)
			.set(updatePayload)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning();
		return res;
	});

	if (updated === null) {
		return reply.status(404).send({ error: "Item not found" });
	}

	if (!updated)
		return reply.status(500).send({
			error: "InventoryItemNotSaved",
			message:
				"Позиция склада не сохранена: сервер не записал изменения. Проверьте данные и повторите; если снова не выйдет — сообщите администратору клиники.",
		});

	const computedKopecks = rublesToKopecks(
		Number(updated.unitCostRub ?? updated.pricePerUnit ?? 0),
	);
	return {
		...updated,
		purchasePriceKopecks: computedKopecks,
	};
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

	const data = parsedPatch.data;
	const patchData: Partial<typeof inventoryItems.$inferInsert> = { updatedAt: new Date() };

	if (data.name !== undefined) {
		if (!data.name?.trim()) {
			return reply.status(400).send({
				error: "NameRequired",
				message: "Укажите название материала.",
			});
		}
		patchData.name = data.name.trim();
	}
	if (data.unit !== undefined) {
		patchData.unit = data.unit?.trim() || "шт";
	}
	if (data.category !== undefined) {
		patchData.category = data.category?.trim() || "material";
	}
	if (data.notes !== undefined) {
		patchData.notes = data.notes?.trim() || null;
	}
	if (data.criticalThreshold !== undefined) {
		const crit = String(Math.max(0, data.criticalThreshold));
		patchData.criticalThreshold = crit;
		patchData.minQty = crit;
	}
	if (data.purchasePriceKopecks !== undefined) {
		const cost = String(Math.max(0, kopecksToRubles(data.purchasePriceKopecks)));
		patchData.unitCostRub = cost;
		patchData.pricePerUnit = cost;
	} else if (data.unitPriceKopecks !== undefined) {
		const cost = String(Math.max(0, kopecksToRubles(data.unitPriceKopecks)));
		patchData.unitCostRub = cost;
		patchData.pricePerUnit = cost;
	} else if (data.purchasePricePerUnit !== undefined) {
		const cost = String(Math.max(0, data.purchasePricePerUnit));
		patchData.unitCostRub = cost;
		patchData.pricePerUnit = cost;
	} else if (data.unitCostRub !== undefined) {
		const cost = String(Math.max(0, data.unitCostRub));
		patchData.unitCostRub = cost;
		patchData.pricePerUnit = cost;
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

	const updated = await withTenantCtx(organizationId, async (tx) => {
		const [existing] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return null;

		const [res] = await tx
			.update(inventoryItems)
			.set(patchData)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning();
		return res;
	});

	if (updated === null) {
		return reply.status(404).send({ error: "Item not found" });
	}

	if (!updated) {
		return reply.status(500).send({
			error: "InventoryItemNotSaved",
			message: "Позиция склада не сохранена.",
		});
	}

	const computedKopecks = rublesToKopecks(
		Number(updated.unitCostRub ?? updated.pricePerUnit ?? 0),
	);
	return {
		...updated,
		purchasePriceKopecks: computedKopecks,
	};
};

export const handleDeleteInventoryItem = async (
	organizationId: string,
	itemId: string,
	reply: FastifyReply,
) => {
	if (!itemId || !UUID_PATTERN.test(itemId.trim())) {
		return reply.status(404).send({ error: "Item not found" });
	}

	const deleted = await withTenantCtx(organizationId, async (tx) => {
		const [existing] = await tx
			.select({ id: inventoryItems.id })
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (!existing) return null;

		const [res] = await tx
			.delete(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning({ id: inventoryItems.id });
		return res;
	});

	if (deleted === null || !deleted) {
		return reply.status(404).send({ error: "Item not found" });
	}
	return { success: true };
};

export { registerItemCatalogMutations } from "./itemCatalogMutationRoutes.js";
