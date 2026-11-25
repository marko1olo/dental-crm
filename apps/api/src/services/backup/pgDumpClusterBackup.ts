import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transform, type TransformCallback } from "node:stream";
import { StringDecoder } from "node:string_decoder";
import { createApiLogger, safeLogError } from "../observability/index.js";
import {
	type BackupResult,
	backupsDirectory,
	ENCRYPTION_ALGORITHM,
	IV_LENGTH,
	pruneOldBackups,
	removePartialFile,
	resolveEncryptionKey,
} from "./backupCryptoUtils.js";

const logger = createApiLogger("backupWorker");

const COPY_HEADER_PATTERN = /^COPY\s+(\S+)\s*\([^)]*\)\s+FROM\s+stdin;\s*$/;
const COPY_TERMINATOR = "\\.";
const DUMP_COMPLETION_MARKER = "PostgreSQL database dump complete";

export interface DumpContentStats {
	copyBlocks: number;
	dataRows: number;
	populatedTables: number;
	unterminatedCopy: boolean;
	complete: boolean;
}

class DumpContentInspector extends Transform {
	private readonly decoder = new StringDecoder("utf8");
	private readonly populated = new Set<string>();
	private carry = "";
	private insideCopy = false;
	private currentTable = "";
	private copyBlocks = 0;
	private dataRows = 0;
	private complete = false;

	override _transform(
		chunk: Buffer,
		_encoding: BufferEncoding,
		done: TransformCallback,
	): void {
		this.consume(this.decoder.write(chunk));
		done(null, chunk);
	}

	override _flush(done: TransformCallback): void {
		this.consume(this.decoder.end());
		if (this.carry.length > 0) {
			this.inspectLine(this.carry);
			this.carry = "";
		}
		done();
	}

	private consume(text: string): void {
		if (text.length === 0) return;
		const buffered = this.carry + text;
		const lines = buffered.split("\n");
		this.carry = lines.pop() ?? "";
		for (const line of lines) this.inspectLine(line);
	}

	private inspectLine(rawLine: string): void {
		const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
		if (this.insideCopy) {
			if (line === COPY_TERMINATOR) {
				this.insideCopy = false;
				this.currentTable = "";
				return;
			}
			this.dataRows += 1;
			if (this.currentTable) this.populated.add(this.currentTable);
			return;
		}
		const copyHeader = COPY_HEADER_PATTERN.exec(line);
		if (copyHeader) {
			this.insideCopy = true;
			this.currentTable = copyHeader[1] ?? "";
			this.copyBlocks += 1;
			return;
		}
		if (line.includes(DUMP_COMPLETION_MARKER)) this.complete = true;
	}

	stats(): DumpContentStats {
		return {
			copyBlocks: this.copyBlocks,
			dataRows: this.dataRows,
			populatedTables: this.populated.size,
			unterminatedCopy: this.insideCopy,
			complete: this.complete,
		};
	}
}

