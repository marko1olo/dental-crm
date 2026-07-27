import { describe, it, test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import cp from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import { ensureSshTunnel, stopSshTunnel } from "../tunnel.js";

describe("tunnel", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    stopSshTunnel(); // Ensure clean state
    mock.method(global, "setTimeout", (cb: Function) => cb()); // mock delay
  });

  afterEach(() => {
    process.env = originalEnv;
    mock.restoreAll();
    stopSshTunnel();
  });

  it("should fail if env variables not set", async () => {
    delete process.env.SSH_KEY_PATH;
    delete process.env.SSH_HOST;
    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);
  });

  it("should fail if invalid env variables (starts with -)", async () => {
    process.env.SSH_KEY_PATH = "-invalid";
    process.env.SSH_HOST = "host";
    let res = await ensureSshTunnel();
    assert.strictEqual(res, false);

    process.env.SSH_KEY_PATH = "valid";
    process.env.SSH_HOST = "-host";
    res = await ensureSshTunnel();
    assert.strictEqual(res, false);
  });

  it("should return true if port is already open", async () => {
    process.env.SSH_KEY_PATH = "key";
    process.env.SSH_HOST = "host";

    const serverMock = {
      once: mock.fn((event: string, cb: Function) => {
        if (event === "error") cb(); // Simulates port occupied
        return serverMock;
      }),
      listen: mock.fn(),
      close: mock.fn()
    };
    mock.method(net, "createServer", () => serverMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, true);
  });

  it("should fail if SSH key not found", async () => {
    process.env.SSH_KEY_PATH = "missing-key";
    process.env.SSH_HOST = "host";

    const serverMock = {
      once: mock.fn((event: string, cb: Function) => {
        if (event === "listening") cb(); // Simulates port free
        return serverMock;
      }),
      listen: mock.fn(),
      close: mock.fn()
    };
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => false);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);
  });

  it("should return true if tunnel launched successfully and port opens", async () => {
    process.env.SSH_KEY_PATH = "valid-key";
    process.env.SSH_HOST = "host";

    let callCount = 0;
    const serverMock = {
      once: mock.fn((event: string, cb: Function) => {
        if (callCount === 0) {
          // First check: port is free
          if (event === "listening") cb();
        } else {
          // Second check: port is occupied (tunnel started)
          if (event === "error") cb();
        }
        return serverMock;
      }),
      listen: mock.fn(() => {
        callCount++;
      }),
      close: mock.fn()
    };
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    const spawnMock = {
      unref: mock.fn(),
      kill: mock.fn()
    };
    mock.method(cp, "spawn", () => spawnMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, true);

    stopSshTunnel();
    assert.strictEqual(spawnMock.kill.mock.calls.length, 1);
  });

  it("should return false if tunnel spawned but port remains closed", async () => {
    process.env.SSH_KEY_PATH = "valid-key";
    process.env.SSH_HOST = "host";

    const serverMock = {
      once: mock.fn((event: string, cb: Function) => {
        // Port is always free
        if (event === "listening") cb();
        return serverMock;
      }),
      listen: mock.fn(),
      close: mock.fn()
    };
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    const spawnMock = {
      unref: mock.fn(),
      kill: mock.fn()
    };
    mock.method(cp, "spawn", () => spawnMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);
  });

  it("should return false if spawn throws error", async () => {
    process.env.SSH_KEY_PATH = "valid-key";
    process.env.SSH_HOST = "host";

    const serverMock = {
      once: mock.fn((event: string, cb: Function) => {
        if (event === "listening") cb(); // Port free
        return serverMock;
      }),
      listen: mock.fn(),
      close: mock.fn()
    };
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    mock.method(cp, "spawn", () => {
      throw new Error("spawn failed");
    });

    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);
  });

  it("should ignore errors during stopSshTunnel", async () => {
    process.env.SSH_KEY_PATH = "valid-key";
    process.env.SSH_HOST = "host";

    let callCount = 0;
    const serverMock = {
      once: mock.fn((event: string, cb: Function) => {
        if (callCount === 0) {
          if (event === "listening") cb();
        } else {
          if (event === "error") cb();
        }
        return serverMock;
      }),
      listen: mock.fn(() => callCount++),
      close: mock.fn()
    };
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    const spawnMock = {
      unref: mock.fn(),
      kill: mock.fn(() => {
        throw new Error("kill failed");
      })
    };
    mock.method(cp, "spawn", () => spawnMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, true);

    // This shouldn't throw an error
    stopSshTunnel();
    assert.strictEqual(spawnMock.kill.mock.calls.length, 1);
  });
});

// Отдельный блок: проверяет не только возврат false при выбросе из spawn,
// но и то, что ошибка залогирована. Пришёл из ветки testing-ssh-tunnel-error,
// был потерян union-мержем, из-за которого файл перестал разбираться.
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
