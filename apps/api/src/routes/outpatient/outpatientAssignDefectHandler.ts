import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { clinicalTeethCatalog, patientToothDefects, toothDefectsCatalog } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { assignPatientToothDefectSchema, getPatientToothDefectsParamsSchema } from "./outpatientTypes.js";

export async function assignPatientToothDefectHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	const paramsParsed = getPatientToothDefectsParamsSchema.safeParse(request.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный UUID пациента",
			details: paramsParsed.error.issues,
		});
	}

	const bodyParsed = assignPatientToothDefectSchema.safeParse(request.body);
	if (!bodyParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры назначения дефекта",
			details: bodyParsed.error.issues,
		});
	}

	const identity = getRequestIdentity(request);
	const doctorId = bodyParsed.data.diagnosedByDoctorId || identity.userId;

	const [tooth] = await db
		.select()
		.from(clinicalTeethCatalog)
		.where(eq(clinicalTeethCatalog.code, bodyParsed.data.toothCode))
		.limit(1);

	if (!tooth) {
		return reply.code(404).send({
			error: "ToothNotFound",
			message: `Зуб или челюстная сущность с кодом "${bodyParsed.data.toothCode}" не найдена в каталоге 55 сущностей`,
		});
	}

	const [defect] = await db
		.select()
		.from(toothDefectsCatalog)
		.where(eq(toothDefectsCatalog.id, bodyParsed.data.defectId))
		.limit(1);

	if (!defect) {
		return reply.code(404).send({
			error: "DefectNotFound",
			message: `Дефект с ID ${bodyParsed.data.defectId} не найден в каталоге 91 дефектов`,
		});
	}

	const [inserted] = await db
		.insert(patientToothDefects)
		.values({
			organizationId: orgId,
			patientId: paramsParsed.data.patientId,
			toothCode: bodyParsed.data.toothCode,
			defectId: bodyParsed.data.defectId,
			visitId: bodyParsed.data.visitId || null,
			diagnosedByDoctorId: doctorId || null,
			comment: bodyParsed.data.comment || null,
		})
		.returning();

	return reply.code(201).send({
		success: true,
		defect: {
			...inserted,
			toothNameRu: tooth.nameRu,
			defectName: defect.name,
			defectAlias: defect.alias,
			defectColor: defect.color,
		},
	});
}
