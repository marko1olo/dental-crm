/**
 * apps/api/src/routes/sanpin/psoModules/psoCrudHandlers.ts
 * CRUD обработчики журнала предстерилизационной очистки.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	SanPiNRegulatoryEngine,
	createPsoCleaningLogDtoSchema,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { recordAuditEvent } from "../../../audit.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../../db/rls.js";
import { preSterilizationCleaningLogs, users } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";

export async function handleGetPso(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"pso read",
	);
	if (!organizationId) return;

	const logs = await withTenantReadCtx(organizationId, async (tx) => {
		return tx
			.select({
				id: preSterilizationCleaningLogs.id,
				organizationId: preSterilizationCleaningLogs.organizationId,
				instrumentName: sql<string>`coalesce(nullif(split_part(pre_sterilization_cleaning_logs.notes, ' | ', 1), ''), 'Стоматологический инструментарий')`,
				testType: preSterilizationCleaningLogs.testType,
				batchItemCount: preSterilizationCleaningLogs.batchItemCount,
				testedSampleCount: preSterilizationCleaningLogs.testedSampleCount,
				isAzopyramNegative: preSterilizationCleaningLogs.isAzopyramNegative,
				isPhenolphthaleinNegative: preSterilizationCleaningLogs.isPhenolphthaleinNegative,
				isBatchApproved: preSterilizationCleaningLogs.isBatchApproved,
				detergentBrand: preSterilizationCleaningLogs.detergentBrand,
				rejectionReason: preSterilizationCleaningLogs.rejectionReason,
				operatorId: preSterilizationCleaningLogs.operatorId,
				operatorName: sql<string>`coalesce(${users.fullName}, 'Медсестра ЦСО')`,
				notes: sql<string>`case when position(' | ' in coalesce(pre_sterilization_cleaning_logs.notes, '')) > 0 then substring(pre_sterilization_cleaning_logs.notes from position(' | ' in pre_sterilization_cleaning_logs.notes) + 3) else '' end`,
				timestamp: preSterilizationCleaningLogs.timestamp,
				createdAt: preSterilizationCleaningLogs.createdAt,
			})
			.from(preSterilizationCleaningLogs)
			.leftJoin(users, eq(users.id, preSterilizationCleaningLogs.operatorId))
			.where(eq(preSterilizationCleaningLogs.organizationId, organizationId))
			.orderBy(desc(preSterilizationCleaningLogs.timestamp));
	});

	return logs;
}

export async function handlePostPso(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"pso create",
	);
	if (!organizationId) return;

	const idempotencyKey = extractIdempotencyKey(req);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const rawBody = { ...((req.body as Record<string, unknown>) || {}) };
	if (typeof rawBody.operatorId === "string") {
		const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRe.test(rawBody.operatorId)) delete rawBody.operatorId;
	}

	const parsed = createPsoCleaningLogDtoSchema.safeParse(rawBody);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры предстерилизационной очистки.",
		});
	}
	const data = parsed.data;

	const evaluation = SanPiNRegulatoryEngine.evaluatePsoSampling(
		data.batchItemCount,
		data.testedSampleCount,
		data.isAzopyramNegative,
		data.isPhenolphthaleinNegative,
		data.isSudanNegative ?? true,
	);

	const [log] = await withTenantWriteCtx(organizationId, async (tx) => {
		const [created] = await tx
			.insert(preSterilizationCleaningLogs)
			.values({
				organizationId,
				testType: data.testType,
				batchItemCount: data.batchItemCount,
				testedSampleCount: data.testedSampleCount,
				isAzopyramNegative: data.isAzopyramNegative,
				isPhenolphthaleinNegative: data.isPhenolphthaleinNegative,
				isBatchApproved: evaluation.isBatchApproved,
				detergentBrand: data.detergentBrand ?? null,
				rejectionReason: evaluation.rejectionReason,
				operatorId: data.operatorId ?? getRequestIdentity(req).userId ?? null,
				notes: data.notes ? `${data.instrumentName} | ${data.notes}` : data.instrumentName,
				timestamp: new Date(),
			})
			.returning();

		if (created) {
			await recordAuditEvent({
				organizationId,
				actorUserId: getRequestIdentity(req).userId ?? null,
				entityType: "sanpin_pso_log",
				entityId: created.id,
				action: "pso_log_created",
				reason: `Создана запись ПСО контроля ${created.testType}: ${created.notes || ""}, партия: ${created.batchItemCount} шт, допуск: ${created.isBatchApproved ? "Да" : "Нет"}`,
				tx,
			});
		}

		return [created];
	});

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_PSO_ADDED",
		payload: log,
	});

	return reply.code(201).send({ success: true, log, evaluation });
}

export async function handleDeletePso(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"pso delete",
	);
	if (!organizationId) return;

	const idempotencyKey = extractIdempotencyKey(req);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const idParsed = z.string().uuid().safeParse((req.params as { id?: unknown })?.id);
	if (!idParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор записи предстерилизационной очистки (ожидается UUID).",
		});
	}
	const id = idParsed.data;
	const [deleted] = await withTenantWriteCtx(organizationId, async (tx) => {
		const [res] = await tx
			.delete(preSterilizationCleaningLogs)
			.where(
				and(
					eq(preSterilizationCleaningLogs.id, id),
					eq(preSterilizationCleaningLogs.organizationId, organizationId),
				),
			)
			.returning();

		if (res) {
			await recordAuditEvent({
				organizationId,
				actorUserId: getRequestIdentity(req).userId ?? null,
				entityType: "sanpin_pso_log",
				entityId: id,
				action: "pso_log_deleted",
				reason: `Удалена запись ПСО контроля ${res.testType}: ${res.notes || ""}`,
				tx,
			});
		}

		return [res];
	});

	if (!deleted) return reply.code(404).send({ error: "NotFound", message: "Запись не найдена" });

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_PSO_DELETED",
		payload: { id },
	});

	return { success: true, id };
}
