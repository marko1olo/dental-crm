import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { outpatientVerifications, patients, users, visits } from "../../db/schema.js";
import { getVerifyQueueQuerySchema } from "./outpatientTypes.js";

export async function getVerifyQueueHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const parsed = getVerifyQueueQuerySchema.safeParse(request.query);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры экспертного аудита качества ЭМК главного врача",
			details: parsed.error.issues,
		});
	}

	const conditions = [eq(outpatientVerifications.organizationId, orgId)];
	if (parsed.data.status) conditions.push(eq(outpatientVerifications.status, parsed.data.status));
	if (parsed.data.doctorId) conditions.push(eq(outpatientVerifications.doctorId, parsed.data.doctorId));
	if (parsed.data.patientId) conditions.push(eq(outpatientVerifications.patientId, parsed.data.patientId));

	const queue = await db
		.select({
			id: outpatientVerifications.id,
			visitId: outpatientVerifications.visitId,
			patientId: outpatientVerifications.patientId,
			patientFullName: patients.fullName,
			doctorId: outpatientVerifications.doctorId,
			doctorFullName: users.fullName,
			cmoUserId: outpatientVerifications.cmoUserId,
			status: outpatientVerifications.status,
			rejectionReason: outpatientVerifications.rejectionReason,
			submittedAt: outpatientVerifications.submittedAt,
			verifiedAt: outpatientVerifications.verifiedAt,
			editableDeadline: outpatientVerifications.editableDeadline,
			visitComplaint: visits.complaint,
			visitDiagnosis: visits.diagnosis,
			visitStatus: visits.status,
		})
		.from(outpatientVerifications)
		.innerJoin(patients, eq(outpatientVerifications.patientId, patients.id))
		.innerJoin(users, eq(outpatientVerifications.doctorId, users.id))
		.innerJoin(visits, eq(outpatientVerifications.visitId, visits.id))
		.where(and(...conditions))
		.orderBy(desc(outpatientVerifications.editableDeadline))
		.limit(parsed.data.limit)
		.offset(parsed.data.offset);

	const now = Date.now();
	const itemsWithLockStatus = queue.map((item) => ({
		...item,
		isEditableDeadlineExpired: now > new Date(item.editableDeadline).getTime(),
		doctorAccess: "unrestricted",
		canDoctorEdit: true,
	}));

	return reply.send({
		count: itemsWithLockStatus.length,
		queue: itemsWithLockStatus,
		advisoryNotice:
			"Экспертный аудит качества главного врача носит рекомендательно-наставнический характер. Дневники врачей доступны для редактирования лечащим врачом.",
	});
}
