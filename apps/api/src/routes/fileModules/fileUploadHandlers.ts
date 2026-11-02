import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { attachments, patients } from "../../db/schema.js";
import { decodeServerHeicImage } from "../../services/imaging/serverHeicDecoder.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { type MultipartFilePayload, UPLOADS_DIR } from "./common.js";

/*
 * Выдача файла вложения.
 *
 * ПОЧЕМУ ЗДЕСЬ ЯВНЫЙ withTenantCtx И tenantTxSelfManaged. Тело ответа —
 * поток файла с диска: он передаётся столько, сколько занимает передача, и
 * скорость задаёт клиент. Автоматическая обёртка из server.ts держала бы
 * транзакцию и соединение из пула (их 10) всё это время; десяти
 * одновременных выгрузок хватало, чтобы обычные запросы к базе перестали
 * получать соединение вовсе. Строка вложения читается под контекстом
 * арендатора, транзакция закрывается, и только потом открывается поток.
 * Обход RLS не применяется: строка ищется по organization_id из
 * проверенного токена и под политикой арендатора.
 */
export const downloadAttachmentHandler = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;
	const { attachmentId } = request.params as { attachmentId: string };

	const [attachment] = await withTenantCtx(orgId, (tx) =>
		tx
			.select()
			.from(attachments)
			.where(
				and(
					eq(attachments.id, attachmentId),
					eq(attachments.organizationId, orgId),
				),
			)
			.limit(1),
	);

	if (!attachment) {
		return reply.code(404).send({
			error: "AttachmentNotFound",
			message: "Вложение не найдено в этой клинике.",
		});
	}

	// 152-ФЗ / 323-ФЗ ст. 13: Защита при скачивании вложений
	const identity = getRequestIdentity(request);
	const reqAny = request as unknown as { user?: { role?: string | null } };
	const staffRole = identity.role ?? reqAny.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);

	// Если вложение привязано к приёму — это медицинские фото/снимки лечебного процесса
	if (attachment.visitId && !evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.attachment.download",
			role: staffRole,
			message:
				"Отказ в доступе к клиническому снимку приёма (152-ФЗ / 323-ФЗ ст. 13): скачивание файлов лечебного процесса неклиническим персоналом запрещено.",
		});
	}

	// Если вложение привязано к пациенту, проверяем архивный статус пациента
	if (attachment.patientId) {
		const [patient] = await db
			.select({ id: patients.id, status: patients.status })
			.from(patients)
			.where(
				and(
					eq(patients.id, attachment.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (patient?.status === "archived" && !evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.archived.attachment.download",
				role: staffRole,
				message:
					"Отказ в доступе к вложению архивированного пациента (152-ФЗ / 323-ФЗ ст. 13): скачивание файлов списанного в архив пациента неклиническим персоналом запрещено.",
			});
		}

		if (attachment.visitId || patient?.status === "archived") {
			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: attachment.patientId,
				action: "DOWNLOAD_MEDICAL_ATTACHMENT",
				metadata: {
					attachmentId: attachment.id,
					fileName: attachment.fileName,
					visitId: attachment.visitId,
				},
			});
		}
	}

	const filePath = path.join(UPLOADS_DIR, attachment.storagePath);
	try {
		await fs.access(filePath);
		reply.header(
			"Content-Disposition",
			`attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
		);
		reply.type(attachment.mimeType);
		return reply.send(createReadStream(filePath));
	} catch (_e) {
		return reply.code(404).send({
			error: "FileNotFoundOnDisk",
			message:
				"Файл вложения отсутствует на диске сервера. Сообщите администратору клиники.",
		});
	}
};

/*
 * Серверное декодирование Apple HEIC / HEIF в WebP с калибровкой Display P3 -> sRGB.
 */
export const decodeHeicHandler = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	try {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const data = await (
			request as unknown as {
				file: () => Promise<MultipartFilePayload | undefined>;
			}
		).file();

		if (!data) {
			return reply.code(400).send({
				error: "MissingFilePayload",
				message: "Файл HEIC не получен для декодирования.",
			});
		}

		const chunks: Buffer[] = [];
		for await (const chunk of data.file) {
			chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
		}
		const inputBuffer = Buffer.concat(chunks);

		const result = await decodeServerHeicImage(inputBuffer, {
			targetFormat: "webp",
			quality: 92,
			maxDimension: 2048,
			generateThumbnail: true,
			thumbnailSize: 200,
		});

		const dataUrl = `data:image/webp;base64,${result.buffer.toString("base64")}`;
		const thumbnailDataUrl = result.thumbnailBuffer
			? `data:image/webp;base64,${result.thumbnailBuffer.toString("base64")}`
			: dataUrl;

		return reply.code(200).send({
			success: true,
			width: result.width,
			height: result.height,
			format: result.format,
			colorSpace: result.colorSpace,
			exif: result.exif,
			dataUrl,
			thumbnailWebpDataUrl: thumbnailDataUrl,
			sizeBytes: result.sizeBytes,
			originalSizeBytes: result.originalSizeBytes,
			durationMs: result.durationMs,
		});
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	} catch (error: any) {
		request.log.error(error);
		return reply.status(500).send({
			error: "HeicDecodingFailed",
			message: "Не удалось декодировать HEIC-снимок на сервере.",
		});
	}
};

export function registerFileUploadRoutes(app: FastifyInstance) {
	app.get(
		"/api/attachments/:attachmentId/download",
		{ config: { tenantTxSelfManaged: true } },
		downloadAttachmentHandler,
	);
	app.post("/api/imaging/decode-heic", decodeHeicHandler);
}
