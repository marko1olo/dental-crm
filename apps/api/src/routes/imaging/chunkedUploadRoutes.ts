/**
 * DENTE Dental CRM — Resumable SHA-256 Chunked Medical Imaging Upload Routes
 *
 * Implements streaming chunked transfer for large DICOM / CBCT / OPG / photo studies:
 * - POST /api/imaging/chunks/init       — validates tenant & patient, opens resumable session
 * - GET  /api/imaging/chunks/:uploadId  — inspects already uploaded chunks for resume
 * - PUT  /api/imaging/chunks/:uploadId/part — streams chunk, checks per-chunk SHA-256 & org before commit
 * - POST /api/imaging/chunks/:uploadId/complete — streams assembled parts through LocalPacsStorageService,
 *   verifies full-file SHA-256 + magic bytes, registers study in PostgreSQL inside tenant RLS context.
 */

import * as crypto from "node:crypto";
import { createReadStream, createWriteStream, existsSync, openSync, readSync, closeSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ImagingStudyKind } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { createImagingStudyInDb } from "../../db/imagingQuery.js";
import { withTenantCtx } from "../../db/rls.js";
import { patients, xrayScans } from "../../db/schema.js";
import { requireOrganizationId } from "../../security/identity.js";
import {
	InvalidMagicBytesError,
	LocalPacsStorageService,
	PathTraversalError,
	TenantIsolationError,
} from "../../services/imaging/localPacsStorageService.js";
import { decodeServerHeicImage } from "../../services/imaging/serverHeicDecoder.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import { parseDicomHeader } from "./dicomParsing.js";
import type { DicomHeaderMetadata } from "./imagingConstants.js";

const MAX_CHUNK_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_CHUNKS = 2048;
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

interface ChunkUploadSession {
	readonly uploadId: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly visitId: string | null;
	readonly kind: ImagingStudyKind;
	readonly title: string;
	readonly toothCode: string | null;
	readonly region: string | null;
	readonly fileName: string;
	readonly fileSizeBytes: number;
	readonly totalChunks: number;
	readonly chunkSizeBytes: number;
	readonly fileSha256: string;
	readonly createdAt: string;
	uploadedChunks: number[];
}

const activeChunkSessions = new Map<string, ChunkUploadSession>();

function normalizeKind(raw: string | undefined): ImagingStudyKind {
	const val = (raw || "").toLowerCase().trim();
	if (val === "opg" || val === "optg" || val === "panoramic") return "opg";
	if (val === "periapical" || val === "rvg") return "periapical";
	if (val === "bitewing") return "bitewing";
	if (val === "ceph" || val === "cephalometric") return "ceph";
	if (val === "cbct" || val === "ct") return "cbct";
	if (val === "photo" || val === "photo_intraoral" || val === "photo_extraoral") return "photo";
	return "other";
}

function getSessionDir(organizationId: string, uploadId: string): string {
	if (!isValidUuid(uploadId)) {
		throw new PathTraversalError("Некорректный идентификатор загрузки.");
	}
	const tenantDir = LocalPacsStorageService.getTenantStorageDir(organizationId);
	return path.join(tenantDir, ".chunk-sessions", uploadId);
}

async function persistSessionMetadata(session: ChunkUploadSession): Promise<void> {
	const dir = getSessionDir(session.organizationId, session.uploadId);
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, "session.json"), JSON.stringify(session), "utf8");
}

async function loadSessionForTenant(
	organizationId: string,
	uploadId: string,
): Promise<ChunkUploadSession | null> {
	if (!isValidUuid(uploadId)) return null;
	const cached = activeChunkSessions.get(uploadId);
	if (cached) {
		if (cached.organizationId !== organizationId) {
			throw new TenantIsolationError("Доступ к чужой сессии загрузки запрещен.");
		}
		return cached;
	}

	const dir = getSessionDir(organizationId, uploadId);
	const metaPath = path.join(dir, "session.json");
	if (!existsSync(metaPath)) return null;

	const raw = await fs.readFile(metaPath, "utf8");
	const parsed = JSON.parse(raw) as ChunkUploadSession;
	if (!parsed || parsed.organizationId !== organizationId) {
		throw new TenantIsolationError("Доступ к чужой сессии загрузки запрещен.");
	}
	activeChunkSessions.set(uploadId, parsed);
	return parsed;
}

