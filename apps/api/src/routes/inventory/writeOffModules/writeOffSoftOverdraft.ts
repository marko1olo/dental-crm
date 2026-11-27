/**
 * writeOffSoftOverdraft.ts — Маршруты мягкого овердрафта (Soft Negative Stock, Мандат 8n, <= 110L).
 * Задержка оприходования накладной не блокирует работу врача у кресла (Мандат 8e).
 */

import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { defineTenantMutation } from "../../../core/routeFactories.js";
import { inventoryItems } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { fefoStockService } from "../../../services/inventory/fefoStockService.js";
import { handleDeductRequest } from "./writeOffFefoParties.js";

const INVENTORY_WRITE_AUTH = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

export const softOverdraftDeductSchema = z.object({
	itemId: z.string().optional(),
	inventoryItemId: z.string().optional(),
	name: z.string().optional(),
	itemName: z.string().optional(),
	quantity: z.number().positive("Количество должно быть больше нуля"),
	reason: z.string().optional(),
	visitId: z.string().nullable().optional(),
	organizationId: z.string().optional(),
}).strict();

function resolveOrgFromResolved(req: FastifyRequest, rep: FastifyReply, resolved: string): string | null {
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
	const registerOverdraftRoute = (path: string) => {
		defineTenantMutation(server, {
			method: "POST",
			path,
			permission: "inventory.write",
			authOptions: INVENTORY_WRITE_AUTH,
			idempotency: "optional_header",
			handler: async ({ tx, organizationId: resolvedOrgId, request, reply }) => {
				const targetOrgId = resolveOrgFromResolved(request, reply, resolvedOrgId);
				if (!targetOrgId) return;

				const rawBody = request.body;
				if (
					Array.isArray(rawBody) ||
					(rawBody &&
						typeof rawBody === "object" &&
						(("materials" in rawBody && Array.isArray((rawBody as { materials?: unknown }).materials)) ||
							("items" in rawBody && Array.isArray((rawBody as { items?: unknown }).items))))
				) {
					return handleDeductRequest(targetOrgId, rawBody, request, reply, tx);
				}

				const parsed = softOverdraftDeductSchema.safeParse(request.body ?? {});
				if (!parsed.success) {
					return reply.status(400).send({
						error: "ValidationError",
						message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
					});
				}

				const userId = getRequestIdentity(request).userId ?? (request.user as { id?: string } | undefined)?.id ?? null;
				const rawId = parsed.data.itemId || parsed.data.inventoryItemId;
				const searchName = (parsed.data.name || parsed.data.itemName || "").trim();

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
								unitCostKopecks: 0n,
								pricePerUnitKopecks: 0n,
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
				const item = updatedItem ?? { id: itemId, name: fefoResult.inventoryItemName, unit: "ед." };

				return reply.status(200).send({
					success: true,
					itemId: item.id,
					itemName: item.name,
					quantityDeducted: parsed.data.quantity,
					newStock,
					isOverdraft,
					allowOverdraft: true,
					deficit,
					warning: isOverdraft ? "soft_overdraft" : undefined,
					warningMessage: isOverdraft
						? `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${deficit} ${item.unit ?? "ед."}). Задержка оприходования накладной не блокирует проведение приема!`
						: undefined,
				});
			},
		});
	};

	registerOverdraftRoute("/:organizationId/soft-overdraft-deduct");
	registerOverdraftRoute("/soft-overdraft-deduct");
}
