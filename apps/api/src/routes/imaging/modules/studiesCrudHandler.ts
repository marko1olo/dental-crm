import { createImagingStudySchema, imagingStudySchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { createImagingStudyInDb, updateImagingStudyInDb } from "../../../db/imagingQuery.js";
import { withTenantCtx } from "../../../db/rls.js";
import { InvalidMagicBytesError, LocalPacsStorageService } from "../../../services/imaging/localPacsStorageService.js";
import { getImagingOrganizationId, parseImagingPayload, sendImagingStudyNotFound, sendImagingStudyScopeError } from "../imagingHelpers.js";
import { imagingStudies, patients, visits, xrayScans } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import { recordStudySanpinDose } from "../../../services/dicom/ingest/metadataParser.js";

const updateImagingStudyBodySchema = z
	.object({
		title: z.string().trim().min(1).max(180).optional(),
		toothCode: z.string().trim().max(50).nullable().optional(),
		region: z.string().trim().max(120).nullable().optional(),
		kind: z.enum(["periapical", "bitewing", "opg", "ceph", "cbct", "photo", "other"]).optional(),
		visitId: z.string().uuid().nullable().optional(),
		status: z.enum(["available", "needs_review", "failed"]).optional(),
		aiSummary: z.string().trim().max(2000).nullable().optional(),
	})
	.strict();

const createImagingStudyBodySchema = createImagingStudySchema
	.extend({
		imageBase64: z.string().min(16).max(32 * 1024 * 1024).optional(),
	})
	.strict();

export async function createStudyHandler(request: FastifyRequest, reply: FastifyReply) {
	const rawBody = (request.body && typeof request.body === "object" ? { ...request.body } : {}) as Record<string, unknown>;
	const paramPatientId = (request.params as { patientId?: string })?.patientId;
	if (paramPatientId && !rawBody.patientId) rawBody.patientId = paramPatientId;

	const parsed = parseImagingPayload(createImagingStudyBodySchema, rawBody, "Снимок не создан: выберите пациента, вид снимка и название.");
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply;
	if (!(await requireClinicalMutationAccess(request, reply, "imaging study create"))) return reply;

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
	if (!isValidUuid(input.patientId)) {
		return reply.code(400).send({ error: "ImagingStudyScopeError", message: "Некорректный UUID пациента для снимка." });
	}
	if (input.visitId && !isValidUuid(input.visitId)) {
		return reply.code(400).send({ error: "ImagingStudyScopeError", message: "Некорректный UUID приёма для снимка." });
	}

	const scopeCheck = await withTenantCtx(orgId, async (tx) => {
		const [patient] = await tx
			.select({ id: patients.id, organizationId: patients.organizationId })
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.id, input.patientId)))
			.limit(1);
		if (!patient) return { errorStatus: 404 as const, message: "Пациент для снимка не найден." };

		if (input.visitId) {
			const [visit] = await tx
				.select({ id: visits.id, patientId: visits.patientId, organizationId: visits.organizationId })
				.from(visits)
				.where(and(eq(visits.organizationId, orgId), eq(visits.id, input.visitId)))
				.limit(1);
			if (!visit) return { errorStatus: 404 as const, message: "Прием для снимка не найден." };
			if (visit.patientId !== input.patientId) return { errorStatus: 409 as const, message: "Снимок относится к приему другого пациента." };
			if (visit.organizationId !== patient.organizationId) return { errorStatus: 409 as const, message: "Снимок относится к приему другой клиники." };
		}
		return null;
	});
	if (scopeCheck) {
		return sendImagingStudyScopeError(reply, scopeCheck.errorStatus, scopeCheck.message);
	}

	let storagePath = input.storagePath;
	let storedRelativeName: string | null = null;
	let storedMimeType = "image/jpeg";
	const imageBody = (request.body && typeof request.body === "object" ? request.body : {}) as { imageBase64?: unknown };
	if (typeof imageBody.imageBase64 === "string" && imageBody.imageBase64.trim()) {
		try {
			let base64Data = imageBody.imageBase64.trim();
			if (base64Data.startsWith("data:")) {
				const match = base64Data.match(/^data:([^;]+);base64,/);
				if (match?.[1]) storedMimeType = match[1];
				base64Data = base64Data.replace(/^data:[^;]+;base64,/, "");
			}
			const stored = await LocalPacsStorageService.storeXrayScanFile(
				orgId,
				input.title,
				Buffer.from(base64Data, "base64"),
				storedMimeType,
			);
			storagePath = stored.storagePath;
			storedRelativeName = stored.relativePath;
		} catch (storeErr) {
			if (storeErr instanceof InvalidMagicBytesError) {
				return reply.code(400).send({ error: "InvalidMagicBytes", message: storeErr.message });
			}
			request.log.error({ err: storeErr }, "Failed to store imageBase64 file in local PACS");
			return reply.code(400).send({
				error: "ImagingStorageWriteFailed",
				message: storeErr instanceof Error ? storeErr.message : "Не удалось сохранить файл снимка.",
			});
		}
	}

	let study;
	try {
		study = await withTenantCtx(orgId, async (tx) => {
			const createdStudy = await createImagingStudyInDb(
				orgId,
				{
					patientId: input.patientId,
					visitId: input.visitId,
					kind: input.kind,
					title: input.title,
					toothCode: input.toothCode,
					region: input.region,
					sourceKind: input.sourceKind,
					sourceName: input.sourceName,
					storagePath: storagePath ?? null,
					dicomStudyUid: input.dicomStudyUid,
					capturedAt: input.capturedAt,
					aiSummary: input.aiSummary,
				},
				tx,
			);

			if (["periapical", "bitewing", "opg", "other"].includes(input.kind)) {
				await tx
					.insert(xrayScans)
					.values({
						id: createdStudy.id,
						organizationId: orgId,
						patientId: input.patientId,
						visitId: input.visitId ?? null,
						storagePath: storagePath ?? null,
						fileUrl: `/api/imaging/studies/${createdStudy.id}/file`,
						originalFilename: input.title,
						mimeType: storedMimeType,
						kind: input.kind,
						toothCode: input.toothCode ?? null,
						notes: input.title,
						status: "done",
						capturedAt: input.capturedAt ? new Date(input.capturedAt) : new Date(),
					})
					.onConflictDoNothing();
			}

			if (createdStudy && input.patientId) {
				await recordStudySanpinDose(orgId, input.patientId, createdStudy, null, tx);
			}

			return createdStudy;
		});
	} catch (dbErr) {
		if (storedRelativeName) {
			await LocalPacsStorageService.deleteTenantFile(orgId, storedRelativeName).catch((cleanupErr) => {
				request.log.warn({ err: cleanupErr, storedRelativeName }, "Failed to cleanup PACS file on DB rollback");
			});
		}
		throw dbErr;
	}

	return reply.code(201).send(imagingStudySchema.parse(study));
}

