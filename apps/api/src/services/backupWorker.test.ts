import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { afterEach, beforeEach, describe } from "node:test";
import type { FastifyBaseLogger } from "fastify";
import { bindServerLogger } from "../observability/logger.js";

/**
 * Тест демона резервного копирования.
 * Ключ здесь тестовый и к рабочим данным отношения не имеет; заведомо не
 * совпадает с образцом из репозитория, иначе демон его отвергнет.
 */
const TEST_ENCRYPTION_KEY = "unit-test-key-do-not-use-in-prod!!";

function createTestLoggerSpy() {
	const infoLines: string[] = [];
	const errorLines: string[] = [];
	const formatArgs = (args: unknown[]): string =>
		args
			.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
			.join(" ");

	const spyLogger: FastifyBaseLogger = {
		level: "info",
		fatal: (...args: unknown[]) => {
			errorLines.push(formatArgs(args));
		},
		error: (...args: unknown[]) => {
			errorLines.push(formatArgs(args));
		},
		warn: () => {},
		info: (...args: unknown[]) => {
			infoLines.push(formatArgs(args));
		},
		debug: () => {},
		trace: () => {},
		silent: () => {},
		child: () => spyLogger,
		msgPrefix: "",
	};

	return { spyLogger, infoLines, errorLines };
}

describe("BackupWorker start/stop", () => {
	let backupWorker: typeof import("./backupWorker.js") | undefined;
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
		bindServerLogger(null);
		if (backupWorker) backupWorker.stopBackupDaemon();
		test.mock.restoreAll();
		if (originalPath) process.env.PATH = originalPath;
		if (originalKey === undefined) delete process.env.CLINIC_ENCRYPTION_KEY;
		else process.env.CLINIC_ENCRYPTION_KEY = originalKey;
		if (fs.existsSync(tempDir)) {
			try {
				fs.rmSync(tempDir, { recursive: true, force: true });
			} catch (cleanupErr) {
				if (process.env.DEBUG) console.warn("Temp cleanup deferred:", cleanupErr);
			}
		}
	});

	test("daemon starts, schedules, and stops", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });

		const { spyLogger, infoLines } = createTestLoggerSpy();
		bindServerLogger(spyLogger);

		backupWorker?.startBackupDaemon();

		assert.strictEqual(infoLines.length, 1, "Should log start message");
		assert.match(infoLines[0] ?? "", /Резервное копирование включено/);

		backupWorker?.stopBackupDaemon();

		const logs = infoLines.join(" ");
		assert.match(logs, /Резервное копирование остановлено/);

		// После остановки интервал снят: тик 24 часов ничего не добавляет в журнал.
		const callsAfterStop = infoLines.length;
		t.mock.timers.tick(24 * 60 * 60 * 1000);
		assert.strictEqual(
			infoLines.length,
			callsAfterStop,
			"Should not execute backup callback after stop",
		);
	});

	test("повторный запуск не создаёт второй интервал", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
		const { spyLogger, infoLines } = createTestLoggerSpy();
		bindServerLogger(spyLogger);

		backupWorker?.startBackupDaemon();
		backupWorker?.startBackupDaemon();

		// Второй вызов обязан выйти сразу: иначе первый интервал теряется и
		// снять его уже нечем — копии начали бы делаться дважды.
		assert.strictEqual(infoLines.length, 1);
	});

	test("без ключа шифрования демон не запускается и говорит об этом", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
		delete process.env.CLINIC_ENCRYPTION_KEY;

		const { spyLogger, infoLines, errorLines } = createTestLoggerSpy();
		bindServerLogger(spyLogger);

		backupWorker?.startBackupDaemon();

		// Молчать нельзя: клиника должна знать, что копий НЕТ.
		assert.strictEqual(infoLines.length, 0);
		assert.strictEqual(errorLines.length, 1);
		assert.match(errorLines[0] ?? "", /ОТКЛЮЧЕНО/);

		// И ничего не запланировано.
		backupWorker?.stopBackupDaemon();
		assert.strictEqual(infoLines.length, 0);
	});

	test("слишком короткий ключ отвергается, а не дополняется нулями", async (t) => {
		t.mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
		process.env.CLINIC_ENCRYPTION_KEY = "short-key";

		const { spyLogger, infoLines, errorLines } = createTestLoggerSpy();
		bindServerLogger(spyLogger);

		backupWorker?.startBackupDaemon();

		assert.strictEqual(infoLines.length, 0);
		assert.strictEqual(errorLines.length, 1);
		assert.match(errorLines[0] ?? "", /короче 32 байт/);
	});
});
