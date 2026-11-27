import crypto from "node:crypto";
import { once } from "node:events";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { PassThrough, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import type pg from "pg";
import { createApiLogger, safeLogError } from "../../observability/index.js";
import { TENANT_BACKUP_FORMAT } from "./backupCryptoUtils.js";
import {
	APPEND_ONLY_AUDIT_TABLES,
	type BackupTableMeta,
	type DeferredLinkRecord,
	type ForeignKeyEdgeInput,
	type SchemaBackupDag,
	buildSchemaBackupDag,
} from "./schemaBackupRegistry.js";
import {
	BACKUP_FORMAT_V2,
	BACKUP_V2_GCM_TAG_LEN,
	BACKUP_V2_HEADER_LEN,
} from "./tenantSnapshotSerializer.js";

const logger = createApiLogger("streamingSnapshotRestorer");

const LEGACY_V1_HEADER_LEN = 36; // 8B "DENTETB1" + 12B IV + 16B AuthTag
const RESTORE_BATCH_ROWS = 200;
const DEFERRED_UPDATE_BATCH_SIZE = 250;

export interface RestoreSnapshotResult {
	readonly restoredTables: number;
	readonly restoredRows: number;
	readonly format: "DENTETB2" | "DENTETB1";
}

type NdjsonSnapshotFrame =
	| {
			kind: "header";
			format: string;
			organizationId: string;
			createdAt?: string;
			migrationHead?: string;
			tableOrder?: string[];
	  }
	| { kind: "table_begin"; table: string; deferredCols?: string[] }
	| { kind: "rows"; table: string; rows: Array<Record<string, unknown>> }
	| { kind: "table_end"; table: string; rowCount: number; sha256?: string }
	| { kind: "footer"; totalTables: number; totalRows: number };

function quoteIdent(ident: string): string {
	return `"${ident.replace(/"/g, '""')}"`;
}

async function queryLivePgForeignKeys(
	pgClient: pg.Client,
): Promise<ForeignKeyEdgeInput[]> {
	try {
		const res = await pgClient.query<{
			src_table: string;
			src_col: string;
			dst_table: string;
			dst_col: string;
			is_nullable: string;
		}>(`
			SELECT
				tc.table_name AS src_table,
				kcu.column_name AS src_col,
				ccu.table_name AS dst_table,
				ccu.column_name AS dst_col,
				c.is_nullable
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			JOIN information_schema.columns c
				ON c.table_schema = tc.table_schema
				AND c.table_name = tc.table_name
				AND c.column_name = kcu.column_name
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_schema = 'public'
		`);
		return res.rows.map((r) => ({
			srcTable: r.src_table,
			srcCols: [r.src_col],
			dstTable: r.dst_table,
			dstCols: [r.dst_col],
			nullable: r.is_nullable === "YES",
		}));
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err) },
			"Не удалось прочитать живые FK из information_schema, используется статический граф Drizzle",
		);
		return [];
	}
}

async function queryNonDeletableTables(
	pgClient: pg.Client,
): Promise<Set<string>> {
	const nonDeletable = new Set<string>(APPEND_ONLY_AUDIT_TABLES);
	try {
		const res = await pgClient.query<{ table_name: string }>(`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
			  AND table_type = 'BASE TABLE'
			  AND NOT has_table_privilege(current_user, format('%I.%I', table_schema, table_name), 'DELETE')
		`);
		for (const row of res.rows) {
			nonDeletable.add(row.table_name);
		}
	} catch (err) {
		logger.warn(
			{ err: safeLogError(err) },
			"Не удалось проверить права DELETE в information_schema; используется список APPEND_ONLY_AUDIT_TABLES",
		);
	}
	return nonDeletable;
}

