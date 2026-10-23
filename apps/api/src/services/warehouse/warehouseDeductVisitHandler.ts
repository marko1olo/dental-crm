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
		const b = rawBody as Record<string, any>;
		const rawVisitId = b.visitId ?? b.treatment_reference_id ?? b.visit_id;
		const rawItems = b.items ?? b.materials;
		let items: any[] | undefined = undefined;
		if (Array.isArray(rawItems)) {
			items = rawItems.map((it) => ({
				inventoryItemId: it.inventoryItemId ?? it.inventory_item_id ?? it.id,
				quantity: it.quantity,
				reason: it.reason ?? it.notes ?? b.notes,
			}));
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

	try {
		const result = await db.transaction(async (tx) => {
			return TreatmentConsumablesService.deductForVisit(tx, {
				organizationId,
				visitId: parsedBody.data.visitId,
				clientMutationId: parsedBody.data.clientMutationId ?? (request.headers["idempotency-key"] as string | undefined) ?? null,
				userId: parsedBody.data.userId !== undefined ? parsedBody.data.userId : ((request.user as any)?.id ?? null),
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
		const isInsufficient = err instanceof InsufficientStockError || (err as any)?.error === "InsufficientStock";
		if (isInsufficient) {
			const e = err as any;
			const avail = Number(e.availableStock ?? 0);
			const req = Number(e.requiredStock ?? 1);
			return reply.status(200).send({
				success: true, isOverdraft: true, is_overdraft: true, hasOverdraft: true,
				inventoryItemId: e.inventoryItemId ?? "unknown", inventoryItemName: e.inventoryItemName ?? "Материал",
				availableStock: avail, requiredStock: req, deductions: [],
				warnings: [{ type: "out_of_stock", itemId: e.inventoryItemId, itemName: e.inventoryItemName, message: `Дефицит: ${req - avail}`, currentStock: avail - req, criticalThreshold: 0 }],
			});
		}
		request.log.error(err, "Failed to deduct visit inventory from warehouse");
		return reply.code(500).send({ error: "InternalServerError", message: err instanceof Error ? err.message : "Ошибка списания по визиту" });
	}
}

export const executeWarehouseDeductVisit = handleWarehouseDeductVisitRequest;
