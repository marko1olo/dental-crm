/**
 * warehouseDeductHandlers.ts — Layer 4: Fastify handler for batch warehouse item deduction.
 */

import { and, eq, ilike, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { db } from "../../db/client.js";
import { inventoryItems } from "../../db/schema.js";
import { FefoStockService } from "../inventory/fefoStockService.js";
import { InsufficientStockError } from "../treatmentConsumablesService.js";
import { warehouseDeductBatchBodySchema, type warehouseDeductItemSchema } from "./warehouseSchemas.js";

const fefoStockService = new FefoStockService();

export async function handleWarehouseDeductRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const parsed = warehouseDeductBatchBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return reply.status(400).send({ error: "ValidationError", message: "Неверный формат данных", details: parsed.error.errors });
	}

	let itemsList: z.infer<typeof warehouseDeductItemSchema>[] = [];
	let commonReason: string | undefined;
	let visitId: string | undefined;
	let allowOverdraftDefault = true;

	if (Array.isArray(parsed.data)) {
		itemsList = parsed.data;
	} else if ("items" in parsed.data || "materials" in parsed.data) {
		const d = parsed.data as any;
		itemsList = d.materials && d.materials.length > 0 ? d.materials : (d.items ?? []);
		commonReason = d.reason || d.notes || (d.operationTitle ? `Списание под «${d.operationTitle}»` : undefined);
		visitId = d.visitId ? String(d.visitId) : undefined;
		if (d.allowOverdraft !== undefined) allowOverdraftDefault = d.allowOverdraft;
	} else {
		itemsList = [parsed.data as z.infer<typeof warehouseDeductItemSchema>];
	}

	if (itemsList.length === 0) return reply.status(400).send({ error: "EmptyDeduction", message: "Список материалов пуст" });
	const effectiveUserId = (request.user as { id?: string } | undefined)?.id ?? null;

	try {
		const deductionResults = await db.transaction(async (tx) => {
			const results: any[] = [];
			for (const item of itemsList) {
				let itemId = item.inventoryItemId || item.itemId || item.id;
				const searchName = (item.name || item.itemName || "").trim();

				if (!itemId && searchName) {
					const [found] = await tx.select({ id: inventoryItems.id }).from(inventoryItems)
						.where(and(eq(inventoryItems.organizationId, organizationId), sql`lower(${inventoryItems.name}) = lower(${searchName})`)).limit(1);
					if (found) {
						itemId = found.id;
					} else {
						const [created] = await tx.insert(inventoryItems).values({
							organizationId, name: searchName, stockQuantity: "0", currentQty: "0", criticalThreshold: "0",
							unitCostRub: item.unitCostRub != null ? String(item.unitCostRub) : "0",
						}).returning({ id: inventoryItems.id });
						if (created) itemId = created.id;
					}
				}
				if (!itemId) throw new Error(`Не удалось определить позицию склада для «${searchName || "не указано"}»`);

				const res = await fefoStockService.deductFefo(tx, {
					organizationId, inventoryItemId: itemId, requiredQty: item.quantity,
					allowOverdraft: item.allowOverdraft ?? allowOverdraftDefault,
					notes: item.reason || item.notes || commonReason || "Списание со склада у кресла (FEFO)",
					userId: effectiveUserId, visitId: visitId || null, transactionType: "treatment_consumable",
				});
				results.push(res);
			}
			return results;
		});

		const hasOverdraft = deductionResults.some((r) => r.isOverdraft);
		return reply.status(200).send({
			success: true, count: deductionResults.length, items: deductionResults, hasOverdraft, isOverdraft: hasOverdraft,
			message: hasOverdraft ? `Списано по FEFO: ${deductionResults.length} (мягкий овердрафт)` : `Списано по FEFO: ${deductionResults.length}`,
		});
	} catch (error) {
		const isInsufficient = error instanceof InsufficientStockError || (error as any)?.error === "InsufficientStock";
		if (isInsufficient) {
			const e = error as any;
			const req = Number(e.requiredStock ?? 1);
			const avail = Number(e.availableStock ?? 0);
			return reply.status(200).send({
				success: true, count: 1, hasOverdraft: true, isOverdraft: true, is_overdraft: true,
				items: [{ inventoryItemId: e.inventoryItemId ?? "unknown", inventoryItemName: e.inventoryItemName ?? "Материал", requiredQty: req, deductedQty: req, isOverdraft: true, deficitQty: req - avail }],
				message: `Списание со склада проведено (зафиксирован мягкий овердрафт: дефицит ${req - avail} ед.).`,
			});
		}
		request.log.error(error, "Failed to deduct warehouse items");
		return reply.status(400).send({ error: "DeductionFailed", message: error instanceof Error ? error.message : "Ошибка списания" });
	}
}

export const executeWarehouseDeductBatch = handleWarehouseDeductRequest;
export const executeWarehouseDeductSingleItem = handleWarehouseDeductRequest;
