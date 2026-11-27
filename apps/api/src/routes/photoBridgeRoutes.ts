import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { isDemoShowcaseMode, requireResolvedOrganizationId } from "../accessGuard.js";
import {
	definePublicRoute,
	defineStreamRoute,
	defineTenantMutation,
} from "../core/routeFactories.js";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
import { onTenantTxCommit, withSuperuserBypass, withTenantReadCtx, withTenantWriteCtx } from "../db/rls.js";
import { patients, attachments, systemBackgroundJobs, visits } from "../db/schema.js";
import { safeLogError } from "../observability/logger.js";
import { extractIdempotencyKey } from "../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { UPLOADS_DIR, validateUploadMagicBytes } from "./fileModules/common.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHOTO_BRIDGE_QUEUE = "photo_bridge_session";
const MAX_PHOTO_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface PhotoBridgeUploadedItem {
	id: string;
	slotId: string;
	url: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	uploadedAt: string;
	idempotencyKey?: string | undefined;
}

export interface PhotoBridgeSessionSlot {
	id: string;
	titleRu: string;
	shortLabelRu: string;
	category?: string | undefined;
	descriptionRu?: string | undefined;
}

export type PhotoBridgeSession = {
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
};

// Ограниченный кэш QR-сессий (синхронизируется через PostgreSQL system_background_jobs)
const sessionsMap = new BoundedTtlMap<string, PhotoBridgeSession>({
	maxEntries: 500,
	ttlMs: 15 * 60 * 1000,
});

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

const photoBridgeUploadedItemSchema = z.object({
	id: z.string(),
	slotId: z.string(),
	url: z.string(),
	fileName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	uploadedAt: z.string(),
	idempotencyKey: z.string().optional(),
});

const photoBridgeSessionSchema = z.object({
	token: z.string().min(1),
	organizationId: z.string(),
	patientId: z.string(),
	patientInitials: z.string(),
	visitId: z.string().nullable().optional(),
	presetId: z.string(),
	slots: z.array(z.object({
		id: z.string(),
		titleRu: z.string(),
		shortLabelRu: z.string(),
		category: z.string().optional(),
		descriptionRu: z.string().optional(),
	})).optional(),
	createdAt: z.number(),
	expiresAt: z.number(),
	photos: z.array(photoBridgeUploadedItemSchema),
});

async function savePhotoBridgeSessionToDb(session: PhotoBridgeSession): Promise<void> {
	const write = async (tx: Parameters<Parameters<typeof withTenantWriteCtx>[1]>[0]) => {
		await tx.insert(systemBackgroundJobs).values({
			organizationId: UUID_REGEX.test(session.organizationId) ? session.organizationId : null,
			queueName: PHOTO_BRIDGE_QUEUE,
			taskName: session.token,
			payload: JSON.parse(JSON.stringify(session)) as Record<string, unknown>,
			status: "pending",
			scheduledFor: new Date(session.expiresAt),
		});
		onTenantTxCommit(() => {
			sessionsMap.set(session.token, session);
		});
	};

	if (UUID_REGEX.test(session.organizationId)) {
		await withTenantWriteCtx(session.organizationId, write);
	} else {
		await withSuperuserBypass(write);
	}
}

async function loadPhotoBridgeSession(
	token: string,
	log?: FastifyRequest["log"],
): Promise<PhotoBridgeSession | null> {
	const cached = sessionsMap.get(token);
	if (cached) {
		if (cached.expiresAt <= Date.now()) {
			sessionsMap.delete(token);
			await withSuperuserBypass(async (tx) => {
				await tx
					.delete(systemBackgroundJobs)
					.where(
						and(
							eq(systemBackgroundJobs.queueName, PHOTO_BRIDGE_QUEUE),
							eq(systemBackgroundJobs.taskName, token),
						),
					);
			}).catch((err) => {
				log?.warn({ err: safeLogError(err), token }, "[photo-bridge] Failed to prune expired cached session");
			});
			return null;
		}
		return cached;
	}

	const row = await withSuperuserBypass(async (tx) => {
		const [found] = await tx
			.select()
			.from(systemBackgroundJobs)
			.where(
				and(
					eq(systemBackgroundJobs.queueName, PHOTO_BRIDGE_QUEUE),
					eq(systemBackgroundJobs.taskName, token),
				),
			)
			.limit(1);
		return found ?? null;
	});

	if (!row || !row.payload || typeof row.payload !== "object") {
		return null;
	}
	const parsed = photoBridgeSessionSchema.safeParse(row.payload);
	if (!parsed.success || !parsed.data.token || parsed.data.expiresAt <= Date.now()) {
		await withSuperuserBypass(async (tx) => {
			await tx.delete(systemBackgroundJobs).where(eq(systemBackgroundJobs.id, row.id));
		}).catch((err) => {
			log?.warn({ err: safeLogError(err), token }, "[photo-bridge] Failed to prune expired DB session");
		});
		return null;
	}

	sessionsMap.set(token, parsed.data);
	return parsed.data;
}

