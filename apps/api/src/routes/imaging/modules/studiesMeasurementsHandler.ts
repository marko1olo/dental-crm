import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { getImagingAnnotationsForStudy, saveImagingMeasurementsForStudy } from "../../../db/imagingMeasurementsQuery.js";
import { getImagingStudyById } from "../../../db/imagingQuery.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import { getImagingOrganizationId, sendImagingStudyNotFound } from "../imagingHelpers.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";

const measurementItemSchema = z
	.object({
		id: z.string().optional(),
		toothCode: z.string().nullable().optional(),
		toothNumber: z.string().nullable().optional(),
		annotationType: z.string().optional(),
		coordinates: z.record(z.string(), z.unknown()),
		measurements: z.record(z.string(), z.unknown()).nullable().optional(),
		notes: z.string().nullable().optional(),
	})
	.strict();

const saveMeasurementsBodySchema = z.union([
	z
		.object({
			measurements: z.array(measurementItemSchema),
		})
		.strict(),
	z.array(measurementItemSchema),
]);

export async function getMeasurementsHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "imaging measurements read"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.read", role: staffRole,
			message: `Отказ в доступе к измерениям снимков: ${evalAccess.reason}`,
		});
	}

	const { id } = request.params as { id: string };
	if (!isValidUuid(id)) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
	}
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const study = await withTenantCtx(orgId, (tx) => getImagingStudyById(orgId, id, tx));
	if (!study) return sendImagingStudyNotFound(reply);

	const measurements = await getImagingAnnotationsForStudy(orgId, id);
	return reply.code(200).send(measurements);
}

export async function saveMeasurementsHandler(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging measurements save"))) return;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied", permission: "clinical.imaging.write", role: staffRole,
			message: `Отказ в сохранении измерений снимка: ${evalAccess.reason}`,
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

	const parsed = saveMeasurementsBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError", message: "Некорректный формат измерений линейки / разметки.", issues: parsed.error.issues,
		});
	}

	const txResult = await withTenantCtx(orgId, async (tx) => {
		const study = await getImagingStudyById(orgId, id, tx);
		if (!study) return { status: "not_found" as const };
		if (!study.patientId) return { status: "missing_patient" as const };

		const rawItems = Array.isArray(parsed.data) ? parsed.data : parsed.data.measurements;
		const normalizedItems = rawItems.map((item) => ({
			id: item.id,
			toothCode: item.toothCode ?? item.toothNumber ?? study.toothCode ?? null,
			annotationType: item.annotationType ?? "distance",
			coordinates: item.coordinates,
			measurements: item.measurements ?? null,
			notes: item.notes ?? null,
		}));

		const saved = await saveImagingMeasurementsForStudy(orgId, id, study.patientId, normalizedItems, tx);
		return { status: "ok" as const, saved };
	});

	if (txResult.status === "not_found") return sendImagingStudyNotFound(reply);
	if (txResult.status === "missing_patient") {
		return reply.code(400).send({
			error: "ValidationError", message: "Для сохранения измерений снимок должен быть привязан к пациенту",
		});
	}

	return reply.code(200).send(txResult.saved);
}
