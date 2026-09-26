/**
 * apps/web/src/components/settings/migration/migrationTypes.ts
 *
 * Типы данных и служебные функции мастера переноса базы данных.
 * Mandate 8b: Строго <= 800 строк.
 */

export interface ApiError {
	error: { code: string; message: string; details: Record<string, unknown> };
}

export interface UploadResponse {
	runId: string;
	sourceName: string;
	fileName: string;
	byteSize: number;
	source: {
		kind: string;
		detectedEncoding: string;
		encodingConfidence: number;
		delimiter: string | null;
		columns: string[];
		streamable: boolean;
		warnings: string[];
	};
	previousRunWithSameFile: { runId: string; uploadedAt: string } | null;
}

export interface ColumnMapping {
	sourceColumn: string;
	targetField: string;
	decidedBy: "vendor_profile" | "deterministic" | "llm" | "manual" | "inferred";
	confidence: number;
	rationale: string;
	sampleValues: string[];
}

export interface MapResponse {
	runId: string;
	mapping: {
		vendorProfile: string | null;
		sourceTable: string;
		entityKind: string;
		columns: ColumnMapping[];
		unmappedColumns: string[];
		warnings: string[];
	};
	profile: {
		sourceKind: string;
		detectedEncoding: string;
		encodingConfidence: number;
		columns: string[];
		rowCount: number;
		sampleRows: Array<Record<string, string>>;
	};
	projectedReady: number;
	projectedQuarantine: number;
	qualityFindings: Array<{
		severity: "info" | "warning" | "blocker";
		message: string;
		affectedRows: number;
	}>;
	llm: { calls: number; rejectedSuggestions: number };
}

export interface RunStatus {
	run: {
		runId: string;
		sourceName: string;
		status: string;
		phase: string | null;
		dryRun: boolean;
		detectedEncoding: string | null;
		progress: { total: number; done: number; percent: number };
		counters: {
			sourceRows: number;
			stagedRows: number;
			loadedRows: number;
			updatedRows: number;
			duplicateRows: number;
			quarantinedRows: number;
			skippedRows: number;
		};
		worker: { id: string | null; resumeCount: number };
		errorMessage: string | null;
	};
	staging: {
		total: number;
		ready: number;
		loaded: number;
		quarantined: number;
	};
}

export interface ReconciliationResponse {
	balanced: boolean;
	checks: Array<{
		code: string;
		title: string;
		expected: number;
		actual: number;
		passed: boolean;
		detail: string;
	}>;
	entityBreakdown: Array<{
		entityKind: string;
		sourceRows: number;
		created: number;
		updated: number;
		duplicates: number;
		quarantined: number;
		skipped: number;
	}>;
	money: {
		sourceTotalRub: number | null;
		loadedTotalRub: number | null;
		quarantinedTotalRub: number | null;
	};
	quarantinePreview: Array<{
		id: string;
		reason: string;
		blocking: boolean;
		fieldPath: string | null;
		message: string;
		suggestedFix: string | null;
		sourceRowNumber: number | null;
	}>;
}

export interface DiscoveryResponse {
	summary: { readable: number; needsExport: number };
	readySources: Array<{
		filePath: string;
		fileName: string;
		byteSize: number;
		format: string;
		version: string | null;
		details: string[];
	}>;
	needsExportSources: Array<{
		filePath: string;
		fileName: string;
		format: string;
		version: string | null;
		guidance: string | null;
	}>;
	imagingFolders: Array<{ directory: string; fileCount: number }>;
	scan: { filesScanned: number; elapsedMs: number; truncated: boolean };
	warnings: string[];
}

export type WizardStep = "source" | "mapping" | "running" | "report";

/** Человеческие названия решений о колонке. */
export const DECISION_TITLES: Record<ColumnMapping["decidedBy"], string> = {
	vendor_profile: "профиль системы",
	deterministic: "правило",
	llm: "нейросеть",
	manual: "вручную",
	inferred: "по содержимому",
};

export const REASON_TITLES: Record<string, string> = {
	missing_required_field: "Нет обязательного поля",
	unparsable_value: "Значение не разобрано",
	encoding_damage: "Повреждена кодировка",
	broken_reference: "Ссылка в никуда",
	duplicate_conflict: "Дубль с расхождением",
	validation_failed: "Нарушено правило",
	ambiguous_mapping: "Неоднозначное сопоставление",
	low_confidence: "Низкая уверенность",
	target_write_failed: "База отклонила запись",
	row_too_large: "Строка слишком велика",
};

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} Б`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Разбирает ответ, различая конверт ошибки и полезную нагрузку. */
export async function readResponse<T>(
	response: Response,
): Promise<
	{ ok: true; data: T } | { ok: false; message: string; code: string }
> {
	const text = await response.text();
	let parsed: unknown = null;
	try {
		parsed = text ? JSON.parse(text) : null;
	} catch {
		return {
			ok: false,
			code: "BadResponse",
			message: `Сервер вернул не JSON (код ${response.status}).`,
		};
	}

	if (!response.ok) {
		const envelope = parsed as Partial<ApiError> | null;
		if (envelope?.error) {
			return {
				ok: false,
				code: envelope.error.code,
				message: envelope.error.message,
			};
		}
		return {
			ok: false,
			code: "HttpError",
			message: `Запрос не выполнен (код ${response.status}).`,
		};
	}

	return { ok: true, data: parsed as T };
}