export async function updateStudyHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply;
	if (!(await requireClinicalMutationAccess(request, reply, "imaging study update"))) return reply;

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

	const { id } = request.params as { id: string };
	if (!isValidUuid(id)) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
	}
	const parsed = updateImagingStudyBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректные параметры обновления снимка", issues: parsed.error.issues });
	}

	const study = await withTenantCtx(orgId, async (tx) => {
		const updatedStudy = await updateImagingStudyInDb(orgId, id, parsed.data, tx);

		const xrayUpdates: Partial<typeof xrayScans.$inferInsert> = {};
		if (parsed.data.title !== undefined) {
			xrayUpdates.originalFilename = parsed.data.title;
			xrayUpdates.notes = parsed.data.title;
		}
		if (parsed.data.toothCode !== undefined) {
			xrayUpdates.toothCode = parsed.data.toothCode;
		}
		if (parsed.data.visitId !== undefined) {
			xrayUpdates.visitId = parsed.data.visitId;
		}
		if (parsed.data.kind !== undefined && ["periapical", "bitewing", "opg", "other"].includes(parsed.data.kind)) {
			xrayUpdates.kind = parsed.data.kind;
		}
		if (parsed.data.aiSummary !== undefined) {
			xrayUpdates.aiSummary = parsed.data.aiSummary;
		}

		if (Object.keys(xrayUpdates).length > 0) {
			await tx
				.update(xrayScans)
				.set({ ...xrayUpdates, updatedAt: new Date() })
				.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)));
		}

		return updatedStudy;
	});

	if (!study) return sendImagingStudyNotFound(reply);
	return reply.send(imagingStudySchema.parse(study));
}

export async function deleteStudyHandler(request: FastifyRequest, reply: FastifyReply) {
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return reply;
	if (!(await requireClinicalMutationAccess(request, reply, "imaging study delete"))) return reply;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? (request as { user?: { role?: string | null } }).user?.role ?? null;
	const allowed = new Set(["chief_doctor", "chiefdoctor", "head_doctor", "owner", "admin"]);
	if (!staffRole || !allowed.has(staffRole)) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "imaging.delete",
			role: staffRole,
			message: "Удаление снимков разрешено главному врачу или владельцу.",
		});
	}

	const { id } = request.params as { id: string };
	if (!isValidUuid(id)) {
		return reply.code(400).send({ error: "ValidationError", message: "Некорректный идентификатор снимка (ожидается UUID)." });
	}
	const deleted = await withTenantCtx(orgId, async (tx) => {
		const [studyRes] = await tx
			.delete(imagingStudies)
			.where(and(eq(imagingStudies.id, id), eq(imagingStudies.organizationId, orgId)))
			.returning({ id: imagingStudies.id, storagePath: imagingStudies.storagePath });

		const [xrayRes] = await tx
			.delete(xrayScans)
			.where(and(eq(xrayScans.id, id), eq(xrayScans.organizationId, orgId)))
			.returning({ id: xrayScans.id, storagePath: xrayScans.storagePath });

		if (!studyRes && !xrayRes) return null;
		return {
			id: studyRes?.id ?? xrayRes?.id,
			storagePath: studyRes?.storagePath ?? xrayRes?.storagePath,
		};
	});

	if (!deleted) {
		return sendImagingStudyNotFound(reply);
	}

	if (deleted.storagePath) {
		try {
			await LocalPacsStorageService.deleteTenantFile(orgId, deleted.storagePath);
		} catch (unlinkErr) {
			request.log.warn({ err: unlinkErr, path: deleted.storagePath }, "Failed to remove physical study file within tenant jail");
		}
	}

	return reply.code(204).send();
}
