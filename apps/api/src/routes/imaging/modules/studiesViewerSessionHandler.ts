import {
	imagingViewerSessionResponseSchema,
	saveImagingViewerSessionRequestSchema,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
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
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";

export async function getViewerSessionHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging viewer session read"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.read", role: staffRole,
			message: `Отказ в доступе к КТ / DICOM исследованиям: ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };
	if (!isValidUuid(id)) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
	}
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const session = await withTenantCtx(orgId, async (tx) => {
		const study = await getImagingStudyById(orgId, id, tx);
		if (!study) return null;
		return getOrCreateImagingViewerSession(orgId, study, tx);
	});
	if (!session) return sendImagingStudyNotFound(reply);
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

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.write", role: staffRole,
			message: `Отказ в сохранении сеанса просмотра снимка: ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };
	if (!isValidUuid(id)) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
	}
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const input = parsed.data;
	const session = await withTenantCtx(orgId, async (tx) => {
		const study = await getImagingStudyById(orgId, id, tx);
		if (!study) return null;

		const savedSession = await saveImagingViewerSession(orgId, id, input, tx);

		if (Array.isArray(input.annotations) && input.annotations.length > 0 && study.patientId) {
			const measurementAnnotations = input.annotations.map((a) => ({
				id: a.id,
				toothCode: a.toothCode ?? study.toothCode ?? null,
				annotationType: a.type ?? "distance",
				coordinates: { points: a.points },
				measurements: a.measurementValue != null ? { value: a.measurementValue, unit: a.unit } : null,
				notes: a.note ?? a.label ?? null,
			}));
			await saveImagingMeasurementsForStudy(orgId, id, study.patientId, measurementAnnotations, tx);
		}

		return savedSession;
	});

	if (!session) return sendImagingStudyNotFound(reply);

	return reply.code(200).send(imagingViewerSessionResponseSchema.parse({ session, warnings: session.warnings }));
}
