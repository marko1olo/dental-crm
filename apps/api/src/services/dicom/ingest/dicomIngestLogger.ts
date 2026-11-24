/**
 * dicomIngestLogger.ts — Структурированное логирование для DICOM/PACS подсистемы приема исследований.
 * Заменяет неструктурированные console.warn / console.error на JSON-логи.
 */

import { createApiLogger } from "../../../observability/logger.js";

const apiLogger = createApiLogger("dicom:ingest");

export interface DicomIngestStructuredLog {
	level: "info" | "warn" | "error";
	scope: "dicom-ingest" | "metadata-parser" | "cstore-scp";
	message: string;
	error?: unknown | undefined;
	details?: Record<string, unknown> | undefined;
	timestamp: string;
}

export const dicomIngestLogger = {
	info(message: string, details?: Record<string, unknown>): void {
		apiLogger.info({ scope: "dicom-ingest", ...(details ?? {}) }, message);
	},

	warn(message: string, error?: unknown, details?: Record<string, unknown>): void {
		const errData = error instanceof Error ? { message: error.message, stack: error.stack } : error;
		apiLogger.warn({ scope: "dicom-ingest", error: errData, ...(details ?? {}) }, message);
	},

	error(message: string, error?: unknown, details?: Record<string, unknown>): void {
		const errData = error instanceof Error ? { message: error.message, stack: error.stack } : error;
		apiLogger.error({ scope: "dicom-ingest", error: errData, ...(details ?? {}) }, message);
	},
};
