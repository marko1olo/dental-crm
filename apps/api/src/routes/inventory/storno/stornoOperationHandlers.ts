/**
 * stornoOperationHandlers.ts — Безопасный возврат и аннулирование складских проводок (Мандаты 8e, 8n).
 * Автоматический возврат ТМЦ на склад при удалении услуг из визита или полном возврате оплаты.
 */

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type TenantDb, withTenantWriteCtx } from "../../../db/rls.js";
import { inventoryItems, inventoryTransactions } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { inventoryStornoBodySchema, toValidUuid } from "../types.js";
import { isValidUuid } from "@dental/shared";
import {
	resolveServiceStornoMaterials,
	type StornoMaterialTarget,
} from "./stornoAuditAndJournal.js";
import {
	findOrCreateStornoTargetItem,
	restoreStockAndBatchesForMaterial,
	type RestoredStornoItem,
	STORNO_DEDUCTION_TX_TYPES,
} from "./stornoBatchRestoration.js";

export type { RestoredStornoItem };

export interface ReverseVisitConsumablesParams {
	organizationId: string;
	visitId: string;
	userId?: string | null | undefined;
	reason?: string | undefined;
	notes?: string | undefined;
	idempotencyKey?: string | undefined;
}

async function executeStornoMaterialsTx(
	tx: TenantDb,
	params: {
		organizationId: string;
		safeVisitId: string | null;
		visitLabel?: string | undefined;
		effectiveUserId: string | null;
		reason?: string | undefined;
		notes?: string | undefined;
		idempotencyKey?: string | undefined;
		initialMaterials: StornoMaterialTarget[];
	},
): Promise<{ restoredItems: RestoredStornoItem[]; alreadyProcessed: boolean }> {
	const {
		organizationId,
		safeVisitId,
		visitLabel,
		effectiveUserId,
		reason,
		notes,
		idempotencyKey,
		initialMaterials,
	} = params;

	if (idempotencyKey) {
		const existingIdem = await tx
			.select({ id: inventoryTransactions.id })
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					eq(inventoryTransactions.transactionType, "storno"),
					sql`(${inventoryTransactions.metadata}->>'stornoIdempotencyKey') = ${idempotencyKey}`,
				),
			)
			.limit(1);
		if (existingIdem.length > 0) {
			return { restoredItems: [], alreadyProcessed: true };
		}
	}

	const materialsToRestore = [...initialMaterials];
	const preferredBatchesByItem = new Map<string, Map<string, number>>();

	if (safeVisitId) {
		const visitTxs = await tx
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					eq(inventoryTransactions.visitId, safeVisitId),
				),
			)
			.orderBy(asc(inventoryTransactions.createdAt), asc(inventoryTransactions.id));

		const deductedByItem = new Map<string, number>();
		for (const t of visitTxs) {
			const itId = t.itemId ?? t.inventoryItemId;
			if (!itId) continue;
			const change = Number(t.quantityChanged ?? t.qty ?? 0);
			if (t.transactionType === "storno") {
				const absQty = Math.abs(change);
				deductedByItem.set(itId, (deductedByItem.get(itId) ?? 0) - absQty);
				if (t.batchId && absQty > 0) {
					const batchMap = preferredBatchesByItem.get(itId);
					if (batchMap) {
						const remB = Number(((batchMap.get(t.batchId) ?? 0) - absQty).toFixed(4));
						if (remB > 0) batchMap.set(t.batchId, remB);
						else batchMap.delete(t.batchId);
					}
				}
			} else if (change < 0 || STORNO_DEDUCTION_TX_TYPES.includes(t.transactionType)) {
				const absQty = Math.abs(change);
				deductedByItem.set(itId, (deductedByItem.get(itId) ?? 0) + absQty);
				if (t.batchId && absQty > 0) {
					let batchMap = preferredBatchesByItem.get(itId);
					if (!batchMap) {
						batchMap = new Map<string, number>();
						preferredBatchesByItem.set(itId, batchMap);
					}
					batchMap.set(t.batchId, Number(((batchMap.get(t.batchId) ?? 0) + absQty).toFixed(4)));
				}
			}
		}

		if (materialsToRestore.length === 0) {
			for (const [itId, netDeducted] of deductedByItem.entries()) {
				const roundedNet = Number(netDeducted.toFixed(4));
				if (roundedNet > 0) {
					materialsToRestore.push({
						inventoryItemId: itId,
						quantity: roundedNet,
						serviceTitle: `Отмена визита ${visitLabel ?? safeVisitId}`,
					});
				}
			}
		}
	}

	if (materialsToRestore.length === 0) {
		return { restoredItems: [], alreadyProcessed: false };
	}

	const sortedMaterials = [...materialsToRestore].sort((a, b) =>
		(a.inventoryItemId || a.name || "").toLowerCase().localeCompare((b.inventoryItemId || b.name || "").toLowerCase()),
	);

	const sortedItemIds = Array.from(
		new Set(sortedMaterials.map((m) => m.inventoryItemId).filter((id): id is string => Boolean(id))),
	).sort();

	const prelockedMap = new Map<string, typeof inventoryItems.$inferSelect>();
	if (sortedItemIds.length > 0) {
		const prelocked = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					inArray(inventoryItems.id, sortedItemIds),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.orderBy(asc(inventoryItems.id))
			.for("update");
		for (const item of prelocked) prelockedMap.set(item.id, item);
	}

	const restoredItems: RestoredStornoItem[] = [];
	for (const material of sortedMaterials) {
		if (!material.quantity || material.quantity <= 0) continue;
		const targetItem = await findOrCreateStornoTargetItem(tx, organizationId, material, prelockedMap);
		if (!targetItem) continue;

		const restored = await restoreStockAndBatchesForMaterial(tx, {
			organizationId,
			targetItem,
			material,
			safeVisitId,
			effectiveUserId,
			reason,
			notes,
			idempotencyKey,
			preferredBatchesByItem,
			prelockedMap,
		});
		restoredItems.push(restored);
	}

	return { restoredItems, alreadyProcessed: false };
}

