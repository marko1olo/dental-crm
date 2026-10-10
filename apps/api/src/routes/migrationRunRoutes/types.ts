import {
	migrationEntityKindSchema,
	migrationTargetFieldSchema,
} from "@dental/shared";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import { migrationRuns } from "../../db/schema.js";
import { MigrationPhaseError } from "../../migration/phases.js";
import {
	type SchemaIssueLike,
	schemaIssuePhrase,
	schemaRefusalMessage,
} from "../../utils/schemaRefusalWords.js";

/**
 * Ошибки и DTO для фаз миграции: заливка, сопоставление, выполнение, сверка.
 */

export interface ApiErrorDetails {
	[key: string]: string | number | boolean | string[] | null;
}

/** Тело единого конверта ошибки — то, что уходит клиенту как значение. */
export interface ApiErrorEnvelope {
	error: { code: string; message: string; details: ApiErrorDetails };
}

/**
 * Читает заголовок с именем файла, допуская кириллицу.
 *
 * ЗАЧЕМ ЭТО НУЖНО
 * Значения HTTP-заголовков — это ByteString: коды символов до 255. Положить
 * туда «Пациенты.dbf» напрямую нельзя, клиент упадёт ещё до отправки запроса с
 * ошибкой «character has a value of 1055 which is greater than 255». Для
 * российской клиники русское имя файла — норма, а не исключение, поэтому имя
 * передаётся в процентной кодировке UTF-8 (encodeURIComponent на стороне
 * клиента), а здесь раскодируется.
 *
 * Значение без процентов принимается как есть: латинское «PACIENT.DBF»
 * кодировать незачем, и требовать этого от вызывающего было бы придиркой.
 */
export function decodeHeaderText(
	value: string | string[] | undefined,
): string | undefined {
	const raw = Array.isArray(value) ? value[0] : value;
	if (!raw?.trim()) return undefined;
	if (!raw.includes("%")) return raw;
	try {
		return decodeURIComponent(raw);
	} catch (err) {
		console.error("[Dente] decodeHeaderText failed:", err);
		// Битая процентная последовательность — берём как есть, чем терять имя.
		return raw;
	}
}

/**
 * Единый конверт ошибки.
 *
 * СТАВИТ КОД И ВОЗВРАЩАЕТ ТЕЛО, А НЕ ЗОВЁТ `send`. Прежняя форма
 * (`return reply.code(N).send(...)`) отдавала вызывающему сам `reply`, а он
 * thenable: `Reply.prototype.then` (fastify/lib/reply.js:466) разрешается по
 * `eos(reply.raw)` — то есть когда ответ уже ушёл клиенту. Обработчик,
 * написавший `return fail(...)`, тем самым возвращал промис, который ждёт конца
 * отправки, а обёртка withTenantCtx из server.ts (хук onRoute) ждёт его, чтобы
 * зафиксировать транзакцию. COMMIT уходил ПОСЛЕ ответа.
 *
 * Возврат значения снимает это целиком: fastify зовёт `reply.send(payload)` уже
 * после разрешения промиса обработчика (lib/wrap-thenable.js:14), то есть после
 * COMMIT. Код, выставленный `reply.code()`, при этом сохраняется — он живёт на
 * объекте ответа, а не в аргументах `send`.
 */
export function fail(
	reply: FastifyReply,
	httpStatus: number,
	code: string,
	message: string,
	details: ApiErrorDetails = {},
): ApiErrorEnvelope {
	reply.code(httpStatus);
	return { error: { code, message, details } };
}

/**
 * Русские подписи полей запросов переноса: ключ схемы → подпись с экрана
 * мастера. Свой словарь у этого файла потому, что схемы здесь свои
 * (`mapRequestSchema`, `executeRequestSchema`, `discoverRequestSchema`,
 * `dicomInspectSchema`), а перевод машинных слов — общий и живёт в
 * `utils/schemaRefusalWords.ts`.
 */
export const migrationRunFieldLabels: Record<string, string> = {
	entityKind: "вид переносимых записей",
	vendorProfile: "код чужой системы",
	allowLlm: "разрешение обращаться к языковой модели",
	mappingOverrides: "поправки карты соответствия",
	sourceColumn: "колонка источника",
	targetField: "поле карточки клиники",
	dryRun: "сухой прогон без записи",
	sourceSystem: "код системы-источника",
	roots: "каталоги для поиска",
	maxDepth: "глубина обхода каталогов",
	timeBudgetMs: "предел времени поиска",
	filePath: "путь к снимку",
};

