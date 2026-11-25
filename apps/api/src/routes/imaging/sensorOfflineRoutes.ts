import { openSync, readSync, closeSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ImagingStudyKind } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import { parseImagingPayload } from "./imagingHelpers.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { patients, xrayScans } from "../../db/schema.js";
import { withTenantCtx } from "../../db/rls.js";
import { createImagingStudyInDb } from "../../db/imagingQuery.js";
import { parseDicomHeader } from "./dicomParsing.js";
import type { DicomHeaderMetadata } from "./imagingConstants.js";
import {
	LocalPacsStorageService,
	InvalidMagicBytesError,
	PathTraversalError,
	TenantIsolationError,
} from "../../services/imaging/localPacsStorageService.js";
import { decodeServerHeicImage } from "../../services/imaging/serverHeicDecoder.js";

export function normalizeImagingStudyKind(raw: string | undefined): ImagingStudyKind {
	const val = (raw || "").toLowerCase().trim();
	if (val === "opg" || val === "optg" || val === "panoramic") return "opg";
	if (val === "periapical" || val === "rvg") return "periapical";
	if (val === "bitewing") return "bitewing";
	if (val === "ceph" || val === "cephalometric") return "ceph";
	if (val === "cbct" || val === "ct") return "cbct";
	if (val === "photo" || val === "photo_intraoral" || val === "photo_extraoral") return "photo";
	return "other";
}

const registerLocalStudyBodySchema = z
	.object({
		patientId: z.string().uuid("Идентификатор пациента должен быть валидным UUID"),
		visitId: z.string().uuid().optional().nullable(),
		doctorId: z.string().uuid().optional().nullable(),
		kind: z
			.enum([
				"ct",
				"cbct",
				"optg",
				"opg",
				"rvg",
				"periapical",
				"bitewing",
				"panoramic",
				"cephalometric",
				"photo_intraoral",
				"photo_extraoral",
				"other",
			])
			.default("cbct"),
		title: z.string().trim().min(1, "Название снимка обязательно").max(200).optional(),
		toothCode: z.string().trim().max(50).optional().nullable(),
		region: z.string().trim().max(100).optional().nullable(),
		localFilePath: z.string().trim().min(1, "Путь к локальному файлу снимка обязателен"),
		fileSizeBytes: z.number().int().nonnegative().optional(),
		dicomStudyUid: z.string().trim().max(128).optional().nullable(),
		dicomSeriesUid: z.string().trim().max(128).optional().nullable(),
		dicomSopInstanceUid: z.string().trim().max(128).optional().nullable(),
		localThumbnailDataUri: z.string().trim().optional().nullable(),
		clientMutationId: z.string().min(1).max(128).optional(),
	})
	.strict();

