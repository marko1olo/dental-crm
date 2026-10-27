import {
	imagingViewerSessionResponseSchema,
	saveImagingViewerSessionRequestSchema,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../../accessGuard.js";
import { saveImagingMeasurementsForStudy } from "../../../db/imagingMeasurementsQuery.js";
import {
	getImagingStudyById,
	getOrCreateImagingViewerSession,
	saveImagingViewerSession,
} from "../../../db/imagingQuery.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import {
	getImagingOrganizationId,
	parseImagingPayload,
	sendImagingStudyNotFound,
} from "../imagingHelpers.js";

export async function getViewerSessionHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging viewer session read"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.read", role: staffRole,
			message: `Отказ в доступе к КТ / DICOM исследованиям (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	const study = await getImagingStudyById(orgId, id);
	if (!study) return sendImagingStudyNotFound(reply);
	const session = await getOrCreateImagingViewerSession(orgId, study);
	return imagingViewerSessionResponseSchema.parse({ session, warnings: session.warnings });
}

export async function putViewerSessionHandler(request: FastifyRequest, reply: FastifyReply) {
	const parsed = parseImagingPayload(
		saveImagingViewerSessionRequestSchema,
		request.body,
		"Сеанс просмотра снимка не сохранен: передайте состояние просмотра и разметку.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	if (!(await requireClinicalMutationAccess(request, reply, "imaging viewer session save"))) return;

	const { id } = request.params as { id: string };
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	const study = await getImagingStudyById(orgId, id);
	if (!study) return sendImagingStudyNotFound(reply);

	const input = parsed.data;
	const session = await saveImagingViewerSession(orgId, id, input);

	if (Array.isArray(input.annotations) && input.annotations.length > 0) {
		try {
			const measurementAnnotations = input.annotations.map((a) => ({
				id: a.id,
				toothCode: a.toothCode ?? study.toothCode ?? null,
				annotationType: a.type ?? "distance",
				coordinates: { points: a.points },
				measurements: a.measurementValue != null ? { value: a.measurementValue, unit: a.unit } : null,
				notes: a.note ?? a.label ?? null,
			}));
			if (study.patientId) {
				await saveImagingMeasurementsForStudy(orgId, id, study.patientId, measurementAnnotations);
			}
		} catch (err) {
			request.log.warn({ err }, "Failed to auto-sync annotations to imaging_annotations table");
		}
	}

	return reply.code(200).send(imagingViewerSessionResponseSchema.parse({ session, warnings: session.warnings }));
}
