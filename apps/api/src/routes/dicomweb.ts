import { createReadStream } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";
import dicomParser from "dicom-parser";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import * as schema from "../db/schema.js";
import { requireOrganizationId } from "../security/identity.js";

/** DICOM Standard Data Dictionary Tags */
const TAG_SOP_INSTANCE_UID = "x00080018";
const TAG_STUDY_INSTANCE_UID = "x0020000d";
const TAG_SERIES_INSTANCE_UID = "x0020000e";
const TAG_NUMBER_OF_FRAMES = "x00280008";
const TAG_ROWS = "x00280010";
const TAG_COLUMNS = "x00280011";
const TAG_BITS_ALLOCATED = "x00280100";
const TAG_SAMPLES_PER_PIXEL = "x00280002";
const TAG_PIXEL_DATA = "x7fe00010";

/** Header inspection probe size (1 MB reads metadata up to series/instance tags) */
const DICOM_HEADER_PROBE_BYTES = 1024 * 1024;

const SAMPLE_DICOM_PATH_ENV = "DENTE_DICOM_SAMPLE_PATH";
const SAMPLE_DICOM_ORGANIZATION_ID_ENV = "DENTE_DICOM_SAMPLE_ORGANIZATION_ID";

const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface DicomFileIdentity {
	studyUid: string | null;
	seriesUid: string | null;
	sopInstanceUid: string | null;
	numberOfFrames: number;
	rows: number | null;
	columns: number | null;
	bitsAllocated: number | null;
	samplesPerPixel: number | null;
	pixelDataOffset: number | null;
	pixelDataLength: number | null;
}

export interface RangeSpecification {
	start: number;
	end: number;
	chunkSize: number;
	totalSize: number;
	isPartial: boolean;
}

/**
 * Normalizes DICOM UIDs by stripping trailing NULs and whitespace.
 */
export function normalizeUid(value: string | null | undefined): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.replace(/\0+$/u, "").trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * RFC 7233 / RFC 9110 compliant HTTP Range header parser.
 */
export function parseHttpRange(
	rangeHeader: string | undefined,
	totalSize: number,
): RangeSpecification | { invalid: true } {
	if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
		return {
			start: 0,
			end: totalSize - 1,
			chunkSize: totalSize,
			totalSize,
			isPartial: false,
		};
	}

	const rawRange = rangeHeader.replace(/^bytes=/u, "").trim();
	const parts = rawRange.split("-");
	if (parts.length !== 2) return { invalid: true };

	const rawStart = parts[0]?.trim();
	const rawEnd = parts[1]?.trim();

	let start: number;
	let end: number;

	if (rawStart && rawEnd) {
		start = Number.parseInt(rawStart, 10);
		end = Number.parseInt(rawEnd, 10);
	} else if (rawStart && !rawEnd) {
		start = Number.parseInt(rawStart, 10);
		end = totalSize - 1;
	} else if (!rawStart && rawEnd) {
		const suffixLength = Number.parseInt(rawEnd, 10);
		if (Number.isNaN(suffixLength) || suffixLength <= 0)
			return { invalid: true };
		start = Math.max(0, totalSize - suffixLength);
		end = totalSize - 1;
	} else {
		return { invalid: true };
	}

	if (
		Number.isNaN(start) ||
		Number.isNaN(end) ||
		start < 0 ||
		end >= totalSize ||
		start > end
	) {
		return { invalid: true };
	}

	return {
		start,
		end,
		chunkSize: end - start + 1,
		totalSize,
		isPartial: true,
	};
}

/**
 * Reads DICOM identification & geometry tags from file header.
 */
export async function readDicomIdentity(
	filePath: string,
): Promise<DicomFileIdentity | null> {
	let handle: FileHandle | null = null;
	try {
		handle = await fs.open(filePath, "r");
		const stat = await handle.stat();
		if (!stat.isFile() || stat.size === 0) return null;
		const length = Math.min(stat.size, DICOM_HEADER_PROBE_BYTES);
		const buffer = Buffer.alloc(length);
		const { bytesRead } = await handle.read(buffer, 0, length, 0);
		const dataSet = dicomParser.parseDicom(
			new Uint8Array(buffer.subarray(0, bytesRead)),
		);

		const numFramesStr = dataSet.string(TAG_NUMBER_OF_FRAMES);
		const numFrames = numFramesStr ? Number.parseInt(numFramesStr, 10) : 1;
		const pixelElement = dataSet.elements[TAG_PIXEL_DATA];

		return {
			studyUid: normalizeUid(dataSet.string(TAG_STUDY_INSTANCE_UID)),
			seriesUid: normalizeUid(dataSet.string(TAG_SERIES_INSTANCE_UID)),
			sopInstanceUid: normalizeUid(dataSet.string(TAG_SOP_INSTANCE_UID)),
			numberOfFrames:
				Number.isFinite(numFrames) && numFrames > 0 ? numFrames : 1,
			rows: dataSet.uint16(TAG_ROWS) ?? null,
			columns: dataSet.uint16(TAG_COLUMNS) ?? null,
			bitsAllocated: dataSet.uint16(TAG_BITS_ALLOCATED) ?? null,
			samplesPerPixel: dataSet.uint16(TAG_SAMPLES_PER_PIXEL) ?? null,
			pixelDataOffset: pixelElement ? pixelElement.dataOffset : null,
			pixelDataLength: pixelElement ? pixelElement.length : null,
		};
	} catch (err) {
		console.error("[Dente] readDicomIdentity failed:", err);
		return null;
	} finally {
		if (handle) {
			await handle.close().catch(() => undefined);
		}
	}
}