export async function registerSensorOfflineRoutes(app: FastifyInstance) {
	app.post("/api/imaging/local-offline/register", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "register local radiology scan"))) {
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

		const parseResult = registerLocalStudyBodySchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parseResult.error.issues[0]?.message || "Ошибка валидации параметров снимка",
				issues: parseResult.error.issues,
			});
		}
		const data = parseResult.data;

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
				message: "Пациент не найден в организации клиники",
			});
		}

		// Security: Validate file path within tenant storage jail or sanitized local workstation scan path
		try {
			LocalPacsStorageService.validateAndResolveLocalFilePath(organizationId, data.localFilePath);
		} catch (err) {
			if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
				return reply.status(403).send({
					error: "ImagingStorageAccessDenied",
					message: err.message,
				});
			}
			return reply.status(400).send({
				error: "InvalidPath",
				message: err instanceof Error ? err.message : "Недопустимый путь к файлу снимка",
			});
		}

		const result = await LocalPacsStorageService.registerLocalRadiologyScan({
			organizationId,
			patientId: data.patientId,
			visitId: data.visitId,
			doctorId: data.doctorId || undefined,
			kind: normalizeImagingStudyKind(data.kind),
			title: data.title || `Снимок ${data.kind.toUpperCase()}`,
			toothCode: data.toothCode,
			region: data.region,
			localFilePath: data.localFilePath,
			fileSizeBytes: data.fileSizeBytes,
			dicomStudyUid: data.dicomStudyUid || undefined,
			dicomSeriesUid: data.dicomSeriesUid || undefined,
			dicomSopInstanceUid: data.dicomSopInstanceUid || undefined,
			localThumbnailDataUri: data.localThumbnailDataUri || undefined,
		});

		return reply.status(201).send({
			success: true,
			...result,
		});
	});

	/**
	 * POST /api/imaging/upload
	 * Streams upload of radiology scans, RVG, CBCT, OPG, HEIC, PNG, JPEG with on-the-fly magic bytes verification
	 * and zero memory leaks for multi-gigabyte scans.
	 */
	app.post(
		"/api/imaging/upload",
		{
			bodyLimit: Number(process.env.DICOM_BODY_LIMIT_BYTES ?? 2 * 1024 * 1024 * 1024),
			config: { tenantTxSelfManaged: true },
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "upload radiology scan"))) {
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

			let fileStream: NodeJS.ReadableStream | null = null;
			let filename = "scan.dcm";
			let patientId = "";
			let kind: ImagingStudyKind = "cbct";
			let title = "";
			let toothCode: string | undefined;
			let region: string | undefined;
			let visitId: string | undefined;

			// Handle multipart or raw stream
			type MultipartRequestCandidate = FastifyRequest & {
				isMultipart?: () => boolean;
				file?: () => Promise<{
					file: NodeJS.ReadableStream;
					filename: string;
					fields?: Record<string, { value?: unknown }>;
				} | undefined>;
			};
			const reqMulti = request as MultipartRequestCandidate;
			const isMulti = typeof reqMulti.isMultipart === "function" && reqMulti.isMultipart();
			if (isMulti && typeof reqMulti.file === "function") {
				const part = await reqMulti.file();
				if (!part) {
					return reply.status(400).send({
						error: "MissingFilePayload",
						message: "Файл снимка не получен в запросе.",
					});
				}
				fileStream = part.file;
				filename = part.filename;
				const fields = (part.fields || {}) as Record<string, { value?: unknown }>;
				patientId = String(fields.patientId?.value || "");
				kind = normalizeImagingStudyKind(fields.kind?.value ? String(fields.kind.value) : "cbct");
				title = String(fields.title?.value || "");
				toothCode = fields.toothCode?.value ? String(fields.toothCode.value) : undefined;
				region = fields.region?.value ? String(fields.region.value) : undefined;
				visitId = fields.visitId?.value ? String(fields.visitId.value) : undefined;
			} else {
				const query = (request.query || {}) as Record<string, string>;
				patientId = query.patientId || (request.headers["x-patient-id"] as string) || "";
				kind = normalizeImagingStudyKind(query.kind || (request.headers["x-study-kind"] as string) || "cbct");
				title = query.title || (request.headers["x-study-title"] as string) || "";
				toothCode = query.toothCode || undefined;
				region = query.region || undefined;
				visitId = query.visitId || undefined;
				filename = query.filename || (request.headers["x-file-name"] as string) || "scan.dcm";
				if (Buffer.isBuffer(request.body)) {
					const { Readable } = await import("node:stream");
					fileStream = Readable.from(request.body);
				} else if (
					request.body !== null &&
					typeof request.body === "object" &&
					"pipe" in request.body &&
					typeof (request.body as { pipe: unknown }).pipe === "function"
				) {
					fileStream = request.body as NodeJS.ReadableStream;
				} else {
					fileStream = request.raw;
				}
			}

			if (!patientId || !isValidUuid(patientId)) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Необходимо указать валидный UUID patientId для загрузки снимка.",
				});
			}
			if (visitId && !isValidUuid(visitId)) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный UUID visitId.",
				});
			}

			// Validate patient ownership inside tenant context
			const [patient] = await withTenantCtx(organizationId, async (tx) =>
				tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
					.limit(1),
			);
			if (!patient) {
				return reply.status(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в организации клиники.",
				});
			}

			if (!fileStream) {
				return reply.status(400).send({
					error: "MissingFilePayload",
					message: "Поток файла снимка не передан.",
				});
			}

			let storedStoragePath: string | null = null;
			try {
				const stored = await LocalPacsStorageService.storeTenantFileStream(
					organizationId,
					filename,
					fileStream,
					{ maxSizeBytes: 2 * 1024 * 1024 * 1024 }, // 2 GB limit per scan
				);
				storedStoragePath = stored.storagePath;

				let dicomMetadata: DicomHeaderMetadata | null = null;
				let localThumbnailDataUri: string | null = null;

				// If DICOM, parse header safe
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
						request.log.warn({ err: hdrErr, fileName: filename }, "Non-fatal DICOM header probe error on upload");
					}
				} else if (stored.detectedFormat === "heic") {
					try {
						const fileBuf = await readFile(stored.storagePath);
						const decoded = await decodeServerHeicImage(fileBuf, {
							thumbnailSize: 200,
							generateThumbnail: true,
						});
						if (decoded.success && decoded.thumbnailBuffer) {
							localThumbnailDataUri = `data:image/webp;base64,${decoded.thumbnailBuffer.toString("base64")}`;
						}
					} catch (heicErr) {
						request.log.warn({ err: heicErr, fileName: filename }, "Non-fatal HEIC thumbnail decode error on upload");
					}
				}

				const studyTitle = title.trim() || `Снимок ${kind.toUpperCase()}`;
				const study = await withTenantCtx(organizationId, async (tx) => {
					const createdStudy = await createImagingStudyInDb(
						organizationId,
						{
							patientId,
							visitId: visitId || null,
							kind,
							title: studyTitle,
							toothCode: toothCode || null,
							region: region || null,
							sourceKind: "dicom_file",
							sourceName: filename,
							storagePath: stored.relativePath,
							dicomStudyUid: dicomMetadata?.studyInstanceUid ?? undefined,
							dicomSeriesUid: dicomMetadata?.seriesInstanceUid ?? undefined,
							dicomSopInstanceUid: dicomMetadata?.sopInstanceUid ?? undefined,
							aiSummary: localThumbnailDataUri ? "Снимок загружен. Сформировано превью." : null,
						},
						tx,
					);

					if (kind !== "cbct") {
						const xrayKind =
							kind === "bitewing"
								? "bitewing"
								: kind === "opg"
									? "opg"
									: kind === "periapical"
										? "periapical"
										: "other";

						await tx
							.insert(xrayScans)
							.values({
								id: createdStudy.id,
								organizationId,
								patientId,
								visitId: visitId || null,
								storagePath: stored.relativePath,
								fileUrl: `/api/imaging/studies/${createdStudy.id}/file`,
								originalFilename: filename,
								fileSizeBytes: stored.fileSizeBytes,
								sha256: stored.sha256,
								mimeType:
									stored.detectedFormat === "png"
										? "image/png"
										: stored.detectedFormat === "jpeg"
											? "image/jpeg"
											: "application/dicom",
								kind: xrayKind,
								toothCode: toothCode || null,
								notes: studyTitle,
								status: "done",
								capturedAt: new Date(),
							})
							.onConflictDoNothing();
					}

					return createdStudy;
				});

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
				});
			} catch (err) {
				if (storedStoragePath) {
					await unlink(storedStoragePath).catch((unlinkErr) => {
						request.log.warn({ err: unlinkErr, storedStoragePath }, "Failed to unlink orphan scan upload");
					});
				}
				if (err instanceof InvalidMagicBytesError) {
					return reply.status(400).send({
						error: "InvalidMagicBytes",
						message: err.message,
					});
				}
				if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
					return reply.status(403).send({
						error: "ImagingStorageAccessDenied",
						message: err.message,
					});
				}
				request.log.error({ err }, "Error during imaging upload");
				return reply.status(500).send({
					error: "UploadFailed",
					message: "Ошибка при сохранении снимка.",
				});
			}
		},
	);

	/**
	 * GET /api/imaging/local-offline/studies/:studyId
	 * Retrieves local radiology study state for doctor consultation.
	 */
	app.get<{ Params: { studyId: string } }>(
		"/api/imaging/local-offline/studies/:studyId",
		async (request, reply) => {
			if (!(await requireClinicalReadAccess(request, reply, "get local radiology study"))) {
				return;
			}
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			const { studyId } = request.params;
			if (!isValidUuid(studyId)) {
				return reply.status(400).send({
					error: "InvalidStudyId",
					message: "Некорректный UUID снимка.",
				});
			}
			const study = await LocalPacsStorageService.getLocalStudyForConsultation(organizationId, studyId);

			if (!study) {
				return reply.status(404).send({
					error: "ImagingStudyNotFound",
					message: "Локальный снимок не найден в базе данных клиники",
				});
			}

			return reply.status(200).send({
				success: true,
				study,
			});
		},
	);

	/**
	 * POST /api/imaging/local-offline/sync-queue
	 * Queues background asynchronous cloud sync for large CBCT scans without blocking consultation.
	 */

	const syncQueueBodySchema = z
		.object({
			studyId: z.string().uuid("Некорректный UUID снимка"),
		})
		.strict();

	app.post("/api/imaging/local-offline/sync-queue", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "queue local study sync"))) {
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

		const parsedBody = syncQueueBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsedBody.error.issues[0]?.message || "Необходимо указать корректный UUID studyId",
			});
		}
		const { studyId } = parsedBody.data;

		const result = await LocalPacsStorageService.queueCloudSync(studyId, organizationId);

		return reply.status(200).send(result);
	});

	/**
	 * GET /api/imaging/local-offline/sync-status
	 * Returns queue of local studies and their cloud sync status.
	 */

	app.get("/api/imaging/local-offline/sync-status", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "get local sync status"))) {
			return;
		}
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;

		const pending = await LocalPacsStorageService.listPendingSyncs(organizationId);

		return reply.status(200).send({
			success: true,
			organizationId,
			items: pending,
			total: pending.length,
		});
	});
}
