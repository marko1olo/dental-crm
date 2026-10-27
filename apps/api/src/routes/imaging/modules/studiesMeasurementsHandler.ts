import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../../accessGuard.js";
import { getImagingAnnotationsForStudy, saveImagingMeasurementsForStudy } from "../../../db/imagingMeasurementsQuery.js";
import { getImagingStudyById } from "../../../db/imagingQuery.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { getImagingOrganizationId, sendImagingStudyNotFound } from "../imagingHelpers.js";

const saveMeasurementsBodySchema = z.union([
	z.object({
		measurements: z.array(
			z.object({
				id: z.string().optional(),
				toothCode: z.string().nullable().optional(),
				toothNumber: z.string().nullable().optional(),
				annotationType: z.string().optional(),
				coordinates: z.record(z.unknown()),
				measurements: z.record(z.unknown()).nullable().optional(),
				notes: z.string().nullable().optional(),
			}),
		),
	}),
	z.array(
		z.object({
			id: z.string().optional(),
			toothCode: z.string().nullable().optional(),
			toothNumber: z.string().nullable().optional(),
			annotationType: z.string().optional(),
			coordinates: z.record(z.unknown()),
			measurements: z.record(z.unknown()).nullable().optional(),
			notes: z.string().nullable().optional(),
		}),
	),
]);

export async function getMeasurementsHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging measurements read"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.read", role: staffRole,
			message: `Отказ в доступе к измерениям снимков (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const study = await getImagingStudyById(orgId, id);
	if (!study) return sendImagingStudyNotFound(reply);

	const measurements = await getImagingAnnotationsForStudy(orgId, id);
	return reply.code(200).send(measurements);
}

export async function saveMeasurementsHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging measurements save"))) return;

	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const study = await getImagingStudyById(orgId, id);
	if (!study) return sendImagingStudyNotFound(reply);

	const parsed = saveMeasurementsBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError", message: "Некорректный формат измерений линейки / разметки.", issues: parsed.error.issues,
		});
	}

	const rawItems = Array.isArray(parsed.data) ? parsed.data : parsed.data.measurements;
	const normalizedItems = rawItems.map((item) => ({
		id: item.id,
		toothCode: item.toothCode ?? item.toothNumber ?? study.toothCode ?? null,
		annotationType: item.annotationType ?? "distance",
		coordinates: item.coordinates,
		measurements: item.measurements ?? null,
		notes: item.notes ?? null,
	}));

	if (!study.patientId) {
		return reply.code(400).send({
			error: "ValidationError", message: "Для сохранения измерений снимок должен быть привязан к пациенту",
		});
	}

	const saved = await saveImagingMeasurementsForStudy(orgId, id, study.patientId, normalizedItems);
	return reply.code(200).send(saved);
}