const createSessionSchema = z
	.object({
		patientId: z.string().min(1),
		visitId: z.string().optional().nullable(),
		presetId: z.string().optional().default("express_6_slots"),
		slots: z
			.array(
				z
					.object({
						id: z.string(),
						titleRu: z.string(),
						shortLabelRu: z.string(),
						category: z.string().optional(),
						descriptionRu: z.string().optional(),
					})
					.strict(),
			)
			.optional(),
	})
	.strict();

const tokenParamSchema = z
	.object({
		token: z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/),
	})
	.strict();

const uploadQuerySchema = z
	.object({
		slotId: z.string().min(1).max(64).optional(),
	})
	.strict();

const jsonPhotoPayloadSchema = z
	.object({
		dataUrl: z.string().max(25 * 1024 * 1024).optional(),
		imageUrl: z.string().max(25 * 1024 * 1024).optional(),
		imageBase64: z.string().max(25 * 1024 * 1024).optional(),
		slotId: z.union([z.string().max(64), z.number()]).optional(),
		fileName: z.string().max(255).optional(),
		filename: z.string().max(255).optional(),
	})
	.strict();

const ALLOWED_IMAGE_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png", ".heic", ".heif"]);
const MIME_TO_EXTENSION: Record<string, string> = {
	"image/webp": ".webp",
	"image/jpeg": ".jpg",
	"image/jpg": ".jpg",
	"image/png": ".png",
	"image/heic": ".heic",
	"image/heif": ".heif",
};

interface MultipartPart {
	type: "field" | "file";
	fieldname: string;
	value?: unknown;
	file: NodeJS.ReadableStream & { truncated?: boolean };
	filename?: string;
	mimetype?: string;
}

interface FastifyWithMultipart {
	parts?: (opts?: {
		limits?: { fileSize?: number; fieldSize?: number; files?: number; fields?: number };
	}) => AsyncIterableIterator<MultipartPart>;
}

