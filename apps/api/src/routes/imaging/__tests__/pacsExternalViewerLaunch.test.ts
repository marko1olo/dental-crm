import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";

let spawnCalls: any[] = [];
let mockChildProcess: any;

import { handleLaunchExternalViewer, setProcessSpawnerForTesting } from "../pacsModules/pacsExternalViewerLaunch.js";

describe("RAD-01: PACS External Viewer Launch Server Stability Inquisition", () => {
	let mockRequest: any;
	let mockReply: any;
	let sentPayload: any;
	let statusCode: number;

	beforeEach(() => {
		spawnCalls = [];
		sentPayload = null;
		statusCode = 200;
		setProcessSpawnerForTesting(((cmd: string, args: string[], options: any) => {
			spawnCalls.push([cmd, args, options]);
			return mockChildProcess;
		}) as any);
		mockReply = {
			code: (code: number) => {
				statusCode = code;
				return mockReply;
			},
			send: (payload: any) => {
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
				warn: (...args: any[]) => {},
				error: (...args: any[]) => {},
				info: (...args: any[]) => {},
			},
		};
	});

	afterEach(() => {
		setProcessSpawnerForTesting(null);
	});

	it("returns fallbackUrl when internal cbct studio is requested", async () => {
		mockRequest.body = { viewerId: "dente-cbct-studio", studyPath: "C:\\studies\\123" };
		await handleLaunchExternalViewer(mockRequest, mockReply);
		assert.deepEqual(sentPayload, {
			success: true,
			isInternalStudio: true,
			fallbackUrl: "/cbct-studio?studyId=C%3A%5Cstudies%5C123",
		});
	});

	it("safely rejects non-existent executable without throwing or crashing", async () => {
		mockRequest.body = { exePath: "C:\\nonexistent\\viewer.exe" };
		await handleLaunchExternalViewer(mockRequest, mockReply);
		assert.equal(sentPayload.success, false);
		assert.match(sentPayload.error, /не найден/);
		assert.equal(sentPayload.canFallbackToInternalStudio, true);
	});

	it("safely rejects non-.exe file paths", async () => {
		const origExists = fs.existsSync;
		const origStat = fs.statSync;
		(fs as any).existsSync = () => true;
		(fs as any).statSync = () => ({ isFile: () => true, isDirectory: () => false });

		try {
			mockRequest.body = { exePath: "C:\\malicious\\script.bat" };
			await handleLaunchExternalViewer(mockRequest, mockReply);
			assert.equal(statusCode, 400);
			assert.equal(sentPayload.success, false);
			assert.match(sentPayload.error, /Недопустимый исполняемый файл/);
		} finally {
			(fs as any).existsSync = origExists;
			(fs as any).statSync = origStat;
		}
	});

	it("attaches error handler BEFORE unref() to prevent unhandled ENOENT server crash and cleans CLI flags", async () => {
		const origExists = fs.existsSync;
		const origStat = fs.statSync;
		(fs as any).existsSync = () => true;
		(fs as any).statSync = () => ({ isFile: () => true, isDirectory: () => false });

		let unrefCalled = 0;
		const fakeChild = new EventEmitter() as any;
		fakeChild.pid = 99999;
		fakeChild.unref = () => { unrefCalled++; };

		let errorListenerRegistered = false;
		const origOn = fakeChild.on;
		fakeChild.on = function (event: string, handler: any) {
			if (event === "error") {
				errorListenerRegistered = true;
			}
			return origOn.call(this, event, handler);
		};
		mockChildProcess = fakeChild;

		mockRequest.body = {
			viewerId: "vatech-ez3d-i",
			exePath: "C:\\Program Files\\Vatech\\Ez3D-i\\Ez3D-i.exe",
			studyPath: "C:\\studies\\study_01",
		};

		try {
			await handleLaunchExternalViewer(mockRequest, mockReply);

			assert.equal(spawnCalls.length, 1);
			const [spawnCmd, spawnArgs] = spawnCalls[0];

			// Verify that invalid /open and -study flags are eradicated
			assert.equal(spawnArgs.includes("/open"), false);
			assert.equal(spawnArgs.includes("-study"), false);
			assert.deepEqual(spawnArgs, ["C:\\studies\\study_01"]);

			// Verify child error listener is registered before unref
			assert.equal(errorListenerRegistered, true);
			assert.equal(unrefCalled, 1);
			assert.equal(sentPayload.success, true);
			assert.equal(sentPayload.pid, 99999);

			// Now simulate asynchronous child process ENOENT error in Node.js event loop
			assert.doesNotThrow(() => {
				fakeChild.emit("error", new Error("spawn ENOENT simulated"));
			});
		} finally {
			(fs as any).existsSync = origExists;
			(fs as any).statSync = origStat;
		}
	});
});
