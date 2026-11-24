import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { isDemoShowcaseMode, requireResolvedOrganizationId } from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import { patients, attachments, visits } from "../db/schema.js";
import { safeLogError } from "../observability/logger.js";
import { UPLOADS_DIR } from "./fileModules/common.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PhotoBridgeUploadedItem {
	id: string;
	slotId: string;
	url: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	uploadedAt: string;
}

export interface PhotoBridgeSessionSlot {
	id: string;
	titleRu: string;
	shortLabelRu: string;
	category?: string | undefined;
	descriptionRu?: string | undefined;
}

export interface PhotoBridgeSession {
	token: string;
	organizationId: string;
	patientId: string;
	patientInitials: string;
	visitId?: string | null | undefined;
	presetId: string;
	slots?: PhotoBridgeSessionSlot[] | undefined;
	createdAt: number;
	expiresAt: number;
	photos: PhotoBridgeUploadedItem[];
}

// In-Memory сессионный пул с TTL 15 минут
const sessionsMap = new Map<string, PhotoBridgeSession>();

function getPatientInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "Пациент";
	const parts = fullName.trim().split(/\s+/);
	const first = parts[0] ?? "Пациент";
	const second = parts[1];
	const third = parts[2];
	if (!second) return first;
	if (!third) return `${first} ${second.charAt(0)}.`;
	return `${first} ${second.charAt(0)}. ${third.charAt(0)}.`;
}

function stripMultipartWrapperFromBuffer(buffer: Buffer): {
	data: Buffer;
	filename?: string | undefined;
	mimeType?: string | undefined;
} {
	const headerEndCrLf = buffer.indexOf("\r\n\r\n");
	const headerEndLf = buffer.indexOf("\n\n");
	let startOffset = 0;
	let filename: string | undefined;
	let mimeType: string | undefined;

	if (headerEndCrLf !== -1 && headerEndCrLf < 4096) {
		const headerText = buffer.subarray(0, headerEndCrLf).toString("utf8");
		const matchFile = headerText.match(/filename="([^"]+)"/);
		if (matchFile) filename = matchFile[1];
		const matchMime = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
		if (matchMime) mimeType = matchMime[1]?.trim();
		startOffset = headerEndCrLf + 4;
	} else if (headerEndLf !== -1 && headerEndLf < 4096) {
		const headerText = buffer.subarray(0, headerEndLf).toString("utf8");
		const matchFile = headerText.match(/filename="([^"]+)"/);
		if (matchFile) filename = matchFile[1];
		const matchMime = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
		if (matchMime) mimeType = matchMime[1]?.trim();
		startOffset = headerEndLf + 2;
	}

	let endOffset = buffer.length;
	const lastBoundary = buffer.lastIndexOf("\r\n--");
	if (lastBoundary !== -1 && lastBoundary > startOffset) {
		endOffset = lastBoundary;
	}

	return {
		data: buffer.subarray(startOffset, endOffset),
		...(filename ? { filename } : {}),
		...(mimeType ? { mimeType } : {}),
	};
}

const createSessionSchema = z.object({
	patientId: z.string().min(1),
	visitId: z.string().optional().nullable(),
	presetId: z.string().optional().default("express_6_slots"),
	slots: z.array(z.object({
		id: z.string(),
		titleRu: z.string(),
		shortLabelRu: z.string(),
		category: z.string().optional(),
		descriptionRu: z.string().optional(),
	})).optional(),
});

const tokenParamSchema = z.object({
	token: z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});

const uploadQuerySchema = z.object({
	slotId: z.string().min(1).max(64).optional(),
});

const jsonPhotoPayloadSchema = z.object({
	dataUrl: z.string().max(25 * 1024 * 1024).optional(),
	imageUrl: z.string().max(25 * 1024 * 1024).optional(),
	imageBase64: z.string().max(25 * 1024 * 1024).optional(),
	slotId: z.union([z.string().max(64), z.number()]).optional(),
	fileName: z.string().max(255).optional(),
	filename: z.string().max(255).optional(),
});