export function registerPhotoBridgeRoutes(app: FastifyInstance) {
	// Автоочистка просроченных токенов каждые 5 минут с очисткой при остановке Fastify
	const cleanupTimer = setInterval(() => {
		sessionsMap.pruneExpired();
	}, 5 * 60 * 1000);
	cleanupTimer.unref();
	app.addHook("onClose", async () => {
		clearInterval(cleanupTimer);
	});

	// Если @fastify/multipart ещё не зарегистрирован (например, в изолированных тестах),
	// подключаем потоковый multipart-парсер вместо ручного разбора boundary.
	if (!app.hasContentTypeParser("multipart/form-data")) {
		app.register(multipart, {
			limits: {
				files: 1,
				fields: 20,
				fieldSize: 64 * 1024,
				fileSize: MAX_PHOTO_UPLOAD_BYTES,
			},
		});
	}

	// Добавляем потоковую поддержку raw-бинарных тел изображений без буферизации в RAM
	const binaryTypes = [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/heic",
		"image/heif",
		"application/octet-stream",
	];
	for (const ct of binaryTypes) {
		try {
			if (!app.hasContentTypeParser(ct)) {
				app.addContentTypeParser(ct, (_req, payload, done) => {
					done(null, payload);
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
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/photo-bridge/session",
		permission: "public",
		handler: async ({ request, reply }) => {
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
		const allowDemoFixture = isDemoShowcaseMode();

		// Мандат 8wy: только в демо-режиме разрешаем демо-пациента без 404 ошибки и без падения 22P02
		if (
			allowDemoFixture &&
			(orgId.startsWith("demo-") ||
				patientId.startsWith("01a00000") ||
				patientId === "chairside" ||
				patientId === "test")
		) {
			patientFullName = "Демо Пациент";
		} else if (!UUID_REGEX.test(patientId)) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в текущей организации.",
			});
		} else {
			// Проверка пациента в организации под RLS-контекстом клиники (Tenant Isolation)
			const patient = await withTenantReadCtx(orgId, async (tx) => {
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
				const visitRow = await withTenantReadCtx(orgId, async (tx) => {
					const [row] = await tx
						.select({ id: visits.id })
						.from(visits)
						.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
						.limit(1);
					return row ?? null;
				});
				if (!visitRow && !(allowDemoFixture && orgId.startsWith("demo-"))) {
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

		await savePhotoBridgeSessionToDb(session);

		const uploadPath = `/#photo-bridge?token=${token}`;

		return reply.code(201).send({
			success: true,
			token,
			patientInitials,
			expiresAt,
			ttlSeconds: 900,
			uploadPath,
		});
		},
	});

	/**
	 * Получение статуса сессии по токену для мобильного браузера врача
	 * GET /api/photo-bridge/session/:token
	 * Публичный эндпоинт (врач на личном смартфоне в перчатках без ввода паролей)
	 */
	definePublicRoute(app, {
		method: "GET",
		path: "/api/photo-bridge/session/:token",
		handler: async ({ request, reply }) => {
		const paramParse = tokenParamSchema.safeParse(request.params);
		if (!paramParse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат токена QR-сессии.",
			});
		}
		const { token } = paramParse.data;
		const session = await loadPhotoBridgeSession(token, request.log);

		if (!session || session.expiresAt <= Date.now()) {
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
		},
	});

	/**
	 * Загрузка снимка со смартфона врача
	 * POST /api/photo-bridge/upload/:token
	 * Поддерживает как multipart/raw бинарные потоки, так и JSON payload
	 */
	definePublicRoute(app, {
		method: "POST",
		path: "/api/photo-bridge/upload/:token",
		handler: async ({ request, reply }) => {
		const paramParse = tokenParamSchema.safeParse(request.params);
		if (!paramParse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат токена QR-сессии.",
			});
		}
		const { token } = paramParse.data;
		const session = await loadPhotoBridgeSession(token, request.log);

		if (!session || session.expiresAt <= Date.now()) {
			return reply.code(410).send({
				error: "SessionExpired",
				message: "Время сессии истекло. Обновите QR-код на экране монитора врача.",
			});
		}

		const MAX_PHOTO_UPLOAD_BYTES = 25 * 1024 * 1024;
		const MAX_PART_HEADER_BYTES = 64 * 1024;
		let tempFilePath: string | null = null;
		let magicHeader: Buffer | null = null;
		let sha256 = "";
		let uploadedSizeBytes = 0;
		let fileBuffer: Buffer | null = null;
		let filename = `chairside-${Date.now()}.webp`;
		let mimeType = "image/webp";
		const queryParse = uploadQuerySchema.safeParse(request.query);
		const querySlotId = queryParse.success ? queryParse.data.slotId : undefined;
		const headerSlotRaw = request.headers["x-slot-id"];
		const headerSlotId = typeof headerSlotRaw === "string" ? headerSlotRaw.slice(0, 64) : undefined;
		let slotId = querySlotId || headerSlotId || "frontal_smile";

		const cleanupTempFile = async () => {
			if (tempFilePath) {
				await fs.rm(tempFilePath, { force: true }).catch((rmErr) => {
					request.log.debug({ err: safeLogError(rmErr), tempFilePath }, "[photo-bridge] Temp file cleanup skipped");
				});
				tempFilePath = null;
			}
		};

		const idempotencyKey = extractIdempotencyKey(request);

		const isStreamLike = (val: unknown): val is NodeJS.ReadableStream =>
			val !== null && typeof val === "object" && "pipe" in val && typeof (val as { pipe: unknown }).pipe === "function";

		const streamToTempFile = async (source: NodeJS.ReadableStream) => {
			const candidateTemp = path.join(os.tmpdir(), `dente-photo-${crypto.randomUUID()}.bin`);
			tempFilePath = candidateTemp;
			const hash = crypto.createHash("sha256");
			const headChunks: Buffer[] = [];
			let headCaptured = 0;
			let bytesCount = 0;

			const transformer = new Transform({
				transform(rawChunk, _enc, cb) {
					const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
					bytesCount += chunk.length;
					if (bytesCount > MAX_PHOTO_UPLOAD_BYTES) {
						const err = new Error("Размер фотографии превышает допустимый лимит 25 МБ.") as Error & {
							statusCode?: number;
							code?: string;
						};
						err.statusCode = 413;
						err.code = "FST_REQ_FILE_TOO_LARGE";
						return cb(err);
					}
					hash.update(chunk);
					if (headCaptured < 512) {
						const slice = chunk.subarray(0, 512 - headCaptured);
						headChunks.push(slice);
						headCaptured += slice.length;
					}
					cb(null, chunk);
				},
			});

			await pipeline(source, transformer, createWriteStream(candidateTemp));
			uploadedSizeBytes = bytesCount;
			sha256 = hash.digest("hex");
			magicHeader = Buffer.concat(headChunks);
		};

		try {
			const contentType = String(request.headers["content-type"] || "");
			const isMultipartRequest = contentType.toLowerCase().includes("multipart/form-data");

			// 1. Потоковый @fastify/multipart (поддерживает порядок field `slotId` до/после `file` и лимит 25 МБ)
			if (isMultipartRequest) {
				const reqWithMultipart = request as FastifyRequest & FastifyWithMultipart;
				if (typeof reqWithMultipart.parts !== "function") {
					return reply.code(415).send({
						error: "UnsupportedMediaType",
						message: "Потоковый multipart-парсер не инициализирован.",
					});
				}
				let fileFound = false;
				for await (const part of reqWithMultipart.parts({
					limits: {
						files: 1,
						fields: 20,
						fieldSize: 64 * 1024,
						fileSize: MAX_PHOTO_UPLOAD_BYTES,
					},
				})) {
					if (part.type === "field") {
						if (part.fieldname === "slotId" && typeof part.value === "string") {
							const parsedSlot = part.value.trim().slice(0, 64);
							if (parsedSlot && !querySlotId && !headerSlotId) {
								slotId = parsedSlot;
							}
						}
					} else if (part.type === "file") {
						if (fileFound) {
							part.file.resume();
							continue;
						}
						fileFound = true;
						filename = part.filename || filename;
						mimeType = part.mimetype || mimeType;
						await streamToTempFile(part.file);
						if (part.file.truncated) {
							await cleanupTempFile();
							return reply.code(413).send({
								error: "PayloadTooLarge",
								message: "Размер фотографии превышает допустимый лимит 25 МБ.",
							});
						}
					}
				}
			} else if (isStreamLike(request.body)) {
				// 2. Потоковый raw binary body (image/* или application/octet-stream)
				mimeType = contentType.split(";")[0]?.trim() || mimeType;
				await streamToTempFile(request.body);
			} else if (Buffer.isBuffer(request.body)) {
				fileBuffer = request.body;
				mimeType = contentType.split(";")[0]?.trim() || mimeType;
			} else if (request.body && typeof request.body === "object") {
				// 3. JSON (dataUrl или imageBase64)
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
					const rawBase64 = match?.[2] ?? dataUrl;
					if (Math.ceil((rawBase64.length * 3) / 4) > MAX_PHOTO_UPLOAD_BYTES) {
						return reply.code(413).send({
							error: "PayloadTooLarge",
							message: "Размер фотографии превышает допустимый лимит 25 МБ.",
						});
					}
					if (match?.[1]) {
						mimeType = match[1];
					}
					fileBuffer = Buffer.from(rawBase64, "base64");
				}
				if (b.slotId !== undefined) slotId = String(b.slotId).slice(0, 64);
				if (b.fileName || b.filename) filename = String(b.fileName || b.filename);
			}
		} catch (uploadErr) {
			await cleanupTempFile();
			const errCode =
				uploadErr && typeof uploadErr === "object" && "code" in uploadErr
					? String((uploadErr as { code?: unknown }).code)
					: "";
			const errStatus =
				uploadErr && typeof uploadErr === "object" && "statusCode" in uploadErr
					? Number((uploadErr as { statusCode?: unknown }).statusCode)
					: 0;
			const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
			if (
				errStatus === 413 ||
				errCode === "FST_REQ_FILE_TOO_LARGE" ||
				msg.includes("лимит 25 МБ") ||
				msg.includes("лимит 64 КБ")
			) {
				return reply.code(413).send({ error: "PayloadTooLarge", message: msg });
			}
			return reply.code(400).send({
				error: "InvalidPhotoUpload",
				message: "Не удалось обработать загрузку фотографии.",
			});
		}

		if (fileBuffer) {
			if (fileBuffer.length > MAX_PHOTO_UPLOAD_BYTES) {
				return reply.code(413).send({
					error: "PayloadTooLarge",
					message: "Размер фотографии превышает допустимый лимит 25 МБ.",
				});
			}
			uploadedSizeBytes = fileBuffer.length;
			magicHeader = fileBuffer.subarray(0, 512);
			sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
		}

		if (uploadedSizeBytes === 0 || !magicHeader) {
			await cleanupTempFile();
			return reply.code(400).send({
				error: "MissingFilePayload",
				message: "Файл изображения не получен со смартфона. Повторите снимок.",
			});
		}

		const normalizedMime = mimeType.toLowerCase().split(";")[0]?.trim() || "image/webp";
		const requestedExt = path.extname(filename).toLowerCase();
		const mappedMimeExt = MIME_TO_EXTENSION[normalizedMime];
		if (requestedExt && !ALLOWED_IMAGE_EXTENSIONS.has(requestedExt)) {
			await cleanupTempFile();
			return reply.code(415).send({
				error: "UnsupportedImageExtension",
				message: "Допускаются только изображения форматов WebP, JPEG, PNG, HEIC или HEIF.",
			});
		}
		if (!mappedMimeExt && normalizedMime !== "application/octet-stream") {
			await cleanupTempFile();
			return reply.code(415).send({
				error: "UnsupportedImageMimeType",
				message: "Неподдерживаемый MIME-тип файла. Отправьте изображение.",
			});
		}
		const magicMime = mappedMimeExt ? normalizedMime : "image/*";
		if (!validateUploadMagicBytes(magicHeader, magicMime)) {
			await cleanupTempFile();
			return reply.code(400).send({
				error: "UnsupportedImageMagicBytes",
				message: "Содержимое файла не является допустимым изображением (WebP, JPEG, PNG, HEIC или HEIF).",
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
			await cleanupTempFile();
			return reply.code(400).send({
				error: "InvalidFileName",
				message: "Некорректное имя файла изображения.",
			});
		}

		if (tempFilePath) {
			try {
				await fs.rename(tempFilePath, storagePath);
			} catch {
				await fs.copyFile(tempFilePath, storagePath);
				await cleanupTempFile();
			}
			tempFilePath = null;
		} else if (fileBuffer) {
			await fs.writeFile(storagePath, fileBuffer);
		}

		// Создаём запись в attachments в PostgreSQL 18 под RLS-контекстом клиники
		let attachment: typeof attachments.$inferSelect | undefined;
		let persistedPhotoItem: PhotoBridgeUploadedItem | undefined;
		let replayedPhotoItem: PhotoBridgeUploadedItem | undefined;
		try {
			const txResult = await withTenantWriteCtx(session.organizationId, async (tx) => {
				const [lockedJob] = await tx
					.select({
						id: systemBackgroundJobs.id,
						payload: systemBackgroundJobs.payload,
					})
					.from(systemBackgroundJobs)
					.where(
						and(
							eq(systemBackgroundJobs.queueName, PHOTO_BRIDGE_QUEUE),
							eq(systemBackgroundJobs.taskName, session.token),
						),
					)
					.for("update")
					.limit(1);

				const parsedLocked =
					lockedJob?.payload && typeof lockedJob.payload === "object"
						? photoBridgeSessionSchema.safeParse(lockedJob.payload)
						: null;
				const currentSession = parsedLocked?.success ? parsedLocked.data : session;
				if (currentSession.expiresAt <= Date.now()) {
					return { expired: true as const };
				}

				if (idempotencyKey) {
					const existingByKey = currentSession.photos.find(
						(item) => item.idempotencyKey === idempotencyKey,
					);
					if (existingByKey) {
						return { expired: false as const, replayed: existingByKey };
					}
				}

				const [row] = await tx
					.insert(attachments)
					.values({
						organizationId: currentSession.organizationId,
						patientId: UUID_REGEX.test(currentSession.patientId) ? currentSession.patientId : null,
						visitId: currentSession.visitId && UUID_REGEX.test(currentSession.visitId) ? currentSession.visitId : null,
						fileName: path.basename(filename).slice(0, 255),
						mimeType: normalizedMime,
						storagePath: storageFilename,
						sha256,
					})
					.returning();
				if (!row) return undefined;

				const nextPhoto: PhotoBridgeUploadedItem = {
					id: row.id,
					slotId,
					url: `/api/attachments/${row.id}/download`,
					fileName: row.fileName,
					mimeType: row.mimeType,
					sizeBytes: uploadedSizeBytes,
					uploadedAt: new Date().toISOString(),
					...(idempotencyKey ? { idempotencyKey } : {}),
				};
				const updatedSession: PhotoBridgeSession = {
					...currentSession,
					photos: [...currentSession.photos, nextPhoto],
				};
				await tx
					.update(systemBackgroundJobs)
					.set({
						payload: updatedSession,
					})
					.where(
						and(
							eq(systemBackgroundJobs.queueName, PHOTO_BRIDGE_QUEUE),
							eq(systemBackgroundJobs.taskName, currentSession.token),
						),
					);
				onTenantTxCommit(() => {
					sessionsMap.set(currentSession.token, updatedSession);
				});
				return { expired: false as const, row, nextPhoto };
			});
			if (txResult?.expired) {
				await fs.rm(storagePath, { force: true }).catch((rmErr) => {
					request.log.warn({ err: safeLogError(rmErr) }, "[photo-bridge] Failed to remove photo file for expired session");
				});
				return reply.code(410).send({
					error: "SessionExpired",
					message: "Время сессии истекло. Обновите QR-код на экране монитора врача.",
				});
			}
			if (txResult && "replayed" in txResult && txResult.replayed) {
				await fs.rm(storagePath, { force: true }).catch((rmErr) => {
					request.log.debug({ err: safeLogError(rmErr) }, "[photo-bridge] Failed to remove duplicate idempotent file");
				});
				replayedPhotoItem = txResult.replayed;
			} else if (txResult && "row" in txResult) {
				attachment = txResult.row;
				persistedPhotoItem = txResult.nextPhoto;
			}
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

		if (replayedPhotoItem) {
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
				reply.header("idempotency-replayed", "true");
			}
			return reply.code(201).send({
				success: true,
				photo: replayedPhotoItem,
			});
		}

		if (!attachment || !persistedPhotoItem) {
			await fs.rm(storagePath, { force: true }).catch((rmErr) => {
				request.log.warn({ err: safeLogError(rmErr) }, "[photo-bridge] Failed to remove orphan photo file");
			});
			return reply.code(500).send({
				error: "AttachmentSaveFailed",
				message: "Не удалось сохранить снимок на сервере.",
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}
		return reply.code(201).send({
			success: true,
			photo: persistedPhotoItem,
		});
		},
	});

	/**
	 * Реактивный поллинг для десктопного монитора врача
	 * GET /api/photo-bridge/poll/:token
	 * Возвращает актуальный список фото без ручного F5 (только авторизованной клинике-владельцу)
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/photo-bridge/poll/:token",
		permission: "public",
		handler: async ({ request, reply }) => {
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
		const session = await loadPhotoBridgeSession(token, request.log);

		if (!session || session.expiresAt <= Date.now()) {
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
		},
	});

	/**
	 * Завершение сессии при закрытии модалки врачом
	 * DELETE /api/photo-bridge/session/:token
	 */
	defineTenantMutation(app, {
		method: "DELETE",
		path: "/api/photo-bridge/session/:token",
		permission: { customCheck: () => true },
		authOptions: {
			allowClinicTokenWithoutStaff: true,
		},
		idempotency: "exempt_idempotent_put_or_delete",
		handler: async ({ tx, organizationId, request, reply }) => {
			const paramParse = tokenParamSchema.safeParse(request.params);
			if (!paramParse.success) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Некорректный формат токена QR-сессии.",
				};
			}
			const { token } = paramParse.data;
			const existing = await loadPhotoBridgeSession(token, request.log);
			if (existing && existing.organizationId !== organizationId) {
				reply.code(403);
				return {
					error: "Forbidden",
					message: "Завершение QR-сессии другой клиники запрещено.",
				};
			}

			const removedRows = await tx
				.delete(systemBackgroundJobs)
				.where(
					and(
						eq(systemBackgroundJobs.queueName, PHOTO_BRIDGE_QUEUE),
						eq(systemBackgroundJobs.taskName, token),
					),
				)
				.returning({ id: systemBackgroundJobs.id });
			const deleted = removedRows.length > 0 || sessionsMap.has(token);
			onTenantTxCommit(() => {
				sessionsMap.delete(token);
			});

			return {
				success: true,
				deleted,
			};
		},
	});
}

export { sessionsMap };