async function clearExistingTenantDataReverseOrder(
	pgClient: pg.Client,
	dag: SchemaBackupDag,
	expectedOrganizationId: string,
	nonDeletableTables: ReadonlySet<string>,
): Promise<void> {
	// Сначала обнуляем отложенные nullable-ссылки для разрыва циклов/self-FK без SUPERUSER
	for (const tableMeta of dag.orderedTables) {
		if (tableMeta.isAppendOnly || nonDeletableTables.has(tableMeta.sqlName)) {
			continue;
		}
		const clearSql = tableMeta.buildClearDeferredSql();
		if (clearSql) {
			await pgClient.query(clearSql, [expectedOrganizationId]);
		}
	}

	// Удаляем строго в обратном топологическом порядке FK DAG (от листьев к корням)
	for (const tableMeta of [...dag.orderedTables].reverse()) {
		if (tableMeta.sqlName === "organizations") continue;
		if (tableMeta.isAppendOnly || nonDeletableTables.has(tableMeta.sqlName)) {
			continue;
		}
		if (tableMeta.sqlName === "users") {
			// audit_events.actor_user_id -> users.id (без ON DELETE) для WORM-журнала:
			// сохраняем пользователей, на которых ссылается неизменяемый аудит,
			// а их поля затем обновятся из бэкапа через ON CONFLICT DO UPDATE.
			await pgClient.query(
				`DELETE FROM "public"."users" AS u WHERE u."organization_id" = $1 AND NOT EXISTS (SELECT 1 FROM "public"."audit_events" AS ae WHERE ae."actor_user_id" = u."id")`,
				[expectedOrganizationId],
			);
			continue;
		}
		if (tableMeta.kind === "TENANT_OWNED_DIRECT") {
			await pgClient.query(
				`DELETE FROM "public".${quoteIdent(tableMeta.sqlName)} WHERE "organization_id" = $1`,
				[expectedOrganizationId],
			);
		} else {
			await pgClient.query(tableMeta.buildDeleteChildSql(), [
				expectedOrganizationId,
			]);
		}
	}
}

async function writeDeferredLinkLine(
	deferredOut: fs.WriteStream,
	record: DeferredLinkRecord,
): Promise<void> {
	const line = `${JSON.stringify(record)}\n`;
	if (!deferredOut.write(line, "utf8")) {
		await once(deferredOut, "drain");
	}
}

async function flushDeferredUpdateBatch(
	pgClient: pg.Client,
	tableMeta: BackupTableMeta,
	colName: string,
	records: readonly DeferredLinkRecord[],
	expectedOrganizationId: string,
): Promise<void> {
	if (records.length === 0) return;
	const targetColMeta = tableMeta.columnsBySqlName.get(colName);
	if (!targetColMeta) return;

	const pkColMetas = tableMeta.pkSqlCols
		.map((pk) => tableMeta.columnsBySqlName.get(pk))
		.filter((m): m is NonNullable<typeof m> => Boolean(m));
	if (pkColMetas.length !== tableMeta.pkSqlCols.length) return;

	const params: unknown[] = [];
	const tuples: string[] = [];

	for (const rec of records) {
		const placeholders: string[] = [];
		for (const pkMeta of pkColMetas) {
			params.push(rec.pk[pkMeta.sqlName]);
			placeholders.push(`$${params.length}::${pkMeta.sqlType}`);
		}
		params.push(rec.val);
		placeholders.push(`$${params.length}::${targetColMeta.sqlType}`);
		tuples.push(`(${placeholders.join(", ")})`);
	}

	const vCols = [
		...pkColMetas.map((m, idx) => `pk_${idx}`),
		"target_val",
	].join(", ");
	const whereClauses = pkColMetas
		.map((m, idx) => `t.${quoteIdent(m.sqlName)} = v.pk_${idx}`)
		.join(" AND ");

	let tenantClause = "";
	if (tableMeta.kind === "TENANT_OWNED_DIRECT" && tableMeta.hasOrgIdColumn) {
		params.push(expectedOrganizationId);
		tenantClause = ` AND t."organization_id" = $${params.length}`;
	}

	const sql =
		`UPDATE "public".${quoteIdent(tableMeta.sqlName)} AS t ` +
		`SET ${quoteIdent(colName)} = v.target_val ` +
		`FROM (VALUES ${tuples.join(", ")}) AS v(${vCols}) ` +
		`WHERE ${whereClauses}${tenantClause}`;
	await pgClient.query(sql, params);
}

