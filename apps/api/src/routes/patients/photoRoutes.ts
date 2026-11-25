import { and, desc, eq, like, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { isDemoShowcaseMode } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	attachments,
	patientPhotoProtocols,
	patients,
	visitExaminationPhotoLinks,
	visits,
} from "../../db/schema.js";
import { requireClinicOrganizationId, sendPatientNotFound } from "./helpers.js";
import { dsdAnalysisDataSchema } from "@dental/shared";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const nonBlobString = z.string().refine((val) => !val.startsWith("blob:"), {
	message: "Временный blob: URL не может быть сохранен в базу данных",
});

const photoSlotItemSchema = z.union([
	nonBlobString,
	z.object({
		imageUrl: nonBlobString.optional(),
		url: nonBlobString.optional(),
		previewUrl: z.string().optional(),
		isUploading: z.boolean().optional(),
		storagePath: z.string().optional(),
		uploadedAt: z.string().optional(),
		toothCode: z.union([z.string(), z.number()]).optional(),
		stage: z.string().optional(),
		notes: z.string().optional().nullable(),
		rotationDegrees: z.number().optional(),
		flipHorizontal: z.boolean().optional(),
		flipVertical: z.boolean().optional(),
		brightness: z.number().optional(),
		contrast: z.number().optional(),
		exposure: z.number().optional(),
		warmth: z.number().optional(),
		detectedVitaShade: z.string().optional().nullable(),
		slotId: z.string().optional(),
		label: z.string().optional(),
		timestamp: z.string().optional(),
		dsdAnalysis: dsdAnalysisDataSchema.optional().nullable(),
		landmarks: z.record(z.string(), z.object({ x: z.number(), y: z.number() })).optional().nullable(),
		paired_document_id: z.string().nullable().optional(),
		paired_photo_id: z.string().nullable().optional(),
		media_category: z.string().optional().nullable(),
		media_subtype: z.string().optional().nullable(),
		media_kind: z.string().optional().nullable(),
		id: z.string().optional(),
		name: z.string().optional(),
	}).strict(),
]);

const photoProtocolPayloadSchema = z
	.object({
		presetId: z.string().min(1).default("express_6_slots"),
		slots: z.record(z.string(), photoSlotItemSchema),
		visitId: z.string().uuid().optional().nullable(),
		stage: z.string().optional().default("before"),
		notes: z.string().optional().nullable(),
		dsdAnalysis: dsdAnalysisDataSchema.optional().nullable(),
	})
	.strict();