function createAssembledChunkStream(sessionDir: string, totalChunks: number): NodeJS.ReadableStream {
	async function* generateChunks() {
		for (let i = 0; i < totalChunks; i++) {
			const partPath = path.join(sessionDir, `part-${i}.bin`);
			const reader = createReadStream(partPath, { highWaterMark: 256 * 1024 });
			for await (const chunk of reader) {
				yield chunk;
			}
		}
	}
	return Readable.from(generateChunks());
}

const initChunkSchema = z
	.object({
		patientId: z.string().uuid(),
		visitId: z.string().uuid().nullable().optional(),
		kind: z.string().max(40).optional(),
		title: z.string().trim().max(200).optional(),
		toothCode: z.string().trim().max(50).nullable().optional(),
		region: z.string().trim().max(100).nullable().optional(),
		fileName: z.string().trim().min(1).max(255),
		fileSizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
		totalChunks: z.number().int().min(1).max(MAX_TOTAL_CHUNKS),
		chunkSizeBytes: z.number().int().min(1).max(MAX_CHUNK_BYTES),
		fileSha256: z.string().trim().regex(/^[a-fA-F0-9]{64}$/, "Ожидается SHA-256 (64 hex-символа)"),
	})
	.strict();

export async function registerChunkedUploadRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * POST /api/imaging/chunks/init
	 * Initializes resumable chunked upload session after validating auth, tenant isolation, and patient ownership.
	 */
	app.post("/api/imaging/chunks/init", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "init chunked imaging upload"))) {
			return;
		}
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				error: "InvalidIdempotencyKey",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const parsed = initChunkSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message || "Некорректные параметры чанковой загрузки.",
				issues: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const [patient] = await withTenantCtx(organizationId, async (tx) =>
			tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, data.patientId)))
				.limit(1),
		);

		if (!patient) {
			return reply.status(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в организации клиники.",
			});
		}

		const uploadId = crypto.randomUUID();
		const session: ChunkUploadSession = {
			uploadId,
			organizationId,
			patientId: data.patientId,
			visitId: data.visitId ?? null,
			kind: normalizeKind(data.kind),
			title: data.title?.trim() || `Снимок ${normalizeKind(data.kind).toUpperCase()}`,
			toothCode: data.toothCode ?? null,
			region: data.region ?? null,
			fileName: path.basename(data.fileName),
			fileSizeBytes: data.fileSizeBytes,
			totalChunks: data.totalChunks,
			chunkSizeBytes: data.chunkSizeBytes,
			fileSha256: data.fileSha256.toLowerCase(),
			createdAt: new Date().toISOString(),
			uploadedChunks: [],
		};

		await persistSessionMetadata(session);
		activeChunkSessions.set(uploadId, session);

		return reply.status(201).send({
			ok: true,
			uploadId,
			chunkSizeBytes: session.chunkSizeBytes,
			totalChunks: session.totalChunks,
			uploadedChunks: session.uploadedChunks,
		});
	});

	/**
	 * GET /api/imaging/chunks/:uploadId
	 * Returns uploaded chunk indices so client can resume interrupted transfers.
	 */
	app.get("/api/imaging/chunks/:uploadId", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "get chunked upload status"))) {
			return;
		}
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const params = request.params as { uploadId?: string };
		const uploadId = params.uploadId || "";
		try {
			const session = await loadSessionForTenant(organizationId, uploadId);
			if (!session) {
				return reply.status(404).send({
					error: "UploadSessionNotFound",
					message: "Сессия загрузки не найдена или уже завершена.",
				});
			}
			return reply.status(200).send({
				ok: true,
				uploadId: session.uploadId,
				totalChunks: session.totalChunks,
				uploadedChunks: session.uploadedChunks,
			});
		} catch (err) {
			if (err instanceof TenantIsolationError || err instanceof PathTraversalError) {
				return reply.status(403).send({ error: err.name, message: err.message });
			}
			throw err;
		}
	});

	/**
	 * Scoped octet-stream parser so chunk bytes stream directly to disk without memory bloat.
	 */
	await app.register(async (chunkScope) => {
		chunkScope.addContentTypeParser("application/octet-stream", (_req, payload, done) => {
			done(null, payload);
		});

		/**
		 * PUT /api/imaging/chunks/:uploadId/part
		 * Verifies auth, organizationId, session, chunk index and SHA-256 integrity.
		 */
		chunkScope.put(
			"/api/imaging/chunks/:uploadId/part",
			{ bodyLimit: MAX_CHUNK_BYTES + 1024 * 64 },
			async (request: FastifyRequest, reply: FastifyReply) => {
				if (!(await requireClinicalMutationAccess(request, reply, "upload imaging chunk part"))) {
					return;
				}
				const organizationId = requireOrganizationId(request, reply);
				if (!organizationId) return;

				const params = request.params as { uploadId?: string };
				const query = (request.query || {}) as Record<string, string | undefined>;
				const uploadId = params.uploadId || "";

				let session: ChunkUploadSession | null = null;
				try {
					session = await loadSessionForTenant(organizationId, uploadId);
				} catch (err) {
					if (err instanceof TenantIsolationError || err instanceof PathTraversalError) {
						return reply.status(403).send({ error: err.name, message: err.message });
					}
					throw err;
				}
				if (!session) {
					return reply.status(404).send({
						error: "UploadSessionNotFound",
						message: "Сессия загрузки не найдена.",
					});
				}

				const rawIndex = query.index ?? String(request.headers["x-chunk-index"] ?? "");
				const chunkIndex = Number.parseInt(rawIndex, 10);
				if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= session.totalChunks) {
					return reply.status(400).send({
						error: "InvalidChunkIndex",
						message: "Некорректный номер чанка.",
					});
				}

				const expectedShaRaw = (query.sha256 ?? String(request.headers["x-chunk-sha256"] ?? "")).trim().toLowerCase();
				if (!/^[a-f0-9]{64}$/.test(expectedShaRaw)) {
					return reply.status(400).send({
						error: "InvalidChunkSha256",
						message: "Отсутствует или некорректна контрольная сумма SHA-256 чанка.",
					});
				}

				let chunkStream: NodeJS.ReadableStream;
				if (Buffer.isBuffer(request.body)) {
					chunkStream = Readable.from(request.body);
				} else if (
					request.body !== null &&
					typeof request.body === "object" &&
					"pipe" in request.body &&
					typeof (request.body as { pipe: unknown }).pipe === "function"
				) {
					chunkStream = request.body as NodeJS.ReadableStream;
				} else {
					chunkStream = request.raw;
				}

				const sessionDir = getSessionDir(organizationId, uploadId);
				await fs.mkdir(sessionDir, { recursive: true });
				const tempPartPath = path.join(sessionDir, `part-${chunkIndex}.tmp-${crypto.randomUUID().slice(0, 8)}`);
				const finalPartPath = path.join(sessionDir, `part-${chunkIndex}.bin`);

				const hasher = crypto.createHash("sha256");
				let chunkBytes = 0;
				const maxAllowedChunkBytes = Math.min(MAX_CHUNK_BYTES, session.chunkSizeBytes + 1024);

				const inspector = new Transform({
					transform(chunk: Buffer, _encoding, cb) {
						chunkBytes += chunk.length;
						if (chunkBytes > maxAllowedChunkBytes) {
							cb(new Error("CHUNK_SIZE_EXCEEDED"));
							return;
						}
						hasher.update(chunk);
						cb(null, chunk);
					},
				});

				try {
					await pipeline(chunkStream, inspector, createWriteStream(tempPartPath));
					const actualSha = hasher.digest("hex").toLowerCase();
					if (actualSha !== expectedShaRaw) {
						await fs.unlink(tempPartPath).catch(() => {});
						return reply.status(422).send({
							error: "ChunkSha256Mismatch",
							message: "Контрольная сумма SHA-256 чанка не совпала. Повторите передачу фрагмента.",
						});
					}

					await fs.rename(tempPartPath, finalPartPath);
					if (!session.uploadedChunks.includes(chunkIndex)) {
						session.uploadedChunks.push(chunkIndex);
						session.uploadedChunks.sort((a, b) => a - b);
						await persistSessionMetadata(session);
					}

					return reply.status(200).send({
						ok: true,
						uploadId,
						chunkIndex,
						bytesReceived: chunkBytes,
						sha256: actualSha,
						uploadedChunks: session.uploadedChunks,
					});
				} catch (err) {
					await fs.unlink(tempPartPath).catch(() => {});
					if (err instanceof Error && err.message === "CHUNK_SIZE_EXCEEDED") {
						return reply.status(413).send({
							error: "ChunkTooLarge",
							message: "Размер чанка превышает заявленный предел сессии.",
						});
					}
					throw err;
				}
			},
		);
	});

	/**
	 * POST /api/imaging/chunks/:uploadId/complete
	 * Streams assembled parts into tenant PACS storage, verifies final SHA-256 & magic bytes,
	 * and creates DB records inside withTenantCtx.
	 */
	app.post("/api/imaging/chunks/:uploadId/complete", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "complete chunked imaging upload"))) {
			return;
		}
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				error: "InvalidIdempotencyKey",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const params = request.params as { uploadId?: string };
		const uploadId = params.uploadId || "";

		let session: ChunkUploadSession | null = null;
		try {
			session = await loadSessionForTenant(organizationId, uploadId);
		} catch (err) {
			if (err instanceof TenantIsolationError || err instanceof PathTraversalError) {
				return reply.status(403).send({ error: err.name, message: err.message });
			}
			throw err;
		}
		if (!session) {
			return reply.status(404).send({
				error: "UploadSessionNotFound",
				message: "Сессия загрузки не найдена.",
			});
		}

		const sessionDir = getSessionDir(organizationId, uploadId);
		const missingChunks: number[] = [];
		for (let i = 0; i < session.totalChunks; i++) {
			if (!existsSync(path.join(sessionDir, `part-${i}.bin`))) {
				missingChunks.push(i);
			}
		}
		if (missingChunks.length > 0) {
			return reply.status(409).send({
				error: "IncompleteChunks",
				message: `Не все фрагменты снимка загружены (осталось: ${missingChunks.length}).`,
				missingChunks,
			});
		}

		let storedStoragePath: string | null = null;
		try {
			const assembledStream = createAssembledChunkStream(sessionDir, session.totalChunks);
			const stored = await LocalPacsStorageService.storeTenantFileStream(
				organizationId,
				session.fileName,
				assembledStream,
				{ maxSizeBytes: MAX_UPLOAD_SIZE_BYTES },
			);
			storedStoragePath = stored.storagePath;

			if (stored.sha256.toLowerCase() !== session.fileSha256) {
				await fs.unlink(stored.storagePath).catch(() => {});
				return reply.status(422).send({
					error: "FileSha256Mismatch",
					message: "Итоговая контрольная сумма SHA-256 собранного файла не совпала.",
				});
			}

			let dicomMetadata: DicomHeaderMetadata | null = null;
			let localThumbnailDataUri: string | null = null;

			if (stored.detectedFormat === "dicom") {
				try {
					const headBuf = Buffer.alloc(Math.min(stored.fileSizeBytes, 65536));
					const fd = openSync(stored.storagePath, "r");
					readSync(fd, headBuf, 0, headBuf.length, 0);
					closeSync(fd);
					const parsed = parseDicomHeader(headBuf);
					if (parsed.tagsRead > 0) {
						dicomMetadata = parsed;
					}
				} catch (hdrErr) {
					request.log.warn({ err: hdrErr, fileName: session.fileName }, "Non-fatal DICOM header probe error");
				}
			} else if (stored.detectedFormat === "heic") {
				try {
					const fileBuf = await fs.readFile(stored.storagePath);
					const decoded = await decodeServerHeicImage(fileBuf, {
						thumbnailSize: 200,
						generateThumbnail: true,
					});
					if (decoded.success && decoded.thumbnailBuffer) {
						localThumbnailDataUri = `data:image/webp;base64,${decoded.thumbnailBuffer.toString("base64")}`;
					}
				} catch (heicErr) {
					request.log.warn({ err: heicErr, fileName: session.fileName }, "Non-fatal HEIC thumbnail decode error");
				}
			}

			const study = await withTenantCtx(organizationId, async (tx) => {
				const createdStudy = await createImagingStudyInDb(
					organizationId,
					{
						patientId: session.patientId,
						visitId: session.visitId,
						kind: session.kind,
						title: session.title,
						toothCode: session.toothCode,
						region: session.region,
						sourceKind: "dicom_file",
						sourceName: session.fileName,
						storagePath: stored.relativePath,
						dicomStudyUid: dicomMetadata?.studyInstanceUid ?? undefined,
						dicomSeriesUid: dicomMetadata?.seriesInstanceUid ?? undefined,
						dicomSopInstanceUid: dicomMetadata?.sopInstanceUid ?? undefined,
						aiSummary: localThumbnailDataUri ? "Снимок загружен. Сформировано превью." : null,
					},
					tx,
				);

				if (session.kind !== "cbct") {
					const xrayKind =
						session.kind === "bitewing"
							? "bitewing"
							: session.kind === "opg"
								? "opg"
								: session.kind === "periapical"
									? "periapical"
									: "other";

					await tx
						.insert(xrayScans)
						.values({
							id: createdStudy.id,
							organizationId,
							patientId: session.patientId,
							visitId: session.visitId,
							storagePath: stored.relativePath,
							fileUrl: `/api/imaging/studies/${createdStudy.id}/file`,
							originalFilename: session.fileName,
							fileSizeBytes: stored.fileSizeBytes,
							sha256: stored.sha256,
							mimeType:
								stored.detectedFormat === "png"
									? "image/png"
									: stored.detectedFormat === "jpeg"
										? "image/jpeg"
										: "application/dicom",
							kind: xrayKind,
							toothCode: session.toothCode,
							notes: session.title,
							status: "done",
							capturedAt: new Date(),
						})
						.onConflictDoNothing();
				}

				return createdStudy;
			});

			activeChunkSessions.delete(uploadId);
			await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {});

			return reply.status(201).send({
				success: true,
				study,
				file: {
					fileName: stored.fileName,
					relativePath: stored.relativePath,
					fileSizeBytes: stored.fileSizeBytes,
					detectedFormat: stored.detectedFormat,
					sha256: stored.sha256,
				},
				dicomMetadata,
				localThumbnailDataUri,
			});
		} catch (err) {
			if (storedStoragePath) {
				await fs.unlink(storedStoragePath).catch(() => {});
			}
			if (err instanceof InvalidMagicBytesError || err instanceof PathTraversalError || err instanceof TenantIsolationError) {
				return reply.status(err instanceof TenantIsolationError ? 403 : 400).send({
					error: err.name,
					message: err.message,
				});
			}
			throw err;
		}
	});
}