async function applyDeferredForeignKeysStreaming(
	pgClient: pg.Client,
	deferredLinksPath: string,
	dag: SchemaBackupDag,
	expectedOrganizationId: string,
): Promise<void> {
	const stat = await fsp.stat(deferredLinksPath).catch(() => null);
	if (!stat || stat.size === 0) return;

	const pendingByKey = new Map<string, DeferredLinkRecord[]>();
	const rl = readline.createInterface({
		input: fs.createReadStream(deferredLinksPath, {
			encoding: "utf8",
			highWaterMark: 64 * 1024,
		}),
		crlfDelay: Number.POSITIVE_INFINITY,
	});

	try {
		for await (const line of rl) {
			if (!line.trim()) continue;
			const record = JSON.parse(line) as DeferredLinkRecord;
			const key = `${record.table}\u0000${record.col}`;
			let bucket = pendingByKey.get(key);
			if (!bucket) {
				bucket = [];
				pendingByKey.set(key, bucket);
			}
			bucket.push(record);

			if (bucket.length >= DEFERRED_UPDATE_BATCH_SIZE) {
				const tableMeta = dag.bySqlName.get(record.table);
				if (tableMeta) {
					await flushDeferredUpdateBatch(
						pgClient,
						tableMeta,
						record.col,
						bucket,
						expectedOrganizationId,
					);
				}
				bucket.length = 0;
			}
		}

		for (const [key, bucket] of pendingByKey.entries()) {
			if (bucket.length === 0) continue;
			const sepIdx = key.indexOf("\u0000");
			const tableName = key.slice(0, sepIdx);
			const colName = key.slice(sepIdx + 1);
			const tableMeta = dag.bySqlName.get(tableName);
			if (tableMeta) {
				await flushDeferredUpdateBatch(
					pgClient,
					tableMeta,
					colName,
					bucket,
					expectedOrganizationId,
				);
			}
		}
	} finally {
		rl.close();
	}
}

export interface StreamingSnapshotSourceHandle {
	readonly inputStream: Readable;
	readonly verifyStreamCompleted?: (() => Promise<void>) | undefined;
	readonly cleanup?: (() => Promise<void>) | undefined;
}

/**
 * Потоково восстанавливает уже расшифрованный поток NDJSON формата `DENTETB2`
 * в открытую или новую транзакцию PostgreSQL 18 (куча V8 < 25 МБ).
 */
