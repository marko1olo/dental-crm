import { closeSync, openSync, readSync, statSync } from "node:fs";
import { open, readdir, stat, type FileHandle } from "node:fs/promises";
import path from "node:path";
import {
	dicomFirstFramePreviewResponseSchema,
	type DicomFirstFramePreviewResponse,
} from "@dental/shared";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { dicomArchiveExtensions, dicomPixelFileExtensions } from "../imagingConstants.js";

const logger = createApiLogger("dicomFileIoAndSafety");

export function isDicomArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	if (filePath.includes("::")) return false;
	return dicomArchiveExtensions.has(
		path.extname(filePath.split("::")[0] ?? filePath).toLowerCase(),
	);
}

export function isDicomArchiveVirtualEntryPath(filePath: string | null): boolean {
	if (!filePath?.includes("::")) return false;
	const archivePath = filePath.split("::")[0] ?? "";
	return dicomArchiveExtensions.has(path.extname(archivePath).toLowerCase());
}

export function isZipArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	return path.extname(filePath.split("::")[0] ?? filePath).toLowerCase() === ".zip";
}

export function isDicomLikeEntry(entryName: string): boolean {
	const normalized = entryName.replaceAll("\\", "/");
	const extension = path.extname(normalized).toLowerCase();
	return (
		dicomPixelFileExtensions.has(extension) ||
		/(?:^|\/)DICOMDIR$/i.test(normalized)
	);
}

export function isDicomPixelPath(filePath: string): boolean {
	const normalized = filePath.replaceAll("\\", "/");
	const extension = path
		.extname(normalized.split("::")[0] ?? normalized)
		.toLowerCase();
	return (
		dicomPixelFileExtensions.has(extension) ||
		/(?:^|\/)DICOMDIR$/i.test(normalized)
	);
}

export async function hasDicomMagicAsync(filePath: string): Promise<boolean> {
	let handle: FileHandle | null = null;
	try {
		const stats = await stat(filePath);
		if (
			!stats.isFile() ||
			stats.size < 132 ||
			stats.size > 2 * 1024 * 1024 * 1024
		) {
			return false;
		}
		const buffer = Buffer.alloc(132);
		handle = await open(filePath, "r");
		await handle.read(buffer, 0, 132, 0);
		return buffer.toString("latin1", 128, 132) === "DICM";
	} catch {
		return false;
	} finally {
		if (handle) {
			await handle.close().catch((err) => {
				logger.warn(
					{ err: safeLogError(err), filePath },
					"Failed to close DICOM file handle after magic check",
				);
			});
		}
	}
}

export function hasDicomMagic(filePath: string): boolean {
	try {
		const stats = statSync(filePath);
		if (
			!stats.isFile() ||
			stats.size < 132 ||
			stats.size > 2 * 1024 * 1024 * 1024
		) {
			return false;
		}
		const buffer = Buffer.alloc(132);
		const handle = openSync(filePath, "r");
		try {
			readSync(handle, buffer, 0, 132, 0);
			return buffer.toString("latin1", 128, 132) === "DICM";
		} finally {
			closeSync(handle);
		}
	} catch {
		return false;
	}
}

export function hasDicomPreamble(filePath: string): boolean {
	return hasDicomMagic(filePath);
}

export function isDicomHeaderCandidatePath(filePath: string): boolean {
	if (isDicomPixelPath(filePath) || isZipArchivePath(filePath)) return true;
	const extension = path.extname(filePath).toLowerCase();
	if (extension && extension.length > 1) return false;
	return hasDicomMagic(filePath);
}

export async function readFilePrefixAsync(
	filePath: string,
	maxBytes: number,
): Promise<Buffer> {
	let handle: FileHandle | null = null;
	try {
		const stats = await stat(filePath);
		const bytesToRead = Math.max(0, Math.min(stats.size, maxBytes));
		const buffer = Buffer.alloc(bytesToRead);
		handle = await open(filePath, "r");
		await handle.read(buffer, 0, bytesToRead, 0);
		return buffer;
	} finally {
		if (handle) {
			await handle.close().catch((err) => {
				logger.warn(
					{ err: safeLogError(err), filePath },
					"Failed to close DICOM file handle after prefix read",
				);
			});
		}
	}
}

export function readFilePrefix(filePath: string, maxBytes: number): Buffer {
	const stats = statSync(filePath);
	const bytesToRead = Math.max(0, Math.min(stats.size, maxBytes));
	const buffer = Buffer.alloc(bytesToRead);
	const handle = openSync(filePath, "r");
	try {
		readSync(handle, buffer, 0, bytesToRead, 0);
		return buffer;
	} finally {
		closeSync(handle);
	}
}

export function redactDicomPreviewText(value: string) {
	return value
		.replace(/[A-Za-z]:[\\/][^\r\n]*/g, "redacted-local-dicom-path")
		.replace(/\\\\[^\r\n]*/g, "redacted-local-dicom-path");
}

export function redactDicomPreviewWarnings(warnings: string[]) {
	return Array.from(
		new Set(
			warnings
				.map((warning) => redactDicomPreviewText(warning))
				.filter((warning) => warning.trim()),
		),
	);
}

export function emptyDicomFirstFramePreview(input: {
	folderPath: string;
	status: "unsupported" | "not_found";
	warnings: string[];
	nextAction: string;
	requestedFileIndex?: number | null;
	selectableFileCount?: number;
}): DicomFirstFramePreviewResponse {
	return dicomFirstFramePreviewResponseSchema.parse({
		version: "dental-crm-dicom-first-frame-preview-v1",
		generatedAt: new Date().toISOString(),
		folderPath: "redacted-local-dicom-folder",
		status: input.status,
		sourceFileName: null,
		sourceFileIndex: null,
		requestedFileIndex: input.requestedFileIndex ?? null,
		selectableFileCount: input.selectableFileCount ?? 0,
		transferSyntaxUid: null,
		photometricInterpretation: null,
		width: null,
		height: null,
		sourceWidth: null,
		sourceHeight: null,
		bitsAllocated: null,
		bitsStored: null,
		pixelRepresentation: null,
		windowCenter: null,
		windowWidth: null,
		imageDataUrl: null,
		warnings: redactDicomPreviewWarnings(input.warnings),
		nextAction: input.nextAction,
	});
}

export async function listDicomCandidateFiles(
	folderPath: string,
): Promise<Array<{ filePath: string; size: number }> | null> {
	let entries;
	try {
		entries = await readdir(folderPath, { withFileTypes: true });
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err), folderPath },
			"Failed to read DICOM series folder",
		);
		return null;
	}

	const dicomFiles: Array<{ filePath: string; size: number }> = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const ext = path.extname(entry.name).toLowerCase();
		const fullPath = path.join(folderPath, entry.name);
		if (
			ext === ".dcm" ||
			ext === ".dicom" ||
			ext === ".ima" ||
			hasDicomMagic(fullPath)
		) {
			try {
				const st = statSync(fullPath);
				dicomFiles.push({ filePath: fullPath, size: st.size });
			} catch (err) {
				logger.warn(
					{ err: safeLogError(err), filePath: fullPath },
					"Skipping unreadable DICOM slice candidate",
				);
			}
		}
	}
	return dicomFiles;
}
