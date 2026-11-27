import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { attachments, patients } from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { resolveSafeUploadPath } from "./common.js";

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
interface DownloadAttachmentParams {
	attachmentId: string;
}

export const downloadAttachmentHandler = async (
	request: FastifyRequest<{ Params: DownloadAttachmentParams }>,
	reply: FastifyReply,
) => {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;
	const { attachmentId } = request.params;
	if (!isValidUuid(attachmentId)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор вложения (ожидается UUID).",
		});
	}

	const [attachment] = await withTenantReadCtx(orgId, (tx) =>
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
	const staffRole = identity.role ?? request.user?.role ?? null;
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
		const attachmentPatientId = attachment.patientId;
		const [patient] = await withTenantReadCtx(orgId, (tx) =>
			tx
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(
						eq(patients.id, attachmentPatientId),
						eq(patients.organizationId, orgId),
					),
				)
				.limit(1),
		);

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

	const filePath = resolveSafeUploadPath(attachment.storagePath);
	if (!filePath) {
		return reply.code(400).send({
			error: "InvalidStoragePath",
			message: "Недопустимый путь к файлу вложения.",
		});
	}
	try {
		await fs.access(filePath);
		reply.header(
			"Content-Disposition",
			`attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
		);
		reply.type(attachment.mimeType);
		return reply.send(createReadStream(filePath));
	} catch (error: unknown) {
		request.log.warn({ err: error, attachmentId, filePath }, "Attachment file missing on disk");
		return reply.code(404).send({
			error: "FileNotFoundOnDisk",
			message:
				"Файл вложения отсутствует на диске сервера. Сообщите администратору клиники.",
		});
	}
};

export function registerFileUploadRoutes(app: FastifyInstance) {
	app.get(
		"/api/attachments/:attachmentId/download",
		{ config: { tenantTxSelfManaged: true } },
		downloadAttachmentHandler,
	);
}
