import { test, describe, afterEach, mock } from "node:test";
import assert from "node:assert";

import cp from "node:child_process";
import fs from "node:fs";
import net from "node:net";

import { ensureSshTunnel, stopSshTunnel } from "../tunnel.js";

describe("ensureSshTunnel", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    mock.restoreAll();

    // Restore environment variables without replacing the process.env object itself
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;
    }

    stopSshTunnel();
  });

  test("should catch and log error if child_process.spawn throws", async () => {
    // We want to test the missing error test for SSH tunnel child process
    mock.method(cp, "spawn", () => {
      throw new Error("Simulated spawn error");
    });

    mock.method(fs, "existsSync", () => true);

    mock.method(net, "createServer", () => ({
      once: (evt: string, cb: any) => {
        if (evt === "listening") cb();
      },
      listen: () => {},
      close: () => {}
    }));

    const consoleErrorMock = mock.method(console, "error", () => {});

    process.env.SSH_KEY_PATH = "/dummy/key";
    process.env.SSH_HOST = "user@localhost";

    const result = await ensureSshTunnel();

    assert.strictEqual(result, false);

    // Verify that the error was caught and logged
    assert.strictEqual(consoleErrorMock.mock.calls.length, 1);
    assert.strictEqual(consoleErrorMock.mock.calls[0]!.arguments[0], "[SSH Tunnel] Failed to launch SSH tunnel:");
    assert.strictEqual(consoleErrorMock.mock.calls[0]!.arguments[1].message, "Simulated spawn error");
  });
});
