import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { outpatientVerifications } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { checkLockParamsSchema } from "./outpatientTypes.js";

export async function checkLockStatusHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const paramsParsed = checkLockParamsSchema.safeParse(request.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный UUID визита",
			details: paramsParsed.error.issues,
		});
	}

	const [verif] = await db
		.select()
		.from(outpatientVerifications)
		.where(
			and(
				eq(outpatientVerifications.visitId, paramsParsed.data.visitId),
				eq(outpatientVerifications.organizationId, orgId),
			),
		)
		.limit(1);

	const identity = getRequestIdentity(request);
	const isDirectorOrCmo =
		identity.role === "owner" ||
		identity.role === "admin" ||
		identity.role === "cmo" ||
		identity.role === "head_doctor" ||
		identity.role === "chief_doctor";

	if (!verif) {
		return reply.send({
			visitId: paramsParsed.data.visitId,
			hasVerificationRecord: false,
			isLocked: false,
			canEdit: true,
			editableDeadline: null,
			status: "draft",
		});
	}

	const now = Date.now();
	const isDeadlineExpired = now > new Date(verif.editableDeadline).getTime();
	const isApproved = verif.status === "approved";

	// Мандат 8e (п. 4): автономия врача — запрет 24-часовых замков намертво для лечащего врача
	const isAttendingDoctor =
		Boolean(identity.userId && verif.doctorId && identity.userId === verif.doctorId) ||
		identity.role === "doctor" ||
		!identity.role;

	const isDoctorOrPrivileged = isAttendingDoctor || isDirectorOrCmo;
	const isLocked = isDoctorOrPrivileged ? false : (isDeadlineExpired || isApproved);

	return reply.send({
		visitId: verif.visitId,
		hasVerificationRecord: true,
		isLocked,
		isDeadlineExpired,
		status: verif.status,
		editableDeadline: verif.editableDeadline,
		canEdit: !isLocked,
		rejectionReason: verif.rejectionReason,
	});
}
