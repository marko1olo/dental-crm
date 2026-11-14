/**
 * warehouseDeductVisitHandler.ts — Layer 4: Fastify handler for deducting visit consumables.
 */

import { visitStockDeductionRequestSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { InsufficientStockError, TreatmentConsumablesService } from "../treatmentConsumablesService.js";

export async function handleWarehouseDeductVisitRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	let normalizedBody = rawBody;
	if (rawBody && typeof rawBody === "object") {
		const b = rawBody as Record<string, unknown>;
		const rawVisitId = b.visitId ?? b.treatment_reference_id ?? b.visit_id;
		const rawItems = b.items ?? b.materials;
		let items: Array<{ inventoryItemId?: unknown; quantity?: unknown; reason?: unknown }> | undefined = undefined;
		if (Array.isArray(rawItems)) {
			items = rawItems.map((it) => {
				const itemObj = typeof it === "object" && it !== null ? (it as Record<string, unknown>) : {};
				return {
					inventoryItemId: itemObj.inventoryItemId ?? itemObj.inventory_item_id ?? itemObj.id,
					quantity: itemObj.quantity,
					reason: itemObj.reason ?? itemObj.notes ?? b.notes,
				};
			});
		}
		normalizedBody = {
			...b,
			visitId: rawVisitId,
			items,
			allowOverdraft: b.allowOverdraft ?? b.allowSoftOverdraft ?? b.clamp_at_zero ?? true,
		};
	}

	const parsedBody = visitStockDeductionRequestSchema.safeParse(normalizedBody);
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса списания",
		});
	}

	const userObj = request.user as { id?: string } | undefined;
	try {
		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.deductForVisit(tx, {
				organizationId,
				visitId: parsedBody.data.visitId,
				clientMutationId: parsedBody.data.clientMutationId ?? (request.headers["idempotency-key"] as string | undefined) ?? null,
				userId: parsedBody.data.userId !== undefined ? parsedBody.data.userId : (userObj?.id ?? null),
				...(parsedBody.data.transactionType !== undefined ? { transactionType: parsedBody.data.transactionType } : {}),
				...(parsedBody.data.services !== undefined ? { services: parsedBody.data.services } : {}),
				...(parsedBody.data.items !== undefined ? { items: parsedBody.data.items } : {}),
				...(parsedBody.data.carpulesCount !== undefined ? { carpulesCount: parsedBody.data.carpulesCount } : {}),
				...(parsedBody.data.drugName !== undefined ? { drugName: parsedBody.data.drugName } : {}),
				...(parsedBody.data.paperJournalAcknowledged !== undefined ? { paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged } : {}),
				...(parsedBody.data.allowOverdraft !== undefined ? { allowOverdraft: parsedBody.data.allowOverdraft } : {}),
			});
		});
		return reply.send({ success: true, ...result, is_overdraft: Boolean(result.isOverdraft) });
	} catch (err: unknown) {
		const isInsufficientError = err instanceof InsufficientStockError;
		const errorObject = typeof err === "object" && err !== null ? (err as { error?: unknown; requiredStock?: unknown; availableStock?: unknown; inventoryItemId?: unknown; inventoryItemName?: unknown }) : null;
		const isInsufficient = isInsufficientError || errorObject?.error === "InsufficientStock";
		if (isInsufficient) {
			const avail = Number(isInsufficientError ? err.availableStock : errorObject?.availableStock ?? 0);
			const req = Number(isInsufficientError ? err.requiredStock : errorObject?.requiredStock ?? 1);
			const itemId = isInsufficientError ? err.inventoryItemId : String(errorObject?.inventoryItemId ?? "unknown");
			const itemName = isInsufficientError ? err.inventoryItemName : String(errorObject?.inventoryItemName ?? "Материал");
			return reply.status(200).send({
				success: true, isOverdraft: true, is_overdraft: true, hasOverdraft: true,
				inventoryItemId: itemId, inventoryItemName: itemName,
				availableStock: avail, requiredStock: req, deductions: [],
				warnings: [{ type: "out_of_stock", itemId, itemName, message: `Дефицит: ${req - avail}`, currentStock: avail - req, criticalThreshold: 0 }],
			});
		}
		request.log.error(err, "Failed to deduct visit inventory from warehouse");
		return reply.code(500).send({ error: "InternalServerError", message: err instanceof Error ? err.message : "Ошибка списания по визиту" });
	}
}

export const executeWarehouseDeductVisit = handleWarehouseDeductVisitRequest;