export async function restoreNdjsonSnapshotStreamToPg(params: {
	readonly inputStream?: Readable | undefined;
	readonly openInputStream?: (() => StreamingSnapshotSourceHandle) | undefined;
	readonly expectedOrganizationId: string;
	readonly pgClient: pg.Client;
	readonly tempDir?: string | undefined;
	readonly verifyStreamCompleted?: (() => Promise<void>) | undefined;
}): Promise<{ restoredTables: number; restoredRows: number }> {
	const { expectedOrganizationId, pgClient } = params;
	const tempDir = params.tempDir ?? os.tmpdir();
	await fsp.mkdir(tempDir, { recursive: true });
	const deferredLinksPath = path.join(
		tempDir,
		`dente_deferred_links_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.ndjson`,
	);
	const deferredOut = fs.createWriteStream(deferredLinksPath, { encoding: "utf8" });

	let restoredTables = 0;
	let restoredRows = 0;
	let headerSeen = false;
	let footerSeen = false;
	let openedHandle: StreamingSnapshotSourceHandle | null = null;

	const [liveFks, nonDeletableTables] = await Promise.all([
		queryLivePgForeignKeys(pgClient),
		queryNonDeletableTables(pgClient),
	]);
	const dag = buildSchemaBackupDag(liveFks);

	await pgClient.query("BEGIN");
	try {
		await pgClient.query(
			"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
			[expectedOrganizationId],
		);

		await clearExistingTenantDataReverseOrder(
			pgClient,
			dag,
			expectedOrganizationId,
			nonDeletableTables,
		);

		openedHandle = params.openInputStream
			? params.openInputStream()
			: params.inputStream
				? {
						inputStream: params.inputStream,
						verifyStreamCompleted: params.verifyStreamCompleted,
					}
				: null;
		if (!openedHandle) {
			throw new Error("restoreNdjsonSnapshotStreamToPg: inputStream or openInputStream is required");
		}

		const activeInput = openedHandle.inputStream;
		const verifyCompleted = openedHandle.verifyStreamCompleted;

		let streamError: Error | null = null;
		const onStreamError = (err: unknown) => {
			if (!streamError) {
				streamError = err instanceof Error ? err : new Error(String(err));
			}
			rl.close();
		};
		if (activeInput.errored) {
			throw activeInput.errored;
		}
		activeInput.on("error", onStreamError);

		const rl = readline.createInterface({
			input: activeInput,
			crlfDelay: Number.POSITIVE_INFINITY,
		});
		rl.on("error", onStreamError);

		const tableHashes = new Map<string, crypto.Hash>();
		const tableCounts = new Map<string, number>();

		try {
			for await (const line of rl) {
				if (streamError) throw streamError;
				if (!line.trim()) continue;
				const frame = JSON.parse(line) as NdjsonSnapshotFrame;

				if (frame.kind === "header") {
					if (frame.format !== BACKUP_FORMAT_V2) {
						throw new Error(`Unsupported NDJSON snapshot format: ${frame.format}`);
					}
					if (frame.organizationId !== expectedOrganizationId) {
						throw new Error(
							`Tenant mismatch in archive: header=${frame.organizationId}, expected=${expectedOrganizationId}`,
						);
					}
					headerSeen = true;
				} else if (frame.kind === "table_begin") {
					if (!headerSeen) {
						throw new Error("Corrupted snapshot: table_begin appeared before header");
					}
					tableHashes.set(frame.table, crypto.createHash("sha256"));
					tableCounts.set(frame.table, 0);
				} else if (frame.kind === "rows") {
					if (!headerSeen) {
						throw new Error("Corrupted snapshot: rows appeared before header");
					}
					const hash = tableHashes.get(frame.table);
					if (hash) {
						hash.update(`${line}\n`, "utf8");
					}
					const meta = dag.bySqlName.get(frame.table);
					if (!meta || frame.rows.length === 0) continue;

					const pendingDeferred: DeferredLinkRecord[] = [];
					for (let i = 0; i < frame.rows.length; i += RESTORE_BATCH_ROWS) {
						const slice = frame.rows.slice(i, i + RESTORE_BATCH_ROWS);
						const sanitizedSlice = meta.extractDeferredLinks(slice, (linkRecord) => {
							pendingDeferred.push(linkRecord);
						});
						const inserted = await meta.insertBatchMultiRow(
							pgClient,
							sanitizedSlice,
							expectedOrganizationId,
						);
						restoredRows += inserted;
						tableCounts.set(
							frame.table,
							(tableCounts.get(frame.table) ?? 0) + slice.length,
						);
					}

					for (const link of pendingDeferred) {
						await writeDeferredLinkLine(deferredOut, link);
					}
				} else if (frame.kind === "table_end") {
					const expectedCount = tableCounts.get(frame.table) ?? 0;
					if (expectedCount !== frame.rowCount) {
						throw new Error(
							`Row count mismatch for table "${frame.table}": expected ${frame.rowCount}, got ${expectedCount}`,
						);
					}
					if (frame.sha256) {
						const actualSha = tableHashes.get(frame.table)?.digest("hex");
						if (actualSha !== frame.sha256) {
							throw new Error(
								`SHA-256 checksum mismatch for table "${frame.table}"`,
							);
						}
					}
					if (frame.rowCount > 0) restoredTables += 1;
				} else if (frame.kind === "footer") {
					footerSeen = true;
				}
			}
		} finally {
			activeInput.off("error", onStreamError);
			rl.close();
		}

		if (streamError) {
			throw streamError;
		}

		// КРИТИЧНО (Anti-Cryptographic-Doom): ждём полного завершения пайплайна
		// (включая decipher._flush и проверку 16B GCM AuthTag в хвосте файла)
		// СТРОГО ДО COMMIT!
		if (verifyCompleted) {
			await verifyCompleted();
		}

		if (!headerSeen || !footerSeen) {
			throw new Error(
				"Incomplete backup stream: missing DENTETB2 header or footer before COMMIT",
			);
		}

		await new Promise<void>((resolve, reject) => {
			deferredOut.end((err?: Error | null) => (err ? reject(err) : resolve()));
		});

		await applyDeferredForeignKeysStreaming(
			pgClient,
			deferredLinksPath,
			dag,
			expectedOrganizationId,
		);

		await pgClient.query("COMMIT");
		return { restoredTables, restoredRows };
	} catch (err) {
		try {
			await pgClient.query("ROLLBACK");
		} catch (rbErr) {
			logger.warn(
				{ err: safeLogError(rbErr), expectedOrganizationId },
				"Ошибка отката транзакции восстановления DENTETB2",
			);
		}
		throw err;
	} finally {
		if (openedHandle?.cleanup) {
			await openedHandle.cleanup().catch((cleanupErr) => {
				logger.debug(
					{ err: safeLogError(cleanupErr), expectedOrganizationId },
					"Ошибка очистки потока при восстановлении DENTETB2",
				);
			});
		}
		deferredOut.destroy();
		try {
			await fsp.unlink(deferredLinksPath);
		} catch (unlinkErr) {
			logger.debug(
				{ err: safeLogError(unlinkErr), deferredLinksPath },
				"Временный файл deferred_links уже удалён",
			);
		}
	}
}

