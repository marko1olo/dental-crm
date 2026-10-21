/**
 * visitConsumablesRoutes.ts — Маршруты списания расходных материалов по приёму пациента.
 * Реализует Мандаты 8e (Врачебная автономия) и 8n (Суверенитет масштаба: соло-врач и небольшая клиника):
 * - Мягкий овердрафт: нулевой остаток на складе никогда не блокирует завершение приёма, акты и оплату (200 OK).
 * - Валидация Idempotency-Key (UUID / UUIDv7) от повторных списаний при даблкликах.
 * - 1-клик списание стандартного набора терапевта без микро-валидации граммов и миллилитров.
 * Декомпозирован по стандарту /decomposer (строго <= 250 строк).
 */

import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isValidUuid } from "@dental/shared";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { inventoryTransactions, visits } from "../../db/schema.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	buildSoftOverdraftResponse,
	isInsufficientStockError,
} from "../inventory/consumables/consumableFefoAllocator.js";
import { executeFefoBatchDeduction } from "../inventory/writeOffModules/writeOffFefoExecution.js";

interface VisitConsumablesRouteParams {
	id?: string;
	visitId?: string;
}

interface ConsumablesItemPayload {
	inventoryItemId?: string;
	id?: string;
	name?: string;
	quantity?: number;
	notes?: string;
	reason?: string;
	unitCostRub?: number;
}

interface VisitConsumablesRequestBody {
	items?: ConsumablesItemPayload[];
	bundleType?: "standard_kit" | "therapy" | "surgery" | "orthopedic" | "hygiene";
	standardKit?: boolean;
	carpulesCount?: number;
	drugName?: string;
	notes?: string;
	allowOverdraft?: boolean;
	idempotencyKey?: string;
	clientMutationId?: string;
}

function extractTargetVisitId(params: VisitConsumablesRouteParams): string | null {
	return params.id || params.visitId || null;
}

function validateIdempotencyHeaderOrBody(
	request: FastifyRequest,
	rawBody: unknown,
): { valid: boolean; error?: string } {
	const rawKey =
		request.headers["idempotency-key"] ??
		request.headers["x-idempotency-key"] ??
		request.headers["x-idempotence-key"] ??
		(rawBody && typeof rawBody === "object"
			? (rawBody as Record<string, unknown>).idempotencyKey ??
			  (rawBody as Record<string, unknown>).clientMutationId
			: null);

	const keyStr = Array.isArray(rawKey) ? rawKey[0] : rawKey;
	if (keyStr && typeof keyStr === "string" && keyStr.trim()) {
		const trimmed = keyStr.trim();
		if (!isValidUuid(trimmed)) {
			return {
				valid: false,
				error: "Заголовок Idempotency-Key / X-Idempotency-Key должен содержать валидный UUID (рекомендуется UUIDv7)",
			};
		}
	}
	return { valid: true };
}

