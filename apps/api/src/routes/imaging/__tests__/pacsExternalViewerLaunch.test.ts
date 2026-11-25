import { describe, it, beforeEach, afterEach, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import type { ChildProcess } from "node:child_process";
import type { FastifyRequest, FastifyReply } from "fastify";

let spawnCalls: [string, string[], unknown][] = [];
let mockChildProcess: ChildProcess | null = null;

import { handleLaunchExternalViewer, setProcessSpawnerForTesting, type ProcessSpawner } from "../pacsModules/pacsExternalViewerLaunch.js";

describe("RAD-01: PACS External Viewer Launch Server Stability Inquisition", () => {
	let mockRequest: {
		headers: Record<string, string>;
		body: Record<string, unknown>;
		log: {
			warn: (...args: unknown[]) => void;
			error: (...args: unknown[]) => void;
			info: (...args: unknown[]) => void;
		};
	};
	let mockReply: {
		code: (code: number) => typeof mockReply;
		send: (payload: {
			success?: boolean;
			error?: string;
			pid?: number;
			isInternalStudio?: boolean;
			fallbackUrl?: string;
			canFallbackToInternalStudio?: boolean;
		}) => typeof mockReply;
	};
	let sentPayload: {
		success?: boolean;
		error?: string;
		pid?: number;
		isInternalStudio?: boolean;
		fallbackUrl?: string;
		canFallbackToInternalStudio?: boolean;
	} | null;
	let statusCode: number;

	beforeEach(() => {
		spawnCalls = [];
		sentPayload = null;
		statusCode = 200;
		const mockSpawner = ((cmd: string, args: readonly string[] = [], options: unknown = {}) => {
			spawnCalls.push([cmd, [...args], options]);
			return mockChildProcess as ChildProcess;
		}) as ProcessSpawner;
		setProcessSpawnerForTesting(mockSpawner);
		mockReply = {
			code: (code: number) => {
				statusCode = code;
				return mockReply;
			},
			send: (payload) => {
				sentPayload = payload;
				return mockReply;
			},
		};
		mockRequest = {
			headers: {
				"x-dente-clinic-token": "demo-showcase-token-inquisition",
			},
			body: {},
			log: {
				warn: () => {},
				error: () => {},
				info: () => {},
			},
		};
	});

	afterEach(() => {
		setProcessSpawnerForTesting(null);
	});

	it("returns fallbackUrl when internal cbct studio is requested", async () => {
		mockRequest.body = { viewerId: "dente-cbct-studio", studyPath: "C:\\studies\\123" };
		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);
		assert.deepEqual(sentPayload, {
			success: true,
			isInternalStudio: true,
			fallbackUrl: "/cbct-studio?studyId=C%3A%5Cstudies%5C123",
		});
	});

	it("safely rejects non-existent executable without throwing or crashing", async () => {
		mockRequest.body = { exePath: "C:\\nonexistent\\viewer.exe" };
		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);
		assert.equal(sentPayload?.success, false);
		assert.match(sentPayload?.error ?? "", /не найден/);
		assert.equal(sentPayload?.canFallbackToInternalStudio, true);
	});

	it("safely rejects non-.exe file paths", async (t: TestContext) => {
		t.mock.method(fs, "existsSync", () => true);
		const dummyStats: Partial<fs.Stats> = { isFile: () => true, isDirectory: () => false };
		t.mock.method(fs, "statSync", () => dummyStats as fs.Stats);

		mockRequest.body = { exePath: "C:\\malicious\\script.bat" };
		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);
		assert.equal(statusCode, 400);
		assert.equal(sentPayload?.success, false);
		assert.match(sentPayload?.error ?? "", /Недопустимый исполняемый файл/);
	});

	it("attaches error handler BEFORE unref() to prevent unhandled ENOENT server crash and cleans CLI flags", async (t: TestContext) => {
		t.mock.method(fs, "existsSync", () => true);
		const dummyStats: Partial<fs.Stats> = { isFile: () => true, isDirectory: () => false };
		t.mock.method(fs, "statSync", () => dummyStats as fs.Stats);

		let unrefCalled = 0;
		class FakeChildProcess extends EventEmitter {
			pid = 99999;
			unref() {
				unrefCalled++;
			}
		}
		const fakeChild = new FakeChildProcess();

		let errorListenerRegistered = false;
		fakeChild.on("error", () => {
			errorListenerRegistered = true;
		});
		mockChildProcess = fakeChild as ChildProcess;

		mockRequest.body = {
			viewerId: "vatech-ez3d-i",
			exePath: "C:\\Program Files\\Vatech\\Ez3D-i\\Ez3D-i.exe",
			studyPath: "study_01",
		};

		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);

		assert.equal(spawnCalls.length, 1);
		const [, spawnArgs] = spawnCalls[0] ?? ["", [] as string[]];

		assert.equal(spawnArgs.includes("/open"), false);
		assert.equal(spawnArgs.includes("-study"), false);
		assert.equal(spawnArgs.length, 1);
		assert.match(spawnArgs[0] ?? "", /study_01/);

		assert.equal(errorListenerRegistered, false);
		assert.equal(unrefCalled, 1);
		assert.equal(sentPayload?.success, true);
		assert.equal(sentPayload?.pid, 99999);

		assert.doesNotThrow(() => {
			fakeChild.emit("error", new Error("spawn ENOENT simulated"));
		});
	});

	it("strictly blocks OS system commands and shells (cmd.exe, powershell.exe) with 400", async (t: TestContext) => {
		t.mock.method(fs, "existsSync", () => true);
		const dummyStats: Partial<fs.Stats> = { isFile: () => true, isDirectory: () => false };
		t.mock.method(fs, "statSync", () => dummyStats as fs.Stats);

		mockRequest.body = { exePath: "C:\\Windows\\System32\\cmd.exe", args: ["/c", "calc.exe"] };
		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);
		assert.equal(statusCode, 400);
		assert.equal(sentPayload?.success, false);
		assert.match(sentPayload?.error ?? "", /системных командных процессоров/);
		assert.equal(spawnCalls.length, 0);
	});

	it("strictly rejects studyPath outside tenant sandbox with 403 PathTraversal", async (t: TestContext) => {
		t.mock.method(fs, "existsSync", () => true);
		const dummyStats: Partial<fs.Stats> = { isFile: () => true, isDirectory: () => false };
		t.mock.method(fs, "statSync", () => dummyStats as fs.Stats);

		mockRequest.body = {
			viewerId: "vatech-ez3d-i",
			exePath: "C:\\Program Files\\Vatech\\Ez3D-i\\Ez3D-i.exe",
			studyPath: "../../../windows/system32/secret_study",
		};
		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);
		assert.equal(statusCode, 403);
		assert.equal(sentPayload?.success, false);
		assert.match(sentPayload?.error ?? "", /находится за пределами изолированного хранилища/);
		assert.equal(spawnCalls.length, 0);
	});

	it("strictly blocks calc.exe via BLOCKED_SYSTEM_EXECUTABLES", async (t: TestContext) => {
		t.mock.method(fs, "existsSync", () => true);
		const dummyStats: Partial<fs.Stats> = { isFile: () => true, isDirectory: () => false };
		t.mock.method(fs, "statSync", () => dummyStats as fs.Stats);

		mockRequest.body = { exePath: "C:\\Windows\\System32\\calc.exe" };
		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);
		assert.equal(statusCode, 400);
		assert.equal(sentPayload?.success, false);
		assert.match(sentPayload?.error ?? "", /системных командных процессоров/);
		assert.equal(spawnCalls.length, 0);
	});

	it("strictly blocks basename whitelist bypass (e.g. C:\\Temp\\Romexis.exe)", async (t: TestContext) => {
		t.mock.method(fs, "existsSync", () => true);
		const dummyStats: Partial<fs.Stats> = { isFile: () => true, isDirectory: () => false };
		t.mock.method(fs, "statSync", () => dummyStats as fs.Stats);

		mockRequest.body = { exePath: "C:\\Temp\\Romexis.exe" };
		await handleLaunchExternalViewer(mockRequest as FastifyRequest, mockReply as FastifyReply);
		assert.equal(statusCode, 403);
		assert.equal(sentPayload?.success, false);
		assert.match(sentPayload?.error ?? "", /не входит в список разрешенных медицинских просмотрщиков/);
		assert.equal(spawnCalls.length, 0);
	});

	it("confirms explorer candidate is completely purged from KNOWN_VIEWER_CANDIDATES", async () => {
		const { KNOWN_VIEWER_CANDIDATES } = await import("../pacsModules/pacsKnownCandidates.js");
		const explorerCandidate = KNOWN_VIEWER_CANDIDATES.find((c) => c.id === "explorer");
		assert.equal(explorerCandidate, undefined);
	});
});