/**
 * Восстанавливает зашифрованный архив клиники (`DENTETB2` потоково с проверкой
 * GCM AuthTag ДО `COMMIT`, либо legacy `DENTETB1` для обратной совместимости).
 */
export async function restoreTenantSnapshotStreaming(params: {
	readonly archivePath: string;
	readonly encryptionKey32Bytes: Buffer;
	readonly expectedOrganizationId: string;
	readonly pgClient: pg.Client;
	readonly tempDir?: string | undefined;
}): Promise<RestoreSnapshotResult> {
	const {
		archivePath,
		encryptionKey32Bytes,
		expectedOrganizationId,
		pgClient,
		tempDir,
	} = params;

	const stat = await fsp.stat(archivePath);
	if (stat.size < LEGACY_V1_HEADER_LEN) {
		throw new Error(
			"Corrupted backup archive: file smaller than minimum header length",
		);
	}

	const probeBuf = Buffer.alloc(Math.min(BACKUP_V2_HEADER_LEN, stat.size));
	const fh = await fsp.open(archivePath, "r");
	try {
		await fh.read(probeBuf, 0, probeBuf.length, 0);
	} finally {
		await fh.close();
	}

	const magic = probeBuf.subarray(0, 8).toString("ascii");
	if (magic === "DENTETB1") {
		return restoreLegacyDenteTb1Archive({
			archivePath,
			encryptionKey32Bytes,
			expectedOrganizationId,
			pgClient,
			tempDir,
		});
	}

	if (magic !== BACKUP_FORMAT_V2) {
		throw new Error(
			`Unsupported archive magic "${magic}" (expected DENTETB2 or DENTETB1)`,
		);
	}

	if (stat.size < BACKUP_V2_HEADER_LEN + BACKUP_V2_GCM_TAG_LEN) {
		throw new Error(
			"Corrupted backup archive: file smaller than DENTETB2 envelope",
		);
	}

	const authTagBuf = Buffer.alloc(BACKUP_V2_GCM_TAG_LEN);
	const tagFh = await fsp.open(archivePath, "r");
	try {
		await tagFh.read(
			authTagBuf,
			0,
			BACKUP_V2_GCM_TAG_LEN,
			stat.size - BACKUP_V2_GCM_TAG_LEN,
		);
	} finally {
		await tagFh.close();
	}

	const iv = probeBuf.subarray(24, 36);
	const res = await restoreNdjsonSnapshotStreamToPg({
		openInputStream: () => {
			const decipher = crypto.createDecipheriv(
				"aes-256-gcm",
				encryptionKey32Bytes,
				iv,
			);
			decipher.setAAD(probeBuf);
			decipher.setAuthTag(authTagBuf);
			const gunzip = zlib.createGunzip();

			const cipherReadStream = fs.createReadStream(archivePath, {
				start: BACKUP_V2_HEADER_LEN,
				end: stat.size - BACKUP_V2_GCM_TAG_LEN - 1,
				highWaterMark: 64 * 1024,
			});
			const plainOut = new PassThrough({ highWaterMark: 64 * 1024 });
			const decryptPipelinePromise = pipeline(
				cipherReadStream,
				decipher,
				gunzip,
				plainOut,
			);
			decryptPipelinePromise.catch((pipeErr) => {
				logger.debug(
					{ err: safeLogError(pipeErr), expectedOrganizationId },
					"Поток расшифровки DENTETB2 завершён с ошибкой",
				);
			});

			return {
				inputStream: plainOut,
				verifyStreamCompleted: () => decryptPipelinePromise,
				cleanup: async () => {
					cipherReadStream.destroy();
					plainOut.destroy();
					await decryptPipelinePromise.catch((cleanupPipeErr) => {
						logger.debug(
							{ err: safeLogError(cleanupPipeErr), expectedOrganizationId },
							"Очистка потока расшифровки DENTETB2",
						);
					});
				},
			};
		},
		expectedOrganizationId,
		pgClient,
		tempDir,
	});
	return { ...res, format: "DENTETB2" };
}

