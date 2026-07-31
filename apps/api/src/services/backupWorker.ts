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
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const REQUIRED_KEY_BYTES = 32;

/** Публичное значение из репозитория — использовать его нельзя. */
const PUBLIC_SAMPLE_KEY = "DUMMY_SAMPLE_KEY_NOT_A_REAL_SECRET";

export interface BackupResult {
  success: boolean;
  filePath?: string;
  error?: string;
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

function pgDumpExecutable(): string {
  const configured = process.env.PG_DUMP_PATH?.trim();
  if (configured && fs.existsSync(configured)) return configured;
  const portable = path.resolve(
    process.cwd(),
    "../../.postgres/bin/pg_dump.exe",
  );
  return fs.existsSync(portable) ? portable : "pg_dump";
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

    const stderrChunks: string[] = [];
    pgDump.stderr.on("data", (data) => {
      const text = String(data);
      stderrChunks.push(text);
      console.warn(`[BackupWorker] pg_dump: ${text.trim()}`);
    });

    pgDump.stdout.pipe(cipher).pipe(writeStream);

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

      writeStream.on("error", (error) => {
        settle({
          success: false,
          error: `Ошибка записи файла копии: ${(error as Error).message}`,
        });
      });

      let dumpExitCode: number | null = null;
      pgDump.on("close", (code) => {
        dumpExitCode = code;
        if (code === 0) return;

        writeStream.destroy();
        settle({
          success: false,
          error:
            `pg_dump завершился с кодом ${code}. ${stderrChunks.join(" ").trim()}`.trim(),
        });
      });

      // БЫЛО: успех резолвился по закрытию pg_dump — до того, как поток
      // шифра дописал последний блок на диск.
      writeStream.on("finish", () => {
        if (dumpExitCode !== 0 && dumpExitCode !== null) return;

        settle({ success: true, filePath });
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
    // Файл, состоящий практически из одного IV, означает пустой дамп.
    if (sizeBytes <= IV_LENGTH + 64) {
      removePartialFile(filePath);
      const error =
        "pg_dump вернул пустой дамп: копия признана недействительной и удалена.";
      console.error(`[BackupWorker] ${error}`);
      return { success: false, error };
    }

    console.log(
      `[BackupWorker] Копия создана: ${filePath} (${Math.round(sizeBytes / 1024)} КБ)`,
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
