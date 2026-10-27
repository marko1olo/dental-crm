import { imagingStudySchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { getImagingStudiesWithFilters } from "../../../db/imagingQuery.js";
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

export async function getStudiesHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging studies"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
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

	const effectivePatientId = (request.params as { patientId?: string })?.patientId ?? parsedQuery.data.patientId ?? parsedQuery.data.patient_id;
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
