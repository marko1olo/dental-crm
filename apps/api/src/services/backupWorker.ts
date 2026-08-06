/**
 * backupWorker.ts — зашифрованные резервные копии базы данных.
 *
 * ЧТО БЫЛО НЕ ТАК
 *  1. startBackupDaemon() НЕ ВЫЗЫВАЛСЯ НИ ОТКУДА. Модуль существовал, писал
 *     обнадёживающие сообщения в лог — и не создавал ни одной копии. Клиника
 *     считала, что копии делаются каждую ночь, а папка backups/ была пуста.
 *  2. Даже при запуске: setInterval на 24 часа БЕЗ первого прогона. Там, где
 *     компьютер выключают на ночь (в проекте есть DENTE_START.bat), интервал
 *     никогда не доходил до суток — копия не создавалась ни разу.
 *  3. Нет обработчика 'error' у spawn: если pg_dump не найден, Node выбрасывает
 *     необработанное исключение и ВЕСЬ процесс API падает.
 *  4. Успех резолвился по закрытию pg_dump, а не по завершению записи файла —
 *     последний блок шифра мог не попасть на диск.
 *  5. При ошибке недописанный файл ОСТАВАЛСЯ: копились файлы правильного вида
 *     и ненулевого размера, которые невозможно расшифровать.
 *  6. Старые копии не удалялись — папка росла бесконечно.
 *  7. Ключ шифрования по умолчанию — публичная строка из исходников, а короткий
 *     ключ молча дополнялся нулями.
 *  8. Параметры подключения были зашиты ("-U dental -d dental_crm") и не
 *     совпадали бы с DATABASE_URL — копия снималась бы не с той базы.
 *  9. Успех settled по событию 'finish' файлового потока, а код возврата
 *     pg_dump на тот момент был ещё null — и проверка
 *     `if (dumpExitCode !== 0 && dumpExitCode !== null) return;` пропускала
 *     этот null дальше. Измерено 2026-08-06 на живой базе: pg_dump упал с
 *     кодом 1 на первой же таблице под FORCE RLS, успев отдать 239 573 байта
 *     схемы, 'finish' пришёл раньше 'close' во всех 5 прогонах, и функция
 *     вернула success: true. Обработчик кода возврата отрабатывал позже, но
 *     settled уже стоял, и его отказ выбрасывался. Проверка кода возврата
 *     была мёртвым кодом.
 * 10. Порог «пустого дампа» стоял на IV_LENGTH + 64 = 80 байт. Дамп ПУСТОЙ
 *     базы (одна схема, ноль строк) той же командой весит 495 904 байта —
 *     порог мимо цели в шесть тысяч раз. Оборванная копия из пункта 9
 *     (239 600 байт) проходила его свободно, восстанавливалась без единой
 *     ошибки и давала 148 таблиц и НОЛЬ строк клинических данных. Размер
 *     файла не отличает схему от копии; отличает только содержимое.
 */

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Transform, type TransformCallback } from "node:stream";
import { StringDecoder } from "node:string_decoder";

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const REQUIRED_KEY_BYTES = 32;

/** Заголовок секции данных в текстовом дампе pg_dump. */
const COPY_HEADER_PATTERN = /^COPY\s+(\S+)\s*\([^)]*\)\s+FROM\s+stdin;\s*$/;
/** Маркер конца секции данных COPY. Внутри данных `\` экранируется как `\\`. */
const COPY_TERMINATOR = "\\.";
/** Последняя строка, которую pg_dump печатает, только успешно закончив работу. */
const DUMP_COMPLETION_MARKER = "PostgreSQL database dump complete";

/** Публичное значение из репозитория — использовать его нельзя. */
const PUBLIC_SAMPLE_KEY = "DUMMY_SAMPLE_KEY_NOT_A_REAL_SECRET";

export interface BackupResult {
	success: boolean;
	filePath?: string;
	error?: string;
}

/** Что на самом деле лежит внутри дампа. Считается на лету, файл не перечитывается. */
export interface DumpContentStats {
	/** Число секций `COPY … FROM stdin;`. */
	copyBlocks: number;
	/** Число строк данных суммарно по всем секциям COPY. */
	dataRows: number;
	/** Число таблиц, в которых нашлась хотя бы одна строка данных. */
	populatedTables: number;
	/** Секция COPY открылась и не закрылась маркером `\.` — поток оборван. */
	unterminatedCopy: boolean;
	/** pg_dump напечатал свой завершающий маркер — значит дошёл до конца. */
	complete: boolean;
}

