import type { FastifyInstance } from "fastify";
import { getRequestIdentity } from "../../security/identity.js";
import {
	PATIENT_ID_UUID_PATTERN,
	requireClinicOrganizationId,
	sendPatientRouteValidationError,
} from "./helpers.js";

export function registerPatientDuplicateRoutes(app: FastifyInstance) {
	/**
	 * POST /api/patients/:patientId/merge
	 * Неразрушающее слияние дублирующей карточки в основную карточку (:patientId).
	 * Переносит все визиты, приёмы, планы лечения, баланс с точностью до копейки,
	 * объединяет аллергии и соматический статус, сохраняет 152-ФЗ аудит.
	 */
	app.post("/api/patients/:patientId/merge", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const { patientId } = request.params as { patientId?: string };
		if (!patientId || !PATIENT_ID_UUID_PATTERN.test(patientId)) {
			return sendPatientRouteValidationError(reply);
		}

		const body = (request.body && typeof request.body === "object" ? request.body : {}) as {
			duplicatePatientId?: string;
			reason?: string;
		};

		if (!body.duplicatePatientId || !PATIENT_ID_UUID_PATTERN.test(body.duplicatePatientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Укажите корректный UUID объединяемой (дублирующей) карточки пациента.",
			});
		}

		if (body.duplicatePatientId === patientId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Нельзя объединить карточку саму с собой.",
			});
		}

		const identity = getRequestIdentity(request);
		const { formatMergeSummary, mergePatients } = await import(
			"../../services/patients/patientMerge.js"
		);

		const result = await mergePatients({
			organizationId: orgId,
			primaryPatientId: patientId,
			duplicatePatientId: body.duplicatePatientId,
			performedByUserId: identity.userId ?? null,
			reason: body.reason ?? null,
		});

		if (!result.ok) {
			return reply.code(409).send({
				error: "PatientMergeRejected",
				message: result.reason,
			});
		}

		return reply.send({
			success: true,
			...result,
			summary: formatMergeSummary(result),
		});
	});
}
