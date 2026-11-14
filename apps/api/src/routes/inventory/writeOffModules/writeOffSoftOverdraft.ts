/**
 * writeOffSoftOverdraft.ts — Маршруты мягкого овердрафта (Soft Negative Stock, Мандат 8n, <= 110L).
 * Задержка оприходования накладной не блокирует работу врача у кресла (Мандат 8e).
 */

import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { inventoryItems } from "../../../db/schema.js";
import { withTenantCtx } from "../../../db/rls.js";
import { fefoStockService } from "../../../services/inventory/fefoStockService.js";
import {
	executeQuickCarpuleDisposal,
	quickCarpuleDisposalSchema,
	softOverdraftDeductSchema,
} from "../../../services/warehouse/warehouseOperations.js";

async function resolveOrg(req: FastifyRequest, rep: FastifyReply, tag: string): Promise<string | null> {
	const resolved = await requireResolvedStaffOrAdminOrganizationId(req, rep, tag);
	if (!resolved) return null;
	const paramOrg = typeof req.params === "object" && req.params !== null && "organizationId" in req.params && typeof (req.params as { organizationId?: unknown }).organizationId === "string"
		? (req.params as { organizationId: string }).organizationId
		: undefined;
	const bodyOrg = typeof req.body === "object" && req.body !== null && "organizationId" in req.body && typeof (req.body as { organizationId?: unknown }).organizationId === "string"
		? (req.body as { organizationId: string }).organizationId
		: undefined;
	const target = paramOrg || bodyOrg || resolved;
	if (target !== resolved) {
		rep.code(403).send({ error: "Forbidden" });
		return null;
	}
	return target;
}

export async function registerSoftOverdraftRoutes(server: FastifyInstance): Promise<void> {
	const handleSoftOverdraft = async (request: FastifyRequest, reply: FastifyReply) => {
		const targetOrgId = await resolveOrg(request, reply, "inventory soft overdraft deduct");
		if (!targetOrgId) return;

		const parsed = softOverdraftDeductSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const rawId = parsed.data.itemId || parsed.data.inventoryItemId;
		const searchName = (parsed.data.name || parsed.data.itemName || "").trim();

		const result = await withTenantCtx(targetOrgId, async (tx) => {
			let itemId = rawId;

			if (!itemId && searchName) {
				let [found] = await tx
					.select({ id: inventoryItems.id })
					.from(inventoryItems)
					.where(and(eq(inventoryItems.organizationId, targetOrgId), sql`lower(${inventoryItems.name}) = lower(${searchName})`))
					.limit(1);

				if (!found) {
					const [partial] = await tx
						.select({ id: inventoryItems.id })
						.from(inventoryItems)
						.where(and(eq(inventoryItems.organizationId, targetOrgId), sql`lower(${inventoryItems.name}) LIKE lower(${'%' + searchName + '%'})`))
						.limit(1);
					if (partial) found = partial;
				}

				if (found) {
					itemId = found.id;
				} else {
					const isUuid = rawId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
					const [created] = await tx
						.insert(inventoryItems)
						.values({
							...(isUuid ? { id: rawId } : {}),
							organizationId: targetOrgId,
							name: searchName,
							stockQuantity: "0",
							currentQty: "0",
							criticalThreshold: "0",
							unitCostRub: "0",
						})
						.returning({ id: inventoryItems.id });
					if (created) itemId = created.id;
				}
			}

			if (!itemId) {
				throw new Error("Не удалось определить позицию склада для списания");
			}

			const fefoResult = await fefoStockService.deductFefo(tx, {
				organizationId: targetOrgId,
				inventoryItemId: itemId,
				requiredQty: parsed.data.quantity,
				allowOverdraft: true,
				notes: parsed.data.reason || "Мягкий овердрафт: экстренное списание при нулевом/недостаточном остатке",
				userId,
				visitId: parsed.data.visitId || null,
				transactionType: "emergency_overdraft",
			});

			const [updatedItem] = await tx
				.select()
				.from(inventoryItems)
				.where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, targetOrgId)));

			const newStock = Number(updatedItem?.stockQuantity ?? updatedItem?.currentQty ?? 0);
			const deficit = fefoResult.deficitQty;
			const isOverdraft = fefoResult.isOverdraft || newStock < 0;

			return {
				item: updatedItem ?? { id: itemId, name: fefoResult.inventoryItemName, unit: "ед." },
				newStock,
				isOverdraft,
				deficit,
			};
		});

		return reply.status(200).send({
			success: true,
			itemId: result.item.id,
			itemName: result.item.name,
			quantityDeducted: parsed.data.quantity,
			newStock: result.newStock,
			isOverdraft: result.isOverdraft,
			allowOverdraft: true,
			deficit: result.deficit,
			warning: result.isOverdraft ? "soft_overdraft" : undefined,
			warningMessage: result.isOverdraft
				? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${result.deficit} ${result.item.unit ?? "ед."}). Задержка оприходования накладной не блокирует проведение приема!`
				: undefined,
		});
	};

	server.post<{ Params?: { organizationId?: string } }>("/:organizationId/soft-overdraft-deduct", handleSoftOverdraft);
	server.post("/soft-overdraft-deduct", handleSoftOverdraft);

	const handleCarpuleDisposal = async (request: FastifyRequest, reply: FastifyReply) => {
		const targetOrgId = await resolveOrg(request, reply, "inventory quick carpule disposal");
		if (!targetOrgId) return;

		const parsed = quickCarpuleDisposalSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const userId = (request.user as { id?: string } | undefined)?.id ?? null;
		const response = await executeQuickCarpuleDisposal(targetOrgId, parsed.data, userId);
		return reply.status(200).send(response);
	};

	server.post<{ Params?: { organizationId?: string } }>("/:organizationId/quick-carpule-disposal", handleCarpuleDisposal);
	server.post("/quick-carpule-disposal", handleCarpuleDisposal);
}
