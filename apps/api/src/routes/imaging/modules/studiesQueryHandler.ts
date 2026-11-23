import { imagingStudySchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { getImagingStudiesWithFilters } from "../../../db/imagingQuery.js";
import { mapImagingStudy } from "../../../db/imaging/imagingMappers.js";
import { imagingStudies, patients } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { getImagingOrganizationId } from "../imagingHelpers.js";

const querySchema = z.object({
	patientId: z.string().uuid().optional(),
	patient_id: z.string().uuid().optional(),
	modality: z.string().optional(),
	bindingStatus: z.enum(["auto_bound", "manual_bound", "pending_review", "unassigned"]).optional(),
	binding_status: z.enum(["auto_bound", "manual_bound", "pending_review", "unassigned"]).optional(),
	search: z.string().optional(),
	limit: z.coerce.number().int().positive().max(500).optional(),
	offset: z.coerce.number().int().nonnegative().optional(),
});

export async function getStudiesHandler(request: FastifyRequest<{ Params: { patientId?: string } }>, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging studies"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.read", role: staffRole,
			message: `Отказ в доступе к КТ / DICOM исследованиям (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const parsedQuery = querySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError", message: "Некорректные параметры фильтрации исследований.", details: parsedQuery.error.issues,
		});
	}

	const effectivePatientId = request.params.patientId ?? parsedQuery.data.patientId ?? parsedQuery.data.patient_id;
	const effectiveBindingStatus = parsedQuery.data.bindingStatus ?? parsedQuery.data.binding_status;
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const studies = await getImagingStudiesWithFilters(orgId, {
		patientId: effectivePatientId,
		modality: parsedQuery.data.modality,
		bindingStatus: effectiveBindingStatus,
		search: parsedQuery.data.search,
		limit: parsedQuery.data.limit,
		offset: parsedQuery.data.offset,
	});
	return studies.map((study) => imagingStudySchema.parse(study));
}

export async function getStudyByIdHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "get imaging study"))) return;
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const { id } = request.params;
	const [study] = await db
		.select({
			study: imagingStudies,
			patientFullName: patients.fullName,
		})
		.from(imagingStudies)
		.leftJoin(
			patients,
			and(eq(patients.organizationId, orgId), eq(patients.id, imagingStudies.patientId)),
		)
		.where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, orgId)))
		.limit(1);

	if (!study) {
		return reply.code(404).send({ error: "ImagingStudyNotFound", message: "Исследование не найдено." });
	}

	return reply.send(imagingStudySchema.parse(mapImagingStudy(study.study, study.patientFullName)));
}