async function fileCarriesRequestedUids(
	filePath: string,
	studyUid: string,
	seriesUid: string,
	instanceUid: string,
): Promise<boolean> {
	const identity = await readDicomIdentity(filePath);
	if (!identity) return false;
	return (
		identity.studyUid === studyUid &&
		identity.seriesUid === seriesUid &&
		identity.sopInstanceUid === instanceUid
	);
}

function sampleDicomPath(): string {
	const configured = process.env[SAMPLE_DICOM_PATH_ENV]?.trim();
	if (configured) return path.resolve(configured);
	return path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
}

function sampleDicomOwnerOrganizationId(): string | null {
	const configured = process.env[SAMPLE_DICOM_ORGANIZATION_ID_ENV]?.trim();
	if (!configured || !UUID_SHAPE.test(configured)) return null;
	return configured;
}

async function organizationExists(organizationId: string): Promise<boolean> {
	if (!UUID_SHAPE.test(organizationId)) return false;
	const [row] = await db
		.select({ id: schema.organizations.id })
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	return typeof row?.id === "string";
}

async function resolveInstanceFilePath(
	organizationId: string,
	studyUid: string,
	seriesUid: string,
	instanceUid: string,
): Promise<string | null> {
	const [instanceRow] = await db
		.select({ storagePath: schema.imagingInstances.storagePath })
		.from(schema.imagingInstances)
		.innerJoin(
			schema.imagingSeries,
			eq(schema.imagingSeries.id, schema.imagingInstances.seriesId),
		)
		.innerJoin(
			schema.imagingStudies,
			eq(schema.imagingStudies.id, schema.imagingSeries.studyId),
		)
		.where(
			and(
				eq(schema.imagingInstances.organizationId, organizationId),
				eq(schema.imagingSeries.organizationId, organizationId),
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.dicomStudyUid, studyUid),
				eq(schema.imagingSeries.dicomSeriesUid, seriesUid),
				eq(schema.imagingInstances.dicomSopInstanceUid, instanceUid),
			),
		)
		.limit(1);

	if (instanceRow?.storagePath) return path.resolve(instanceRow.storagePath);

	const [studyRow] = await db
		.select({ storagePath: schema.imagingStudies.storagePath })
		.from(schema.imagingStudies)
		.where(
			and(
				eq(schema.imagingStudies.organizationId, organizationId),
				eq(schema.imagingStudies.dicomStudyUid, studyUid),
				isNotNull(schema.imagingStudies.storagePath),
			),
		)
		.limit(1);

	if (studyRow?.storagePath) {
		const studyFilePath = path.resolve(studyRow.storagePath);
		if (
			await fileCarriesRequestedUids(
				studyFilePath,
				studyUid,
				seriesUid,
				instanceUid,
			)
		) {
			return studyFilePath;
		}
	}

	const sampleOwnerOrgId = sampleDicomOwnerOrganizationId();
	if (sampleOwnerOrgId !== null && sampleOwnerOrgId === organizationId) {
		const samplePath = sampleDicomPath();
		if (
			await fileCarriesRequestedUids(
				samplePath,
				studyUid,
				seriesUid,
				instanceUid,
			)
		) {
			return samplePath;
		}
	}

	return null;
}

/**
 * Streams binary payload with RFC 7233 Range and Content-Range support.
 */
