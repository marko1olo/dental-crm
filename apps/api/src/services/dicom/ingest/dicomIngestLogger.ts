/**
 * dicomIngestLogger.ts — Структурированное логирование для DICOM/PACS подсистемы приема исследований.
 * Заменяет неструктурированные console.warn / console.error на JSON-логи.
 */

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
		const entry: DicomIngestStructuredLog = {
			level: "info",
			scope: "dicom-ingest",
			message,
			details,
			timestamp: new Date().toISOString(),
		};
		process.stdout.write(`${JSON.stringify(entry)}\n`);
	},

	warn(message: string, error?: unknown, details?: Record<string, unknown>): void {
		const entry: DicomIngestStructuredLog = {
			level: "warn",
			scope: "dicom-ingest",
			message,
			error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
			details,
			timestamp: new Date().toISOString(),
		};
		process.stderr.write(`${JSON.stringify(entry)}\n`);
	},

	error(message: string, error?: unknown, details?: Record<string, unknown>): void {
		const entry: DicomIngestStructuredLog = {
			level: "error",
			scope: "dicom-ingest",
			message,
			error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
			details,
			timestamp: new Date().toISOString(),
		};
		process.stderr.write(`${JSON.stringify(entry)}\n`);
	},
};