function positiveIntFromEnv(name: string, fallback: number): number {
	const parsed = Number(process.env[name] ?? fallback);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function rejectHollowBackup(
	stats: DumpContentStats,
	sizeBytes: number,
): string | null {
	if (sizeBytes <= IV_LENGTH) {
		return "копия состоит из одного вектора инициализации: pg_dump не отдал ни байта.";
	}
	if (stats.unterminatedCopy) {
		return `копия оборвана внутри секции COPY (секций ${stats.copyBlocks}, строк данных ${stats.dataRows}): восстановить её нельзя.`;
	}
	if (!stats.complete) {
		return `в копии нет завершающего маркера pg_dump ("${DUMP_COMPLETION_MARKER}"): выгрузка оборвана на ${stats.dataRows} строках данных.`;
	}
	const minRows = positiveIntFromEnv("DENTE_BACKUP_MIN_DATA_ROWS", 1);
	if (stats.dataRows < minRows) {
		return `в копии ${stats.dataRows} строк данных при минимуме ${minRows}: это схема без данных, а не копия. Частая причина — роль подключения не может обойти RLS (нужен атрибут BYPASSRLS).`;
	}
	const minTables = positiveIntFromEnv("DENTE_BACKUP_MIN_POPULATED_TABLES", 1);
	if (stats.populatedTables < minTables) {
		return `строки данных нашлись только в ${stats.populatedTables} таблицах при минимуме ${minTables}: остальные таблицы выгружены пустыми.`;
	}
	return null;
}

function backupDatabaseUrl(): string {
	return (
		process.env.BACKUP_DATABASE_URL?.trim() || process.env.DATABASE_URL || ""
	);
}

function pgDumpMajorVersion(binary: string): number | null {
	const probe = spawnSync(binary, ["--version"], { encoding: "utf8" });
	if (probe.error || probe.status !== 0) return null;
	const match = /(\d+)(?:\.\d+)*\s*$/.exec(String(probe.stdout).trim());
	return match ? Number(match[1]) : null;
}

function resolvePgDump(
	minMajor: number | null,
): { binary: string; major: number } | { error: string } {
	const configured = process.env.PG_DUMP_PATH?.trim();
	if (configured && !fs.existsSync(configured)) {
		return {
			error: `PG_DUMP_PATH указывает на несуществующий файл (${configured}). Раньше это значение молча игнорировалось и подставлялся другой бинарь.`,
		};
	}
	const toolsPortable = path.resolve(
		process.cwd(),
		"../../.tools/pgsql/bin/pg_dump.exe",
	);
	const oldPortable = path.resolve(
		process.cwd(),
		"../../.postgres/bin/pg_dump.exe",
	);
	if (configured) {
		const major = pgDumpMajorVersion(configured);
		if (major === null) {
			return {
				error: `pg_dump из PG_DUMP_PATH не запускается (${configured}).`,
			};
		}
		if (minMajor !== null && major < minMajor) {
			return {
				error: `pg_dump из PG_DUMP_PATH версии ${major} МЛАДШЕ сервера ${minMajor} (${configured}). pg_dump отказывается выгружать сервер новее себя, поэтому копии не создаются вообще. Укажите бинарь версии ${minMajor} или новее.`,
			};
		}
		return { binary: configured, major };
	}

	const candidates = [
		fs.existsSync(toolsPortable) ? toolsPortable : null,
		fs.existsSync(oldPortable) ? oldPortable : null,
		"pg_dump",
	].filter((value): value is string => Boolean(value));

	const rejected: string[] = [];
	for (const candidate of candidates) {
		const major = pgDumpMajorVersion(candidate);
		if (major === null) {
			rejected.push(`${candidate}: не запускается`);
			continue;
		}
		if (minMajor !== null && major < minMajor) {
			rejected.push(`${candidate}: версия ${major}, требуется ${minMajor}+`);
			continue;
		}
		return { binary: candidate, major };
	}
	const versionClause =
		minMajor !== null ? ` версии ${minMajor}+` : " (работоспособный)";
	return {
		error: `Не найден pg_dump${versionClause}. Проверено: ${rejected.join("; ")}. Укажите путь в PG_DUMP_PATH.`,
	};
}

async function serverMajorVersion(): Promise<number | null> {
	try {
		const { pool } = await import("../../db/client.js");
		const result = await pool.query<{ v: string }>(
			"SELECT current_setting('server_version_num') AS v",
		);
		const numeric = Number(result.rows[0]?.v);
		return Number.isFinite(numeric) && numeric > 0
			? Math.floor(numeric / 10000)
			: null;
	} catch (error) {
		logger.warn(
			{ err: safeLogError(error) },
			"Не удалось узнать версию сервера, проверка версии pg_dump пропущена",
		);
		return null;
	}
}

function pgDumpArguments(): string[] {
	const baseArgs = ["--clean", "--if-exists", "--no-owner", "--no-acl"];
	const databaseUrl = backupDatabaseUrl().trim();
	if (databaseUrl) return ["--dbname", databaseUrl, ...baseArgs];
	return [
		"-U",
		process.env.POSTGRES_USER || "dental",
		"-d",
		process.env.POSTGRES_DB || "dental_crm",
		...baseArgs,
	];
}

function diagnoseRlsFailure(stderrText: string): string | null {
	if (!/row-level security policy/i.test(stderrText)) return null;
	const table = /policy for table "([^"]+)"/i.exec(stderrText)?.[1];
	const where = table ? ` (оборвалось на таблице "${table}")` : "";
	return (
		`pg_dump остановлен политиками RLS${where}. ` +
		`Роль подключения не имеет атрибута BYPASSRLS, а таблицы защищены ` +
		`FORCE ROW LEVEL SECURITY, поэтому владелец таблиц тоже подчиняется политикам. ` +
		`Копия НЕПОЛНАЯ и удалена. Заведите отдельную роль только для копий и укажите её в BACKUP_DATABASE_URL: ` +
		`CREATE ROLE dente_backup LOGIN BYPASSRLS PASSWORD '...'; GRANT pg_read_all_data TO dente_backup;`
	);
}

