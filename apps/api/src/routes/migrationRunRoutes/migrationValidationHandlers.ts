import { realpath } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
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
import { safeLogError } from "../../observability/logger.js";
import { ADMIN_ROLES, getRequestIdentity } from "../../security/identity.js";
import {
	decodeHeaderText,
	dicomInspectSchema,
	discoverRequestSchema,
	fail,
	failSchemaRefusal,
} from "./types.js";

const BLOCKED_SYSTEM_ROOTS = [
	"/etc",
	"/proc",
	"/sys",
	"/dev",
	"/boot",
	"/root",
	"/var/run",
	"C:\\Windows",
	"C:\\ProgramData",
	"C:\\Program Files",
	"C:\\Program Files (x86)",
	"C:\\System Volume Information",
].map((p) => path.resolve(p).toLowerCase());

function isInsideRoot(target: string, root: string): boolean {
	const normTarget = process.platform === "win32" ? target.toLowerCase() : target;
	const normRoot = process.platform === "win32" ? root.toLowerCase() : root;
	return (
		normTarget === normRoot ||
		normTarget.startsWith(
			normRoot.endsWith(path.sep) ? normRoot : `${normRoot}${path.sep}`,
		)
	);
}

function getConfiguredMigrationAllowedRoots(): string[] {
	const configuredRootsRaw = process.env.DENTAL_MIGRATION_ALLOWED_ROOTS?.trim();
	if (configuredRootsRaw) {
		const parsed = configuredRootsRaw
			.split(/[;,]/)
			.map((r) => r.trim())
			.filter(Boolean)
			.map((r) => path.resolve(r));
		if (parsed.length > 0) {
			return parsed;
		}
	}
	return [path.resolve(process.cwd(), ".data", "migration-sources")];
}

