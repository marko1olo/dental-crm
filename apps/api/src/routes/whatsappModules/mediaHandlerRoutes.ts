/**
 * whatsappModules/mediaHandlerRoutes.ts — Inbound & Outbound Media Pipeline.
 *
 * Secure ingestion and storage of dental photos, X-ray panoramic scans, and PDF treatment plans
 * received from or sent to patients via WhatsApp chat. Validates magic bytes, enforces strict size caps,
 * path containment, and cleans up disk files on DB error.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { attachments, patients } from "../../db/schema.js";
import { safeLogError } from "../../observability/logger.js";
import { UPLOADS_DIR } from "../fileModules/common.js";
import {
	ALLOWED_WHATSAPP_MEDIA_TYPES,
	type WhatsAppAllowedMediaType,
} from "./types.js";

const MAX_WHATSAPP_MEDIA_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB ceiling

const whatsappMediaUploadBodySchema = z
	.object({
		patientId: z.string().uuid(),
		fileName: z.string().trim().min(1).max(255),
		mimeType: z.enum(ALLOWED_WHATSAPP_MEDIA_TYPES),
		base64Data: z.string().min(1),
		caption: z.string().max(1024).optional(),
	})
	.strict();

/**
 * Validates file magic bytes to prevent MIME-spoofing and malicious binaries.
 */
export function validateMediaMagicBytes(
	buffer: Buffer,
	expectedMime: WhatsAppAllowedMediaType,
): boolean {
	if (buffer.length < 4) return false;

	switch (expectedMime) {
		case "image/jpeg":
			return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
		case "image/png":
			return (
				buffer[0] === 0x89 &&
				buffer[1] === 0x50 &&
				buffer[2] === 0x4e &&
				buffer[3] === 0x47
			);
		case "application/pdf":
			return (
				buffer[0] === 0x25 &&
				buffer[1] === 0x50 &&
				buffer[2] === 0x44 &&
				buffer[3] === 0x46
			); // "%PDF"
		case "image/webp":
			return buffer.length >= 12 && buffer.toString("ascii", 8, 12) === "WEBP";
		default:
			return false;
	}
}

/**
 * Registers WhatsApp media attachment and upload routes.
 */
export async function registerMediaHandlerRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * POST /api/whatsapp/media/upload
	 * Защищенная загрузка медиафайла (PDF сметы / плана лечения или снимка) для отправки в чат.
	 */
	app.post(
		"/api/whatsapp/media/upload",
		{
			config: { tenantTxSelfManaged: true },
			schema: {
				description: "WhatsApp media upload with mandatory RFC 9562 Idempotency-Key",
				headers: {
					type: "object",
					properties: {
						"idempotency-key": { type: "string" },
						"x-idempotency-key": { type: "string" },
						organizationid: { type: "string" },
						"x-organization-id": { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"whatsapp media upload",
			);
			if (!orgId) return;

			const parsed = whatsappMediaUploadBodySchema.safeParse(request.body);
			if (!parsed.success) {
				reply.code(400);
				return {
					error: "ValidationError",
					message:
						"Некорректные параметры медиафайла. Поддерживаются PDF, JPEG, PNG и WebP.",
				};
			}

			const { patientId, fileName, mimeType, base64Data, caption } = parsed.data;

			const patient = await withTenantCtx(orgId, async (tx) => {
				const [row] = await tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
					.limit(1);
				return row ?? null;
			});

			if (!patient) {
				reply.code(404);
				return {
					error: "PatientNotFound",
					message: "Пациент не найден в данной организации.",
				};
			}

			const buffer = Buffer.from(base64Data, "base64");

			if (buffer.length > MAX_WHATSAPP_MEDIA_SIZE_BYTES) {
				reply.code(413);
				return {
					error: "PayloadTooLarge",
					message: "Размер медиафайла превышает лимит 16 МБ.",
				};
			}

			if (!validateMediaMagicBytes(buffer, mimeType)) {
				reply.code(422);
				return {
					error: "InvalidFileSignature",
					message:
						"Сигнатура файла не соответствует заявленному типу (MIME spoofing protection).",
				};
			}

			const resolvedBaseDir = path.resolve(UPLOADS_DIR);
			await fs.mkdir(resolvedBaseDir, { recursive: true });

			const uniqueSuffix = crypto.randomUUID();
			const rawExt =
				path.extname(fileName).replace(/[^a-zA-Z0-9.]/g, "") ||
				(mimeType === "application/pdf"
					? ".pdf"
					: mimeType === "image/png"
						? ".png"
						: mimeType === "image/webp"
							? ".webp"
							: ".jpg");
			const safeBase = path
				.basename(fileName, path.extname(fileName))
				.replace(/[^a-zA-Z0-9.-]/g, "_");
			const storageFilename = `${uniqueSuffix}-${safeBase}${rawExt}`;
			const storagePath = path.resolve(resolvedBaseDir, storageFilename);

			if (!storagePath.startsWith(resolvedBaseDir + path.sep)) {
				reply.code(400);
				return {
					error: "InvalidStoragePath",
					message: "Недопустимое имя файла.",
				};
			}

			const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
			await fs.writeFile(storagePath, buffer);

			let attachment: typeof attachments.$inferSelect | undefined;
			try {
				attachment = await withTenantCtx(orgId, async (tx) => {
					const [inserted] = await tx
						.insert(attachments)
						.values({
							organizationId: orgId,
							patientId,
							fileName,
							mimeType,
							storagePath: storageFilename,
							sha256,
						})
						.returning();
					return inserted;
				});
			} catch (dbErr) {
				await fs.rm(storagePath, { force: true }).catch((rmErr) =>
					request.log.warn(
						{ err: safeLogError(rmErr), storagePath },
						"Failed to clean up uploaded file after DB error",
					),
				);
				throw dbErr;
			}

			if (!attachment) {
				await fs.rm(storagePath, { force: true }).catch((rmErr) =>
					request.log.warn(
						{ err: safeLogError(rmErr), storagePath },
						"Failed to clean up uploaded file when attachment row was not returned",
					),
				);
				reply.code(500);
				return {
					error: "AttachmentSaveFailed",
					message: "Не удалось сохранить медиафайл на сервере.",
				};
			}

			return {
				ok: true,
				mediaId: attachment.id,
				patientId,
				fileName: attachment.fileName,
				mimeType: attachment.mimeType,
				bytes: buffer.length,
				mediaUrl: `/api/attachments/${attachment.id}/download`,
				caption: caption ?? null,
				message: "Медиафайл сохранен и подготовлен к отправке.",
			};
		},
	);
}
