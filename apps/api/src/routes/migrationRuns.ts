import { Readable } from "node:stream";
import {
	type MigrationEntityKind,
	type MigrationTargetField,
	migrationEntityKindSchema,
	migrationRunRequestSchema,
	migrationTargetFieldSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { migrationReconciliations, migrationRuns } from "../db/schema.js";
import {
	discoverLocalSources,
	summarizeDiscovery,
} from "../migration/discovery.js";
import { listQuarantine } from "../migration/engine.js";
import { readDicomMetadata } from "../migration/formats/dicom.js";
import {
	MigrationPhaseError,
	mapRunPhase,
	stageRunPhase,
} from "../migration/phases.js";
import { reconciliationReportCsv } from "../migration/reconcile.js";
import {
	countStagingByStatus,
	createRun,
	enqueueRun,
	findRun,
} from "../migration/runStore.js";
import { detectSourceShape } from "../migration/streamStage.js";
import {
	deleteUpload,
	MAX_UPLOAD_BYTES,
	storeUploadStream,
	UploadTooLargeError,
} from "../migration/uploadStore.js";
import { migrationWorkerStatus } from "../migration/worker.js";
import { getRequestIdentity } from "../security/identity.js";
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер, рядом с домом
 * текстов отказа по кабинету клиники (utils/clinicSessionRefusal.ts).
 */
import {
	type SchemaIssueLike,
	schemaIssuePhrase,
	schemaRefusalMessage,
} from "../utils/schemaRefusalWords.js";

/**
 * Оркестрация переноса по фазам: заливка, сопоставление, выполнение, сверка.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ РЯДОМ С routes/migration.ts
 * В migration.ts живут синхронные маршруты: /analyze и /run. Они остаются
 * рабочим и удобным путём для файла обычного размера — оператор получает всё
 * одним запросом. Здесь путь для больших выгрузок: ни один запрос не длится
 * дольше секунд, тяжёлая работа уходит в фоновый воркер.
 *
 * Смешивать их в одном файле не стоит: у них разные контракты ответов (один
 * отдаёт итог, другой — идентификатор задачи) и разные требования к телу запроса
 * (JSON против двоичного потока).
 *
 * ФОРМАТ ОШИБОК
 * Все ответы об ошибке — { error: { code, message, details } }. code машинный,
 * message на русском для оператора, details — то, что помогает разобраться
 * (предел размера, недостающие поля). Без единого формата интерфейсу пришлось бы
 * угадывать, где искать текст ошибки.
 */

interface ApiErrorDetails {
	[key: string]: string | number | boolean | string[] | null;
}

/** Тело единого конверта ошибки — то, что уходит клиенту как значение. */
interface ApiErrorEnvelope {
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
function decodeHeaderText(
	value: string | string[] | undefined,
): string | undefined {
	const raw = Array.isArray(value) ? value[0] : value;
	if (!raw?.trim()) return undefined;
	if (!raw.includes("%")) return raw;
	try {
		return decodeURIComponent(raw);
	} catch {
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
function fail(
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
const migrationRunFieldLabels: Record<string, string> = {
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
function failSchemaRefusal(
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
function failFromPhaseError(
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

const mapRequestSchema = z.object({
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

const discoverRequestSchema = z.object({
	/**
	 * Корни обхода. Пусто — берутся диски и домашний каталог. Указывать корень
	 * стоит всегда, когда он известен: обход всего диска занимает десятки секунд.
	 */
	roots: z.array(z.string().min(1).max(400)).max(10).default([]),
	maxDepth: z.number().int().min(1).max(10).default(6),
	timeBudgetMs: z.number().int().min(1000).max(180_000).default(45_000),
});

const dicomInspectSchema = z.object({
	filePath: z.string().min(1).max(600),
});

const executeRequestSchema = z.object({
	/**
	 * Значение по умолчанию true не случайно: перенос чужой базы начинается с
	 * сухого прогона. Запись в боевые таблицы требует явного dryRun: false.
	 */
	dryRun: z.boolean().default(true),
	sourceSystem: z.string().min(1).max(60).default("legacy"),
});

/** Ответ о состоянии прогона. Один формат для всех опросов. */
function runStatusPayload(run: typeof migrationRuns.$inferSelect) {
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

export async function registerMigrationRunRoutes(app: FastifyInstance) {
	/**
	 * Сквозной разбор двоичного тела.
	 *
	 * Без этого Fastify отвечает 415 Unsupported Media Type: у него нет парсера
	 * для application/octet-stream, и запрос отвергается до обработчика. Штатные
	 * парсеры здесь не подходят по существу — они собирают тело в память, а весь
	 * смысл этого маршрута в том, чтобы этого не делать.
	 *
	 * Парсер отдаёт сам поток, не читая его: обработчик льёт его прямо на диск.
	 */
	app.addContentTypeParser(
		"application/octet-stream",
		(_request, payload, done) => {
			done(null, payload);
		},
	);

	/**
	 * Заливка источника потоком.
	 *
	 * Тело запроса — сами байты файла, без base64 и без multipart. Причина проста:
	 * base64 раздувает данные на треть и требует полной сборки в памяти, а
	 * multipart добавляет разбор границ и зависимость от плагина. Здесь тело льётся
	 * прямо на диск, расход памяти равен размеру чанка.
	 *
	 * Имя файла приходит заголовком x-migration-file-name в процентной кодировке:
	 * в теле его быть не может, оно целиком занято содержимым.
	 */
	app.post(
		"/api/migration/upload",
		{ bodyLimit: MAX_UPLOAD_BYTES },
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration upload",
			);
			if (!context) return;

			// Имена приходят в процентной кодировке UTF-8: в заголовке кириллицы быть
			// не может, а файл «Пациенты.dbf» — обычное дело.
			const rawFileName = decodeHeaderText(
				request.headers["x-migration-file-name"],
			);
			const rawSourceName = decodeHeaderText(
				request.headers["x-migration-source-name"],
			);

			/**
			 * Тело — поток, отданный сквозным парсером выше. Берём именно его, а не
			 * request.raw: парсер уже владеет потоком, и чтение из raw в обход него
			 * дало бы пустое тело.
			 */
			const bodyStream = request.body;
			if (!(bodyStream instanceof Readable)) {
				return fail(
					reply,
					415,
					"UnsupportedContentType",
					"Тело запроса должно быть двоичным потоком файла с заголовком Content-Type: application/octet-stream.",
					{ received: String(request.headers["content-type"] ?? "не указан") },
				);
			}

			let stored: Awaited<ReturnType<typeof storeUploadStream>>;
			try {
				stored = await storeUploadStream(bodyStream, rawFileName);
			} catch (error) {
				if (error instanceof UploadTooLargeError) {
					return fail(reply, 413, "UploadTooLarge", error.message, {
						limitBytes: error.limitBytes,
						limitMegabytes: Math.floor(error.limitBytes / (1024 * 1024)),
					});
				}
				const message =
					error instanceof Error ? error.message : "Файл не принят.";
				return fail(reply, 400, "UploadFailed", message);
			}

			/**
			 * Форма источника определяется сразу, по голове файла: если формат не
			 * читается вовсе, честнее сказать об этом на заливке, а не через минуту
			 * на фазе сопоставления. Файл при отказе удаляется — держать на диске
			 * персональные данные, с которыми ничего нельзя сделать, незачем.
			 */
			let shape: Awaited<ReturnType<typeof detectSourceShape>>;
			try {
				shape = await detectSourceShape({
					filePath: stored.filePath,
					fileName: stored.fileName,
					byteSize: stored.byteSize,
					forcedKind: undefined,
				});
			} catch (error) {
				await deleteUpload(stored.filePath);
				const message =
					error instanceof Error ? error.message : "Формат файла не распознан.";
				return fail(reply, 422, "SourceRejected", message, {
					fileName: stored.fileName,
					byteSize: stored.byteSize,
				});
			}

			const previous = await db
				.select({ id: migrationRuns.id, createdAt: migrationRuns.createdAt })
				.from(migrationRuns)
				.where(
					and(
						eq(migrationRuns.organizationId, context.organizationId),
						eq(migrationRuns.sourceFingerprint, stored.fingerprint),
					),
				)
				.orderBy(desc(migrationRuns.createdAt))
				.limit(1);

			const identity = getRequestIdentity(request);
			const run = await createRun({
				organizationId: context.organizationId,
				startedByUserId: identity.userId ?? null,
				sourceName: (rawSourceName ?? stored.fileName).slice(0, 200),
				sourceKind: shape.sourceKind,
				sourceFingerprint: stored.fingerprint,
				sourceBytes: stored.byteSize,
				uploadPath: stored.filePath,
				uploadFileName: stored.fileName,
				detectedEncoding: shape.detectedEncoding,
				encodingConfidence: shape.encodingConfidence,
			});

			reply.code(201);
			return {
				runId: run.id,
				sourceName: run.sourceName,
				fileName: stored.fileName,
				byteSize: stored.byteSize,
				source: {
					kind: shape.sourceKind,
					detectedEncoding: shape.detectedEncoding,
					encodingConfidence: shape.encodingConfidence,
					delimiter: shape.delimiter,
					columns: shape.columns,
					streamable: shape.streamable,
					warnings: shape.warnings,
				},
				/**
				 * Предупреждение о повторной заливке, а не запрет: оператору часто нужно
				 * догрузить исправленную выгрузку. Идемпотентность обеспечивается
				 * таблицей соответствий, а не блокировкой второго прогона.
				 */
				previousRunWithSameFile:
					previous[0] === undefined
						? null
						: {
								runId: previous[0].id,
								uploadedAt: previous[0].createdAt.toISOString(),
							},
				nextStep: "POST /api/migration/:runId/map",
			};
		},
	);

	/** Сопоставление колонок: правила плюс языковая модель. Быстрая фаза. */
	app.post<{ Params: { runId: string } }>(
		"/api/migration/:runId/map",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration map",
			);
			if (!context) return;

			const parsed = mapRequestSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return failSchemaRefusal(
					reply,
					parsed.error.issues,
					"Запрос сопоставления не прошёл проверку.",
					"сопоставление колонок",
				);
			}

			try {
				const result = await mapRunPhase({
					runId: request.params.runId,
					organizationId: context.organizationId,
					allowLlm: parsed.data.allowLlm,
					sourceSystem: "legacy",
					...(parsed.data.entityKind === undefined
						? {}
						: { requestedEntityKind: parsed.data.entityKind }),
					...(parsed.data.vendorProfile === undefined
						? {}
						: { requestedVendorProfile: parsed.data.vendorProfile }),
					mappingOverrides: parsed.data.mappingOverrides,
				});

				reply.code(200);
				return {
					runId: request.params.runId,
					mapping: result.mapping,
					profile: result.analyze.profile,
					projectedReady: result.analyze.projectedReady,
					projectedQuarantine: result.analyze.projectedQuarantine,
					qualityFindings: result.analyze.qualityFindings,
					llm: {
						calls: result.llmCalls,
						rejectedSuggestions: result.llmRejected,
					},
					nextStep: "POST /api/migration/:runId/execute",
				};
			} catch (error) {
				return failFromPhaseError(reply, error);
			}
		},
	);

	/**
	 * Укладка в стейджинг отдельным вызовом.
	 *
	 * Обычно её делает воркер внутри выполнения, но отдельный маршрут нужен, чтобы
	 * оператор мог увидеть карантин ДО записи в боевые таблицы: уложить, посмотреть,
	 * что отсеялось, поправить карту и уложить заново.
	 */
	app.post<{ Params: { runId: string } }>(
		"/api/migration/:runId/stage",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration stage",
			);
			if (!context) return;

			try {
				const result = await stageRunPhase({
					runId: request.params.runId,
					organizationId: context.organizationId,
					allowLlm: false,
					sourceSystem: "legacy",
					mappingOverrides: [],
				});
				const counts = await countStagingByStatus(
					request.params.runId,
					context.organizationId,
				);
				reply.code(200);
				return {
					runId: request.params.runId,
					sourceRows: result.sourceRows,
					staging: counts,
					nextStep: "POST /api/migration/:runId/execute",
				};
			} catch (error) {
				return failFromPhaseError(reply, error);
			}
		},
	);

	/**
	 * Постановка выполнения в очередь.
	 *
	 * Отвечает 202 Accepted и идентификатором задачи: загрузка идёт в фоне, а
	 * клиент опрашивает GET /api/migration/:runId. Возвращать 200 здесь было бы
	 * неправдой — работа не выполнена, а только принята.
	 */
	app.post<{ Params: { runId: string } }>(
		"/api/migration/:runId/execute",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration execute",
			);
			if (!context) return;

			const parsed = executeRequestSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return failSchemaRefusal(
					reply,
					parsed.error.issues,
					"Запрос выполнения не прошёл проверку.",
					"выполнение прогона",
				);
			}

			const run = await findRun(request.params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}
			if (!run.mappingJson) {
				return fail(
					reply,
					409,
					"MappingMissing",
					"Карта соответствия не построена. Сначала вызовите фазу сопоставления.",
					{ nextStep: "POST /api/migration/:runId/map" },
				);
			}
			if (run.status === "loading") {
				return fail(
					reply,
					409,
					"RunAlreadyRunning",
					"Прогон уже выполняется.",
					{
						phase: run.phase,
						workerId: run.workerId,
					},
				);
			}
			if (run.status === "queued") {
				return fail(
					reply,
					409,
					"RunAlreadyQueued",
					"Прогон уже стоит в очереди на выполнение.",
				);
			}

			const queued = await enqueueRun(
				request.params.runId,
				context.organizationId,
				parsed.data.dryRun,
			);
			if (!queued) {
				return fail(
					reply,
					409,
					"RunNotQueueable",
					`Прогон в состоянии «${run.status}» нельзя поставить в очередь. Завершённый перенос повторно не выполняется — создайте новый.`,
					{ status: run.status },
				);
			}

			const queuedRun = await findRun(
				request.params.runId,
				context.organizationId,
			);
			reply.code(202);
			return {
				accepted: true,
				runId: request.params.runId,
				status: queuedRun?.status ?? "queued",
				dryRun: parsed.data.dryRun,
				message: parsed.data.dryRun
					? "Сухой прогон принят: боевые таблицы не изменятся."
					: "Выполнение принято. Загрузка идёт в фоне.",
				poll: `GET /api/migration/${request.params.runId}`,
				worker: migrationWorkerStatus(),
			};
		},
	);

	/** Состояние прогона для опроса клиентом. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/:runId",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration run status",
			);
			if (!context) return;

			const run = await findRun(request.params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}
			const staging = await countStagingByStatus(
				run.id,
				context.organizationId,
			);
			reply.code(200);
			return { run: runStatusPayload(run), staging, mapping: run.mappingJson };
		},
	);

	/** Акт сверки: то, что передаётся клинике как доказательство переноса. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/:runId/reconciliation",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation",
			);
			if (!context) return;

			const run = await findRun(request.params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

			if (!reconciliation) {
				return fail(
					reply,
					409,
					"ReconciliationNotReady",
					"Сверка ещё не сформирована: выполнение не завершено.",
					{ status: run.status, phase: run.phase },
				);
			}

			const quarantinePreview = await listQuarantine(
				context.organizationId,
				run.id,
				50,
			);

			reply.code(200);
			return {
				runId: run.id,
				generatedAt: reconciliation.generatedAt.toISOString(),
				balanced: reconciliation.balanced,
				checks: reconciliation.checksJson,
				entityBreakdown: reconciliation.entityBreakdownJson,
				money: {
					sourceTotalRub: reconciliation.sourceMoneyTotalRub,
					loadedTotalRub: reconciliation.loadedMoneyTotalRub,
					quarantinedTotalRub: reconciliation.quarantinedMoneyTotalRub,
				},
				run: runStatusPayload(run),
				quarantinePreview,
			};
		},
	);

	/** Акт сверки в CSV с BOM: без него русский Excel показывает вопросительные знаки. */
	app.get<{ Params: { runId: string } }>(
		"/api/migration/:runId/reconciliation.csv",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"migration reconciliation csv",
			);
			if (!context) return;

			const run = await findRun(request.params.runId, context.organizationId);
			if (!run) {
				return fail(
					reply,
					404,
					"RunNotFound",
					"Прогон переноса не найден в этой организации.",
				);
			}

			const [reconciliation] = await db
				.select()
				.from(migrationReconciliations)
				.where(eq(migrationReconciliations.runId, run.id))
				.orderBy(desc(migrationReconciliations.generatedAt))
				.limit(1);

			if (!reconciliation) {
				return fail(
					reply,
					409,
					"ReconciliationNotReady",
					"Сверка ещё не сформирована.",
					{ status: run.status },
				);
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
			/*
			 * ЗДЕСЬ `reply.send` ОСТАЁТСЯ, И ЭТО НЕ ПРОПУСК. Тело ответа — не JSON, а
			 * строка CSV с BOM, отданная под собственным Content-Type и
			 * Content-Disposition; форму отправки такого тела трогать незачем. Записи в
			 * базу этот маршрут не делает вовсе — читает уже сформированную сверку,
			 * поэтому откладывать здесь нечего.
			 */
			return reply.send(`﻿${csv}`);
		},
	);

	/** Состояние фонового исполнителя — для диагностики и системной страницы. */
	app.get("/api/migration/worker/status", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"migration worker status",
		);
		if (!context) return;
		reply.code(200);
		return { worker: migrationWorkerStatus() };
	});

	/**
	 * Поиск баз старых систем на диске сервера.
	 *
	 * ЧЕМ ОТЛИЧАЕТСЯ ОТ /api/imports/smart/local-source-discovery
	 * Тот маршрут перечисляет каталоги и присваивает им вероятности, не открывая
	 * ни одного файла. Здесь каждый файл-кандидат открывается и опознаётся по
	 * содержимому, а ответ содержит факт, а не догадку: формат, версию, число
	 * записей и — для нечитаемых форматов — конкретную инструкцию, чем открыть.
	 *
	 * ПРАВА
	 * Требуется право на изменение, а не на чтение. Обход диска сервера — это
	 * действие уровня администратора: оно раскрывает структуру файловой системы,
	 * и давать его всем, кто может смотреть карточки, неправильно.
	 */
	app.post("/api/migration/discover", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"migration discovery",
		);
		if (!context) return;

		const parsed = discoverRequestSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return failSchemaRefusal(
				reply,
				parsed.error.issues,
				"Запрос поиска не прошёл проверку.",
				"поиск источников",
			);
		}

		try {
			const result = await discoverLocalSources({
				...(parsed.data.roots.length > 0 ? { roots: parsed.data.roots } : {}),
				maxDepth: parsed.data.maxDepth,
				timeBudgetMs: parsed.data.timeBudgetMs,
			});
			const summary = summarizeDiscovery(result);

			reply.code(200);
			return {
				roots: result.roots,
				summary,
				/**
				 * Читаемые источники идут первыми и отдельным списком: оператору нужно
				 * сразу видеть, что можно перенести прямо сейчас, а что требует выгрузки
				 * из старой программы.
				 */
				readySources: result.sources
					.filter((source) => source.format.readable)
					.slice(0, 60)
					.map((source) => ({
						filePath: source.filePath,
						fileName: source.fileName,
						byteSize: source.byteSize,
						modifiedAt: source.modifiedAt,
						format: source.format.title,
						formatId: source.format.id,
						version: source.format.version,
						details: source.details,
						relevance: source.relevance,
					})),
				needsExportSources: result.sources
					.filter((source) => !source.format.readable)
					.slice(0, 60)
					.map((source) => ({
						filePath: source.filePath,
						fileName: source.fileName,
						byteSize: source.byteSize,
						format: source.format.title,
						formatId: source.format.id,
						version: source.format.version,
						/** Что именно делать оператору. Ради этого поиск и нужен. */
						guidance: source.format.guidance,
						relevance: source.relevance,
					})),
				imagingFolders: result.imagingFolders.slice(0, 20),
				scan: {
					filesScanned: result.filesScanned,
					directoriesScanned: result.directoriesScanned,
					elapsedMs: result.elapsedMs,
					truncated: result.truncated,
				},
				warnings: result.warnings,
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Поиск не выполнен.";
			return fail(reply, 500, "DiscoveryFailed", message);
		}
	});

	/**
	 * Метаданные снимка DICOM.
	 *
	 * Нужен отдельно от переноса таблиц: снимки привязываются к пациентам по ФИО и
	 * дате рождения из самого снимка, и оператор должен увидеть, что там записано,
	 * до массовой привязки.
	 */
	app.post("/api/migration/dicom/inspect", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"migration dicom inspect",
		);
		if (!context) return;

		const parsed = dicomInspectSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return failSchemaRefusal(
				reply,
				parsed.error.issues,
				"Запрос разбора снимка не прошёл проверку.",
				"разбор снимка",
			);
		}

		try {
			const metadata = await readDicomMetadata(parsed.data.filePath);
			reply.code(200);
			return { filePath: parsed.data.filePath, metadata };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Снимок не разобран.";
			return fail(reply, 422, "DicomRejected", message, {
				filePath: parsed.data.filePath,
			});
		}
	});
}

export type { MigrationEntityKind, MigrationTargetField };
export { migrationRunRequestSchema };
