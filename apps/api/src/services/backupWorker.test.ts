import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach, beforeEach, describe } from "node:test";

/**
 * Демон резервного копирования переписан, а тест остался от прежней версии.
 *
 * Он ждал английских сообщений «Starting Encrypted Cloud Backup Daemon»,
 * «Running scheduled daily backup», «Stopped Encrypted Cloud Backup Daemon».
 * Ничего этого больше нет: сообщения русские, а по тику интервала демон просто
 * вызывает createEncryptedBackup и ничего не пишет в журнал.
 *
 * Главное же — startBackupDaemon теперь требует CLINIC_ENCRYPTION_KEY и без
 * него вообще не запускается: копия медицинских данных без шифрования
 * недопустима. Тест ключ не задавал, поэтому демон уходил в ветку с
 * console.error и не планировал ничего, а проверка «должно быть одно сообщение
 * о старте» видела ноль.
 *
 * Ключ здесь тестовый и к рабочим данным отношения не имеет; заведомо не
 * совпадает с образцом из репозитория, иначе демон его отвергнет.
 */
const TEST_ENCRYPTION_KEY = "unit-test-key-do-not-use-in-prod!!";

describe("BackupWorker start/stop", () => {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	let backupWorker: any;
	let tempDir: string;
	let originalPath: string | undefined;
	let originalKey: string | undefined;

	beforeEach(async () => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-test-"));
		fs.mkdirSync(path.join(tempDir, "a", "b"), { recursive: true });

		// Setup a dummy pg_dump
		const dummyBin = path.join(tempDir, "bin");
		fs.mkdirSync(dummyBin);

		if (process.platform === "win32") {
			const dummyPgDump = path.join(dummyBin, "pg_dump.cmd");
			fs.writeFileSync(dummyPgDump, `@echo off\nexit 0\n`);
		} else {
			const dummyPgDump = path.join(dummyBin, "pg_dump");
			fs.writeFileSync(dummyPgDump, `#!/usr/bin/env node\nprocess.exit(0);\n`, {
				mode: 0o755,
			});
		}

		originalPath = process.env.PATH;
		process.env.PATH = `${dummyBin}${path.delimiter}${originalPath}`;

		originalKey = process.env.CLINIC_ENCRYPTION_KEY;
		process.env.CLINIC_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

		test.mock.method(process, "cwd", () => path.join(tempDir, "a", "b"));

		backupWorker = await import("./backupWorker.js");
		backupWorker.stopBackupDaemon();
	});

	afterEach(() => {
		if (backupWorker) backupWorker.stopBackupDaemon();
		test.mock.restoreAll();
		if (originalPath) process.env.PATH = originalPath;
		if (originalKey === undefined) delete process.env.CLINIC_ENCRYPTION_KEY;
		else process.env.CLINIC_ENCRYPTION_KEY = originalKey;
		try {
			fs.rmSync(tempDir, { recursive: true, force: true });
		} catch {}
	});

	test("daemon starts, schedules, and stops", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });

		const logMock = t.mock.method(console, "log", () => {});

		backupWorker.startBackupDaemon();

		assert.strictEqual(logMock.mock.callCount(), 1, "Should log start message");
		const startLog = logMock.mock.calls[0];
		assert.ok(startLog);
		assert.match(startLog.arguments[0], /Резервное копирование включено/);

		backupWorker.stopBackupDaemon();

		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const logs = logMock.mock.calls.map((c: any) => c.arguments[0]).join(" ");
		assert.match(logs, /Резервное копирование остановлено/);

		// После остановки интервал снят: тик 24 часов ничего не добавляет в журнал.
		const callsAfterStop = logMock.mock.callCount();
		t.mock.timers.tick(24 * 60 * 60 * 1000);
		assert.strictEqual(
			logMock.mock.callCount(),
			callsAfterStop,
			"Should not execute backup callback after stop",
		);
	});

	test("повторный запуск не создаёт второй интервал", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
		const logMock = t.mock.method(console, "log", () => {});

		backupWorker.startBackupDaemon();
		backupWorker.startBackupDaemon();

		// Второй вызов обязан выйти сразу: иначе первый интервал теряется и
		// снять его уже нечем — копии начали бы делаться дважды.
		assert.strictEqual(logMock.mock.callCount(), 1);
	});

	test("без ключа шифрования демон не запускается и говорит об этом", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
		delete process.env.CLINIC_ENCRYPTION_KEY;

		const logMock = t.mock.method(console, "log", () => {});
		const errorMock = t.mock.method(console, "error", () => {});

		backupWorker.startBackupDaemon();

		// Молчать нельзя: клиника должна знать, что копий НЕТ.
		assert.strictEqual(logMock.mock.callCount(), 0);
		assert.strictEqual(errorMock.mock.callCount(), 1);
		const disabledError = errorMock.mock.calls[0];
		assert.ok(disabledError);
		assert.match(disabledError.arguments[0], /ОТКЛЮЧЕНО/);

		// И ничего не запланировано.
		backupWorker.stopBackupDaemon();
		assert.strictEqual(logMock.mock.callCount(), 0);
	});

	test("слишком короткий ключ отвергается, а не дополняется нулями", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
		process.env.CLINIC_ENCRYPTION_KEY = "short-key";

		const logMock = t.mock.method(console, "log", () => {});
		const errorMock = t.mock.method(console, "error", () => {});

		backupWorker.startBackupDaemon();

		assert.strictEqual(logMock.mock.callCount(), 0);
		assert.strictEqual(errorMock.mock.callCount(), 1);
		const shortKeyError = errorMock.mock.calls[0];
		assert.ok(shortKeyError);
		assert.match(shortKeyError.arguments[0], /короче 32 байт/);
	});
});
