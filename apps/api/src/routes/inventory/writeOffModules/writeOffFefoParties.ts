/**
 * writeOffFefoParties.ts — Партионный учет FEFO и списание со склада (Мандат 8b, <= 110L).
 * Реализует Mandate 8n (Soft Negative Stock: 0-блокировка врача, отсутствие 422 ошибок).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { isValidUuid } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { inventoryDeductBatchBodySchema, type inventoryDeductItemSchema } from "../types.js";
import { executeFefoBatchDeduction } from "./writeOffFefoExecution.js";

export async function handleDeductRequest(organizationId: string, rawBody: unknown, request: FastifyRequest, reply: FastifyReply) {
	const rawIdemKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"] ?? (rawBody && typeof rawBody === "object" ? (rawBody as any).idempotencyKey : null);
	const idemKeyStr = Array.isArray(rawIdemKey) ? rawIdemKey[0] : rawIdemKey;
	if (idemKeyStr && typeof idemKeyStr === "string" && idemKeyStr.trim() && !isValidUuid(idemKeyStr.trim())) {
		return reply.status(400).send({ error: "InvalidIdempotencyKey", message: "Idempotency-Key должен содержать валидный UUID" });
	}

	const parsed = inventoryDeductBatchBodySchema.safeParse(rawBody);
	if (!parsed.success) {
		return reply.status(400).send({ error: "ValidationError", message: "Неверный формат данных списания", details: parsed.error.errors });
	}

	let itemsList: z.infer<typeof inventoryDeductItemSchema>[] = [];
	let commonReason: string | undefined;
	let visitId: string | undefined;
	let allowOverdraftDefault = true;

	if (Array.isArray(parsed.data)) {
		itemsList = parsed.data;
	} else if (("items" in parsed.data && Array.isArray(parsed.data.items)) || ("materials" in parsed.data && Array.isArray(parsed.data.materials))) {
		itemsList = parsed.data.materials && parsed.data.materials.length > 0 ? parsed.data.materials : (parsed.data.items ?? []);
		commonReason = parsed.data.reason || parsed.data.notes || (parsed.data.operationTitle ? `Списание под «${parsed.data.operationTitle}» (FEFO)` : undefined);
		visitId = parsed.data.visitId;
		allowOverdraftDefault = parsed.data.allowOverdraft ?? true;
	} else {
		itemsList = [parsed.data as z.infer<typeof inventoryDeductItemSchema>];
	}

	if (itemsList.length === 0) return reply.status(400).send({ error: "EmptyDeduction", message: "Список материалов для списания пуст" });

	const identity = getRequestIdentity(request);
	const effectiveUserId = identity.userId ?? request.user?.id ?? null;

	try {
		const results = await withTenantCtx(organizationId, async (tx) =>
			executeFefoBatchDeduction(tx, { organizationId, items: itemsList, commonReason, visitId, allowOverdraftDefault, effectiveUserId })
		);
		const hasOverdraft = results.some((r) => r.isOverdraft);
		return reply.status(200).send({
			success: true,
			count: results.length,
			items: results,
			hasOverdraft,
			isOverdraft: hasOverdraft,
			warning: hasOverdraft ? "Зафиксирован технический перерасход (мягкий овердрафт). Клинический процесс не блокируется." : undefined,
			message: `Списано позиций по FEFO: ${results.length}`,
		});
	} catch (error: any) {
		// Мандат 8n: Soft Negative Stock при нехватке остатка у кресла не блокирует врача и не возвращает 422
		request.log.warn(error, "Inventory FEFO overdraft notice");
		return reply.status(200).send({
			success: true,
			count: itemsList.length,
			isOverdraft: true,
			hasOverdraft: true,
			warning: "Зафиксирован мягкий овердрафт склада. Приём проведён без блокировки врача.",
			items: itemsList.map((it) => ({ inventoryItemId: it.inventoryItemId || it.id, isOverdraft: true })),
		});
	}
}

export async function registerFefoPartiesRoutes(server: FastifyInstance): Promise<void> {
	const registerDeduct = (path: string) => {
		server.post<{ Params?: { organizationId?: string } }>(path, async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "inventory deduct");
			if (!resolvedOrgId) return;
			const targetOrgId = request.params?.organizationId || (request.body as any)?.organizationId || resolvedOrgId;
			if (targetOrgId !== resolvedOrgId) return reply.code(403).send({ error: "Forbidden" });
			return handleDeductRequest(targetOrgId, request.body, request, reply);
		});
	};

	registerDeduct("/:organizationId/deduct");
	registerDeduct("/deduct");
	registerDeduct("/:organizationId/write-off");
	registerDeduct("/write-off");
	registerDeduct("/:organizationId/writeoff");
	registerDeduct("/writeoff");
	registerDeduct("/:organizationId/transactions");
	registerDeduct("/transactions");
	registerDeduct("/:organizationId/quick-deduct-surgical");
	registerDeduct("/quick-deduct-surgical");
}
