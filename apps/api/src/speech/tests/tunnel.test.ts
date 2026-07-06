import { describe, test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import child_process from "node:child_process";
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import cp from "node:child_process";
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
describe("tunnel", () => {

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
  it("should fail if env variables not set", async () => {
    delete process.env.SSH_KEY_PATH;
    delete process.env.SSH_HOST;
    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);

  it("should fail if invalid env variables (starts with -)", async () => {
    process.env.SSH_KEY_PATH = "-invalid";
    process.env.SSH_HOST = "host";
    let res = await ensureSshTunnel();
    assert.strictEqual(res, false);

    process.env.SSH_KEY_PATH = "valid";
    process.env.SSH_HOST = "-host";
    res = await ensureSshTunnel();
    assert.strictEqual(res, false);

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
    mock.method(net, "createServer", () => serverMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, true);

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
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => false);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);

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
        return serverMock;
      }),
      listen: mock.fn(() => {
        callCount++;
      }),
      close: mock.fn()
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    const spawnMock = {
      unref: mock.fn(),
      kill: mock.fn()
    mock.method(cp, "spawn", () => spawnMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, true);

    stopSshTunnel();
    assert.strictEqual(spawnMock.kill.mock.calls.length, 1);

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
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    const spawnMock = {
      unref: mock.fn(),
      kill: mock.fn()
    mock.method(cp, "spawn", () => spawnMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);

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
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    mock.method(cp, "spawn", () => {
      throw new Error("spawn failed");

    const res = await ensureSshTunnel();
    assert.strictEqual(res, false);

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
        return serverMock;
      }),
      listen: mock.fn(() => callCount++),
      close: mock.fn()
    mock.method(net, "createServer", () => serverMock);

    mock.method(fs, "existsSync", () => true);

    const spawnMock = {
      unref: mock.fn(),
      kill: mock.fn(() => {
        throw new Error("kill failed");
      })
    mock.method(cp, "spawn", () => spawnMock);

    const res = await ensureSshTunnel();
    assert.strictEqual(res, true);

    // This shouldn't throw an error
    stopSshTunnel();
    assert.strictEqual(spawnMock.kill.mock.calls.length, 1);
import { test, describe, afterEach, mock } from "node:test";



  const originalEnv = { ...process.env };


    // Restore environment variables without replacing the process.env object itself
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;


  test("should catch and log error if child_process.spawn throws", async () => {
    // We want to test the missing error test for SSH tunnel child process


    mock.method(net, "createServer", () => ({
      once: (evt: string, cb: any) => {
        if (evt === "listening") cb();
      close: () => {}
    }));

    const consoleErrorMock = mock.method(console, "error", () => {});

    process.env.SSH_KEY_PATH = "/dummy/key";
    process.env.SSH_HOST = "user@localhost";



    // Verify that the error was caught and logged
    assert.strictEqual(consoleErrorMock.mock.calls.length, 1);
    assert.strictEqual(consoleErrorMock.mock.calls[0]!.arguments[0], "[SSH Tunnel] Failed to launch SSH tunnel:");
    assert.strictEqual(consoleErrorMock.mock.calls[0]!.arguments[1].message, "Simulated spawn error");
  });
});
