import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { attachments, patients } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { type MultipartFilePayload, UPLOADS_DIR } from "./common.js";

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
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		const [patient] = await db
			.select({ id: patients.id, status: patients.status })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		// 152-ФЗ / 323-ФЗ ст. 13: Защита вложений архивированного пациента
		if (patient.status === "archived") {
			const identity = getRequestIdentity(request);
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.attachments",
					role: staffRole,
					message:
						"Отказ в доступе к вложениям архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): извлечение файлов списанного в архив пациента неклиническим персоналом запрещено.",
				});
			}
		}

		const rows = await db
			.select()
			.from(attachments)
			.where(
				and(
					eq(attachments.patientId, patientId),
					eq(attachments.organizationId, orgId),
				),
			);

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
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		const [patient] = await db
			.select({ id: patients.id, status: patients.status })
			.from(patients)
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		// 152-ФЗ / 323-ФЗ: Защита от модификации вложений архивированного пациента
		if (patient.status === "archived") {
			const identity = getRequestIdentity(request);
			const reqAny = request as unknown as { user?: { role?: string | null } };
			const staffRole = identity.role ?? reqAny.user?.role ?? null;
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

		// Stream file to disk and calculate sha256
		const hash = crypto.createHash("sha256");
		let sha256 = "";

		// Create a write stream
		const writeStream = createWriteStream(storagePath);

		data.file.on("data", (chunk: Buffer) => hash.update(chunk));

		await pipeline(data.file, writeStream);
		sha256 = hash.digest("hex");

		const [attachment] = await db
			.insert(attachments)
			.values({
				organizationId: orgId,
				patientId,
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
	app.get("/api/patients/:patientId/attachments", getPatientAttachmentsHandler);
	app.get("/api/files/patients/:patientId/attachments", getPatientAttachmentsHandler);
	app.post("/api/patients/:patientId/attachments", postPatientAttachmentsHandler);
	app.post("/api/files/patients/:patientId/attachments", postPatientAttachmentsHandler);
}
