import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { attachments, visitDiaries, visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { type MultipartFilePayload, UPLOADS_DIR } from "./common.js";

export const getVisitAttachmentsHandler = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { visitId: rawVisitId } = request.params as { visitId: string };
		const visitId = rawVisitId.startsWith("visit-") ? rawVisitId.slice(6) : rawVisitId;
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitId);
		if (!isUuid) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден в этой клинике.",
			});
		}

		/*
		 * БЫЛО: только filter attachments.visitId + org — чужой/несуществующий
		 * visitId давал files:[] как «снимков нет». Врач не отличал пустой
		 * приём от чужого UUID / опечатки. Пациентский GET уже 404.
		 */
		const [visitRow] = await db
			.select({ id: visits.id, patientId: visits.patientId })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);
		if (!visitRow) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден в этой клинике.",
			});
		}

		// 152-ФЗ / 323-ФЗ ст. 13: Вложения приёма (снимки, фото зубов) доступны только клиническому персоналу
		const identity = getRequestIdentity(request);
		const reqAny = request as unknown as { user?: { role?: string | null } };
		const staffRole = identity.role ?? reqAny.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.visit.attachments.read",
				role: staffRole,
				message:
					"Доступ к клиническим фото и снимкам приёма ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
			});
		}

		if (visitRow.patientId) {
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: visitRow.patientId,
				action: "VIEW_VISIT_ATTACHMENTS",
				metadata: { visitId },
			});
		}

		const visitAttachments = await db
			.select()
			.from(attachments)
			.where(
				and(
					eq(attachments.visitId, visitId),
					eq(attachments.organizationId, orgId),
				),
			);

		return reply.send({
			files: visitAttachments.map((a) => ({
				id: a.id,
				url: `/api/attachments/${a.id}/download`,
				name: a.fileName,
				type: a.mimeType,
			})),
		});
	} catch (error: unknown) {
		request.log.error(error);
		return reply.status(500).send({
			error: "InternalServerError",
			message: "Ошибка при чтении снимков и вложений приёма.",
		});
	}
};

export const postVisitAttachmentsHandler = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { visitId: rawVisitId } = request.params as { visitId: string };
		const visitId = rawVisitId.startsWith("visit-") ? rawVisitId.slice(6) : rawVisitId;
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitId);
		if (!isUuid) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден в этой клинике.",
			});
		}

		/*
		 * БЫЛО: insert attachments с organizationId=org вызывающего и visitId
		 * из URL без проверки. FK visits.id глобальный — UUID приёма другой
		 * клиники принимался; строка жила в org атакующего, а visit_id
		 * указывал на чужой приём. Несуществующий UUID → 500 FK, не 404.
		 * СТАЛО: как у patient attachments — 403/404 до записи на диск.
		 */
		const [visitRow] = await db
			.select({ id: visits.id, patientId: visits.patientId })
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);
		if (!visitRow) {
			return reply.code(403).send({
				error: "Forbidden",
				message:
					"Приём не найден в этой клинике или относится к другой организации.",
			});
		}

		/*
		 * DEFECT #45: refuse photo attach to locked 043/у.
		 * БЫЛО: client VisitDiaryPhotoUpload блокировал UI при isLocked,
		 * но POST /api/files/visits/:visitId/attachments принимал файл
		 * без проверки visit_diaries.is_locked. curl/Postman с токеном
		 * кабинета мог прикрепить снимок к уже подписанной 043/у —
		 * юридическая карта менялась после ЭЦП без ревизии.
		 * СТАЛО: если у приёма есть locked diary в этой org → 409.
		 * Приёмы без дневника (ещё не создан) — upload разрешён.
		 */
		const [lockedDiary] = await db
			.select({ id: visitDiaries.id })
			.from(visitDiaries)
			.where(
				and(
					eq(visitDiaries.visitId, visitId),
					eq(visitDiaries.organizationId, orgId),
					eq(visitDiaries.isLocked, true),
				),
			)
			.limit(1);
		if (lockedDiary) {
			return reply.code(409).send({
				error: "DiaryLocked",
				message:
					"Дневник приёма уже подписан. Если необходимо добавить новые клинические фото или рентген-снимки к визиту, внесите правку через ревизию («Исправленному верить»).",
			});
		}

		const data = await (
			request as unknown as {
				file: () => Promise<MultipartFilePayload | undefined>;
			}
		).file();
		if (!data) {
			return reply.code(400).send({
				error: "MissingFilePayload",
				message: "Файл не получен: выберите снимок и повторите загрузку.",
			});
		}

		const uniqueSuffix = crypto.randomUUID();
		const safeFilename = data.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
		const filename = `${uniqueSuffix}-${safeFilename}`;
		const storagePath = path.join(UPLOADS_DIR, filename);

		const hash = crypto.createHash("sha256");
		let sha256 = "";
		const writeStream = createWriteStream(storagePath);
		data.file.on("data", (chunk: Buffer) => hash.update(chunk));
		await pipeline(data.file, writeStream);
		sha256 = hash.digest("hex");

		const [attachment] = await db
			.insert(attachments)
			.values({
				organizationId: orgId,
				visitId,
				patientId: visitRow.patientId,
				fileName: data.filename,
				mimeType: data.mimetype,
				storagePath: filename,
				sha256,
			})
			.returning();

		if (!attachment) {
			return reply.code(500).send({
				error: "AttachmentNotSaved",
				message:
					"Файл не сохранён: сервер не записал вложение. Повторите загрузку; если снова не выйдет — сообщите администратору клиники.",
			});
		}

		return reply.code(201).send({
			success: true,
			file: {
				id: attachment.id,
				url: `/api/attachments/${attachment.id}/download`,
				name: attachment.fileName,
				type: attachment.mimeType,
			},
		});
	} catch (error: unknown) {
		request.log.error(error);
		return reply.status(500).send({
			error: "InternalServerError",
			message: "Ошибка при прикреплении снимка к приёму.",
		});
	}
};

export function registerVisitAttachmentsRoutes(app: FastifyInstance) {
	app.get("/api/files/visits/:visitId/attachments", getVisitAttachmentsHandler);
	app.post("/api/files/visits/:visitId/attachments", postVisitAttachmentsHandler);
}
