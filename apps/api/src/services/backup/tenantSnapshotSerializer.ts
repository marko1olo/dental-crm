import crypto from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import pg from "pg";
import { requireDatabaseUrl } from "../../db/client.js";
import { createApiLogger, safeLogError } from "../../observability/index.js";
import {
	type BackupResult,
	backupsDirectory,
	pruneOldBackups,
	removePartialFile,
	resolveEncryptionKey,
} from "./backupCryptoUtils.js";
import {
	type BackupTableMeta,
	buildSchemaBackupDag,
	serializeSnapshotValueForNdjson,
} from "./schemaBackupRegistry.js";

const logger = createApiLogger("backupWorker");

export const BACKUP_FORMAT_V2 = "DENTETB2";
export const BACKUP_V2_MAGIC = Buffer.from("DENTETB2", "ascii");
export const BACKUP_V2_HEADER_LEN = 44;
export const BACKUP_V2_GCM_TAG_LEN = 16;
const BACKUP_SQL_PAGE_SIZE = 500;
const BACKUP_NDJSON_BATCH_ROWS = 100;

export interface CreateTenantBackupOptions {
	readonly sanitizeForSupport?: boolean | undefined;
	readonly databaseUrl?: string | undefined;
	readonly backupDir?: string | undefined;
}

// Строгий семафор maxConcurrentBackups = 1: предотвращает параллельное чтение
// тяжёлых снимков на 5400 RPM HDD и перегрузку V8 Heap.
let activeBackupMutex: Promise<void> = Promise.resolve();

async function withBackupSemaphore<T>(task: () => Promise<T>): Promise<T> {
	const prev = activeBackupMutex;
	let release: (() => void) | undefined;
	activeBackupMutex = new Promise<void>((resolve) => {
		release = resolve;
	});
	await prev;
	try {
		return await task();
	} finally {
		release?.();
	}
}

function serializeNdjsonLine(frame: unknown): string {
	return `${JSON.stringify(frame, (_key, value) =>
		serializeSnapshotValueForNdjson(value),
	)}\n`;
}

async function writeLine(stream: PassThrough, line: string): Promise<void> {
	if (!stream.write(line, "utf8")) {
		await once(stream, "drain");
	}
}

async function readMigrationHead(client: pg.Client): Promise<string> {
	try {
		await client.query("SAVEPOINT sp_mig_head");
		const regRes = await client.query<{ reg: string | null }>(
			"SELECT to_regclass('public._dente_migrations')::text AS reg",
		);
		if (!regRes.rows[0]?.reg) {
			await client.query("RELEASE SAVEPOINT sp_mig_head");
			return "unknown";
		}
		const migRes = await client.query<{ name: string }>(
			"SELECT name FROM _dente_migrations ORDER BY applied_at DESC, name DESC LIMIT 1",
		);
		await client.query("RELEASE SAVEPOINT sp_mig_head");
		return migRes.rows[0]?.name ?? "unknown";
	} catch (err) {
		try {
			await client.query("ROLLBACK TO SAVEPOINT sp_mig_head");
			await client.query("RELEASE SAVEPOINT sp_mig_head");
		} catch {
			// транзакция уже откачена или соединение закрыто
		}
		logger.warn(
			{ err: safeLogError(err) },
			"Не удалось прочитать _dente_migrations при создании снимка",
		);
		return "unknown";
	}
}

function buildCursorParams(
	organizationId: string,
	tableMeta: BackupTableMeta,
	lastRow: Record<string, unknown> | null,
): unknown[] {
	if (!lastRow) {
		return [organizationId, BACKUP_SQL_PAGE_SIZE];
	}
	const pkValues = tableMeta.pkSqlCols.map((col) => lastRow[col]);
	return [organizationId, ...pkValues, BACKUP_SQL_PAGE_SIZE];
}

