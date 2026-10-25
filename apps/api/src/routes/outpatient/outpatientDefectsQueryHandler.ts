import { and, desc, eq, isNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	clinicalTeethCatalog,
	patientToothDefects,
	toothDefectsCatalog,
	users,
} from "../../db/schema.js";
import {
	getPatientToothDefectsParamsSchema,
	getPatientToothDefectsQuerySchema,
} from "./outpatientTypes.js";

export async function getPatientToothDefectsHandler(request: FastifyRequest, reply: FastifyReply) {
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

	const queryParsed = getPatientToothDefectsQuerySchema.safeParse(request.query);
	const activeOnly =
		queryParsed.success &&
		(queryParsed.data.activeOnly === "true" || queryParsed.data.activeOnly === "1");

	const conditions = [
		eq(patientToothDefects.organizationId, orgId),
		eq(patientToothDefects.patientId, paramsParsed.data.patientId),
	];
	if (activeOnly) {
		conditions.push(isNull(patientToothDefects.resolvedAt));
	}
	if (queryParsed.success && queryParsed.data.toothCode) {
		conditions.push(eq(patientToothDefects.toothCode, queryParsed.data.toothCode));
	}

	const defects = await db
		.select({
			id: patientToothDefects.id,
			patientId: patientToothDefects.patientId,
			toothCode: patientToothDefects.toothCode,
			toothNameRu: clinicalTeethCatalog.nameRu,
			toothType: clinicalTeethCatalog.type,
			defectId: patientToothDefects.defectId,
			defectName: toothDefectsCatalog.name,
			defectAlias: toothDefectsCatalog.alias,
			defectType: toothDefectsCatalog.type,
			defectKey: toothDefectsCatalog.key,
			defectColor: toothDefectsCatalog.color,
			visitId: patientToothDefects.visitId,
			diagnosedByDoctorId: patientToothDefects.diagnosedByDoctorId,
			doctorFullName: users.fullName,
			diagnosedAt: patientToothDefects.diagnosedAt,
			resolvedAt: patientToothDefects.resolvedAt,
			comment: patientToothDefects.comment,
		})
		.from(patientToothDefects)
		.innerJoin(clinicalTeethCatalog, eq(patientToothDefects.toothCode, clinicalTeethCatalog.code))
		.innerJoin(toothDefectsCatalog, eq(patientToothDefects.defectId, toothDefectsCatalog.id))
		.leftJoin(users, eq(patientToothDefects.diagnosedByDoctorId, users.id))
		.where(and(...conditions))
		.orderBy(desc(patientToothDefects.diagnosedAt));

	return reply.send({ patientId: paramsParsed.data.patientId, count: defects.length, defects });
}