async function streamDicomFileResponse(
	request: FastifyRequest,
	reply: FastifyReply,
	filePath: string,
	contentType = "application/dicom",
) {
	let size: number;
	try {
		const stat = await fs.stat(filePath);
		if (!stat.isFile()) throw new Error("not a regular file");
		size = stat.size;
	} catch (statError) {
		request.log.error(
			{ err: statError, filePath },
			"[dicomweb] File stat error",
		);
		return reply.code(404).send({
			error: "DicomInstanceFileUnreadable",
			message: "Файл снимка не читается с диска.",
		});
	}

	const rangeHeader = request.headers.range;
	const range = parseHttpRange(rangeHeader, size);

	if ("invalid" in range) {
		reply.header("Content-Range", `bytes */${size}`);
		return reply.code(416).send({
			error: "RangeNotSatisfiable",
			message:
				"Запрошенный диапазон байт выходит за пределы файла снимка.",
		});
	}

	reply.header("Accept-Ranges", "bytes");
	reply.header("Content-Type", contentType);

	if (range.isPartial) {
		reply.code(206);
		reply.header(
			"Content-Range",
			`bytes ${range.start}-${range.end}/${size}`,
		);
		reply.header("Content-Length", range.chunkSize);
		return reply.send(
			createReadStream(filePath, { start: range.start, end: range.end }),
		);
	}

	reply.code(200);
	reply.header("Content-Length", size);
	return reply.send(createReadStream(filePath));
}

