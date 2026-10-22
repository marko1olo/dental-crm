/**
 * writeOffFefoExecution.ts — Layer 2 / Layer 3: FEFO-партионное списание и мягкий овердрафт.
 * Реализует Мандаты 8e, 8k, 8n, 8s (Doctor Autonomy, Zero Dead-Ends, Soft Overdraft).
 * В соответствии с правилом §2.25 стандарта /decomposer первый параметр функций БД — tx: DatabaseTransaction.
 */

import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { isValidUuid } from "@dental/shared";
import { withTenantCtx } from "../../../db/rls.js";
import { inventoryItems } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { fefoStockService } from "../../../services/inventory/fefoStockService.js";
import { InsufficientStockError } from "../../../services/inventory/materialDeduction.js";
import {
	inventoryDeductBatchBodySchema,
	type inventoryDeductItemSchema,
} from "../types.js";
import type { DatabaseTransaction } from "./writeOffTypes.js";

export interface FefoBatchDeductionParams {
	organizationId: string;
	items: Array<z.infer<typeof inventoryDeductItemSchema>>;
	commonReason?: string | undefined;
	visitId?: string | undefined;
	allowOverdraftDefault?: boolean | undefined;
	effectiveUserId: string | null;
}

/**
 * Атомарное пакетное списание позиций по FEFO в рамках открытой транзакции БД.
 * Первый параметр — tx: DatabaseTransaction согласно §2.25 стандарта /decomposer.
 */
export async function executeFefoBatchDeduction(
	tx: DatabaseTransaction,
	params: FefoBatchDeductionParams,
): Promise<Array<any>> {
	const {
		organizationId,
		items,
		commonReason,
		visitId,
		allowOverdraftDefault = true,
		effectiveUserId,
	} = params;

	const results: Array<any> = [];

	for (const item of items) {
		let itemId = item.inventoryItemId || item.id;

		// Если ID не передан, но передано наименование — ищем позицию в базе
		if (!itemId && item.name?.trim()) {
			const searchName = item.name.trim();
			let [found] = await tx
				.select({ id: inventoryItems.id })
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						sql`lower(${inventoryItems.name}) = lower(${searchName})`,
					),
				)
				.limit(1);

			if (!found) {
				// Поиск по ключевым словам/подстроке
				const [partial] = await tx
					.select({ id: inventoryItems.id })
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, organizationId),
							sql`lower(${inventoryItems.name}) LIKE lower(${'%' + searchName + '%'}) OR lower(${searchName}) LIKE ('%' || lower(${inventoryItems.name}) || '%')`,
						),
					)
					.limit(1);
				if (partial) found = partial;
			}

			if (found) {
				itemId = found.id;
			} else {
				// По закону Zero Dead-Ends (Мандат 8e, 8n): если номенклатура отсутствует на складе,
				// создаем карточку материала с остатком 0 для последующего мягкого овердрафта.
				const [created] = await tx
					.insert(inventoryItems)
					.values({
						organizationId,
						name: searchName,
						stockQuantity: "0",
						currentQty: "0",
						criticalThreshold: "0",
						unitCostRub:
							item.unitCostRub != null
								? String(item.unitCostRub)
								: "0",
					})
					.returning({ id: inventoryItems.id });
				if (created) itemId = created.id;
			}
		}

		if (!itemId) {
			throw new Error(
				`Не удалось определить позицию склада для материала «${item.name || "не указано"}»`,
			);
		}

		const res = await fefoStockService.deductFefo(tx, {
			organizationId,
			inventoryItemId: itemId,
			requiredQty: item.quantity,
			allowOverdraft:
				item.allowOverdraft ?? allowOverdraftDefault,
			notes:
				item.reason ||
				item.notes ||
				commonReason ||
				"Списание со склада у кресла (автоматический FEFO)",
			userId: effectiveUserId,
			visitId: visitId || null,
			transactionType: "treatment_consumable",
		});

		results.push(res);
	}

	return results;
}

/**
 * Обработчик эндпоинта пакетного списания со склада с поддержкой мягкого овердрафта.
 */
