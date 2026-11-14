/**
 * apps/api/src/routes/sanpin/psoModules/psoQuickNormHandler.ts
 * Быстрая фиксация нормы предстерилизационной очистки (азопирам + фенолфталеин).
 * Мандат 8b: строго <= 120 строк.
 */

import { SanPiNRegulatoryEngine } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { preSterilizationCleaningLogs } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { wsBroker } from "../../../services/websocketBroker.js";

export async function handlePostPsoQuickNorm(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"pso quick norm",
	);
	if (!organizationId) return;

	const body = (req.body as Record<string, unknown>) || {};
	const batchItemCount = typeof body.batchItemCount === "number" ? body.batchItemCount : 100;
	const testedSampleCount =
		typeof body.testedSampleCount === "number"
			? body.testedSampleCount
			: Math.max(3, Math.ceil(batchItemCount * 0.01));
	const detergentBrand = typeof body.detergentBrand === "string" ? body.detergentBrand : "Биолот 0.5% + Аламинол 1%";
	const instrumentName =
		typeof body.instrumentName === "string"
			? body.instrumentName
			: "Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)";
	const notesText =
		typeof body.notes === "string"
			? body.notes
			: "Азопирамовая и фенолфталеиновая пробы отрицательные (следов крови и моющих средств не обнаружено, норма)";

	const evaluation = SanPiNRegulatoryEngine.evaluatePsoSampling(
		batchItemCount,
		testedSampleCount,
		true,
		true,
	);

	const bodyOperatorId = typeof body.operatorId === "string" ? body.operatorId : null;

	const [log] = await db
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
			operatorId: bodyOperatorId ?? getRequestIdentity(req).userId ?? null,
			notes: `${instrumentName} | ${notesText}`,
			timestamp: new Date(),
		})
		.returning();

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_PSO_ADDED",
		payload: log,
	});

	return reply.code(201).send({
		success: true,
		log,
		evaluation,
	});
}
