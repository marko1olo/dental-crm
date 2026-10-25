import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { outpatientVerifications, visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	updateOutpatientVerificationStatusSchema,
	updateVerificationParamsSchema,
} from "./outpatientTypes.js";

export async function updateVerificationStatusHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const paramsParsed = updateVerificationParamsSchema.safeParse(request.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный ID записи аудита качества",
			details: paramsParsed.error.issues,
		});
	}

	const bodyParsed = updateOutpatientVerificationStatusSchema.safeParse(request.body);
	if (!bodyParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный статус аудита качества",
			details: bodyParsed.error.issues,
		});
	}

	if (bodyParsed.data.status === "rejected" && !bodyParsed.data.rejectionReason?.trim()) {
		return reply.code(400).send({
			error: "RejectionReasonRequired",
			message: "При внесении замечания по качеству карты главный врач обязан указать рекомендацию или причину замечания",
		});
	}

	const [existing] = await db
		.select()
		.from(outpatientVerifications)
		.where(and(eq(outpatientVerifications.id, paramsParsed.data.id), eq(outpatientVerifications.organizationId, orgId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({ error: "VerificationNotFound", message: "Запись верификации не найдена" });
	}

	const identity = getRequestIdentity(request);
	const isFinished = bodyParsed.data.status === "approved" || bodyParsed.data.status === "rejected";

	const [updated] = await db
		.update(outpatientVerifications)
		.set({
			status: bodyParsed.data.status,
			rejectionReason: bodyParsed.data.rejectionReason || null,
			cmoUserId: identity.userId || null,
			verifiedAt: isFinished ? new Date() : null,
		})
		.where(and(eq(outpatientVerifications.id, existing.id), eq(outpatientVerifications.organizationId, orgId)))
		.returning();

	await db
		.update(visits)
		.set({ qualityControlStatus: bodyParsed.data.status })
		.where(and(eq(visits.id, existing.visitId), eq(visits.organizationId, orgId)));

	return reply.send({ success: true, verification: updated });
}