async function restoreLegacyDenteTb1Archive(params: {
	readonly archivePath: string;
	readonly encryptionKey32Bytes: Buffer;
	readonly expectedOrganizationId: string;
	readonly pgClient: pg.Client;
	readonly tempDir?: string | undefined;
}): Promise<RestoreSnapshotResult> {
	const { archivePath, encryptionKey32Bytes, expectedOrganizationId, pgClient } =
		params;

	const stat = await fsp.stat(archivePath);
	const headerBuf = Buffer.alloc(LEGACY_V1_HEADER_LEN);
	const fh = await fsp.open(archivePath, "r");
	try {
		await fh.read(headerBuf, 0, LEGACY_V1_HEADER_LEN, 0);
	} finally {
		await fh.close();
	}

	const iv = headerBuf.subarray(8, 20);
	const authTag = headerBuf.subarray(20, 36);

	const decipher = crypto.createDecipheriv(
		"aes-256-gcm",
		encryptionKey32Bytes,
		iv,
	);
	decipher.setAAD(
		Buffer.from(`${TENANT_BACKUP_FORMAT}:${expectedOrganizationId}`, "utf8"),
	);
	decipher.setAuthTag(authTag);

	const gunzip = zlib.createGunzip();
	const readStream = fs.createReadStream(archivePath, {
		start: LEGACY_V1_HEADER_LEN,
		end: stat.size - 1,
		highWaterMark: 64 * 1024,
	});
	const plainOut = new PassThrough({ highWaterMark: 64 * 1024 });
	const decryptPipelinePromise = pipeline(readStream, decipher, gunzip, plainOut);
	decryptPipelinePromise.catch((pipeErr) => {
		logger.debug(
			{ err: safeLogError(pipeErr), expectedOrganizationId },
			"Поток расшифровки legacy DENTETB1 завершён с ошибкой",
		);
	});

	const chunks: Buffer[] = [];
	const MAX_LEGACY_V1_JSON_BYTES = 256 * 1024 * 1024;
	let totalBytes = 0;

	try {
		for await (const chunk of plainOut) {
			const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			totalBytes += buf.length;
			if (totalBytes > MAX_LEGACY_V1_JSON_BYTES) {
				throw new Error(
					"Legacy DENTETB1 snapshot exceeds 256 MiB memory safety ceiling",
				);
			}
			chunks.push(buf);
		}
		await decryptPipelinePromise;
	} finally {
		readStream.destroy();
		plainOut.destroy();
		await decryptPipelinePromise.catch((cleanupPipeErr) => {
			logger.debug(
				{ err: safeLogError(cleanupPipeErr), expectedOrganizationId },
				"Очистка потока расшифровки legacy DENTETB1",
			);
		});
	}

	const parsed = JSON.parse(Buffer.concat(chunks, totalBytes).toString("utf8")) as {
		organizationId?: string;
		tables?: Record<string, unknown>;
	};
	const res = await restoreLegacySnapshotObjectToPg({
		snapshot: parsed,
		expectedOrganizationId,
		pgClient,
		tempDir: params.tempDir,
	});
	return { ...res, format: "DENTETB1" };
}

/**
 * Восстанавливает legacy-объект формата `DENTE_TENANT_BACKUP_V1` (`tables: { organization, ... }`)
 * с батчевой вставкой 200 строк, DAG-порядком и 2-фазными отложенными ссылками.
 */
