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
import {
	isValidUuid,
	kopecksToRubles,
	rublesToKopecks,
	treatmentConsumableDeductionRecordSchema,
	treatmentConsumableDeductionWarningSchema,
	type TreatmentConsumableDeductionRecord,
	type TreatmentConsumableDeductionWarning,
} from "@dental/shared";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	inventoryTransactions,
	treatmentConsumableDeductions,
	visits,
} from "../../db/schema.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import { wsBroker } from "../../services/websocketBroker.js";
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
	unitCostKopecks?: number;
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

function extractAndValidateIdempotencyKey(
	request: FastifyRequest,
	rawBody: unknown,
): { valid: boolean; key: string | null; error?: string } {
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
				key: null,
				error: "Заголовок Idempotency-Key / X-Idempotency-Key должен содержать валидный UUID (рекомендуется UUIDv7)",
			};
		}
		return { valid: true, key: trimmed };
	}
	return { valid: true, key: null };
}

async function handlePostVisitConsumables(
	request: FastifyRequest<{
		Params: VisitConsumablesRouteParams;
		Body: VisitConsumablesRequestBody;
	}>,
	reply: FastifyReply,
) {
	const targetVisitId = extractTargetVisitId(request.params);
	if (!targetVisitId || !isValidUuid(targetVisitId)) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор приёма (ожидается UUID)",
		});
	}

	const idemCheck = extractAndValidateIdempotencyKey(request, request.body);
	if (!idemCheck.valid) {
		return reply.status(400).send({
			error: "InvalidIdempotencyKey",
			message: idemCheck.error,
		});
	}
	const idempotencyKey = idemCheck.key;
	const body = request.body || {};
	const clientMutationId =
		typeof body.clientMutationId === "string" && body.clientMutationId.trim().length > 0
			? body.clientMutationId.trim()
			: null;
	const effectiveIdemKey = idempotencyKey || clientMutationId || null;

	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit consumables deduction",
	);
	if (!context) return;
	const orgId = context.organizationId;
	const identity = getRequestIdentity(request);
	const doctorUserId = identity.userId ?? request.user?.id ?? null;

	// Идемпотентная проверка по реестру treatment_consumable_deductions (Мандаты 8e, 8n, 8bo)
	if (effectiveIdemKey) {
		const [existingDeduction] = await withTenantCtx(orgId, async (tx) => {
			return tx
				.select()
				.from(treatmentConsumableDeductions)
				.where(
					and(
						eq(treatmentConsumableDeductions.organizationId, orgId),
						eq(treatmentConsumableDeductions.treatmentReferenceId, effectiveIdemKey),
					),
				)
				.limit(1);
		});

		if (existingDeduction) {
			reply.header("X-Idempotency-Key", effectiveIdemKey);
			const prevDeductions = Array.isArray(existingDeduction.deductions)
				? existingDeduction.deductions
				: [];
			const prevWarnings = Array.isArray(existingDeduction.warnings)
				? existingDeduction.warnings
				: [];
			return reply.status(200).send({
				success: true,
				visitId: targetVisitId,
				alreadyProcessed: true,
				isOverdraft: existingDeduction.isOverdraft,
				hasOverdraft: existingDeduction.isOverdraft,
				deductions: prevDeductions,
				items: prevDeductions,
				warnings: [
					...prevWarnings,
					{
						type: "already_processed",
						message: `Списание по ключу «${effectiveIdemKey}» уже было выполнено ранее (дедуплицировано).`,
					},
				],
				message: `Списание материалов по ключу «${effectiveIdemKey}» уже проведено ранее.`,
			});
		}
	}

	const [visit] = await withTenantCtx(orgId, async (tx) => {
		return tx
			.select({ id: visits.id })
			.from(visits)
			.where(and(eq(visits.id, targetVisitId), eq(visits.organizationId, orgId)))
			.limit(1);
	});

	if (!visit) {
		return reply.status(404).send({
			error: "VisitNotFound",
			message: `Приём ${targetVisitId} не найден в текущей организации`,
		});
	}

	try {
		const result = await withTenantCtx(orgId, async (tx) => {
			let innerResult: unknown;

			if (body.bundleType === "surgery") {
				innerResult = await TreatmentConsumablesService.quickWriteoffSurgery(tx, {
					organizationId: orgId,
					visitId: targetVisitId,
					userId: doctorUserId,
					notes: body.notes ?? null,
				});
			} else if (body.bundleType === "orthopedic") {
				innerResult = await TreatmentConsumablesService.quickWriteoffOrthopedicProtocol(tx, {
					organizationId: orgId,
					protocolId: (body as { protocolId?: string }).protocolId ?? "orthopedics_prep",
					visitId: targetVisitId,
					userId: doctorUserId,
					notes: body.notes ?? null,
				});
			} else if (typeof body.carpulesCount === "number" && body.carpulesCount > 0) {
				const carpulesCount = body.carpulesCount;
				innerResult = await TreatmentConsumablesService.quickWriteoffCarpules(tx, {
					organizationId: orgId,
					visitId: targetVisitId,
					carpulesCount,
					drugName: body.drugName ?? "Артикаин 1:100 000 (карпула)",
					userId: doctorUserId,
					notes: body.notes ?? null,
				});
			} else if (Array.isArray(body.items) && body.items.length > 0) {
				const itemsToDeduct = body.items.map((it) => {
					const unitCostKopecks =
						it.unitCostKopecks != null
							? Math.round(Number(it.unitCostKopecks))
							: it.unitCostRub != null
								? rublesToKopecks(Number(it.unitCostRub))
								: 0;

					return {
						inventoryItemId: it.inventoryItemId || it.id,
						name: it.name,
						quantity: Number(it.quantity) || 1,
						notes: it.notes || it.reason || body.notes || `Расходные материалы по приёму ${targetVisitId}`,
						unitCostKopecks,
						unitCostRub: String(kopecksToRubles(unitCostKopecks)),
						allowOverdraft: body.allowOverdraft ?? true,
					};
				});

				const deductionResults = await executeFefoBatchDeduction(tx, {
					organizationId: orgId,
					items: itemsToDeduct,
					visitId: targetVisitId,
					allowOverdraftDefault: body.allowOverdraft ?? true,
					effectiveUserId: doctorUserId,
					commonReason: body.notes,
				});

				const hasOverdraft = deductionResults.some((r) => r.isOverdraft);
				innerResult = {
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
				// По умолчанию: Автоматическое списание стандартного набора терапевта
				innerResult = await TreatmentConsumablesService.quickWriteoffStandardKit(tx, {
					organizationId: orgId,
					visitId: targetVisitId,
					userId: doctorUserId,
					notes: body.notes ?? "Стандартный набор расходных материалов терапевта",
				});
			}

			// Регистрация в реестре treatment_consumable_deductions в той же атомарной транзакции (Мандат 8bo)
			if (effectiveIdemKey) {
				const resObj =
					innerResult && typeof innerResult === "object"
						? (innerResult as Record<string, unknown>)
						: {};
				const isOverdraftVal = Boolean(resObj.isOverdraft ?? resObj.hasOverdraft);
				const rawDeductions = resObj.items ?? resObj.deductions ?? [];
				const rawWarnings = resObj.warnings ?? [];
				const savedDeductions: TreatmentConsumableDeductionRecord[] = Array.isArray(rawDeductions)
					? rawDeductions
							.map((d) => treatmentConsumableDeductionRecordSchema.safeParse(d))
							.filter(
								(p): p is { success: true; data: TreatmentConsumableDeductionRecord } =>
									p.success,
							)
							.map((p) => p.data)
					: [];
				const savedWarnings: TreatmentConsumableDeductionWarning[] = Array.isArray(rawWarnings)
					? rawWarnings
							.map((w) => treatmentConsumableDeductionWarningSchema.safeParse(w))
							.filter(
								(p): p is { success: true; data: TreatmentConsumableDeductionWarning } =>
									p.success,
							)
							.map((p) => p.data)
					: [];

				await tx
					.insert(treatmentConsumableDeductions)
					.values({
						organizationId: orgId,
						treatmentReferenceId: effectiveIdemKey,
						visitId: targetVisitId,
						doctorId: doctorUserId,
						status: "completed",
						isOverdraft: isOverdraftVal,
						deductions: savedDeductions,
						warnings: savedWarnings,
						notes: body.notes ?? null,
					})
					.onConflictDoNothing();
			}

			return innerResult;
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "INVENTORY_STOCK_CHANGED",
			payload: {
				visitId: targetVisitId,
				action: "consumables_deducted",
			},
		});

		if (effectiveIdemKey) {
			reply.header("X-Idempotency-Key", effectiveIdemKey);
		}

		return reply.status(200).send(result);
	} catch (error: unknown) {
		request.log.warn({ err: error, visitId: targetVisitId }, "Failed to deduct visit consumables, deferring to back-office");
		const msg = error instanceof Error ? error.message : "Не удалось списать расходные материалы";
		return reply.status(200).send({
			success: false,
			deferred: true,
			warning: "Списание отложено в бэк-офис",
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
	if (!targetVisitId || !isValidUuid(targetVisitId)) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор приёма (ожидается UUID)",
		});
	}

	const context = await requireClinicalReadContext(
		request,
		reply,
		"visit consumables read",
	);
	if (!context) return;
	const orgId = context.organizationId;

	const transactions = await withTenantCtx(orgId, async (tx) => {
		return tx
			.select()
			.from(inventoryTransactions)
			.where(
				and(
					eq(inventoryTransactions.organizationId, orgId),
					eq(inventoryTransactions.visitId, targetVisitId),
				),
			)
			.orderBy(desc(inventoryTransactions.createdAt));
	});

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
