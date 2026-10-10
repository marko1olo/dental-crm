import { Readable } from "node:stream";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { migrationRuns } from "../../db/schema.js";
import {
	discoverLocalSources,
	summarizeDiscovery,
} from "../../migration/discovery.js";
import { readDicomMetadata } from "../../migration/formats/dicom.js";
import { createRun } from "../../migration/runStore.js";
import { detectSourceShape } from "../../migration/streamStage.js";
import {
	deleteUpload,
	MAX_UPLOAD_BYTES,
	storeUploadStream,
	UploadTooLargeError,
} from "../../migration/uploadStore.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	decodeHeaderText,
	dicomInspectSchema,
	discoverRequestSchema,
	fail,
	failSchemaRefusal,
} from "./types.js";

/**
 * Обработчики валидации форматов (CSV/XML/JSON/DBF/1C/InfoDent/D4W),
 * потоковой заливки файлов, автоматического обнаружения источников и разбора DICOM.
 */
export function registerMigrationValidationRoutes(app: FastifyInstance): void {
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
