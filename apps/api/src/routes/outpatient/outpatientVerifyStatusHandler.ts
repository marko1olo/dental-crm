import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
	unguardedBypassAllowed,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { outpatientVerifications, visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	updateOutpatientVerificationStatusSchema,
	updateVerificationParamsSchema,
} from "./outpatientTypes.js";

export async function updateVerificationStatusHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "outpatient verify status"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const identity = getRequestIdentity(request);
	const rawRole = identity.role ?? request.user?.role ?? null;
	const normalizedRole = rawRole?.trim().toLowerCase() ?? null;
	const evalAccess = evaluateClinicalAccess(rawRole);
	const isCmoOrLead =
		normalizedRole === "owner" ||
		normalizedRole === "admin" ||
		normalizedRole === "chief_doctor" ||
		normalizedRole === "chiefdoctor" ||
		normalizedRole === "head_doctor";
	const allowUnguarded =
		rawRole === null && unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS");
	if (!evalAccess.hasClinicalAccess && !isCmoOrLead && !allowUnguarded) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.outpatient.verify",
			role: rawRole,
			message: "Верификация качества медицинских карт доступна только главному врачу или клиническому руководству.",
		});
	}

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

	const isFinished = bodyParsed.data.status === "approved" || bodyParsed.data.status === "rejected";

	const updated = await withTenantCtx(orgId, async (tx) => {
		const [existing] = await tx
			.select()
			.from(outpatientVerifications)
			.where(and(eq(outpatientVerifications.id, paramsParsed.data.id), eq(outpatientVerifications.organizationId, orgId)))
			.limit(1)
			.for("update");

		if (!existing) {
			return null;
		}

		const [verRecord] = await tx
			.update(outpatientVerifications)
			.set({
				status: bodyParsed.data.status,
				rejectionReason: bodyParsed.data.rejectionReason || null,
				cmoUserId: identity.userId || null,
				verifiedAt: isFinished ? new Date() : null,
			})
			.where(and(eq(outpatientVerifications.id, existing.id), eq(outpatientVerifications.organizationId, orgId)))
			.returning();

		await tx
			.update(visits)
			.set({ qualityControlStatus: bodyParsed.data.status })
			.where(and(eq(visits.id, existing.visitId), eq(visits.organizationId, orgId)));

		return verRecord;
	});

	if (!updated) {
		return reply.code(404).send({ error: "VerificationNotFound", message: "Запись верификации не найдена" });
	}

	return reply.send({ success: true, verification: updated });
}