const ALLOWED_IMAGE_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png", ".heic", ".heif"]);
const MIME_TO_EXTENSION: Record<string, string> = {
	"image/webp": ".webp",
	"image/jpeg": ".jpg",
	"image/jpg": ".jpg",
	"image/png": ".png",
	"image/heic": ".heic",
	"image/heif": ".heif",
};

interface FastifyMultipartFilePart {
	file: AsyncIterable<Buffer>;
	filename?: string;
	mimetype?: string;
	fields?: Record<string, { value?: string }>;
}

interface FastifyWithMultipart {
	file?: () => Promise<FastifyMultipartFilePart | undefined>;
}

export function registerPhotoBridgeRoutes(app: FastifyInstance) {
	// Автоочистка просроченных токенов каждые 5 минут с очисткой при остановке Fastify
	const cleanupTimer = setInterval(() => {
		const now = Date.now();
		for (const [token, session] of sessionsMap.entries()) {
			if (session.expiresAt <= now) {
				sessionsMap.delete(token);
			}
		}
	}, 5 * 60 * 1000);
	cleanupTimer.unref();
	app.addHook("onClose", async () => {
		clearInterval(cleanupTimer);
	});

	// Добавляем поддержку бинарных тел запросов для фотопротокола без сбоев дублирования
	const binaryTypes = [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/heic",
		"image/heif",
		"application/octet-stream",
		"multipart/form-data",
	];
	for (const ct of binaryTypes) {
		try {
			if (!app.hasContentTypeParser(ct)) {
				app.addContentTypeParser(ct, { parseAs: "buffer" }, (_req, body, done) => {
					done(null, body);
				});
			}
		} catch (err) {
			app.log.debug(
				{ contentType: ct, err: safeLogError(err) },
				"[photo-bridge] Content-type parser registration skipped",
			);
		}
	}

	/**
	 * Создание защищенной одноразовой сессии мобильного QR-моста
	 * POST /api/photo-bridge/session
	 * Доступно авторизованному клиническому персоналу
	 */
	app.post("/api/photo-bridge/session", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parseResult = createSessionSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры для создания QR-сессии фотопротокола.",
				details: parseResult.error.format(),
			});
		}

		const { patientId, visitId, presetId, slots } = parseResult.data;

		let patientFullName: string | null | undefined;
		const allowDemoFixture = orgId.startsWith("demo-") || isDemoShowcaseMode();

		// Мандат 8wy: только в демо-режиме разрешаем демо-пациента без 404 ошибки и без падения 22P02
		if (
			orgId.startsWith("demo-") ||
			(allowDemoFixture && (patientId.startsWith("01a00000") || patientId === "chairside" || patientId === "test"))
		) {
			patientFullName = "Демо Пациент";
		} else if (!UUID_REGEX.test(patientId)) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в текущей организации.",
			});
		} else {
			// Проверка пациента в организации под RLS-контекстом клиники (Tenant Isolation)
			const patient = await withTenantCtx(orgId, async (tx) => {
				const [row] = await tx
					.select({ id: patients.id, fullName: patients.fullName })
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
					.limit(1);
				return row ?? null;
			});

			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в текущей организации.",
				});
			}
			patientFullName = patient.fullName;
		}

		// Если передан visitId, проверяем его принадлежность без сбоев 22P02
		if (visitId) {
			if (!UUID_REGEX.test(visitId)) {
				if (!allowDemoFixture || (visitId !== "chairside" && visitId !== "test")) {
					return reply.code(404).send({
						error: "VisitNotFound",
						message: "Приём не найден в текущей клинике.",
					});
				}
			} else {
				const visitRow = await withTenantCtx(orgId, async (tx) => {
					const [row] = await tx
						.select({ id: visits.id })
						.from(visits)
						.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
						.limit(1);
					return row ?? null;
				});
				if (!visitRow && !orgId.startsWith("demo-")) {
					return reply.code(404).send({
						error: "VisitNotFound",
						message: "Приём не найден в текущей клинике.",
					});
				}
			}
		}

		// Генерация криптографически стойкого одноразового токена (TTL 15 минут)
		const token = crypto.randomBytes(16).toString("hex");
		const now = Date.now();
		const ttlMs = 15 * 60 * 1000;
		const expiresAt = now + ttlMs;
		const patientInitials = getPatientInitials(patientFullName);

		const session: PhotoBridgeSession = {
			token,
			organizationId: orgId,
			patientId,
			patientInitials,
			visitId: visitId || null,
			presetId,
			...(slots ? { slots } : {}),
			createdAt: now,
			expiresAt,
			photos: [],
		};

		sessionsMap.set(token, session);

		const uploadPath = `/#photo-bridge?token=${token}`;

		return reply.code(201).send({
			success: true,
			token,
			patientInitials,
			expiresAt,
			ttlSeconds: 900,
			uploadPath,
		});
	});

	/**
	 * Получение статуса сессии по токену для мобильного браузера врача
	 * GET /api/photo-bridge/session/:token
	 * Публичный эндпоинт (врач на личном смартфоне в перчатках без ввода паролей)
	 */
	app.get("/api/photo-bridge/session/:token", async (request: FastifyRequest, reply: FastifyReply) => {
		const paramParse = tokenParamSchema.safeParse(request.params);
		if (!paramParse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат токена QR-сессии.",
			});
		}
		const { token } = paramParse.data;
		const session = sessionsMap.get(token);

		if (!session || session.expiresAt <= Date.now()) {
			if (session) sessionsMap.delete(token);
			return reply.code(410).send({
				error: "SessionExpiredOrNotFound",
				message: "Сессия QR-загрузки истекла или не найдена. Обновите QR-код на экране компьютера.",
			});
		}

		return reply.send({
			success: true,
			token: session.token,
			patientInitials: session.patientInitials,
			visitId: session.visitId,
			presetId: session.presetId,
			slots: session.slots,
			expiresAt: session.expiresAt,
			photosCount: session.photos.length,
			uploadedPhotos: session.photos,
		});
	});

	/**
	 * Загрузка снимка со смартфона врача
	 * POST /api/photo-bridge/upload/:token
	 * Поддерживает как multipart/raw бинарные потоки, так и JSON payload
	 */
	app.post("/api/photo-bridge/upload/:token", async (request: FastifyRequest, reply: FastifyReply) => {
		const paramParse = tokenParamSchema.safeParse(request.params);
		if (!paramParse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат токена QR-сессии.",
			});
		}
		const { token } = paramParse.data;
		const session = sessionsMap.get(token);

		if (!session || session.expiresAt <= Date.now()) {
			if (session) sessionsMap.delete(token);
			return reply.code(410).send({
				error: "SessionExpired",
				message: "Время сессии истекло. Обновите QR-код на экране монитора врача.",
			});
		}

		let fileBuffer: Buffer | null = null;
		let filename = `chairside-${Date.now()}.webp`;
		let mimeType = "image/webp";
		const queryParse = uploadQuerySchema.safeParse(request.query);
		const querySlotId = queryParse.success ? queryParse.data.slotId : undefined;
		const headerSlotRaw = request.headers["x-slot-id"];
		const headerSlotId = typeof headerSlotRaw === "string" ? headerSlotRaw.slice(0, 64) : undefined;
		let slotId = querySlotId || headerSlotId || "frontal_smile";

		// 1. Попытка через стандартный multipart stream, если доступен
		const reqWithMultipart = request as FastifyRequest & FastifyWithMultipart;
		if (typeof reqWithMultipart.file === "function") {
			try {
				const part = await reqWithMultipart.file();
				if (part) {
					const chunks: Buffer[] = [];
					for await (const chunk of part.file) {
						chunks.push(chunk as Buffer);
					}
					fileBuffer = Buffer.concat(chunks);
					filename = part.filename || filename;
					mimeType = part.mimetype || mimeType;
					const fields = part.fields;
					if (fields?.slotId?.value) slotId = fields.slotId.value;
				}
			} catch (err) {
				request.log.warn(
					{ err: safeLogError(err) },
					"[photo-bridge] Multipart stream parse failed, trying fallback body parser",
				);
			}
		}

		// 2. Если тело пришло как Buffer (multipart/form-data или raw stream)
		if (!fileBuffer && Buffer.isBuffer(request.body)) {
			const contentType = request.headers["content-type"] || "";
			if (contentType.includes("multipart/form-data")) {
				const stripped = stripMultipartWrapperFromBuffer(request.body);
				fileBuffer = stripped.data;
				if (stripped.filename) filename = stripped.filename;
				if (stripped.mimeType) mimeType = stripped.mimeType;
			} else {
				fileBuffer = request.body;
				mimeType = contentType.split(";")[0]?.trim() || mimeType;
			}
		}

		// 3. Если тело пришло как JSON (dataUrl или imageBase64)
		if (!fileBuffer && request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
			const jsonParsed = jsonPhotoPayloadSchema.safeParse(request.body);
			if (!jsonParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат данных снимка.",
				});
			}
			const b = jsonParsed.data;
			const dataUrl = b.dataUrl || b.imageUrl || b.imageBase64;
			if (typeof dataUrl === "string") {
				const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
				if (match && match[1] && match[2]) {
					mimeType = match[1];
					fileBuffer = Buffer.from(match[2], "base64");
				} else {
					fileBuffer = Buffer.from(dataUrl, "base64");
				}
			}
			if (b.slotId !== undefined) slotId = String(b.slotId).slice(0, 64);
			if (b.fileName || b.filename) filename = String(b.fileName || b.filename);
		}

		if (!fileBuffer || fileBuffer.length === 0) {
			return reply.code(400).send({
				error: "MissingFilePayload",
				message: "Файл изображения не получен со смартфона. Повторите снимок.",
			});
		}

		const normalizedMime = mimeType.toLowerCase().split(";")[0]?.trim() || "image/webp";
		const requestedExt = path.extname(filename).toLowerCase();
		const mappedMimeExt = MIME_TO_EXTENSION[normalizedMime];
		if (requestedExt && !ALLOWED_IMAGE_EXTENSIONS.has(requestedExt)) {
			return reply.code(400).send({
				error: "UnsupportedImageExtension",
				message: "Допускаются только изображения форматов WebP, JPEG, PNG, HEIC или HEIF.",
			});
		}
		if (!mappedMimeExt && normalizedMime !== "application/octet-stream") {
			return reply.code(400).send({
				error: "UnsupportedImageMimeType",
				message: "Неподдерживаемый MIME-тип файла. Отправьте изображение.",
			});
		}
		const rawExt = ALLOWED_IMAGE_EXTENSIONS.has(requestedExt)
			? requestedExt
			: (mappedMimeExt ?? ".webp");

		// Обеспечиваем существование каталога загрузок и проверяем path containment
		await fs.mkdir(UPLOADS_DIR, { recursive: true });

		const uniqueSuffix = crypto.randomUUID();
		const safeBase = (path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9.-]/g, "_") || "chairside").replace(/^\.+/, "") || "chairside";
		const storageFilename = `${uniqueSuffix}-${safeBase}${rawExt}`;
		const resolvedUploadsDir = path.resolve(UPLOADS_DIR);
		const storagePath = path.resolve(resolvedUploadsDir, storageFilename);
		if (!storagePath.startsWith(resolvedUploadsDir + path.sep)) {
			return reply.code(400).send({
				error: "InvalidFileName",
				message: "Некорректное имя файла изображения.",
			});
		}

		const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
		await fs.writeFile(storagePath, fileBuffer);

		// Создаем запись в attachments в PostgreSQL 18 под RLS-контекстом клиники
		let attachment: typeof attachments.$inferSelect | undefined;
		try {
			attachment = await withTenantCtx(session.organizationId, async (tx) => {
				const [row] = await tx
					.insert(attachments)
					.values({
						organizationId: session.organizationId,
						patientId: UUID_REGEX.test(session.patientId) ? session.patientId : null,
						visitId: session.visitId && UUID_REGEX.test(session.visitId) ? session.visitId : null,
						fileName: path.basename(filename).slice(0, 255),
						mimeType: normalizedMime,
						storagePath: storageFilename,
						sha256,
					})
					.returning();
				return row;
			});
		} catch (dbErr) {
			await fs.rm(storagePath, { force: true }).catch((rmErr) => {
				request.log.warn({ err: safeLogError(rmErr) }, "[photo-bridge] Failed to remove orphan photo file after DB error");
			});
			request.log.error({ err: safeLogError(dbErr) }, "[photo-bridge] Failed to insert attachment row");
			return reply.code(500).send({
				error: "AttachmentSaveFailed",
				message: "Не удалось сохранить снимок на сервере.",
			});
		}

		if (!attachment) {
			await fs.rm(storagePath, { force: true }).catch((rmErr) => {
				request.log.warn({ err: safeLogError(rmErr) }, "[photo-bridge] Failed to remove orphan photo file");
			});
			return reply.code(500).send({
				error: "AttachmentSaveFailed",
				message: "Не удалось сохранить снимок на сервере.",
			});
		}

		const photoItem: PhotoBridgeUploadedItem = {
			id: attachment.id,
			slotId,
			url: `/api/attachments/${attachment.id}/download`,
			fileName: attachment.fileName,
			mimeType: attachment.mimeType,
			sizeBytes: fileBuffer.length,
			uploadedAt: new Date().toISOString(),
		};

		session.photos.push(photoItem);

		return reply.code(201).send({
			success: true,
			photo: photoItem,
		});
	});

	/**
	 * Реактивный поллинг для десктопного монитора врача
	 * GET /api/photo-bridge/poll/:token
	 * Возвращает актуальный список фото без ручного F5 (только авторизованной клинике-владельцу)
	 */
	app.get("/api/photo-bridge/poll/:token", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "photo bridge poll");
		if (!orgId) return;

		const paramParse = tokenParamSchema.safeParse(request.params);
		if (!paramParse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат токена QR-сессии.",
			});
		}
		const { token } = paramParse.data;
		const session = sessionsMap.get(token);

		if (!session || session.expiresAt <= Date.now()) {
			if (session) sessionsMap.delete(token);
			return reply.code(410).send({
				error: "SessionExpiredOrNotFound",
				message: "Сессия QR-загрузки истекла.",
			});
		}

		if (session.organizationId !== orgId) {
			return reply.code(403).send({
				error: "Forbidden",
				message: "Доступ к QR-сессии другой клиники запрещён.",
			});
		}

		return reply.send({
			success: true,
			count: session.photos.length,
			photos: session.photos,
			expiresAt: session.expiresAt,
		});
	});

	/**
	 * Завершение сессии при закрытии модалки врачом
	 * DELETE /api/photo-bridge/session/:token
	 */
	app.delete("/api/photo-bridge/session/:token", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "photo bridge delete");
		if (!orgId) return;

		const paramParse = tokenParamSchema.safeParse(request.params);
		if (!paramParse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат токена QR-сессии.",
			});
		}
		const { token } = paramParse.data;
		const existing = sessionsMap.get(token);
		if (existing && existing.organizationId !== orgId) {
			return reply.code(403).send({
				error: "Forbidden",
				message: "Завершение QR-сессии другой клиники запрещено.",
			});
		}

		const deleted = sessionsMap.delete(token);

		return reply.send({
			success: true,
			deleted,
		});
	});
}

export { sessionsMap };