export async function reverseVisitConsumablesTx(
	tx: TenantDb,
	params: ReverseVisitConsumablesParams,
): Promise<{ restoredItems: RestoredStornoItem[]; alreadyProcessed: boolean }> {
	const safeVisitId = toValidUuid(params.visitId);
	if (!safeVisitId) return { restoredItems: [], alreadyProcessed: false };

	return executeStornoMaterialsTx(tx, {
		organizationId: params.organizationId,
		safeVisitId,
		visitLabel: params.visitId,
		effectiveUserId: params.userId ?? null,
		reason: params.reason,
		notes: params.notes,
		idempotencyKey: params.idempotencyKey,
		initialMaterials: [],
	});
}

export async function handleStornoRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
	executor?: TenantDb,
) {
	const rawIdemHeader = request.headers["idempotency-key"];
	const headerIdemStr = Array.isArray(rawIdemHeader) ? rawIdemHeader[0] : rawIdemHeader;
	let idempotencyKey: string | undefined;
	if (headerIdemStr !== undefined) {
		const trimmed = headerIdemStr.trim();
		if (!trimmed || !isValidUuid(trimmed)) {
			return reply.status(400).send({
				error: "InvalidIdempotencyKey",
				message: "Idempotency-Key должен содержать валидный UUID",
			});
		}
		idempotencyKey = trimmed;
	}

	const parsed = inventoryStornoBodySchema.safeParse(rawBody ?? {});
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: parsed.error.errors[0]?.message ?? "Неверные параметры запроса сторно",
			details: parsed.error.errors,
		});
	}

	const data = parsed.data;
	const safeVisitId = toValidUuid(data.visitId);
	const identity = getRequestIdentity(request);
	const effectiveUserId = identity.userId ?? request.user?.id ?? null;

	try {
		const runStorno = async (tx: TenantDb) => {
			const initialMaterials: StornoMaterialTarget[] = [];
			for (const it of data.items ?? data.materials ?? []) {
				initialMaterials.push({
					inventoryItemId: it.inventoryItemId || it.id,
					name: it.name,
					quantity: it.quantity,
					serviceTitle: "Ручное сторно",
				});
			}
			for (const srv of data.services ?? (data.service ? [data.service] : [])) {
				const resolved = await resolveServiceStornoMaterials(srv, organizationId, tx);
				initialMaterials.push(...resolved);
			}

			return executeStornoMaterialsTx(tx, {
				organizationId,
				safeVisitId,
				visitLabel: data.visitId ?? undefined,
				effectiveUserId,
				reason: data.reason,
				notes: data.notes,
				idempotencyKey,
				initialMaterials,
			});
		};
		const { restoredItems: stornoResult, alreadyProcessed } = executor
			? await runStorno(executor)
			: await withTenantWriteCtx(organizationId, runStorno);

		return reply.status(200).send({
			success: true,
			alreadyProcessed,
			stornoCount: stornoResult.length,
			restoredItems: stornoResult,
			message: alreadyProcessed
				? "Повторный запрос сторно дедуплицирован по Idempotency-Key"
				: stornoResult.length > 0
					? `Отмена ошибочного списания: ${stornoResult.length} позиций материалов возвращены на склад`
					: "Нет материалов для отмены списания",
		});
	} catch (err) {
		request.log.error(err, "Storno error");
		return reply.status(500).send({
			error: "StornoFailed",
			message: err instanceof Error ? err.message : "Не удалось выполнить сторно материалов",
		});
	}
}
