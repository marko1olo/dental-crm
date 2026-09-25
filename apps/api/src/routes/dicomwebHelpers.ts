import { createReadStream } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import path from "node:path";
import dicomParser from "dicom-parser";
import { and, eq, isNotNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";

/** DICOM Standard Data Dictionary Tags */
export const TAG_SOP_INSTANCE_UID = "x00080018";
export const TAG_STUDY_INSTANCE_UID = "x0020000d";
export const TAG_SERIES_INSTANCE_UID = "x0020000e";
export const TAG_NUMBER_OF_FRAMES = "x00280008";
export const TAG_ROWS = "x00280010";
export const TAG_COLUMNS = "x00280011";
export const TAG_BITS_ALLOCATED = "x00280100";
export const TAG_SAMPLES_PER_PIXEL = "x00280002";
export const TAG_PIXEL_DATA = "x7fe00010";

/** Header inspection probe size (1 MB reads metadata up to series/instance tags) */
export const DICOM_HEADER_PROBE_BYTES = 1024 * 1024;

export const SAMPLE_DICOM_PATH_ENV = "DENTE_DICOM_SAMPLE_PATH";
export const SAMPLE_DICOM_ORGANIZATION_ID_ENV = "DENTE_DICOM_SAMPLE_ORGANIZATION_ID";

export const UUID_SHAPE =
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

export async function fileCarriesRequestedUids(
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

export function sampleDicomPath(): string {
	const configured = process.env[SAMPLE_DICOM_PATH_ENV]?.trim();
	if (configured) return path.resolve(configured);
	return path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
}

export function sampleDicomOwnerOrganizationId(): string | null {
	const configured = process.env[SAMPLE_DICOM_ORGANIZATION_ID_ENV]?.trim();
	if (!configured || !UUID_SHAPE.test(configured)) return null;
	return configured;
}

export async function organizationExists(organizationId: string): Promise<boolean> {
	if (!UUID_SHAPE.test(organizationId)) return false;
	const [row] = await db
		.select({ id: schema.organizations.id })
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	return typeof row?.id === "string";
}

export async function resolveInstanceFilePath(
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
export async function streamDicomFileResponse(
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
