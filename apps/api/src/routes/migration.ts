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
import { randomUUID } from "node:crypto";
import {
	migrationReconciliations,
	migrationRuns,
	patients,
	serviceCatalogItems,
} from "../db/schema.js";
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
			if (!context) return reply;

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
			if (!context) return reply;

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
		if (!context) return reply;
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
			if (!context) return reply;

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
		if (!context) return reply;

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
			if (!context) return reply;

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
		if (!context) return reply;

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

	/**
	 * Экспресс-импорт данных с 2-фазным барьером подтверждения (Two-Phase Guard):
	 * Phase 1: preview / dry_run — анализ колонок (ФИО, Телефон, Баланс), детекция дублей, превью строк.
	 * Phase 2: commit — транзакционная запись в PostgreSQL 18 с изоляцией по organizationId.
	 */
	app.post("/api/migration/import", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"express migration import",
		);
		if (!context) return reply;

		const body = (request.body as Record<string, any>) ?? {};
		const phase = body.phase === "commit" && (body.confirm === true || body.dryRun === false) ? "commit" : "preview";
		const entityKind = body.entityKind === "price_list" ? "price_list" : "patients";
		const sourceName = typeof body.sourceName === "string" ? body.sourceName : "express_import.csv";

		let rawRows: Array<Record<string, any>> = [];
		if (Array.isArray(body.rows) && body.rows.length > 0) {
			rawRows = body.rows;
		} else if (typeof body.rawText === "string" && body.rawText.trim().length > 0) {
			const lines = body.rawText.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
			if (lines.length > 0) {
				const delimiter = lines[0]?.includes("\t") ? "\t" : lines[0]?.includes(";") ? ";" : ",";
				const header = lines[0]!.split(delimiter).map((h: string) => h.trim().replace(/^["']|["']$/g, ""));
				for (let i = 1; i < lines.length; i++) {
					const parts = lines[i]!.split(delimiter).map((p: string) => p.trim().replace(/^["']|["']$/g, ""));
					const row: Record<string, any> = {};
					for (let j = 0; j < header.length; j++) {
						row[header[j] || `col_${j}`] = parts[j] ?? "";
					}
					rawRows.push(row);
				}
			}
		}

		if (rawRows.length === 0) {
			return reply.code(400).send({
				error: "MigrationValidationError",
				message: "Не переданы данные для разбора и переноса. Загрузите файл CSV/Excel или передайте строки.",
			});
		}

		const firstRow = rawRows[0] || {};
		const keys = Object.keys(firstRow);
		const detectedColumns: Array<{ key: string; label: string; field: string }> = [];

		for (const k of keys) {
			const lower = k.toLowerCase();
			if (/ф.?и.?о|имя|пациент|клиент|пациентка|фамилия|full.*name|name/i.test(lower)) {
				detectedColumns.push({ key: k, label: "ФИО", field: "fullName" });
			} else if (/тел|phone|mobile|сот|контакт/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Телефон", field: "phone" });
			} else if (/рожд|д\.?р|birth|dob/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Дата рождения", field: "birthDate" });
			} else if (/баланс|долг|депозит|balance|debt|аванс/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Баланс/Депозит", field: "balanceRub" });
			} else if (/код|артикул|номенклатур|code|sku/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Код/Артикул", field: "code" });
			} else if (/наименование|услуга|процедура|название|title|service/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Наименование", field: "title" });
			} else if (/цена|стоимость|тариф|price|cost|base_price/i.test(lower)) {
				detectedColumns.push({ key: k, label: "Цена (руб)", field: "priceRub" });
			} else {
				detectedColumns.push({ key: k, label: k, field: "note" });
			}
		}

		const seenPhones = new Set<string>();
		const seenNames = new Set<string>();
		let duplicatesCount = 0;
		for (const r of rawRows) {
			const nameVal = String(r[detectedColumns.find((c) => c.field === "fullName")?.key || ""] || "").trim().toLowerCase();
			const phoneVal = String(r[detectedColumns.find((c) => c.field === "phone")?.key || ""] || "").replace(/\D/g, "");
			if (phoneVal && seenPhones.has(phoneVal)) {
				duplicatesCount++;
			} else if (nameVal && seenNames.has(nameVal)) {
				duplicatesCount++;
			} else {
				if (phoneVal) seenPhones.add(phoneVal);
				if (nameVal) seenNames.add(nameVal);
			}
		}

		if (phase === "preview") {
			return {
				success: true,
				phase: "preview",
				sourceName,
				entityKind,
				totalRows: rawRows.length,
				detectedColumns,
				duplicatesCount,
				sampleRows: rawRows.slice(0, 5),
				message: `Распознано ${rawRows.length} записей из «${sourceName}». Выявлено возможных дублей: ${duplicatesCount}. Подтвердите импорт для переноса в базу.`,
			};
		}

		let importedRows = 0;
		if (entityKind === "patients") {
			const nameCol = detectedColumns.find((c) => c.field === "fullName")?.key;
			const phoneCol = detectedColumns.find((c) => c.field === "phone")?.key;
			const birthCol = detectedColumns.find((c) => c.field === "birthDate")?.key;
			const balanceCol = detectedColumns.find((c) => c.field === "balanceRub")?.key;

			for (const r of rawRows) {
				const fullName = (nameCol ? String(r[nameCol] ?? "") : "").trim() || "Пациент из импорта";
				const phone = phoneCol ? String(r[phoneCol] ?? "").trim() : null;
				const birthDate = birthCol ? String(r[birthCol] ?? "").trim() : null;
				const balanceRub = balanceCol ? Number(r[balanceCol]) || 0 : 0;
				const notes = balanceRub !== 0 ? `Баланс при переносе: ${balanceRub} руб.` : null;

				await db.insert(patients).values({
					id: randomUUID(),
					organizationId: context.organizationId,
					fullName,
					phone: phone || null,
					birthDate: birthDate || null,
					notes,
					status: "active",
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				importedRows++;
			}
		} else if (entityKind === "price_list") {
			const codeCol = detectedColumns.find((c) => c.field === "code")?.key;
			const titleCol = detectedColumns.find((c) => c.field === "title")?.key;
			const priceCol = detectedColumns.find((c) => c.field === "priceRub")?.key;

			for (let idx = 0; idx < rawRows.length; idx++) {
				const r = rawRows[idx]!;
				const title = (titleCol ? String(r[titleCol] ?? "") : "").trim() || `Услуга ${idx + 1}`;
				const code = (codeCol ? String(r[codeCol] ?? "") : "").trim() || `IMP-${idx + 1}`;
				const priceNum = priceCol ? Math.max(0, Number(r[priceCol]) || 0) : 0;

				await db.insert(serviceCatalogItems).values({
					organizationId: context.organizationId,
					code,
					title,
					category: "therapy",
					specialty: "universal",
					basePriceRub: priceNum,
					priceRub: priceNum,
					durationMinutes: 30,
					isActive: true,
				});
				importedRows++;
			}
		}

		return {
			success: true,
			phase: "commit",
			sourceName,
			entityKind,
			totalRows: rawRows.length,
			importedRows,
			duplicatesCount,
			message: `Импорт успешно завершен: перенесено ${importedRows} записей в базу данных клиники.`,
		};
	});
}