/**
 * Создаёт полный потоковый Disaster Recovery бэкап ОДНОЙ клиники в формате `DENTETB2`
 * (44B заголовок -> NDJSON -> gzip -> AES-256-GCM -> 16B хвост AuthTag).
 *
 * Гарантии:
 * 1. Автоматически выгружает ВСЕ боевые таблицы схемы (~183 таблицы тенанта) по
 *    `schemaBackupRegistry` в топологическом порядке FK DAG.
 * 2. Выполняется через выделенный короткоживущий `pg.Client` внутри
 *    `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` (не занимает HTTP-пул и
 *    читает все таблицы на единый срез MVCC без блокировки врачей).
 * 3. Использует линейную keyset-пагинацию `ORDER BY pk ASC LIMIT 500` вместо O(N^2) OFFSET.
 * 4. Сохраняет 100% полей учётных записей (`password_hash`, `pin_code_hash`, `login_id`)
 *    для реального аварийного восстановления (опциональное обезличивание — только
 *    при `sanitizeForSupport: true`).
 */
export async function createTenantEncryptedBackup(
	organizationId: string,
	options?: CreateTenantBackupOptions,
): Promise<BackupResult> {
	return withBackupSemaphore(() =>
		executeTenantEncryptedBackup(organizationId, options),
	);
}

