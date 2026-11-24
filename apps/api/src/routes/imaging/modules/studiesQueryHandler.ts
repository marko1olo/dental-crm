import { imagingStudySchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { getImagingStudiesWithFilters } from "../../../db/imagingQuery.js";
import { mapImagingStudy, mapXrayScanToImagingStudy } from "../../../db/imaging/imagingMappers.js";
import { withTenantCtx } from "../../../db/rls.js";
import { imagingStudies, patients, xrayScans } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { isValidUuid } from "../../../utils/httpIdempotency.js";
import { getImagingOrganizationId } from "../imagingHelpers.js";

const querySchema = z
	.object({
		patientId: z.string().uuid().optional(),
		patient_id: z.string().uuid().optional(),
		modality: z.string().optional(),
		bindingStatus: z.enum(["auto_bound", "manual_bound", "pending_review", "unassigned"]).optional(),
		binding_status: z.enum(["auto_bound", "manual_bound", "pending_review", "unassigned"]).optional(),
		search: z.string().optional(),
		limit: z.coerce.number().int().positive().max(500).optional(),
		offset: z.coerce.number().int().nonnegative().optional(),
	})
	.strict();

export async function getStudiesHandler(request: FastifyRequest<{ Params: { patientId?: string } }>, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging studies"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.read", role: staffRole,
			message: `Отказ в доступе к КТ / DICOM исследованиям: ${evalAccess.reason}`,
		});
	}

	if (request.params.patientId && !isValidUuid(request.params.patientId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор пациента (ожидается UUID).",
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

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.imaging.read",
			role: staffRole,
			message: `Отказ в доступе к КТ / DICOM исследованию: ${evalAccess.reason}`,
		});
	}

	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const { id } = request.params;
	if (!isValidUuid(id)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор снимка (ожидается UUID).",
		});
	}

	const resolvedStudy = await withTenantCtx(orgId, async (tx) => {
		const [study] = await tx
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

		if (study) {
			return mapImagingStudy(study.study, study.patientFullName);
		}

		const [xray] = await tx
			.select({
				scan: xrayScans,
				patientFullName: patients.fullName,
			})
			.from(xrayScans)
			.leftJoin(
				patients,
				and(eq(patients.organizationId, orgId), eq(patients.id, xrayScans.patientId)),
			)
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)))
			.limit(1);

		return xray ? mapXrayScanToImagingStudy(xray.scan, xray.patientFullName) : null;
	});

	if (!resolvedStudy) {
		return reply.code(404).send({ error: "ImagingStudyNotFound", message: "Исследование не найдено." });
	}

	return reply.send(imagingStudySchema.parse(resolvedStudy));
}
