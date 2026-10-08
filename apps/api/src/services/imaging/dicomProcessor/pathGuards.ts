/**
 * pathGuards.ts — Layer 1: Проверки файловых путей, сигнатур DICOM и контроль асинхронного сканирования.
 */

import {
	closeSync,
	openSync,
	readSync,
	statSync,
} from "node:fs";
import path from "node:path";
import { setImmediate as yieldImmediate } from "node:timers/promises";
import {
	type ApiDicomScanOptions,
	type ApiDicomScanYieldState,
	dicomArchiveExtensions,
	dicomPixelFileExtensions,
} from "./types.js";

export function createApiDicomScanYieldState(): ApiDicomScanYieldState {
	return {
		processedCount: 0,
		lastYieldAt: Date.now(),
	};
}

export async function maybeYieldApiDicomScan(
	yieldState: ApiDicomScanYieldState,
	options: ApiDicomScanOptions = {},
	stride = 32,
	maxIntervalMs = 25,
) {
	if (options.signal?.aborted) {
		throw options.signal.reason ?? new Error("DICOM scan aborted");
	}
	yieldState.processedCount += 1;
	const now = Date.now();
	if (
		yieldState.processedCount % stride === 0 ||
		now - yieldState.lastYieldAt >= maxIntervalMs
	) {
		yieldState.lastYieldAt = now;
		await yieldImmediate();
		if (options.signal?.aborted) {
			throw options.signal.reason ?? new Error("DICOM scan aborted");
		}
	}
}

export function isDicomArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	const cleanPath = filePath.split("::")[0] ?? filePath;
	return dicomArchiveExtensions.has(path.extname(cleanPath).toLowerCase());
}

export function isDicomArchiveVirtualEntryPath(
	filePath: string | null,
): boolean {
	if (!filePath?.includes("::")) return false;
	const archivePath = filePath.split("::")[0] ?? "";
	return dicomArchiveExtensions.has(path.extname(archivePath).toLowerCase());
}

export function isZipArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	return (
		path.extname(filePath.split("::")[0] ?? filePath).toLowerCase() === ".zip"
	);
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

export function hasDicomMagic(filePath: string): boolean {
	try {
		const stats = statSync(filePath);
		if (
			!stats.isFile() ||
			stats.size < 132 ||
			stats.size > 2 * 1024 * 1024 * 1024
		)
			return false;
		const buffer = Buffer.alloc(132);
		const handle = openSync(filePath, "r");
		try {
			readSync(handle, buffer, 0, 132, 0);
			return buffer.toString("latin1", 128, 132) === "DICM";
		} finally {
			closeSync(handle);
		}
	} catch (err) {
		console.error("[Dente] Failed to read DICOM header:", err);
		return false;
	}
}

export function isDicomHeaderCandidatePath(filePath: string): boolean {
	if (isDicomPixelPath(filePath) || isZipArchivePath(filePath)) return true;
	const extension = path.extname(filePath).toLowerCase();
	if (extension && extension.length > 1) return false;
	return hasDicomMagic(filePath);
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
