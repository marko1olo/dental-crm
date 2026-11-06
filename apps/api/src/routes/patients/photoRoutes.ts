import { and, desc, eq, like, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
	attachments,
	patientPhotoProtocols,
	patients,
	visitExaminationPhotoLinks,
	visits,
} from "../../db/schema.js";
import { requireClinicOrganizationId, sendPatientNotFound } from "./helpers.js";

const photoProtocolPayloadSchema = z.object({
	presetId: z.string().min(1).default("express_6_slots"),
	slots: z.record(z.string(), z.any()),
	visitId: z.string().uuid().optional().nullable(),
	stage: z.string().optional().default("before"),
	notes: z.string().optional().nullable(),
});

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

		// Проверка существования пациента в организации (Tenant Isolation)
		const [patient] = await db
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) {
			return sendPatientNotFound(reply, patientId);
		}

		try {
			// 1. Получаем последний активный фотопротокол
			const [latestProtocol] = await db
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
			const imageAttachments = await db
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
			const examLinks = await db
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

		// Проверка существования пациента
		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) {
			return sendPatientNotFound(reply, patientId);
		}

		const parseResult = photoProtocolPayloadSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректная структура данных фотопротокола.",
				details: parseResult.error.format(),
			});
		}

		const { presetId, slots, visitId, stage, notes } = parseResult.data;

		// Если передан visitId, проверяем его существование
		if (visitId) {
			const [visitRow] = await db
				.select({ id: visits.id })
				.from(visits)
				.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
				.limit(1);
			if (!visitRow) {
				request.log.warn({ visitId }, "Visit not found for photo protocol binding");
			}
		}

		try {
			// Проверяем наличие существующего протокола для обновления или создания
			const [existing] = await db
				.select({ id: patientPhotoProtocols.id })
				.from(patientPhotoProtocols)
				.where(
					and(
						eq(patientPhotoProtocols.patientId, patientId),
						eq(patientPhotoProtocols.organizationId, orgId),
					),
				)
				.orderBy(desc(patientPhotoProtocols.updatedAt))
				.limit(1);

			let savedProtocol;
			if (existing) {
				const [updated] = await db
					.update(patientPhotoProtocols)
					.set({
						presetId,
						slots,
						stage: stage || "before",
						notes: notes || null,
						visitId: visitId || null,
						updatedAt: new Date(),
					})
					.where(eq(patientPhotoProtocols.id, existing.id))
					.returning();
				savedProtocol = updated;
			} else {
				const [created] = await db
					.insert(patientPhotoProtocols)
					.values({
						organizationId: orgId,
						patientId,
						visitId: visitId || null,
						presetId,
						slots,
						stage: stage || "before",
						notes: notes || null,
					})
					.returning();
				savedProtocol = created;
			}

			return reply.code(200).send({
				success: true,
				protocol: savedProtocol,
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

		const [visit] = await db
			.select({ id: visits.id, patientId: visits.patientId })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);

		if (!visit) {
			return reply.code(404).send({ error: "VisitNotFound", message: "Приём не найден." });
		}

		const [protocol] = await db
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

		return reply.send({ success: true, protocol: protocol || null });
	});

	app.post("/api/visits/:visitId/photo-protocol", async (request, reply) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;
		const { visitId } = request.params as { visitId: string };

		const [visit] = await db
			.select({ id: visits.id, patientId: visits.patientId })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);

		if (!visit) {
			return reply.code(404).send({ error: "VisitNotFound", message: "Приём не найден." });
		}

		const parseResult = photoProtocolPayloadSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректная структура данных фотопротокола.",
			});
		}

		const { presetId, slots, stage, notes } = parseResult.data;

		const [created] = await db
			.insert(patientPhotoProtocols)
			.values({
				organizationId: orgId,
				patientId: visit.patientId,
				visitId,
				presetId,
				slots,
				stage: stage || "during",
				notes: notes || null,
			})
			.returning();

		return reply.send({ success: true, protocol: created });
	});
}