export async function registerDicomwebRoutes(app: FastifyInstance) {
	/**
	 * QIDO-RS: Search for Studies (DICOM PS3.18 Section 8.3)
	 * GET /api/dicomweb/studies
	 */
	app.get<{
		Querystring: {
			StudyInstanceUID?: string;
			PatientID?: string;
			PatientName?: string;
			limit?: string | number;
			offset?: string | number;
		};
	}>(
		"/api/dicomweb/studies",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom qido studies",
				))
			)
				return;
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			if (!UUID_SHAPE.test(organizationId)) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			const queryStudyUid = normalizeUid(request.query.StudyInstanceUID);
			const queryPatientId = request.query.PatientID?.trim();
			const limit = Math.min(
				Math.max(1, Number(request.query.limit) || 25),
				100,
			);
			const offset = Math.max(0, Number(request.query.offset) || 0);

			const results = await withTenantCtx(organizationId, async () => {
				const orgKnown = await organizationExists(organizationId);
				if (!orgKnown) return null;

				const conditions = [
					eq(schema.imagingStudies.organizationId, organizationId),
					isNotNull(schema.imagingStudies.dicomStudyUid),
				];

				if (queryStudyUid) {
					conditions.push(
						eq(schema.imagingStudies.dicomStudyUid, queryStudyUid),
					);
				}
				if (queryPatientId && UUID_SHAPE.test(queryPatientId)) {
					conditions.push(
						eq(schema.imagingStudies.patientId, queryPatientId),
					);
				}

				return db
					.select({
						studyId: schema.imagingStudies.id,
						dicomStudyUid: schema.imagingStudies.dicomStudyUid,
						patientId: schema.imagingStudies.patientId,
						capturedAt: schema.imagingStudies.capturedAt,
						title: schema.imagingStudies.title,
						kind: schema.imagingStudies.kind,
					})
					.from(schema.imagingStudies)
					.where(and(...conditions))
					.orderBy(desc(schema.imagingStudies.capturedAt))
					.limit(limit)
					.offset(offset);
			});

			if (results === null) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			// Format into standard DICOM JSON Model (PS3.18 F.1)
			const dicomJson = results.map((row) => {
				const dateObj = new Date(row.capturedAt);
				const studyDate = dateObj
					.toISOString()
					.slice(0, 10)
					.replace(/-/g, "");
				const studyTime = dateObj
					.toISOString()
					.slice(11, 19)
					.replace(/:/g, "");
				return {
					"0020000D": { vr: "UI", Value: [row.dicomStudyUid] },
					"00100020": { vr: "LO", Value: [row.patientId] },
					"00080020": { vr: "DA", Value: [studyDate] },
					"00080030": { vr: "TM", Value: [studyTime] },
					"00080060": {
						vr: "CS",
						Value: [row.kind?.toUpperCase() ?? "OT"],
					},
					"00081030": { vr: "LO", Value: [row.title] },
				};
			});

			reply.header("Content-Type", "application/dicom+json");
			return reply.code(200).send(dicomJson);
		},
	);

	/**
	 * WADO-RS: Retrieve Instance (DICOM PS3.18 Section 9.5)
	 * GET /api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid
	 */
	app.get<{
		Params: { studyUid: string; seriesUid: string; instanceUid: string };
	}>(
		"/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom instance read",
				))
			)
				return;
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			const studyUid = normalizeUid(request.params.studyUid);
			const seriesUid = normalizeUid(request.params.seriesUid);
			const instanceUid = normalizeUid(request.params.instanceUid);

			if (!UUID_SHAPE.test(organizationId)) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message:
						"Снимок не выдан: организация из токена не существует.",
				});
			}

			const resolution = await withTenantCtx(organizationId, async () => {
				let organizationKnown: boolean;
				try {
					organizationKnown =
						await organizationExists(organizationId);
				} catch (lookupError) {
					return {
						organizationCheckFailed: true as const,
						lookupError,
						organizationKnown: false,
						filePath: null,
					};
				}
				if (
					!organizationKnown ||
					!studyUid ||
					!seriesUid ||
					!instanceUid
				) {
					return {
						organizationCheckFailed: false as const,
						lookupError: null,
						organizationKnown,
						filePath: null,
					};
				}
				return {
					organizationCheckFailed: false as const,
					lookupError: null,
					organizationKnown,
					filePath: await resolveInstanceFilePath(
						organizationId,
						studyUid,
						seriesUid,
						instanceUid,
					),
				};
			});

			if (resolution.organizationCheckFailed) {
				return reply.code(503).send({
					error: "OrganizationCheckUnavailable",
					message:
						"Снимок не выдан: не удалось проверить организацию запроса.",
				});
			}
			if (!resolution.organizationKnown) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message:
						"Снимок не выдан: организация из токена не существует.",
				});
			}

			if (!studyUid || !seriesUid || !instanceUid) {
				return reply.code(400).send({
					error: "DicomInstanceUidMissing",
					message:
						"В адресе должны быть указаны UID исследования, серии и объекта.",
				});
			}

			const filePath = resolution.filePath;
			if (!filePath) {
				return reply.code(404).send({
					error: "DicomInstanceNotFound",
					message: "Снимок с таким UID в этой клинике не найден.",
					studyUid,
					seriesUid,
					instanceUid,
				});
			}

			return streamDicomFileResponse(
				request,
				reply,
				filePath,
				"application/dicom",
			);
		},
	);

	/**
	 * WADO-RS: Retrieve Frames (DICOM PS3.18 Section 9.5 Frame Pixel Data)
	 * GET /api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame
	 */
	app.get<{
		Params: {
			studyUid: string;
			seriesUid: string;
			instanceUid: string;
			frame: string;
		};
	}>(
		"/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"dicom frame read",
				))
			)
				return;
			const organizationId = requireOrganizationId(request, reply);
			if (!organizationId) return;

			const studyUid = normalizeUid(request.params.studyUid);
			const seriesUid = normalizeUid(request.params.seriesUid);
			const instanceUid = normalizeUid(request.params.instanceUid);
			const frameNumber = Number.parseInt(request.params.frame, 10);

			if (!UUID_SHAPE.test(organizationId)) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			if (Number.isNaN(frameNumber) || frameNumber < 1) {
				return reply.code(400).send({
					error: "InvalidFrameNumber",
					message:
						"Номер кадра должен быть положительным целым числом (1-indexed).",
				});
			}

			const resolution = await withTenantCtx(organizationId, async () => {
				const orgKnown = await organizationExists(organizationId);
				if (!orgKnown || !studyUid || !seriesUid || !instanceUid) {
					return { orgKnown, filePath: null };
				}
				return {
					orgKnown: true,
					filePath: await resolveInstanceFilePath(
						organizationId,
						studyUid,
						seriesUid,
						instanceUid,
					),
				};
			});

			if (!resolution.orgKnown) {
				return reply.code(403).send({
					error: "OrganizationUnknown",
					message: "Организация из токена не существует.",
				});
			}

			const filePath = resolution.filePath;
			if (!filePath) {
				return reply.code(404).send({
					error: "DicomInstanceNotFound",
					message: "Снимок с таким UID в этой клинике не найден.",
				});
			}

			const identity = await readDicomIdentity(filePath);
			if (!identity) {
				return reply.code(404).send({
					error: "DicomInstanceFileUnreadable",
					message: "Не удалось разобрать структуру DICOM-файла.",
				});
			}

			if (frameNumber > identity.numberOfFrames) {
				return reply.code(404).send({
					error: "FrameNotFound",
					message: `Запрошенный кадр ${frameNumber} превышает число кадров в объекте (${identity.numberOfFrames}).`,
				});
			}

			const frameIndex = frameNumber - 1;
			const rows = identity.rows ?? 512;
			const columns = identity.columns ?? 512;
			const bitsAllocated = identity.bitsAllocated ?? 16;
			const bytesPerSample = Math.ceil(bitsAllocated / 8);
			const samplesPerPixel = identity.samplesPerPixel ?? 1;
			const frameSizeBytes =
				rows * columns * bytesPerSample * samplesPerPixel;

			if (identity.pixelDataOffset !== null && frameSizeBytes > 0) {
				const frameStart =
					identity.pixelDataOffset + frameIndex * frameSizeBytes;
				const frameEnd = frameStart + frameSizeBytes - 1;

				reply.code(200);
				reply.header("Content-Type", "application/octet-stream");
				reply.header("Content-Length", frameSizeBytes);
				return reply.send(
					createReadStream(filePath, { start: frameStart, end: frameEnd }),
				);
			}

			return streamDicomFileResponse(
				request,
				reply,
				filePath,
				"application/octet-stream",
			);
		},
	);
}
