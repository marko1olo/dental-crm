import {
	type MigrationAnalyzeRequest,
	type MigrationRunRequest,
	migrationAnalyzeRequestSchema,
	migrationAnalyzeResponseSchema,
	migrationRollbackRequestSchema,
	migrationRollbackResponseSchema,
	migrationRunRequestSchema,
	migrationRunResponseSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { migrationReconciliations, migrationRuns } from "../db/schema.js";
import {
	analyzeSource,
	type EngineInput,
	listQuarantine,
	listRuns,
	rollbackRun,
	runMigration,
} from "../migration/engine.js";
import { reconciliationReportCsv } from "../migration/reconcile.js";
import { getRequestIdentity } from "../security/identity.js";
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер, рядом с домом
 * текстов отказа по кабинету клиники (utils/clinicSessionRefusal.ts). Второй
 * словарь — та болезнь, из которой в этом дереве выросли девять расчётов долга
 * пациента и три копии часового пояса.
 */
import { schemaRefusalMessage } from "../utils/schemaRefusalWords.js";

/**
 * Маршруты переноса данных из чужих систем.
 *
 * ОРГАНИЗАЦИЯ БЕРЁТСЯ ИЗ ПРОВЕРЕННОГО ТОКЕНА.
 * В routes/imports.ts организация определялась так:
 *
 *     const [org] = await db.select().from(organizations).limit(1);
 *
 * — то есть первая строка таблицы, без всякой связи с тем, кто прислал запрос.
 * На одной клинике в базе это незаметно; на второй администратор одной клиники
 * загружает выгрузку в базу другой. Здесь организация приходит только из
 * requireClinicalMutationContext, который извлекает её из подписанного токена.
 *
 * ЛИМИТ ТЕЛА ЗАПРОСА поднят до 32 МБ: выгрузка пациентов средней клиники за
 * десять лет в DBF занимает единицы мегабайт, но книга Excel с историей приёмов
 * доходит до двадцати. Значение по умолчанию Fastify (1 МБ) отклоняло бы
 * реальные выгрузки с невнятной ошибкой.
 */

const MIGRATION_BODY_LIMIT = 32 * 1024 * 1024;

type PayloadSchema<T> = {
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
 *
 * Без словаря отказ называл поле ЛАТИНСКИМ ключом схемы, и это гасило фразу
 * целиком: латинское слово из шести и более знаков (`sourceName` — 10,
 * `contentBase64` — 13) отбрасывает весь текст фильтром клиента.
 */
const migrationFieldLabels: Record<string, string> = {
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
 * Разбор тела запроса с человеческим отказом.
 *
 * БЫЛО, замерено `app.inject` в своём процессе:
 *
 *   POST /api/migration/analyze,  пустое тело → «sourceName: Required»
 *   POST /api/migration/rollback, runId числом
 *     → «runId: Expected string, received number; confirm: Invalid literal
 *        value, expected true»
 *
 * В этих строках НЕТ НИ ОДНОГО русского слова. Оператор переноса не видел даже
 * смеси языков: клиент гасит текст без кириллицы целиком
 * (`apps/web/src/AppHelpers.tsx`, `operatorReadableErrorDetail`), и на экране
 * мастера оставалась подпись по коду ответа. Замысел «сообщать поле и причину»
 * (он был записан в прежнем комментарии здесь) не выполнялся: поле называлось
 * латинским ключом схемы, а причина — словом разборщика.
 *
 * СТАЛО: и подпись поля, и причина, и следующий шаг по-русски. Перевод машинных
 * слов берётся из ОДНОГО дома `utils/schemaRefusalWords.ts`, своей копии здесь
 * нет: местная заплата этого класса уже написана в `routes/telegram.ts` и
 * отстала от установленного `zod` на шесть кодов замечаний из шестнадцати.
 *
 * Машинные коды ответа (`MigrationValidationError`) не менялись: интерфейс по
 * ним ветвится.
 */
function parsePayload<T>(
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
function engineInputFrom(
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

function errorMessageOf(error: unknown): string {
	return error instanceof Error
		? error.message
		: "Неизвестная ошибка переноса.";
}

export async function registerMigrationRoutes(app: FastifyInstance) {
	/**
	 * Анализ источника. Ничего не записывает — даже в стейджинг.
	 * Это первый шаг мастера: оператор видит определённую кодировку, карту
	 * соответствия и оценку того, сколько строк пройдёт, до всякой записи.
	 */
	app.post(
		"/api/migration/analyze",
		{ bodyLimit: MIGRATION_BODY_LIMIT },
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration analyze",
			);
			if (!context) return;

			const parsed = parsePayload(
				migrationAnalyzeRequestSchema,
				request.body,
				"разбор источника",
			);
			if (!parsed.ok) {
				return reply
					.code(400)
					.send({ error: "MigrationValidationError", message: parsed.message });
			}

			try {
				const result = await analyzeSource(
					engineInputFrom(context.organizationId, null, parsed.data, true),
				);
				return migrationAnalyzeResponseSchema.parse(result);
			} catch (error) {
				/**
				 * Отказ разбора — это не сбой сервера, а свойство присланного файла
				 * (дамп SQL, обрезанный JSON, повреждённый DBF). Код 422 и внятный текст,
				 * а не 500: оператор должен понять, что делать с файлом.
				 */
				return reply.code(422).send({
					error: "MigrationSourceRejected",
					message: errorMessageOf(error),
				});
			}
		},
	);

	/**
	 * Прогон переноса. По умолчанию сухой: dryRun приходит из схемы со значением
	 * true, и запись в боевые таблицы требует явного dryRun: false.
	 */
	app.post(
		"/api/migration/run",
		{ bodyLimit: MIGRATION_BODY_LIMIT },
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration run",
			);
			if (!context) return;

			const parsed = parsePayload(
				migrationRunRequestSchema,
				request.body,
				"запуск переноса",
			);
			if (!parsed.ok) {
				return reply
					.code(400)
					.send({ error: "MigrationValidationError", message: parsed.message });
			}

			const identity = getRequestIdentity(request);
			try {
				const result = await runMigration(
					engineInputFrom(
						context.organizationId,
						identity.userId ?? null,
						parsed.data,
						parsed.data.dryRun,
					),
				);
				return migrationRunResponseSchema.parse(result);
			} catch (error) {
				return reply
					.code(422)
					.send({ error: "MigrationFailed", message: errorMessageOf(error) });
			}
		},
	);

	/** Список прогонов организации. */
	app.get("/api/migration/runs", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"migration runs list",
		);
		if (!context) return;
		return { runs: await listRuns(context.organizationId) };
	});

	/** Один прогон с последней сверкой. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/runs/:runId",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration run detail",
			);
			if (!context) return;

			const [run] = await db
				.select()
				.from(migrationRuns)
				.where(
					and(
						eq(migrationRuns.id, request.params.runId),
						eq(migrationRuns.organizationId, context.organizationId),
					),
				);

			if (!run) {
				return reply.code(404).send({
					error: "MigrationRunNotFound",
					message: "Прогон переноса не найден.",
				});
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

			return {
				run: {
					runId: run.id,
					sourceName: run.sourceName,
					sourceKind: run.sourceKind,
					vendorProfile: run.vendorProfile,
					status: run.status,
					dryRun: run.dryRun,
					detectedEncoding: run.detectedEncoding,
					encodingConfidence: run.encodingConfidence,
					sourceRows: run.sourceRows,
					stagedRows: run.stagedRows,
					loadedRows: run.loadedRows,
					updatedRows: run.updatedRows,
					duplicateRows: run.duplicateRows,
					quarantinedRows: run.quarantinedRows,
					skippedRows: run.skippedRows,
					llmCalls: run.llmCalls,
					llmRejectedSuggestions: run.llmRejectedSuggestions,
					startedAt: run.startedAt?.toISOString() ?? null,
					finishedAt: run.finishedAt?.toISOString() ?? null,
					errorMessage: run.errorMessage,
				},
				mapping: run.mappingJson,
				reconciliation: reconciliation
					? {
							runId: run.id,
							generatedAt: reconciliation.generatedAt.toISOString(),
							balanced: reconciliation.balanced,
							checks: reconciliation.checksJson,
							entityBreakdown: reconciliation.entityBreakdownJson,
							sourceMoneyTotalRub: reconciliation.sourceMoneyTotalRub,
							loadedMoneyTotalRub: reconciliation.loadedMoneyTotalRub,
							quarantinedMoneyTotalRub: reconciliation.quarantinedMoneyTotalRub,
						}
					: null,
			};
		},
	);

	/** Карантин прогона с постраничной выборкой. */
	app.get<{
		Params: { runId: string };
		Querystring: { limit?: string; offset?: string };
	}>("/api/migration/runs/:runId/quarantine", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"migration quarantine",
		);
		if (!context) return;

		const limit = Math.min(
			Math.max(Number(request.query.limit ?? "200") || 200, 1),
			500,
		);
		const offset = Math.max(Number(request.query.offset ?? "0") || 0, 0);
		const items = await listQuarantine(
			context.organizationId,
			request.params.runId,
			limit,
			offset,
		);
		return { items, limit, offset };
	});

	/**
	 * Отчёт сверки в CSV — то, что передаётся клинике как доказательство переноса.
	 * Кодировка UTF-8 с BOM: без него русский Excel открывает файл как cp1251 и
	 * показывает вопросительные знаки вместо заголовков.
	 */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/runs/:runId/reconciliation.csv",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation report",
			);
			if (!context) return;

			const [run] = await db
				.select({ id: migrationRuns.id })
				.from(migrationRuns)
				.where(
					and(
						eq(migrationRuns.id, request.params.runId),
						eq(migrationRuns.organizationId, context.organizationId),
					),
				);
			if (!run) {
				return reply.code(404).send({
					error: "MigrationRunNotFound",
					message: "Прогон переноса не найден.",
				});
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

			if (!reconciliation) {
				return reply.code(404).send({
					error: "ReconciliationNotFound",
					message: "Сверка для этого прогона ещё не выполнялась.",
				});
			}

			const csv = reconciliationReportCsv({
				runId: run.id,
				generatedAt: reconciliation.generatedAt.toISOString(),
				balanced: reconciliation.balanced,
				checks: reconciliation.checksJson,
				entityBreakdown: reconciliation.entityBreakdownJson,
				sourceMoneyTotalRub: reconciliation.sourceMoneyTotalRub,
				loadedMoneyTotalRub: reconciliation.loadedMoneyTotalRub,
				quarantinedMoneyTotalRub: reconciliation.quarantinedMoneyTotalRub,
			});

			reply.header("Content-Type", "text/csv; charset=utf-8");
			reply.header(
				"Content-Disposition",
				`attachment; filename="reconciliation-${run.id.slice(0, 8)}.csv"`,
			);
			return reply.send(`﻿${csv}`);
		},
	);

	/**
	 * Откат прогона. Удаляет только созданное этим прогоном; записи, обновлённые
	 * им, и записи, на которые уже сослались после переноса, сохраняются.
	 */
	app.post("/api/migration/rollback", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"migration rollback",
		);
		if (!context) return;

		const parsed = parsePayload(
			migrationRollbackRequestSchema,
			request.body,
			"откат переноса",
		);
		if (!parsed.ok) {
			return reply
				.code(400)
				.send({ error: "MigrationValidationError", message: parsed.message });
		}

		const identity = getRequestIdentity(request);
		try {
			const result = await rollbackRun({
				organizationId: context.organizationId,
				runId: parsed.data.runId,
				actorUserId: identity.userId ?? null,
			});

			return migrationRollbackResponseSchema.parse({
				runId: parsed.data.runId,
				status: result.status,
				deletedByEntity: result.outcomes.map((outcome) => ({
					entityKind: outcome.entityKind,
					deleted: outcome.deleted,
					retained: outcome.retained,
					retainedReason: outcome.retainedReason,
				})),
				message: result.message,
			});
		} catch (error) {
			return reply.code(422).send({
				error: "MigrationRollbackFailed",
				message: errorMessageOf(error),
			});
		}
	});
}
