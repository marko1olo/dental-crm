import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx, withTenantReadCtx } from "../../db/rls.js";
import { attachments, visitDiaries, visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	resolveSafeUploadPath,
	sanitizeUploadFilename,
	UPLOADS_DIR,
	validateUploadMagicBytes,
} from "./common.js";

interface VisitAttachmentParams {
	visitId: string;
}

export const getVisitAttachmentsHandler = async (
	request: FastifyRequest<{ Params: VisitAttachmentParams }>,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { visitId: rawVisitId } = request.params;
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
		const [visitRow] = await withTenantReadCtx(orgId, (tx) =>
			tx
				.select({ id: visits.id, patientId: visits.patientId })
				.from(visits)
				.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
				.limit(1),
		);
		if (!visitRow) {
			return reply.code(404).send({
				error: "VisitNotFound",
				message: "Приём не найден в этой клинике.",
			});
		}

		// 152-ФЗ / 323-ФЗ ст. 13: Вложения приёма (снимки, фото зубов) доступны только клиническому персоналу
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
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

		const visitAttachments = await withTenantReadCtx(orgId, (tx) =>
			tx
				.select()
				.from(attachments)
				.where(
					and(
						eq(attachments.visitId, visitId),
						eq(attachments.organizationId, orgId),
					),
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
	request: FastifyRequest<{ Params: VisitAttachmentParams }>,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { visitId: rawVisitId } = request.params;
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
		const precheck = await withTenantCtx(orgId, async (tx) => {
			const [visitRow] = await tx
				.select({ id: visits.id, patientId: visits.patientId })
				.from(visits)
				.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
				.limit(1);
			if (!visitRow) {
				return { kind: "forbidden_visit" as const };
			}
			const [lockedDiary] = await tx
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
				return { kind: "locked_diary" as const };
			}
			return { kind: "ok" as const, visitRow };
		});

		if (precheck.kind === "forbidden_visit") {
			return reply.code(403).send({
				error: "Forbidden",
				message:
					"Приём не найден в этой клинике или относится к другой организации.",
			});
		}
		if (precheck.kind === "locked_diary") {
			return reply.code(409).send({
				error: "DiaryLocked",
				message:
					"Дневник приёма уже подписан. Если необходимо добавить новые клинические фото или рентген-снимки к визиту, внесите правку через ревизию («Исправленному верить»).",
			});
		}
		const { visitRow } = precheck;

		if (typeof request.file !== "function") {
			return reply.code(400).send({
				error: "MissingFilePayload",
				message: "Файл не получен: выберите снимок и повторите загрузку.",
			});
		}
		const data = await request.file();
		if (!data) {
			return reply.code(400).send({
				error: "MissingFilePayload",
				message: "Файл не получен: выберите снимок и повторите загрузку.",
			});
		}

		await fs.mkdir(UPLOADS_DIR, { recursive: true });
		const uniqueSuffix = crypto.randomUUID();
		const safeFilename = sanitizeUploadFilename(data.filename);
		const filename = `${uniqueSuffix}-${safeFilename}`;
		const storagePath = resolveSafeUploadPath(filename);
		if (!storagePath) {
			return reply.code(400).send({
				error: "InvalidStoragePath",
				message: "Некорректное имя загружаемого файла.",
			});
		}

		const hash = crypto.createHash("sha256");
		const headerChunks: Buffer[] = [];
		let headerBytes = 0;
		const writeStream = createWriteStream(storagePath);
		data.file.on("data", (chunk: Buffer) => {
			hash.update(chunk);
			if (headerBytes < 512) {
				headerChunks.push(chunk);
				headerBytes += chunk.length;
			}
		});
		await pipeline(data.file, writeStream);
		const headerBuffer = Buffer.concat(headerChunks).subarray(0, 512);
		if (!validateUploadMagicBytes(headerBuffer, data.mimetype)) {
			await fs.rm(storagePath, { force: true }).catch(() => undefined);
			return reply.code(400).send({
				error: "UnsupportedFileType",
				message: "Неподдерживаемый или повреждённый формат файла вложения.",
			});
		}
		const sha256 = hash.digest("hex");

		let attachment: typeof attachments.$inferSelect | undefined;
		try {
			const inserted = await withTenantCtx(orgId, (tx) =>
				tx
					.insert(attachments)
					.values({
						organizationId: orgId,
						visitId,
						patientId: visitRow.patientId,
						fileName: safeFilename,
						mimeType: data.mimetype,
						storagePath: filename,
						sha256,
					})
					.returning(),
			);
			attachment = inserted[0];
		} catch (dbErr) {
			await fs.rm(storagePath, { force: true }).catch(() => undefined);
			throw dbErr;
		}

		if (!attachment) {
			await fs.rm(storagePath, { force: true }).catch(() => undefined);
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
	app.get(
		"/api/files/visits/:visitId/attachments",
		{ config: { tenantTxSelfManaged: true } },
		getVisitAttachmentsHandler,
	);
	app.post(
		"/api/files/visits/:visitId/attachments",
		{ config: { tenantTxSelfManaged: true } },
		postVisitAttachmentsHandler,
	);
}