export function registerPatientPhotoRoutes(app: FastifyInstance) {
	/**
	 * Получение последнего фотопротокола и всех снимков пациента
	 * GET /api/patients/:patientId/photos
	 * GET /api/patients/:patientId/photo-protocol
	 */
	const getPatientPhotosHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const { patientId } = request.params as { patientId: string };

		// Защита от краха PostgreSQL 22P02: валидация UUID перед запросом в БД (Мандат 8e / Дефект 2)
		if (!patientId || !UUID_REGEX.test(patientId)) {
			if (
				isDemoShowcaseMode() &&
				(patientId === "chairside" ||
					patientId === "chairside-unassigned" ||
					patientId === "test" ||
					orgId.startsWith("demo-"))
			) {
				return reply.send({
					success: true,
					protocol: null,
					photos: [],
				});
			}
			return sendPatientNotFound(reply);
		}

		try {
			const loaded = await withTenantCtx(orgId, async (tx) => {
				const [patient] = await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
					.limit(1);

				if (!patient) return null;

				// 1. Получаем последний активный фотопротокол
				const [latestProtocol] = await tx
					.select()
					.from(patientPhotoProtocols)
					.where(
						and(
							eq(patientPhotoProtocols.patientId, patientId),
							eq(patientPhotoProtocols.organizationId, orgId),
						),
					)
					.orderBy(desc(patientPhotoProtocols.updatedAt))
					.limit(1);

				// 2. Получаем вложения изображений из attachments
				const imageAttachments = await tx
					.select({
						id: attachments.id,
						fileName: attachments.fileName,
						mimeType: attachments.mimeType,
						storagePath: attachments.storagePath,
						createdAt: attachments.createdAt,
						visitId: attachments.visitId,
					})
					.from(attachments)
					.where(
						and(
							eq(attachments.patientId, patientId),
							eq(attachments.organizationId, orgId),
							or(
								like(attachments.mimeType, "image/%"),
								like(attachments.fileName, "%.webp"),
								like(attachments.fileName, "%.jpg"),
								like(attachments.fileName, "%.jpeg"),
								like(attachments.fileName, "%.png"),
							),
						),
					)
					.orderBy(desc(attachments.createdAt));

				// 3. Получаем ссылки на фото визитов
				const examLinks = await tx
					.select({
						id: visitExaminationPhotoLinks.id,
						visitId: visitExaminationPhotoLinks.visitId,
						photoUrl: visitExaminationPhotoLinks.photoUrl,
						caption: visitExaminationPhotoLinks.caption,
						createdAt: visitExaminationPhotoLinks.createdAt,
					})
					.from(visitExaminationPhotoLinks)
					.where(
						and(
							eq(visitExaminationPhotoLinks.patientId, patientId),
							eq(visitExaminationPhotoLinks.organizationId, orgId),
						),
					)
					.orderBy(desc(visitExaminationPhotoLinks.createdAt));

				return { latestProtocol, imageAttachments, examLinks };
			});

			if (!loaded) {
				return sendPatientNotFound(reply);
			}
			const { latestProtocol, imageAttachments, examLinks } = loaded;

			const photos = [
				...imageAttachments.map((att) => ({
					id: att.id,
					url: `/api/attachments/${att.id}/download`,
					name: att.fileName,
					type: att.mimeType,
					visitId: att.visitId,
					createdAt: att.createdAt,
					source: "attachment",
				})),
				...examLinks.map((link) => ({
					id: link.id,
					url: link.photoUrl,
					name: link.caption || "Фото осмотра",
					type: "image/jpeg",
					visitId: link.visitId,
					createdAt: link.createdAt,
					source: "visit_exam",
				})),
			];

			return reply.send({
				success: true,
				protocol: latestProtocol
					? {
							id: latestProtocol.id,
							patientId: latestProtocol.patientId,
							visitId: latestProtocol.visitId,
							presetId: latestProtocol.presetId,
							slots: latestProtocol.slots,
							stage: latestProtocol.stage,
							notes: latestProtocol.notes,
							createdAt: latestProtocol.createdAt,
							updatedAt: latestProtocol.updatedAt,
						}
					: null,
				photos,
			});
		} catch (error) {
			request.log.error(error, "Failed to fetch patient photo protocol");
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось получить фотопротокол пациента.",
			});
		}
	};

	/**
	 * Сохранение фотопротокола пациента в PostgreSQL 18
	 * POST /api/patients/:patientId/photos
	 * POST /api/patients/:patientId/photo-protocol
	 */
	const postPatientPhotosHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const { patientId } = request.params as { patientId: string };

		// Защита от краха PostgreSQL 22P02: валидация UUID перед запросом в БД
		if (!patientId || !UUID_REGEX.test(patientId)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается формат UUID).",
			});
		}

		// Проверка существования пациента (RLS-контекст клиники)
		const patient = await withTenantCtx(orgId, async (tx) => {
			const [row] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			return row ?? null;
		});

		if (!patient) {
			return sendPatientNotFound(reply);
		}

		const parseResult = photoProtocolPayloadSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректная структура данных фотопротокола.",
				details: parseResult.error.format(),
			});
		}

		const { presetId, slots, visitId, stage, notes, dsdAnalysis } = parseResult.data;

		// Защита от утечки временных blob: URL в PostgreSQL 18 (Дефект 1 / Мандат 8aq)
		const hasBlobUrl = Object.values(slots).some((item) => {
			if (typeof item === "string") return item.startsWith("blob:");
			if (item && typeof item === "object") {
				const obj = item as Record<string, unknown>;
				if (typeof obj.imageUrl === "string" && obj.imageUrl.startsWith("blob:")) return true;
				if (typeof obj.url === "string" && obj.url.startsWith("blob:")) return true;
			}
			return false;
		});
		if (hasBlobUrl) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Недопустимо сохранение временного blob: URL в базу данных. Дождитесь завершения загрузки файла.",
			});
		}

		const effectiveSlots = dsdAnalysis ? { ...slots, dsdAnalysis } : slots;

		try {
			const effectiveStage = stage || "before";
			const txOutcome = await withTenantCtx(orgId, async (tx) => {
				if (visitId) {
					const [visitRow] = await tx
						.select({ id: visits.id })
						.from(visits)
						.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
						.limit(1);
					if (!visitRow) {
						return { kind: "visit_not_found" as const };
					}
				}

				// Проверяем наличие существующего протокола той же стадии (stage) и визита для версионности (Мандат 8aq, D-12)
				const conditions = [
					eq(patientPhotoProtocols.patientId, patientId),
					eq(patientPhotoProtocols.organizationId, orgId),
					eq(patientPhotoProtocols.stage, effectiveStage),
				];
				if (visitId) {
					conditions.push(eq(patientPhotoProtocols.visitId, visitId));
				}

				const [existing] = await tx
					.select({ id: patientPhotoProtocols.id })
					.from(patientPhotoProtocols)
					.where(and(...conditions))
					.orderBy(desc(patientPhotoProtocols.updatedAt))
					.limit(1);

				let savedProtocol;
				if (existing) {
					const [updated] = await tx
						.update(patientPhotoProtocols)
						.set({
							presetId,
							slots: effectiveSlots,
							notes: notes || null,
							visitId: visitId || null,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(patientPhotoProtocols.id, existing.id),
								eq(patientPhotoProtocols.organizationId, orgId),
							),
						)
						.returning();
					savedProtocol = updated;
				} else {
					const [created] = await tx
						.insert(patientPhotoProtocols)
						.values({
							organizationId: orgId,
							patientId,
							visitId: visitId || null,
							presetId,
							slots: effectiveSlots,
							stage: effectiveStage,
							notes: notes || null,
						})
						.returning();
					savedProtocol = created;
				}

				return { kind: "saved" as const, savedProtocol };
			});

			if (txOutcome.kind === "visit_not_found") {
				return reply.code(404).send({
					error: "VisitNotFound",
					message: "Указанный приём не найден в этой клинике.",
				});
			}

			return reply.code(200).send({
				success: true,
				protocol: txOutcome.savedProtocol,
			});
		} catch (error) {
			request.log.error(error, "Failed to persist patient photo protocol");
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Не удалось сохранить клинический фотопротокол.",
			});
		}
	};

	app.get("/api/patients/:patientId/photos", getPatientPhotosHandler);
	app.get("/api/patients/:patientId/photo-protocol", getPatientPhotosHandler);
	app.post("/api/patients/:patientId/photos", postPatientPhotosHandler);
	app.post("/api/patients/:patientId/photo-protocol", postPatientPhotosHandler);

	// Роуты для визита (зеркалирование)
	app.get("/api/visits/:visitId/photo-protocol", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { visitId } = request.params as { visitId: string };

		if (!visitId || !UUID_REGEX.test(visitId)) {
			return reply.code(404).send({ error: "VisitNotFound", message: "Приём не найден." });
		}

		const loaded = await withTenantCtx(orgId, async (tx) => {
			const [visit] = await tx
				.select({ id: visits.id, patientId: visits.patientId })
				.from(visits)
				.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
				.limit(1);
			if (!visit) return null;

			const [protocol] = await tx
				.select()
				.from(patientPhotoProtocols)
				.where(
					and(
						eq(patientPhotoProtocols.visitId, visitId),
						eq(patientPhotoProtocols.organizationId, orgId),
					),
				)
				.orderBy(desc(patientPhotoProtocols.updatedAt))
				.limit(1);
			return { protocol: protocol || null };
		});

		if (!loaded) {
			return reply.code(404).send({ error: "VisitNotFound", message: "Приём не найден." });
		}

		return reply.send({ success: true, protocol: loaded.protocol });
	});

	app.post("/api/visits/:visitId/photo-protocol", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { visitId } = request.params as { visitId: string };

		if (!visitId || !UUID_REGEX.test(visitId)) {
			return reply.code(404).send({ error: "VisitNotFound", message: "Приём не найден." });
		}

		const parseResult = photoProtocolPayloadSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректная структура данных фотопротокола.",
			});
		}

		const { presetId, slots, stage, notes, dsdAnalysis } = parseResult.data;

		// Защита от утечки временных blob: URL в PostgreSQL 18 (Дефект 1 / Мандат 8aq)
		const hasBlobUrl = Object.values(slots).some((item) => {
			if (typeof item === "string") return item.startsWith("blob:");
			if (item && typeof item === "object") {
				const obj = item as Record<string, unknown>;
				if (typeof obj.imageUrl === "string" && obj.imageUrl.startsWith("blob:")) return true;
				if (typeof obj.url === "string" && obj.url.startsWith("blob:")) return true;
			}
			return false;
		});
		if (hasBlobUrl) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Недопустимо сохранение временного blob: URL в базу данных. Дождитесь завершения загрузки файла.",
			});
		}

		const effectiveSlots = dsdAnalysis ? { ...slots, dsdAnalysis } : slots;
		const effectiveStage = stage || "during";

		const txOutcome = await withTenantCtx(orgId, async (tx) => {
			const [visit] = await tx
				.select({ id: visits.id, patientId: visits.patientId })
				.from(visits)
				.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
				.limit(1);

			if (!visit) {
				return { kind: "visit_not_found" as const };
			}

			const [existing] = await tx
				.select({ id: patientPhotoProtocols.id })
				.from(patientPhotoProtocols)
				.where(
					and(
						eq(patientPhotoProtocols.visitId, visitId),
						eq(patientPhotoProtocols.organizationId, orgId),
						eq(patientPhotoProtocols.stage, effectiveStage),
					),
				)
				.orderBy(desc(patientPhotoProtocols.updatedAt))
				.for("update")
				.limit(1);

			if (existing) {
				const [updated] = await tx
					.update(patientPhotoProtocols)
					.set({
						presetId,
						slots: effectiveSlots,
						notes: notes || null,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(patientPhotoProtocols.id, existing.id),
							eq(patientPhotoProtocols.organizationId, orgId),
						),
					)
					.returning();
				return { kind: "saved" as const, protocol: updated };
			}

			const [created] = await tx
				.insert(patientPhotoProtocols)
				.values({
					organizationId: orgId,
					patientId: visit.patientId,
					visitId,
					presetId,
					slots: effectiveSlots,
					stage: effectiveStage,
					notes: notes || null,
				})
				.returning();
			return { kind: "saved" as const, protocol: created };
		});

		if (txOutcome.kind === "visit_not_found") {
			return reply.code(404).send({ error: "VisitNotFound", message: "Приём не найден." });
		}

		return reply.send({ success: true, protocol: txOutcome.protocol });
	});
}
