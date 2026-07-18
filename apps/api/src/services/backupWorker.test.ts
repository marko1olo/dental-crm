import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("BackupWorker start/stop", () => {
    let backupWorker: any;
    let tempDir: string;
    let originalPath: string | undefined;

    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "backup-test-"));
        fs.mkdirSync(path.join(tempDir, "a", "b"), { recursive: true });

        // Setup a dummy pg_dump
        const dummyBin = path.join(tempDir, "bin");
        fs.mkdirSync(dummyBin);

        if (process.platform === 'win32') {
            const dummyPgDump = path.join(dummyBin, 'pg_dump.cmd');
            fs.writeFileSync(dummyPgDump, `@echo off\nexit 0\n`);
        } else {
            const dummyPgDump = path.join(dummyBin, 'pg_dump');
            fs.writeFileSync(dummyPgDump, `#!/usr/bin/env node\nprocess.exit(0);\n`, { mode: 0o755 });
        }

        originalPath = process.env.PATH;
        process.env.PATH = `${dummyBin}${path.delimiter}${originalPath}`;

        test.mock.method(process, "cwd", () => path.join(tempDir, "a", "b"));

        backupWorker = await import("./backupWorker.js");
        backupWorker.stopBackupDaemon();
    });

    afterEach(() => {
        if (backupWorker) backupWorker.stopBackupDaemon();
        test.mock.restoreAll();
        if (originalPath) process.env.PATH = originalPath;
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    });

    test("daemon starts, schedules, and executes callback using fake timers", async (t) => {
        t.mock.timers.enable({ apis: ["setInterval", "Date"] });

        const logMock = t.mock.method(console, "log", () => {});

        backupWorker.startBackupDaemon();

        assert.strictEqual(logMock.mock.callCount(), 1, "Should log start message");
        assert.match(logMock.mock.calls[0].arguments[0], /Starting Encrypted Cloud Backup Daemon/);

        // Advance time by 24 hours to trigger the interval
        t.mock.timers.tick(24 * 60 * 60 * 1000);

        assert.strictEqual(logMock.mock.callCount(), 2, "Should log running scheduled backup");
        assert.match(logMock.mock.calls[1].arguments[0], /Running scheduled daily backup/);

        backupWorker.startBackupDaemon();

        backupWorker.stopBackupDaemon();

        const logs = logMock.mock.calls.map((c: any) => c.arguments[0]).join(" ");
        assert.match(logs, /Stopped Encrypted Cloud Backup Daemon/);

        // Advance time by another 24 hours to ensure it is stopped
        t.mock.timers.tick(24 * 60 * 60 * 1000);

        const runningLogs = logMock.mock.calls.filter((c: any) => /Running scheduled daily backup/.test(c.arguments[0]));
        assert.strictEqual(runningLogs.length, 1, "Should not execute backup callback after stop");

        await new Promise((resolve) => setTimeout(resolve, 50));
    });
});