export async function restoreLegacySnapshotObjectToPg(params: {
	readonly snapshot: Record<string, unknown>;
	readonly expectedOrganizationId?: string | undefined;
	readonly pgClient: pg.Client;
	readonly tempDir?: string | undefined;
}): Promise<{ restoredTables: number; restoredRows: number }> {
	const { snapshot, pgClient } = params;
	const tablesMap =
		snapshot.tables &&
		typeof snapshot.tables === "object" &&
		!Array.isArray(snapshot.tables)
			? (snapshot.tables as Record<string, unknown>)
			: snapshot;

	const snapshotOrgId =
		typeof snapshot.organizationId === "string"
			? snapshot.organizationId
			: params.expectedOrganizationId;

	if (!snapshotOrgId) {
		throw new Error("Legacy snapshot does not contain organizationId");
	}
	if (
		params.expectedOrganizationId &&
		snapshotOrgId !== params.expectedOrganizationId
	) {
		throw new Error(
			`Tenant mismatch in legacy snapshot: got ${snapshotOrgId}, expected ${params.expectedOrganizationId}`,
		);
	}

	const [liveFks, nonDeletableTables] = await Promise.all([
		queryLivePgForeignKeys(pgClient),
		queryNonDeletableTables(pgClient),
	]);
	const dag = buildSchemaBackupDag(liveFks);

	// Переводим ключи snapshot.tables (exportName / snake_case / organization / invoices) к SQL-именам
	const rowsBySqlTable = new Map<string, Array<Record<string, unknown>>>();
	for (const [key, rawEntry] of Object.entries(tablesMap)) {
		if (!rawEntry) continue;
		const mappedMeta =
			key === "organization"
				? dag.bySqlName.get("organizations")
				: key === "invoices"
					? dag.bySqlName.get("patient_invoices")
					: (dag.byExportName.get(key) ?? dag.bySqlName.get(key));
		if (!mappedMeta) continue;
		if (rowsBySqlTable.has(mappedMeta.sqlName)) continue;

		const rawList = Array.isArray(rawEntry) ? rawEntry : [rawEntry];
		const normalizedList: Array<Record<string, unknown>> = [];
		for (const item of rawList) {
			if (item && typeof item === "object" && !Array.isArray(item)) {
				normalizedList.push(
					mappedMeta.normalizeLegacyRowKeys(item as Record<string, unknown>),
				);
			}
		}
		if (normalizedList.length > 0) {
			rowsBySqlTable.set(mappedMeta.sqlName, normalizedList);
		}
	}

	const tempDir = params.tempDir ?? os.tmpdir();
	await fsp.mkdir(tempDir, { recursive: true });
	const deferredLinksPath = path.join(
		tempDir,
		`dente_legacy_deferred_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.ndjson`,
	);
	const deferredOut = fs.createWriteStream(deferredLinksPath, { encoding: "utf8" });

	let restoredTables = 0;
	let restoredRows = 0;

	await pgClient.query("BEGIN");
	try {
		await pgClient.query(
			"SELECT set_config('app.current_tenant', $1, true), set_config('app.superuser_bypass', 'off', true)",
			[snapshotOrgId],
		);

		await clearExistingTenantDataReverseOrder(
			pgClient,
			dag,
			snapshotOrgId,
			nonDeletableTables,
		);

		for (const tableMeta of dag.orderedTables) {
			const tableRows = rowsBySqlTable.get(tableMeta.sqlName);
			if (!tableRows || tableRows.length === 0) continue;

			const pendingDeferred: DeferredLinkRecord[] = [];
			let tableInserted = 0;
			for (let i = 0; i < tableRows.length; i += RESTORE_BATCH_ROWS) {
				const slice = tableRows.slice(i, i + RESTORE_BATCH_ROWS);
				const sanitized = tableMeta.extractDeferredLinks(slice, (linkRecord) => {
					pendingDeferred.push(linkRecord);
				});
				tableInserted += await tableMeta.insertBatchMultiRow(
					pgClient,
					sanitized,
					snapshotOrgId,
				);
			}
			for (const link of pendingDeferred) {
				await writeDeferredLinkLine(deferredOut, link);
			}
			if (tableInserted > 0) {
				restoredTables += 1;
				restoredRows += tableInserted;
			}
		}

		await new Promise<void>((resolve, reject) => {
			deferredOut.end((err?: Error | null) => (err ? reject(err) : resolve()));
		});

		await applyDeferredForeignKeysStreaming(
			pgClient,
			deferredLinksPath,
			dag,
			snapshotOrgId,
		);

		await pgClient.query("COMMIT");
		return { restoredTables, restoredRows };
	} catch (err) {
		try {
			await pgClient.query("ROLLBACK");
		} catch (rbErr) {
			logger.warn(
				{ err: safeLogError(rbErr), snapshotOrgId },
				"Ошибка отката транзакции восстановления legacy-снимка",
			);
		}
		throw err;
	} finally {
		deferredOut.destroy();
		try {
			await fsp.unlink(deferredLinksPath);
		} catch (unlinkErr) {
			logger.debug(
				{ err: safeLogError(unlinkErr), deferredLinksPath },
				"Временный файл legacy deferred_links уже удалён",
			);
		}
	}
}