/**
 * Отказ разбора тела запроса — один сборщик на все четыре адреса этого файла.
 *
 * БЫЛО: четыре ОДИНАКОВЫЕ строки формата, по одной на адрес,
 *
 *     issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
 *
 * то есть латинский ключ схемы, латинское слово `body` и слово разборщика.
 * Замерено `app.inject` в своём процессе:
 *
 *   POST /api/migration/<прогон>/map     → ["vendorProfile: Expected string, received number",
 *                                          "allowLlm: Expected boolean, received string"]
 *   POST /api/migration/<прогон>/execute → ["dryRun: Expected boolean, received string"]
 *
 * Ни одного русского слова, поэтому клиент гасит каждую строку целиком
 * (`apps/web/src/AppHelpers.tsx`, `operatorReadableErrorDetail`). Поле `message`
 * этого конверта по-русски было и раньше, но говорило лишь «запрос не прошёл
 * проверку» — без причины и без действия. Оператор переноса читал только это.
 *
 * Четыре копии одной строки формата — это и есть способ, которым дефект
 * расползается: правку внесли бы в одну, остальные три остались бы прежними.
 * Теперь сборщик один, а перевод машинных слов берётся из общего дома
 * `utils/schemaRefusalWords.ts`.
 *
 * Машинные коды (`ValidationError` и остальные) не менялись: интерфейс по ним
 * ветвится. Форма конверта тоже сохранена — список строк в
 * `error.details.issues`.
 */
export function failSchemaRefusal(
	reply: FastifyReply,
	issues: ReadonlyArray<SchemaIssueLike>,
	headline: string,
	retryAction: string,
): ApiErrorEnvelope {
	return fail(
		reply,
		400,
		"ValidationError",
		schemaRefusalMessage({
			issues,
			fieldLabels: migrationRunFieldLabels,
			retryAction,
			fallbackMessage: `${headline} Заполните поля мастера переноса заново и повторите ${retryAction}.`,
		}),
		{
			issues: issues.map((issue) =>
				schemaIssuePhrase(issue, migrationRunFieldLabels),
			),
		},
	);
}

/** Переводит отказ фазы в ответ API с сохранением машинного кода. */
export function failFromPhaseError(
	reply: FastifyReply,
	error: unknown,
): ApiErrorEnvelope {
	if (error instanceof MigrationPhaseError) {
		const httpStatus =
			error.code === "RunNotFound"
				? 404
				: error.code === "UploadExpired"
					? 410
					: 422;
		return fail(reply, httpStatus, error.code, error.message);
	}
	const message =
		error instanceof Error ? error.message : "Неизвестная ошибка переноса.";
	return fail(reply, 422, "MigrationFailed", message);
}

export const mapRequestSchema = z.object({
	entityKind: migrationEntityKindSchema.optional(),
	vendorProfile: z.string().max(60).optional(),
	allowLlm: z.boolean().default(true),
	mappingOverrides: z
		.array(
			z.object({
				sourceColumn: z.string().min(1),
				targetField: migrationTargetFieldSchema,
			}),
		)
		.default([]),
});
export type MapRequest = z.infer<typeof mapRequestSchema>;

export const discoverRequestSchema = z.object({
	/**
	 * Корни обхода. Пусто — берутся диски и домашний каталог. Указывать корень
	 * стоит всегда, когда он известен: обход всего диска занимает десятки секунд.
	 */
	roots: z.array(z.string().min(1).max(400)).max(10).default([]),
	maxDepth: z.number().int().min(1).max(10).default(6),
	timeBudgetMs: z.number().int().min(1000).max(180_000).default(45_000),
});
export type DiscoverRequest = z.infer<typeof discoverRequestSchema>;

export const dicomInspectSchema = z.object({
	filePath: z.string().min(1).max(600),
});
export type DicomInspectRequest = z.infer<typeof dicomInspectSchema>;

export const executeRequestSchema = z.object({
	/**
	 * Значение по умолчанию true не случайно: перенос чужой базы начинается с
	 * сухого прогона. Запись в боевые таблицы требует явного dryRun: false.
	 */
	dryRun: z.boolean().default(true),
	sourceSystem: z.string().min(1).max(60).default("legacy"),
});
export type ExecuteRequest = z.infer<typeof executeRequestSchema>;

/** Ответ о состоянии прогона. Один формат для всех опросов. */
export function runStatusPayload(run: typeof migrationRuns.$inferSelect) {
	const total = run.progressTotal;
	const done = run.progressDone;
	return {
		runId: run.id,
		sourceName: run.sourceName,
		sourceKind: run.sourceKind,
		status: run.status,
		phase: run.phase,
		dryRun: run.dryRun,
		vendorProfile: run.vendorProfile,
		detectedEncoding: run.detectedEncoding,
		encodingConfidence: run.encodingConfidence,
		progress: {
			total,
			done,
			// Процент считается здесь, а не в интерфейсе: одно место — один ответ.
			percent:
				total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100)),
		},
		counters: {
			sourceRows: run.sourceRows,
			stagedRows: run.stagedRows,
			loadedRows: run.loadedRows,
			updatedRows: run.updatedRows,
			duplicateRows: run.duplicateRows,
			quarantinedRows: run.quarantinedRows,
			skippedRows: run.skippedRows,
		},
		llm: {
			calls: run.llmCalls,
			rejectedSuggestions: run.llmRejectedSuggestions,
		},
		worker: {
			id: run.workerId,
			heartbeatAt: run.heartbeatAt?.toISOString() ?? null,
			resumeCount: run.resumeCount,
		},
		startedAt: run.startedAt?.toISOString() ?? null,
		finishedAt: run.finishedAt?.toISOString() ?? null,
		errorMessage: run.errorMessage,
		/** true — файл источника ещё на сервере и фазы можно повторить. */
		uploadRetained: Boolean(run.uploadPath),
	};
}