export async function handleDeductRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	// Валидация Idempotency-Key / X-Idempotency-Key (UUID / UUIDv7) от даблкликов медперсонала
	const rawIdemKey =
		request.headers["idempotency-key"] ??
		request.headers["x-idempotency-key"] ??
		request.headers["x-idempotence-key"] ??
		(rawBody && typeof rawBody === "object"
			? (rawBody as Record<string, unknown>).idempotencyKey ??
			  (rawBody as Record<string, unknown>).clientMutationId
			: null);

	const idemKeyStr = Array.isArray(rawIdemKey) ? rawIdemKey[0] : rawIdemKey;
	if (idemKeyStr && typeof idemKeyStr === "string" && idemKeyStr.trim()) {
		const trimmedKey = idemKeyStr.trim();
		if (!isValidUuid(trimmedKey)) {
			return reply.status(400).send({
				error: "InvalidIdempotencyKey",
				message: "Заголовок Idempotency-Key / X-Idempotency-Key должен содержать валидный UUID (рекомендуется UUIDv7)",
			});
		}
	}

	const parsed = inventoryDeductBatchBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Неверный формат данных для списания материалов",
			details: parsed.error.errors,
		});
	}

	let itemsList: z.infer<typeof inventoryDeductItemSchema>[] = [];
	let commonReason: string | undefined;
	let visitId: string | undefined;
	let allowOverdraftDefault = true;

	if (Array.isArray(parsed.data)) {
		itemsList = parsed.data;
	} else if (
		("items" in parsed.data && Array.isArray(parsed.data.items)) ||
		("materials" in parsed.data && Array.isArray(parsed.data.materials))
	) {
		itemsList =
			parsed.data.materials && parsed.data.materials.length > 0
				? parsed.data.materials
				: (parsed.data.items ?? []);
		commonReason =
			parsed.data.reason ||
			parsed.data.notes ||
			(parsed.data.operationTitle
				? `Списание под операцию «${parsed.data.operationTitle}» (FEFO у кресла)`
				: undefined);
		visitId = parsed.data.visitId;
		if (parsed.data.allowOverdraft !== undefined) {
			allowOverdraftDefault = parsed.data.allowOverdraft;
		} else if (parsed.data.hasWarehouseDelay !== undefined) {
			allowOverdraftDefault = true;
		}
	} else {
		itemsList = [parsed.data as z.infer<typeof inventoryDeductItemSchema>];
	}

	if (itemsList.length === 0) {
		return reply.status(400).send({
			error: "EmptyDeduction",
			message: "Список материалов для списания пуст",
		});
	}

	const identity = getRequestIdentity(request);
	const userContext = request.user;
	const effectiveUserId = identity.userId ?? userContext?.id ?? null;

	try {
		const deductionResults = await withTenantCtx(organizationId, async (tx) => {
			return executeFefoBatchDeduction(tx, {
				organizationId,
				items: itemsList,
				commonReason,
				visitId,
				allowOverdraftDefault,
				effectiveUserId,
			});
		});

		const hasOverdraft = deductionResults.some((r) => r.isOverdraft);

		return reply.status(200).send({
			success: true,
			count: deductionResults.length,
			items: deductionResults,
			hasOverdraft,
			isOverdraft: hasOverdraft,
			warning: hasOverdraft
				? "Зафиксирован технический перерасход (мягкий овердрафт). Клинический процесс не блокируется."
				: undefined,
			message: hasOverdraft
				? `Списано позиций по FEFO: ${deductionResults.length} (зафиксирован мягкий овердрафт, клинический процесс не блокируется)`
				: `Списано позиций по FEFO: ${deductionResults.length}`,
		});
	} catch (error) {
		const isInsufficientStock =
			error instanceof InsufficientStockError ||
			(error as any)?.error === "InsufficientStock" ||
			(error as any)?.name === "InsufficientStockError" ||
			(error as any)?.code === "InsufficientStock";

		if (isInsufficientStock) {
			const itemErr = error as any;
			const invItemId = itemErr.inventoryItemId ?? "unknown";
			const invItemName = itemErr.inventoryItemName ?? "Материал";
			const avail = Number(itemErr.availableStock ?? 0);
			const req = Number(itemErr.requiredStock ?? 1);
			const deficit = Math.max(0, req - avail);
			return reply.status(409).send({
				success: false,
				code: "INSUFFICIENT_STOCK",
				error: "InsufficientStock",
				message: `Недостаточно остатка на складе по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`,
				inventoryItemId: invItemId,
				inventoryItemName: invItemName,
				availableStock: avail,
				requiredStock: req,
				deficitQty: deficit,
			});
		}

		request.log.error(error, "Failed to deduct inventory items");
		const msg =
			error instanceof Error
				? error.message
				: "Не удалось провести списание материалов";
		return reply.status(400).send({
			error: "DeductionFailed",
			message: msg,
		});
	}
}
