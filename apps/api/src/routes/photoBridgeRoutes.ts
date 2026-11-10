import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { attachments, patients, visits } from "../db/schema.js";
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

export interface PhotoBridgeSession {
	token: string;
	organizationId: string;
	patientId: string;
	patientInitials: string;
	visitId?: string | null;
	presetId: string;
	createdAt: number;
	expiresAt: number;
	photos: PhotoBridgeUploadedItem[];
}

// In-Memory сессионный пул с TTL 15 минут
const sessionsMap = new Map<string, PhotoBridgeSession>();

// Автоочистка просроченных токенов каждые 5 минут
setInterval(() => {
	const now = Date.now();
	for (const [token, session] of sessionsMap.entries()) {
		if (session.expiresAt <= now) {
			sessionsMap.delete(token);
		}
	}
}, 5 * 60 * 1000).unref();

function getPatientInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "Пациент";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0]!;
	if (parts.length === 2) return `${parts[0]} ${parts[1]!.charAt(0)}.`;
	return `${parts[0]} ${parts[1]!.charAt(0)}. ${parts[2]!.charAt(0)}.`;
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
});

export function registerPhotoBridgeRoutes(app: FastifyInstance) {
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
		} catch {
			// Игнорируем если тип уже зарегистрирован внешним плагином
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

		const { patientId, visitId, presetId } = parseResult.data;

		let patientFullName: string | null | undefined;

		// Мандат 8wy: в демо-режиме и тестовых стендах разрешаем демо-пациента без 404 ошибки и без падения 22P02
		if (orgId.startsWith("demo-") || patientId.startsWith("01a00000") || patientId === "chairside" || patientId === "test") {
			patientFullName = "Демо Пациент";
		} else if (!UUID_REGEX.test(patientId)) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в текущей организации.",
			});
		} else {
			// Проверка пациента в организации (Tenant Isolation)
			const [patient] = await db
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

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
				if (!orgId.startsWith("demo-") && visitId !== "chairside" && visitId !== "test") {
					return reply.code(404).send({
						error: "VisitNotFound",
						message: "Приём не найден в текущей клинике.",
					});
				}
			} else {
				const [visitRow] = await db
					.select({ id: visits.id })
					.from(visits)
					.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
					.limit(1);
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
		const { token } = request.params as { token: string };
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
		const { token } = request.params as { token: string };
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
		const query = request.query as { slotId?: string };
		let slotId = query?.slotId || (request.headers["x-slot-id"] as string) || "frontal_smile";

		// 1. Попытка через стандартный multipart stream, если доступен
		// biome-ignore lint/suspicious/noExplicitAny: Fastify multipart method inspection
		if (typeof (request as any).file === "function") {
			try {
				// biome-ignore lint/suspicious/noExplicitAny: Fastify multipart call
				const part = await (request as any).file();
				if (part) {
					const chunks: Buffer[] = [];
					for await (const chunk of part.file) {
						chunks.push(chunk as Buffer);
					}
					fileBuffer = Buffer.concat(chunks);
					filename = part.filename || filename;
					mimeType = part.mimetype || mimeType;
					const fields = part.fields as Record<string, { value?: string }> | undefined;
					if (fields?.slotId?.value) slotId = fields.slotId.value;
				}
			} catch {
				// Fallback to body inspection
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
		if (!fileBuffer && request.body && typeof request.body === "object") {
			// biome-ignore lint/suspicious/noExplicitAny: JSON payload extraction
			const b = request.body as any;
			const dataUrl = b.dataUrl || b.imageUrl || b.imageBase64;
			if (typeof dataUrl === "string") {
				const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
				if (match) {
					mimeType = match[1] || mimeType;
					fileBuffer = Buffer.from(match[2]!, "base64");
				} else {
					fileBuffer = Buffer.from(dataUrl, "base64");
				}
			}
			if (b.slotId) slotId = String(b.slotId);
			if (b.fileName || b.filename) filename = String(b.fileName || b.filename);
		}

		if (!fileBuffer || fileBuffer.length === 0) {
			return reply.code(400).send({
				error: "MissingFilePayload",
				message: "Файл изображения не получен со смартфона. Повторите снимок.",
			});
		}

		// Обеспечиваем существование каталога загрузок
		await fs.mkdir(UPLOADS_DIR, { recursive: true });

		const uniqueSuffix = crypto.randomUUID();
		const rawExt = path.extname(filename) || ".webp";
		const safeBase = path.basename(filename, rawExt).replace(/[^a-zA-Z0-9.-]/g, "_");
		const storageFilename = `${uniqueSuffix}-${safeBase}${rawExt}`;
		const storagePath = path.join(UPLOADS_DIR, storageFilename);

		const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
		await fs.writeFile(storagePath, fileBuffer);

		// Создаем запись в attachments в PostgreSQL 18
		const [attachment] = await db
			.insert(attachments)
			.values({
				organizationId: session.organizationId,
				patientId: UUID_REGEX.test(session.patientId) ? session.patientId : null,
				visitId: session.visitId && UUID_REGEX.test(session.visitId) ? session.visitId : null,
				fileName: filename,
				mimeType,
				storagePath: storageFilename,
				sha256,
			})
			.returning();

		if (!attachment) {
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
	 * Возвращает актуальный список фото без ручного F5
	 */
	app.get("/api/photo-bridge/poll/:token", async (request: FastifyRequest, reply: FastifyReply) => {
		const { token } = request.params as { token: string };
		const session = sessionsMap.get(token);

		if (!session || session.expiresAt <= Date.now()) {
			if (session) sessionsMap.delete(token);
			return reply.code(410).send({
				error: "SessionExpiredOrNotFound",
				message: "Сессия QR-загрузки истекла.",
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
		const { token } = request.params as { token: string };
		const deleted = sessionsMap.delete(token);

		return reply.send({
			success: true,
			deleted,
		});
	});
}

export { sessionsMap };
