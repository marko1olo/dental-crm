/**
 * apps/api/src/routes/sanpin/psoModules/psoQuickNormHandler.ts
 * Быстрая фиксация нормы предстерилизационной очистки (азопирам + фенолфталеин).
 * Мандат 8b: строго <= 120 строк.
 */

import { SanPiNRegulatoryEngine } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { recordAuditEvent } from "../../../audit.js";
import { onTenantTxCommit, withTenantCtx } from "../../../db/rls.js";
import { preSterilizationCleaningLogs } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";

const psoQuickNormBodySchema = z
	.object({
		batchItemCount: z.number().int().positive().optional(),
		testedSampleCount: z.number().int().positive().optional(),
		detergentBrand: z.string().optional(),
		instrumentName: z.string().optional(),
		notes: z.string().optional(),
		operatorId: z.string().uuid().nullable().optional(),
	})
	.strict();

export async function handlePostPsoQuickNorm(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"pso quick norm",
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

	const parsed = psoQuickNormBodySchema.safeParse(req.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры фиксации нормы предстерилизационной очистки.",
			issues: parsed.error.issues,
		});
	}
	const body = parsed.data;
	const batchItemCount = body.batchItemCount ?? 100;
	const testedSampleCount =
		body.testedSampleCount ?? Math.max(3, Math.ceil(batchItemCount * 0.01));
	const detergentBrand = body.detergentBrand ?? "Биолот 0.5% + Аламинол 1%";
	const instrumentName =
		body.instrumentName ??
		"Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)";
	const notesText =
		body.notes ??
		"Азопирамовая и фенолфталеиновая пробы отрицательные (следов крови и моющих средств не обнаружено, норма)";

	const evaluation = SanPiNRegulatoryEngine.evaluatePsoSampling(
		batchItemCount,
		testedSampleCount,
		true,
		true,
	);

	const bodyOperatorId = body.operatorId ?? null;
	const actorUserId = getRequestIdentity(req).userId ?? null;

	const [log] = await withTenantCtx(organizationId, async (tx) => {
		const [created] = await tx
			.insert(preSterilizationCleaningLogs)
			.values({
				organizationId,
				testType: "both",
				batchItemCount,
				testedSampleCount,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isBatchApproved: true,
				detergentBrand,
				rejectionReason: null,
				operatorId: bodyOperatorId ?? actorUserId,
				notes: `${instrumentName} | ${notesText}`,
				timestamp: new Date(),
			})
			.returning();

		if (created) {
			await recordAuditEvent({
				organizationId,
				actorUserId,
				entityType: "sanpin_pso_log",
				entityId: created.id,
				action: "pso_quick_norm_created",
				reason: `Физиологическая норма ПСО: ${created.notes}, партия: ${created.batchItemCount} шт`,
				tx,
			});
			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "SANPIN_PSO_ADDED",
					payload: created,
				});
			});
		}

		return [created];
	});

	return reply.code(201).send({
		success: true,
		log,
		evaluation,
		indicators: { azopyram: "negative_norm", phenolphthalein: "negative_norm" },
	});
}