async function handlePostVisitConsumables(
	request: FastifyRequest<{
		Params: VisitConsumablesRouteParams;
		Body: VisitConsumablesRequestBody;
	}>,
	reply: FastifyReply,
) {
	const targetVisitId = extractTargetVisitId(request.params);
	if (!targetVisitId) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Не указан идентификатор приёма",
		});
	}

	const idemCheck = validateIdempotencyHeaderOrBody(request, request.body);
	if (!idemCheck.valid) {
		return reply.status(400).send({
			error: "InvalidIdempotencyKey",
			message: idemCheck.error,
		});
	}

	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit consumables deduction",
	);
	if (!context) return;
	const orgId = context.organizationId;
	const identity = (request as unknown as { __denteIdentity?: { userId?: string } })
		.__denteIdentity;
	const doctorUserId = identity?.userId ?? request.user?.id ?? null;

	const [visit] = await database
		.select({ id: visits.id })
		.from(visits)
		.where(and(eq(visits.id, targetVisitId), eq(visits.organizationId, orgId)))
		.limit(1);

	if (!visit) {
		return reply.status(404).send({
			error: "VisitNotFound",
			message: `Приём ${targetVisitId} не найден в текущей организации`,
		});
	}

	const body = request.body || {};

	try {
		let result: unknown;

		if (body.bundleType === "surgery") {
			result = await withTenantCtx(orgId, async (tx) => {
				return TreatmentConsumablesService.quickWriteoffSurgery(tx, {
					organizationId: orgId,
					visitId: targetVisitId,
					userId: doctorUserId,
					notes: body.notes ?? null,
				});
			});
		} else if (body.bundleType === "orthopedic") {
			result = await withTenantCtx(orgId, async (tx) => {
				return TreatmentConsumablesService.quickWriteoffOrthopedicProtocol(tx, {
					organizationId: orgId,
					protocolId: (body as { protocolId?: string }).protocolId ?? "orthopedics_prep",
					visitId: targetVisitId,
					userId: doctorUserId,
					notes: body.notes ?? null,
				});
			});
		} else if (body.carpulesCount && body.carpulesCount > 0) {
			result = await withTenantCtx(orgId, async (tx) => {
				return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
					organizationId: orgId,
					visitId: targetVisitId,
					carpulesCount: body.carpulesCount!,
					drugName: body.drugName ?? "Артикаин 1:100 000 (карпула)",
					userId: doctorUserId,
					notes: body.notes ?? null,
				});
			});
		} else if (Array.isArray(body.items) && body.items.length > 0) {
			const itemsToDeduct = body.items.map((it) => ({
				inventoryItemId: it.inventoryItemId || it.id,
				name: it.name,
				quantity: Number(it.quantity) || 1,
				notes: it.notes || it.reason || body.notes || `Расходные материалы по приёму ${targetVisitId}`,
				unitCostRub: it.unitCostRub != null ? String(it.unitCostRub) : "0",
				allowOverdraft: body.allowOverdraft ?? true,
			}));

			const deductionResults = await withTenantCtx(orgId, async (tx) => {
				return executeFefoBatchDeduction(tx, {
					organizationId: orgId,
					items: itemsToDeduct,
					visitId: targetVisitId,
					allowOverdraftDefault: body.allowOverdraft ?? true,
					effectiveUserId: doctorUserId,
					commonReason: body.notes,
				});
			});

			const hasOverdraft = deductionResults.some((r) => r.isOverdraft);
			result = {
				success: true,
				visitId: targetVisitId,
				count: deductionResults.length,
				items: deductionResults,
				hasOverdraft,
				isOverdraft: hasOverdraft,
				warning: hasOverdraft
					? "Зафиксирован мягкий овердрафт склада. Приём пациента завершён без блокировки."
					: undefined,
			};
		} else {
			// По умолчанию: 1-клик списание стандартного набора терапевта
			result = await withTenantCtx(orgId, async (tx) => {
				return TreatmentConsumablesService.quickWriteoffStandardKit(tx, {
					organizationId: orgId,
					visitId: targetVisitId,
					userId: doctorUserId,
					notes: body.notes ?? "Стандартный набор расходных материалов терапевта",
				});
			});
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "INVENTORY_STOCK_CHANGED",
			payload: {
				visitId: targetVisitId,
				action: "consumables_deducted",
			},
		});

		return reply.status(200).send(result);
	} catch (error) {
		if (isInsufficientStockError(error)) {
			// Клинический закон: задержка накладной снабженцем не должна блокировать операцию и лечение зуба.
			// Мягкий овердрафт: отдаем 200 OK с предупреждением о дефиците партии вместо блокирующего 409.
			return reply.status(200).send(buildSoftOverdraftResponse(error, "visit"));
		}

		request.log.error(error, "Failed to deduct visit consumables");
		const msg = error instanceof Error ? error.message : "Не удалось списать расходные материалы";
		return reply.status(400).send({
			error: "ConsumablesDeductionFailed",
			message: msg,
		});
	}
}

async function handleGetVisitConsumables(
	request: FastifyRequest<{ Params: VisitConsumablesRouteParams }>,
	reply: FastifyReply,
) {
	const targetVisitId = extractTargetVisitId(request.params);
	if (!targetVisitId) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Не указан идентификатор приёма",
		});
	}

	const context = await requireClinicalReadContext(
		request,
		reply,
		"visit consumables read",
	);
	if (!context) return;
	const orgId = context.organizationId;

	const transactions = await database
		.select()
		.from(inventoryTransactions)
		.where(
			and(
				eq(inventoryTransactions.organizationId, orgId),
				eq(inventoryTransactions.visitId, targetVisitId),
			),
		)
		.orderBy(desc(inventoryTransactions.createdAt));

	return reply.send({
		visitId: targetVisitId,
		consumables: transactions,
		count: transactions.length,
	});
}

export function registerVisitConsumablesRoutes(app: FastifyInstance) {
	app.post("/api/visits/:visitId/consumables", handlePostVisitConsumables);
	app.post("/api/v1/visits/:visitId/consumables", handlePostVisitConsumables);

	app.get("/api/visits/:visitId/consumables", handleGetVisitConsumables);
	app.get("/api/v1/visits/:visitId/consumables", handleGetVisitConsumables);
}