/**
 * Проходной поток между stdout pg_dump и шифром: считает содержимое дампа,
 * пока байты идут на диск. Ничего не буферизует сверх одной незавершённой
 * строки, поэтому пригоден для копий любого размера.
 *
 * Проверять содержимое ПОСЛЕ записи нельзя: файл уже зашифрован, и чтобы его
 * посчитать, пришлось бы расшифровывать копию целиком на каждом прогоне.
 */
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
		// Последний элемент — незавершённый хвост: строка может продолжиться
		// в следующем чанке, разбирать её сейчас нельзя.
		this.carry = lines.pop() ?? "";
		for (const line of lines) this.inspectLine(line);
	}

	private inspectLine(rawLine: string): void {
		// pg_dump на Windows печатает CRLF; терминатор и заголовок иначе не совпадут.
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

/**
 * Отвергает копию, которая выглядит копией, но данных не содержит.
 *
 * Возвращает текст отказа или null, если копия пригодна.
 *
 * Структурные проверки (оборванная секция COPY, отсутствие завершающего
 * маркера) абсолютны: они ловят любой обрыв, включая падение pg_dump посреди
 * выгрузки. Пороги по строкам настраиваются, потому что их правильное
 * значение знает только владелец базы: у клиники с двумя тысячами пациентов и
 * у свежеразвёрнутой установки нижняя граница разная. По умолчанию порог
 * минимальный — он ловит полностью пустую выгрузку, но НЕ ловит выгрузку,
 * где RLS оставил строки только в таблицах без политик. Измеренные числа
 * пишутся в журнал каждым успешным прогоном, чтобы порог было на чём выставить.
 */
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

function backupsDirectory(): string {
	return (
		process.env.DENTE_BACKUP_DIR?.trim() ||
		path.resolve(process.cwd(), "../../backups")
	);
}

/**
 * Ключ шифрования копии. Возвращает ошибку, если ключ не настроен или небезопасен —
 * лучше явно отказаться, чем создать копию медицинских данных, зашифрованную
 * известным всем ключом.
 */
function resolveEncryptionKey(): { key: Buffer } | { error: string } {
	const raw = process.env.CLINIC_ENCRYPTION_KEY?.trim();
	if (!raw) {
		return {
			error:
				"CLINIC_ENCRYPTION_KEY не задан. Копии не создаются: без ключа их нельзя зашифровать, а копия медицинских данных без шифрования недопустима.",
		};
	}
	if (raw === PUBLIC_SAMPLE_KEY) {
		return {
			error:
				"CLINIC_ENCRYPTION_KEY равен примеру из репозитория. Задайте собственный ключ длиной 32 байта.",
		};
	}
	const keyBytes = Buffer.from(raw, "utf8");
	if (keyBytes.length < REQUIRED_KEY_BYTES) {
		return {
			error: `CLINIC_ENCRYPTION_KEY короче ${REQUIRED_KEY_BYTES} байт. Короткий ключ раньше молча дополнялся нулями, что резко ослабляло шифрование.`,
		};
	}
	// Ровно 32 байта: длинный ключ сворачиваем через SHA-256, чтобы не терять
	// энтропию простой обрезкой.
	const key =
		keyBytes.length === REQUIRED_KEY_BYTES
			? keyBytes
			: crypto.createHash("sha256").update(keyBytes).digest();
	return { key };
}

/** Мажорная версия из вывода `pg_dump --version` ("pg_dump (PostgreSQL) 18.4"). */
function pgDumpMajorVersion(binary: string): number | null {
	const probe = spawnSync(binary, ["--version"], { encoding: "utf8" });
	if (probe.error || probe.status !== 0) return null;
	const match = /(\d+)(?:\.\d+)*\s*$/.exec(String(probe.stdout).trim());
	return match ? Number(match[1]) : null;
}

/**
 * Выбирает бинарь pg_dump и ОТКАЗЫВАЕТСЯ, если выбрать нечего.
 *
 * БЫЛО: молчаливая цепочка фоллбэков, заканчивавшаяся голым именем "pg_dump"
 * из PATH. Три отдельных тихих отказа: (1) PG_DUMP_PATH задан, но файла по
 * нему нет — значение молча игнорировалось; (2) выбранный бинарь мог быть
 * любой версии; (3) в PATH pg_dump могло не быть вовсе. Измерено 2026-08-07 на
 * этой машине: PG_DUMP_PATH не задан нигде, в PATH pg_dump отсутствует, и
 * выбирался фоллбэк .postgres/bin/pg_dump.exe версии 14.13 против сервера
 * 18.4. pg_dump 14.13 отказывается дампить сервер новее себя
 * ("aborting because of server version mismatch", код 1, ноль байт на выходе),
 * то есть копии не создавались вообще, и до прав под RLS дело не доходило.
 * Версия бинаря не проверялась ни разу.
 */
function resolvePgDump():
	| { binary: string; major: number }
	| { error: string } {
	const configured = process.env.PG_DUMP_PATH?.trim();
	if (configured && !fs.existsSync(configured)) {
		return {
			error: `PG_DUMP_PATH указывает на несуществующий файл (${configured}). Раньше это значение молча игнорировалось и подставлялся другой бинарь.`,
		};
	}
	const portable = path.resolve(
		process.cwd(),
		"../../.postgres/bin/pg_dump.exe",
	);
	const candidates = [
		configured,
		fs.existsSync(portable) ? portable : null,
		"pg_dump",
	].filter((value): value is string => Boolean(value));

	const rejected: string[] = [];
	for (const candidate of candidates) {
		const major = pgDumpMajorVersion(candidate);
		if (major === null) {
			rejected.push(`${candidate}: не запускается`);
			continue;
		}
		return { binary: candidate, major };
	}
	return {
		error: `Не найден работоспособный pg_dump. Проверено: ${rejected.join("; ")}. Укажите путь в PG_DUMP_PATH.`,
	};
}

/**
 * Возвращает путь к бинарю pg_dump, пригодному для работы с текущим сервером.
 * Бросает Error, если работоспособный бинарь не найден — ошибка перехватывается
 * в createEncryptedBackup и превращается в BackupResult { success: false }.
 */
function pgDumpExecutable(): string {
	const result = resolvePgDump();
	if ("error" in result) {
		throw new Error(result.error);
	}
	return result.binary;
}

/**
 * Параметры подключения берём из DATABASE_URL, а не из зашитых значений:
 * иначе копия снимается не с той базы, с которой работает приложение.
 */
function pgDumpArguments(): string[] {
	const baseArgs = ["--clean", "--if-exists", "--no-owner", "--no-acl"];
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (databaseUrl) return ["--dbname", databaseUrl, ...baseArgs];
	return [
		"-U",
		process.env.POSTGRES_USER || "dental",
		"-d",
		process.env.POSTGRES_DB || "dental_crm",
		...baseArgs,
	];
}

function removePartialFile(filePath: string): void {
	try {
		if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
	} catch (error) {
		console.warn(
			"[BackupWorker] Не удалось удалить незавершённый файл копии:",
			error,
		);
	}
}

/**
 * Удаляет копии старше срока хранения. Раньше папка росла без ограничений
 * и со временем занимала весь диск клиники.
 */
export function pruneOldBackups(
	retentionDays = Number(process.env.DENTE_BACKUP_RETENTION_DAYS ?? 30),
): void {
	if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
	const dir = backupsDirectory();
	if (!fs.existsSync(dir)) return;
	const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
	try {
		for (const name of fs.readdirSync(dir)) {
			if (!name.startsWith("dente_crm_backup_") || !name.endsWith(".sql.enc"))
				continue;
			const full = path.join(dir, name);
			try {
				if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
			} catch {
				// Файл мог быть удалён параллельно — остальные это не должно останавливать.
			}
		}
	} catch (error) {
		console.warn("[BackupWorker] Не удалось очистить старые копии:", error);
	}
}

/**
 * Создаёт зашифрованную копию базы через pg_dump.
 * success означает, что файл ПОЛНОСТЬЮ записан и закрыт.
 */
export async function createEncryptedBackup(): Promise<BackupResult> {
	const keyResult = resolveEncryptionKey();
	if ("error" in keyResult) {
		console.error(`[BackupWorker] ${keyResult.error}`);
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
		// IV пишется в начало файла — он нужен для расшифровки.
		writeStream.write(iv);

		const pgDump = spawn(pgDumpExecutable(), pgDumpArguments(), {
			env: { ...process.env },
		});

		// Счётчик стоит ДО шифра: после него виден только шифротекст.
		const inspector = new DumpContentInspector();

		const stderrChunks: string[] = [];
		pgDump.stderr.on("data", (data) => {
			const text = String(data);
			stderrChunks.push(text);
			console.warn(`[BackupWorker] pg_dump: ${text.trim()}`);
		});

		pgDump.stdout.pipe(inspector).pipe(cipher).pipe(writeStream);

		const outcome = await new Promise<BackupResult>((resolve) => {
			let settled = false;
			const settle = (result: BackupResult) => {
				if (settled) return;
				settled = true;
				resolve(result);
			};

			// БЫЛО: обработчика 'error' не было — отсутствующий pg_dump ронял
			// весь процесс API необработанным исключением.
			pgDump.on("error", (error) => {
				writeStream.destroy();
				settle({
					success: false,
					error: `Не удалось запустить pg_dump (${(error as Error).message}). Укажите путь в PG_DUMP_PATH.`,
				});
			});

			// Сбой в середине конвейера (шифр, счётчик) без обработчика тоже валит
			// процесс: 'error' на потоке без слушателя выбрасывается наружу.
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

			// БЫЛО: успех резолвился по закрытию pg_dump — до того, как поток
			// шифра дописал последний блок на диск. Затем маятник качнулся в другую
			// сторону: успех стали резолвить по 'finish' файла, а код возврата
			// pg_dump на тот момент ещё null, и его пропускали как «ошибки нет».
			// Успех требует ОБА события: код возврата 0 И закрытый файл. Порядок,
			// в котором они приходят, значения не имеет.
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
					settle({
						success: false,
						error:
							`pg_dump завершился с кодом ${code}. ${stderrChunks.join(" ").trim()}`.trim(),
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
			// Незавершённый файл удаляем: иначе в папке остаются копии
			// правильного вида и ненулевого размера, которые не расшифровать.
			removePartialFile(filePath);
			console.error(`[BackupWorker] Копия НЕ создана: ${outcome.error}`);
			return outcome;
		}

		const sizeBytes = fs.statSync(filePath).size;
		const stats = inspector.stats();
		// БЫЛО: порог в 80 байт. Дамп ПУСТОЙ базы весит полмегабайта, так что
		// проверка по размеру пропускала и схему без данных, и оборванный дамп.
		// Решает только содержимое: секции COPY, строки в них и завершающий
		// маркер pg_dump.
		const rejection = rejectHollowBackup(stats, sizeBytes);
		if (rejection) {
			removePartialFile(filePath);
			const error = `Копия признана недействительной и удалена: ${rejection}`;
			console.error(`[BackupWorker] ${error}`);
			return { success: false, error };
		}

		console.log(
			`[BackupWorker] Копия создана: ${filePath} (${Math.round(sizeBytes / 1024)} КБ, ` +
				`секций COPY ${stats.copyBlocks}, строк данных ${stats.dataRows}, ` +
				`таблиц со строками ${stats.populatedTables})`,
		);
		pruneOldBackups();
		return outcome;
	} catch (error) {
		if (filePath) removePartialFile(filePath);
		const message = error instanceof Error ? error.message : String(error);
		console.error("[BackupWorker] Исключение при создании копии:", error);
		return { success: false, error: message };
	}
}

let backupInterval: NodeJS.Timeout | null = null;

function backupIntervalMs(): number {
	const configured = Number(process.env.DENTE_BACKUP_INTERVAL_HOURS ?? 24);
	const hours = Number.isFinite(configured) && configured > 0 ? configured : 24;
	return hours * 60 * 60 * 1000;
}

/**
 * Запускает периодическое резервное копирование.
 *
 * Первая копия снимается вскоре после старта (по умолчанию через 2 минуты, чтобы
 * не мешать загрузке приложения), затем по интервалу. Без первого прогона на
 * клинике, где компьютер выключают на ночь, копия не создавалась никогда.
 */
export function startBackupDaemon(): void {
	if (backupInterval) return;

	const keyResult = resolveEncryptionKey();
	if ("error" in keyResult) {
		// Молчать нельзя: клиника должна знать, что копий НЕТ.
		console.error(
			`[BackupWorker] Резервное копирование ОТКЛЮЧЕНО. ${keyResult.error}`,
		);
		return;
	}

	console.log("[BackupWorker] Резервное копирование включено.");

	const firstRunDelayMs = Number(
		process.env.DENTE_BACKUP_FIRST_RUN_DELAY_MS ?? 120_000,
	);
	const firstRun: ReturnType<typeof setTimeout> = setTimeout(
		() => {
			void createEncryptedBackup();
		},
		Math.max(0, firstRunDelayMs),
	);
	// unref, чтобы отложенный первый прогон не удерживал процесс при остановке.
	(firstRun as unknown as { unref?: () => void }).unref?.();

	backupInterval = setInterval(() => {
		void createEncryptedBackup();
	}, backupIntervalMs());
}

export function stopBackupDaemon(): void {
	if (backupInterval) {
		clearInterval(backupInterval);
		backupInterval = null;
		console.log("[BackupWorker] Резервное копирование остановлено.");
	}
}
