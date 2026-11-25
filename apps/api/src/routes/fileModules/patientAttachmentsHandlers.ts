import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { attachments, patients } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	resolveSafeUploadPath,
	sanitizeUploadFilename,
	UPLOADS_DIR,
	validateUploadMagicBytes,
} from "./common.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PatientAttachmentParams {
	patientId: string;
}

/*
 * Список вложений карточки пациента (не приёма).
 *
 * POST ниже писал на диск и в attachments с patient_id, но списка не было —
 * оператор загружал «в никуда»: скачать и проверить нельзя. Зеркало
 * GET /api/files/visits/:visitId/attachments, фильтр по patient_id + org.
 * visit_id не трогаем: фото дневника живут на приёме; здесь — паспорт,
 * направление, скан договора и прочие файлы именно карточки.
 */
export const getPatientAttachmentsHandler = async (
	request: FastifyRequest<{ Params: PatientAttachmentParams }>,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params;
		if (!UUID_PATTERN.test(patientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается формат UUID).",
			});
		}

		const loaded = await withTenantCtx(orgId, async (tx) => {
			const [patient] = await tx
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);

			if (!patient) {
				return { kind: "not_found" as const };
			}

			// 152-ФЗ / 323-ФЗ ст. 13: Защита вложений архивированного пациента
			if (patient.status === "archived") {
				const identity = getRequestIdentity(request);
				const staffRole = identity.role ?? request.user?.role ?? null;
				const evalAccess = evaluateClinicalAccess(staffRole);
				if (!evalAccess.hasClinicalAccess) {
					return { kind: "forbidden" as const, staffRole };
				}
			}

			const rows = await tx
				.select()
				.from(attachments)
				.where(
					and(
						eq(attachments.patientId, patientId),
						eq(attachments.organizationId, orgId),
					),
				);

			return { kind: "ok" as const, rows };
		});

		if (loaded.kind === "not_found") {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}
		if (loaded.kind === "forbidden") {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.archived.attachments",
				role: loaded.staffRole,
				message:
					"Отказ в доступе к вложениям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение файлов списанного в архив пациента неклиническим персоналом запрещено.",
			});
		}
		const { rows } = loaded;

		return reply.send({
			files: rows.map((a) => ({
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
			message: "Ошибка при получении списка вложений пациента.",
		});
	}
};

export const postPatientAttachmentsHandler = async (
	request: FastifyRequest<{ Params: PatientAttachmentParams }>,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params;
		if (!UUID_PATTERN.test(patientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается формат UUID).",
			});
		}

		const patient = await withTenantCtx(orgId, async (tx) => {
			const [found] = await tx
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);
			return found ?? null;
		});

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		// 152-ФЗ / 323-ФЗ: Защита от модификации вложений архивированного пациента
		if (patient.status === "archived") {
			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.attachments",
					role: staffRole,
					message:
						"Отказ в загрузке вложений архивированному пациенту (152-ФЗ / 323-ФЗ ст. 13): модификация файлов списанного в архив пациента неклиническим персоналом запрещена.",
				});
			}
		}

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

		// Stream file to disk, inspect header magic bytes, and calculate sha256
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
			const inserted = await withTenantCtx(orgId, async (tx) =>
				tx
					.insert(attachments)
					.values({
						organizationId: orgId,
						patientId,
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

		/*
		 * Ответ в том же виде, что visit-upload: web-панель ждёт file.id/url/name/type
		 * и не разбирает сырой attachment из БД (storagePath/sha256).
		 */
		return reply.code(201).send({
			success: true,
			attachment,
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
			message: "Ошибка при сохранении вложения карточки пациента.",
		});
	}
};

export function registerPatientAttachmentsRoutes(app: FastifyInstance) {
	app.get(
		"/api/patients/:patientId/attachments",
		{ config: { tenantTxSelfManaged: true } },
		getPatientAttachmentsHandler,
	);
	app.get(
		"/api/files/patients/:patientId/attachments",
		{ config: { tenantTxSelfManaged: true } },
		getPatientAttachmentsHandler,
	);
	app.post(
		"/api/patients/:patientId/attachments",
		{ config: { tenantTxSelfManaged: true } },
		postPatientAttachmentsHandler,
	);
	app.post(
		"/api/files/patients/:patientId/attachments",
		{ config: { tenantTxSelfManaged: true } },
		postPatientAttachmentsHandler,
	);
}
