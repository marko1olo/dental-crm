/**
 * apps/api/src/routes/migrationRoutes/migrationTypesAndHelpers.ts
 *
 * Types, payload parsers, and human refusal helpers for Migration Routes.
 */

import type {
	MigrationAnalyzeRequest,
	MigrationRunRequest,
} from "@dental/shared";
import type { EngineInput } from "../../migration/engine.js";
import { schemaRefusalMessage } from "../../utils/schemaRefusalWords.js";

export const MIGRATION_BODY_LIMIT = 32 * 1024 * 1024;

export type PayloadSchema<T> = {
	safeParse: (value: unknown) =>
		| { success: true; data: T }
		| {
				success: false;
				error: {
					issues: Array<{ path: Array<string | number>; message: string }>;
				};
		  };
};

/**
 * Русские подписи полей переноса: ключ схемы → то, как поле названо на экране
 * мастера переноса.
 */
export const migrationFieldLabels: Record<string, string> = {
	sourceName: "название источника",
	sourceKind: "вид источника",
	rawText: "содержимое источника",
	contentBase64: "файл источника",
	entityKind: "вид переносимых записей",
	allowLlm: "разрешение обращаться к языковой модели",
	vendorProfile: "код чужой системы",
	dryRun: "сухой прогон без записи",
	sourceSystem: "код системы-источника",
	mappingOverrides: "поправки карты соответствия",
	sourceColumn: "колонка источника",
	targetField: "поле карточки клиники",
	runId: "прогон переноса",
	confirm: "подтверждение отката",
};

/**
 * Разбор тела запроса с человеческим отказом на русском языке.
 */
export function parsePayload<T>(
	schema: PayloadSchema<T>,
	value: unknown,
	retryAction: string,
): { ok: true; data: T } | { ok: false; message: string } {
	const parsed = schema.safeParse(value);
	if (parsed.success) return { ok: true, data: parsed.data };
	return {
		ok: false,
		message: schemaRefusalMessage({
			issues: parsed.error.issues,
			fieldLabels: migrationFieldLabels,
			retryAction,
			fallbackMessage:
				"Запрос переноса не прошёл проверку. Выберите источник заново в мастере переноса и повторите действие.",
		}),
	};
}

/** Приводит запрос к входным данным движка. */
export function engineInputFrom(
	organizationId: string,
	userId: string | null,
	request: MigrationRunRequest | MigrationAnalyzeRequest,
	dryRun: boolean,
): EngineInput {
	const runRequest = request as Partial<MigrationRunRequest>;
	return {
		organizationId,
		startedByUserId: userId,
		sourceName: request.sourceName,
		...(request.rawText === undefined ? {} : { rawText: request.rawText }),
		...(request.contentBase64 === undefined
			? {}
			: { contentBase64: request.contentBase64 }),
		...(request.sourceKind === undefined
			? {}
			: { forcedSourceKind: request.sourceKind }),
		...(request.entityKind === undefined
			? {}
			: { requestedEntityKind: request.entityKind }),
		...(request.vendorProfile === undefined
			? {}
			: { requestedVendorProfile: request.vendorProfile }),
		allowLlm: request.allowLlm,
		dryRun,
		sourceSystem: runRequest.sourceSystem ?? "legacy",
		mappingOverrides: runRequest.mappingOverrides ?? [],
	};
}

export function errorMessageOf(error: unknown): string {
	return error instanceof Error
		? error.message
		: "Неизвестная ошибка переноса.";
}
