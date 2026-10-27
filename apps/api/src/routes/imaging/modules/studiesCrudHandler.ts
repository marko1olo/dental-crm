import { createImagingStudySchema, imagingStudySchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { createImagingStudyInDb, updateImagingStudyInDb } from "../../../db/imagingQuery.js";
import { getPatientByIdFromDb } from "../../../db/patientsQuery.js";
import { getVisitByIdInDb } from "../../../db/visitsQuery.js";
import { LocalPacsStorageService } from "../../../services/imaging/localPacsStorageService.js";
import { getImagingOrganizationId, parseImagingPayload, sendImagingStudyNotFound, sendImagingStudyScopeError } from "../imagingHelpers.js";

const updateImagingStudyBodySchema = z.object({
	title: z.string().trim().min(1).max(180).optional(),
	toothCode: z.string().trim().max(50).nullable().optional(),
	region: z.string().trim().max(120).nullable().optional(),
	kind: z.enum(["periapical", "bitewing", "opg", "ceph", "cbct", "photo", "other"]).optional(),
	visitId: z.string().uuid().nullable().optional(),
	status: z.enum(["available", "needs_review", "failed"]).optional(),
	aiSummary: z.string().trim().max(2000).nullable().optional(),
});

export async function createStudyHandler(request: FastifyRequest, reply: FastifyReply) {
	const rawBody = (request.body && typeof request.body === "object" ? { ...request.body } : {}) as Record<string, unknown>;
	const paramPatientId = (request.params as { patientId?: string })?.patientId;
	if (paramPatientId && !rawBody.patientId) rawBody.patientId = paramPatientId;

	const parsed = parseImagingPayload(createImagingStudySchema, rawBody, "Снимок не создан: выберите пациента, вид снимка и название.");
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply;
	if (!(await requireClinicalMutationAccess(request, reply, "imaging study create"))) return reply;

	const input = parsed.data;
	const patient = await getPatientByIdFromDb(orgId, input.patientId);
	if (!patient) return sendImagingStudyScopeError(reply, 404, "Пациент для снимка не найден.");

	if (input.visitId) {
		const visit = await getVisitByIdInDb(orgId, input.visitId);
		if (!visit) return sendImagingStudyScopeError(reply, 404, "Прием для снимка не найден.");
		if (visit.patientId !== input.patientId) return sendImagingStudyScopeError(reply, 409, "Снимок относится к приему другого пациента.");
		if (visit.organizationId !== patient.organizationId) return sendImagingStudyScopeError(reply, 409, "Снимок относится к приему другой клиники.");
	}

	let storagePath = input.storagePath;
	const imageBody = (request.body && typeof request.body === "object" ? request.body : {}) as { imageBase64?: unknown };
	if (typeof imageBody.imageBase64 === "string" && imageBody.imageBase64.trim()) {
		try {
			let base64Data = imageBody.imageBase64.trim();
			let mime = "image/jpeg";
			if (base64Data.startsWith("data:")) {
				const match = base64Data.match(/^data:([^;]+);base64,/);
				if (match?.[1]) mime = match[1];
				base64Data = base64Data.replace(/^data:[^;]+;base64,/, "");
			}
			const stored = await LocalPacsStorageService.storeXrayScanFile(orgId, input.title, Buffer.from(base64Data, "base64"), mime);
			storagePath = stored.storagePath;
		} catch (storeErr) {
			request.log.warn({ storeErr }, "Failed to store imageBase64 file in local PACS");
		}
	}

	const study = await createImagingStudyInDb(orgId, {
		patientId: input.patientId, visitId: input.visitId, kind: input.kind, title: input.title, toothCode: input.toothCode,
		region: input.region, sourceKind: input.sourceKind, sourceName: input.sourceName, storagePath: storagePath ?? null,
		dicomStudyUid: input.dicomStudyUid, capturedAt: input.capturedAt, aiSummary: input.aiSummary,
	});
	return reply.code(201).send(imagingStudySchema.parse(study));
}

export async function updateStudyHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply;
	if (!(await requireClinicalMutationAccess(request, reply, "imaging study update"))) return reply;

	const { id } = request.params as { id: string };
	const parsed = updateImagingStudyBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры обновления снимка", issues: parsed.error.issues });
	}

	const study = await updateImagingStudyInDb(orgId, id, parsed.data);
	if (!study) return sendImagingStudyNotFound(reply);
	return reply.send(imagingStudySchema.parse(study));
}