async function executeTenantEncryptedBackup(
	organizationId: string,
	options?: CreateTenantBackupOptions,
): Promise<BackupResult> {
	const keyResult = resolveEncryptionKey();
	if ("error" in keyResult) {
		logger.error(
			{ err: keyResult.error, organizationId },
			"CLINIC_ENCRYPTION_KEY invalid or missing for tenant backup",
		);
		return { success: false, error: keyResult.error };
	}

	const sanitizeForSupport = options?.sanitizeForSupport === true;
	const targetDir = options?.backupDir ?? backupsDirectory();
	let finalPath = "";
	let partPath = "";
	let pgClient: pg.Client | null = null;

	try {
		await fsp.mkdir(targetDir, { recursive: true });

		const dag = buildSchemaBackupDag();
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const suffix = sanitizeForSupport ? "_support" : "";
		finalPath = path.join(
			targetDir,
			`org_${organizationId}_backup_${timestamp}${suffix}.dentalbackup`,
		);
		partPath = `${finalPath}.part`;

		const salt = crypto.randomBytes(16);
		const iv = crypto.randomBytes(12);
		const headerBuf = Buffer.alloc(BACKUP_V2_HEADER_LEN);
		BACKUP_V2_MAGIC.copy(headerBuf, 0);
		salt.copy(headerBuf, 8);
		iv.copy(headerBuf, 24);
		headerBuf.writeUInt32BE(dag.orderedTables.length, 36);
		headerBuf.writeUInt32BE(sanitizeForSupport ? 1 : 0, 40);

		const cipher = crypto.createCipheriv("aes-256-gcm", keyResult.key, iv);
		cipher.setAAD(headerBuf);

		const ndjsonStream = new PassThrough({ highWaterMark: 64 * 1024 });
		const gzipStream = zlib.createGzip({ level: 6 });
		const partWriteStream = fs.createWriteStream(partPath, {
			flags: "w",
			mode: 0o600,
		});
		partWriteStream.write(headerBuf);

		const pipelinePromise = pipeline(
			ndjsonStream,
			gzipStream,
			cipher,
			partWriteStream,
		);

		const dbUrl = options?.databaseUrl ?? requireDatabaseUrl();
		pgClient = new pg.Client({ connectionString: dbUrl });
		await pgClient.connect();

		let patientsCount = 0;
		let visitsCount = 0;
		let totalRows = 0;
		let populatedTables = 0;
		let orgFound = false;

		try {
			await pgClient.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
			await pgClient.query(
				"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true), set_config('statement_timeout', '120000', true)",
				[organizationId],
			);

			const orgRes = await pgClient.query<Record<string, unknown>>(
				'SELECT * FROM "public"."organizations" WHERE "id" = $1 LIMIT 1',
				[organizationId],
			);
			orgFound = orgRes.rows.length > 0;

			if (orgFound) {
				const migrationHead = await readMigrationHead(pgClient);
				await writeLine(
					ndjsonStream,
					serializeNdjsonLine({
						kind: "header",
						format: BACKUP_FORMAT_V2,
						organizationId,
						createdAt: new Date().toISOString(),
						migrationHead,
						sanitizedForSupport: sanitizeForSupport,
						tableOrder: dag.orderedTables.map((t) => t.sqlName),
					}),
				);

				for (const tableMeta of dag.orderedTables) {
					await writeLine(
						ndjsonStream,
						serializeNdjsonLine({
							kind: "table_begin",
							table: tableMeta.sqlName,
							deferredCols: tableMeta.deferredNullableColumns,
						}),
					);

					const tableHash = crypto.createHash("sha256");
					let tableRowsCount = 0;
					let lastRow: Record<string, unknown> | null = null;

					while (true) {
						const querySql = tableMeta.buildSelectPageSql(lastRow !== null);
						const params = buildCursorParams(organizationId, tableMeta, lastRow);
						const pageRes = await pgClient.query<Record<string, unknown>>(
							querySql,
							params,
						);
						const rows = pageRes.rows;
						if (rows.length === 0) break;

						if (tableMeta.sqlName === "patients") {
							patientsCount += rows.length;
						} else if (tableMeta.sqlName === "visits") {
							visitsCount += rows.length;
						}

						const normalizedRows = sanitizeForSupport
							? rows.map((row) => tableMeta.sanitizeRowForSupport(row))
							: rows;

						for (
							let i = 0;
							i < normalizedRows.length;
							i += BACKUP_NDJSON_BATCH_ROWS
						) {
							const batch = normalizedRows.slice(
								i,
								i + BACKUP_NDJSON_BATCH_ROWS,
							);
							const frameLine = serializeNdjsonLine({
								kind: "rows",
								table: tableMeta.sqlName,
								rows: batch,
							});
							tableHash.update(frameLine, "utf8");
							await writeLine(ndjsonStream, frameLine);
						}

						tableRowsCount += rows.length;
						totalRows += rows.length;
						lastRow = rows[rows.length - 1] ?? null;

						if (rows.length < BACKUP_SQL_PAGE_SIZE) break;
					}

					if (tableRowsCount > 0) populatedTables += 1;

					await writeLine(
						ndjsonStream,
						serializeNdjsonLine({
							kind: "table_end",
							table: tableMeta.sqlName,
							rowCount: tableRowsCount,
							sha256: tableHash.digest("hex"),
						}),
					);
				}

				await writeLine(
					ndjsonStream,
					serializeNdjsonLine({
						kind: "footer",
						totalTables: dag.orderedTables.length,
						populatedTables,
						totalRows,
					}),
				);
			}

			await pgClient.query("COMMIT");
		} catch (txError) {
			try {
				await pgClient.query("ROLLBACK");
			} catch (rbErr) {
				logger.warn(
					{ err: safeLogError(rbErr), organizationId },
					"Ошибка отката read-only транзакции бэкапа",
				);
			}
			ndjsonStream.destroy(
				txError instanceof Error ? txError : new Error(String(txError)),
			);
			await pipelinePromise.catch((pipeErr) => {
				logger.debug(
					{ err: safeLogError(pipeErr), organizationId, filePath: partPath },
					"Поток шифрования DENTETB2 остановлен при откате транзакции",
				);
			});
			throw txError;
		} finally {
			try {
				await pgClient.end();
			} catch (closeErr) {
				logger.warn(
					{ err: safeLogError(closeErr), organizationId },
					"Ошибка закрытия выделенного pg.Client бэкапа",
				);
			}
			pgClient = null;
		}

		ndjsonStream.end();
		await pipelinePromise;

		if (!orgFound) {
			removePartialFile(partPath);
			return {
				success: false,
				error: "Организация не найдена для создания резервной копии.",
			};
		}

		// Записываем 16-байтный AES-GCM AuthTag строго в хвост файла (EOF-16 .. EOF)
		const authTag = cipher.getAuthTag();
		await fsp.appendFile(partPath, authTag);
		await fsp.rename(partPath, finalPath);

		logger.info(
			{
				format: BACKUP_FORMAT_V2,
				organizationId,
				filePath: finalPath,
				patientsCount,
				visitsCount,
				tablesCount: dag.orderedTables.length,
				populatedTables,
				totalRows,
				sanitizedForSupport: sanitizeForSupport,
			},
			"Полный потоковый DR-бэкап клиники DENTETB2 успешно создан и зашифрован",
		);
		pruneOldBackups();
		return { success: true, filePath: finalPath };
	} catch (error) {
		if (partPath) removePartialFile(partPath);
		if (finalPath) removePartialFile(finalPath);
		const message = error instanceof Error ? error.message : String(error);
		logger.error(
			{ err: safeLogError(error), organizationId, filePath: finalPath },
			"Ошибка создания изолированной копии клиники DENTETB2",
		);
		return { success: false, error: message };
	}
}
