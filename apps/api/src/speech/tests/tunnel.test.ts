import { describe, test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import child_process from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import { ensureSshTunnel, stopSshTunnel } from "../tunnel.js";

describe("ensureSshTunnel", () => {
  let spawnMock: any;
  let existsSyncMock: any;
  let createServerMock: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Clear state
    stopSshTunnel();

    process.env.SSH_KEY_PATH = "/tmp/fake_key";
    process.env.SSH_HOST = "fake@host";
  });

  afterEach(() => {
    process.env = originalEnv;
    mock.restoreAll();
    stopSshTunnel();
  });

  test("catches spawn errors and returns false", async () => {
    // Mock isPortOpen to return false (simulate port not initially open)
    createServerMock = mock.method(net, "createServer", () => {
      return {
        once: (event: string, cb: any) => {
          if (event === "listening") {
            setTimeout(() => cb(), 10);
          }
        },
        listen: () => {},
        close: () => {},
      };
    });

    // We must mock fs.existsSync to be synchronous, not promise returning
    existsSyncMock = mock.method(fs, "existsSync", () => true);

    // Mock spawn to throw
    spawnMock = mock.method(child_process, "spawn", () => {
      throw new Error("Simulated spawn error");
    });

    const result = await ensureSshTunnel();
    assert.strictEqual(result, false);

    // Verify spawn was called
    assert.strictEqual(spawnMock.mock.calls.length, 1);
  });
});