async function resolveSafeMigrationPath(rawPath: string): Promise<string> {
	if (!rawPath || rawPath.includes("\0")) {
		throw new Error("Некорректный путь к файлу или каталогу.");
	}
	const resolved = path.resolve(rawPath.trim());
	let canonical = resolved;
	try {
		canonical = await realpath(resolved);
	} catch (err: unknown) {
		const code = (err as { code?: string } | null)?.code;
		if (code && code !== "ENOENT") {
			throw err;
		}
	}

	for (const blocked of BLOCKED_SYSTEM_ROOTS) {
		if (isInsideRoot(canonical, blocked)) {
			throw new Error("Доступ к системным каталогам операционной системы запрещён.");
		}
	}

	const uploadsBase = path.resolve(
		process.env.DENTAL_MIGRATION_UPLOAD_ROOT?.trim() ||
			path.join(process.cwd(), ".data", "migration-uploads"),
	);
	if (isInsideRoot(canonical, uploadsBase)) {
		throw new Error("Прямое чтение внутреннего хранилища загрузок запрещено.");
	}

	const allowedRoots = getConfiguredMigrationAllowedRoots();
	if (!allowedRoots.some((root) => isInsideRoot(canonical, root))) {
		throw new Error(
			"Указанный путь выходит за пределы разрешённых каталогов миграции (DENTAL_MIGRATION_ALLOWED_ROOTS).",
		);
	}

	return canonical;
}

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
		{ bodyLimit: MAX_UPLOAD_BYTES, config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration upload",
			);
			if (!context) return reply;

			// Имена приходят в процентной кодировке UTF-8: в заголовке кириллицы быть
			// не может, а файл «Пациенты.dbf» — обычное дело.
			const rawFileName = decodeHeaderText(
				request.headers["x-migration-file-name"],
				request.log,
			);
			const rawSourceName = decodeHeaderText(
				request.headers["x-migration-source-name"],
				request.log,
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
				request.log.warn(
					{ err: safeLogError(error), organizationId: context.organizationId, fileName: rawFileName },
					"[migration] Upload stream rejected",
				);
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
				request.log.warn(
					{ err: safeLogError(error), organizationId: context.organizationId, fileName: stored.fileName },
					"[migration] Unsupported source shape deleted",
				);
				await deleteUpload(stored.filePath);
				const message =
					error instanceof Error ? error.message : "Формат файла не распознан.";
				return fail(reply, 422, "SourceRejected", message, {
					fileName: stored.fileName,
					byteSize: stored.byteSize,
				});
			}

			const previous = await withTenantReadCtx(context.organizationId, async (tx) =>
				tx
					.select({ id: migrationRuns.id, createdAt: migrationRuns.createdAt })
					.from(migrationRuns)
					.where(
						and(
							eq(migrationRuns.organizationId, context.organizationId),
							eq(migrationRuns.sourceFingerprint, stored.fingerprint),
						),
					)
					.orderBy(desc(migrationRuns.createdAt))
					.limit(1),
			);

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
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/migration/discover",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration discovery",
			);
			if (!context) return reply;

			const identity = getRequestIdentity(request);
			if (
				identity.userId &&
				!(ADMIN_ROLES as readonly string[]).includes(identity.role ?? "")
			) {
				return fail(
					reply,
					403,
					"PermissionDenied",
					"Поиск локальных баз на сервере доступен только владельцу или администратору клиники.",
				);
			}

			const parsed = discoverRequestSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return failSchemaRefusal(
					reply,
					parsed.error.issues,
					"Запрос поиска не прошёл проверку.",
					"поиск источников",
				);
			}

			let validatedRoots: string[] = getConfiguredMigrationAllowedRoots();
			if (parsed.data.roots.length > 0) {
				try {
					validatedRoots = await Promise.all(
						parsed.data.roots.map((r) => resolveSafeMigrationPath(r)),
					);
				} catch (pathError) {
					return fail(
						reply,
						400,
						"InvalidMigrationPath",
						pathError instanceof Error
							? pathError.message
							: "Недопустимый каталог для поиска источников.",
					);
				}
			}

			try {
				const result = await discoverLocalSources({
					roots: validatedRoots,
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
				request.log.error(
					{ err: safeLogError(error), organizationId: context.organizationId },
					"[migration] Local source discovery failed",
				);
				const message =
					error instanceof Error ? error.message : "Поиск не выполнен.";
				return fail(reply, 500, "DiscoveryFailed", message);
			}
		},
	});

	/**
	 * Метаданные снимка DICOM.
	 *
	 * Нужен отдельно от переноса таблиц: снимки привязываются к пациентам по ФИО и
	 * дате рождения из самого снимка, и оператор должен увидеть, что там записано,
	 * до массовой привязки.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/migration/dicom/inspect",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"migration dicom inspect",
			);
			if (!context) return reply;

			const identity = getRequestIdentity(request);
			if (
				identity.userId &&
				!(ADMIN_ROLES as readonly string[]).includes(identity.role ?? "")
			) {
				return fail(
					reply,
					403,
					"PermissionDenied",
					"Инспекция файлов DICOM на сервере доступна только владельцу или администратору клиники.",
				);
			}

			const parsed = dicomInspectSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return failSchemaRefusal(
					reply,
					parsed.error.issues,
					"Запрос разбора снимка не прошёл проверку.",
					"разбор снимка",
				);
			}

			let safeFilePath: string;
			try {
				safeFilePath = await resolveSafeMigrationPath(parsed.data.filePath);
			} catch (pathError) {
				return fail(
					reply,
					400,
					"InvalidMigrationPath",
					pathError instanceof Error
						? pathError.message
						: "Недопустимый путь к файлу DICOM.",
				);
			}

			try {
				const metadata = await readDicomMetadata(safeFilePath);
				reply.code(200);
				return { filePath: safeFilePath, metadata };
			} catch (error) {
				request.log.error(
					{ err: safeLogError(error), organizationId: context.organizationId, filePath: safeFilePath },
					"[migration] DICOM metadata inspection failed",
				);
				const message =
					error instanceof Error ? error.message : "Снимок не разобран.";
				return fail(reply, 422, "DicomRejected", message, {
					filePath: safeFilePath,
				});
			}
		},
	});
}