export async function createEncryptedBackup(): Promise<BackupResult> {
	const keyResult = resolveEncryptionKey();
	if ("error" in keyResult) {
		logger.error(
			{ err: keyResult.error },
			"CLINIC_ENCRYPTION_KEY invalid or missing",
		);
		return { success: false, error: keyResult.error };
	}

	let filePath = "";
	try {
		const backupsDir = backupsDirectory();
		fs.mkdirSync(backupsDir, { recursive: true });

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		filePath = path.join(backupsDir, `dente_crm_backup_${timestamp}.sql.enc`);

		const iv = crypto.randomBytes(IV_LENGTH);
		const cipher = crypto.createCipheriv(
			ENCRYPTION_ALGORITHM,
			keyResult.key,
			iv,
		);
		const writeStream = fs.createWriteStream(filePath, { mode: 0o600 });
		writeStream.write(iv);

		const serverMajor = await serverMajorVersion();
		const dumpTool = resolvePgDump(serverMajor);
		if ("error" in dumpTool) {
			removePartialFile(filePath);
			logger.error(
				{ err: dumpTool.error },
				"Копия НЕ создана: pg_dump resolution error",
			);
			return { success: false, error: dumpTool.error };
		}

		if (serverMajor !== null && dumpTool.major < serverMajor) {
			removePartialFile(filePath);
			const error =
				`pg_dump версии ${dumpTool.major} МЛАДШЕ сервера ${serverMajor} (${dumpTool.binary}). ` +
				`pg_dump отказывается выгружать сервер новее себя, поэтому копии не создаются вообще. ` +
				`Задайте PG_DUMP_PATH на бинарь версии ${serverMajor} или новее.`;
			logger.error(
				{ err: error, serverMajor, dumpMajor: dumpTool.major },
				"pg_dump version mismatch",
			);
			return { success: false, error };
		}

		const pgDump = spawn(dumpTool.binary, pgDumpArguments(), {
			env: { ...process.env },
		});

		const inspector = new DumpContentInspector();
		const stderrChunks: string[] = [];
		pgDump.stderr.on("data", (data) => {
			const text = String(data);
			stderrChunks.push(text);
			logger.warn({ stderr: text.trim() }, "pg_dump stderr stream warning");
		});

		pgDump.stdout.pipe(inspector).pipe(cipher).pipe(writeStream);

		const outcome = await new Promise<BackupResult>((resolve) => {
			let settled = false;
			const settle = (result: BackupResult) => {
				if (settled) return;
				settled = true;
				resolve(result);
			};

			pgDump.on("error", (error) => {
				writeStream.destroy();
				settle({
					success: false,
					error: `Не удалось запустить pg_dump (${(error as Error).message}). Укажите путь в PG_DUMP_PATH.`,
				});
			});

			for (const stage of [inspector, cipher]) {
				stage.on("error", (error: Error) => {
					writeStream.destroy();
					settle({
						success: false,
						error: `Ошибка конвейера копии: ${error.message}`,
					});
				});
			}

			writeStream.on("error", (error) => {
				settle({
					success: false,
					error: `Ошибка записи файла копии: ${(error as Error).message}`,
				});
			});

			let dumpExitCode: number | null = null;
			let streamFinished = false;
			const settleIfComplete = () => {
				if (dumpExitCode === 0 && streamFinished) {
					settle({ success: true, filePath });
				}
			};

			pgDump.on("close", (code) => {
				dumpExitCode = code;
				if (code !== 0) {
					writeStream.destroy();
					const stderrText = stderrChunks.join(" ").trim();
					const rlsDiagnosis = diagnoseRlsFailure(stderrText);
					settle({
						success: false,
						error: rlsDiagnosis
							? `${rlsDiagnosis} Код возврата pg_dump: ${code}.`
							: `pg_dump завершился с кодом ${code}. ${stderrText}`.trim(),
					});
					return;
				}
				settleIfComplete();
			});

			writeStream.on("finish", () => {
				streamFinished = true;
				settleIfComplete();
			});
		});

		if (!outcome.success) {
			removePartialFile(filePath);
			logger.error(
				{ err: outcome.error },
				"Копия НЕ создана: pg_dump execution failed",
			);
			return outcome;
		}

		const sizeBytes = fs.statSync(filePath).size;
		const stats = inspector.stats();
		const rejection = rejectHollowBackup(stats, sizeBytes);
		if (rejection) {
			removePartialFile(filePath);
			const error = `Копия признана недействительной и удалена: ${rejection}`;
			logger.error(
				{ err: error, stats, sizeBytes },
				"Резервная копия отклонена как пустая или неполная",
			);
			return { success: false, error };
		}

		logger.info(
			{
				filePath,
				sizeKb: Math.round(sizeBytes / 1024),
				copyBlocks: stats.copyBlocks,
				dataRows: stats.dataRows,
				populatedTables: stats.populatedTables,
			},
			"Резервная копия базы успешно создана и зашифрована",
		);
		pruneOldBackups();
		return outcome;
	} catch (error) {
		if (filePath) removePartialFile(filePath);
		const message = error instanceof Error ? error.message : String(error);
		logger.error(
			{ err: safeLogError(error), filePath },
			"Исключение при создании копии",
		);
		return { success: false, error: message };
	}
}
