import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { startWatchdog } from "./watchdog.js";

describe("startWatchdog", () => {
	let consoleLogMock: ReturnType<typeof mock.method>;

	beforeEach(() => {
		consoleLogMock = mock.method(console, "log", () => {});
	});

	afterEach(() => {
		mock.restoreAll();
	});

	test("should log the correct disabled message", () => {
		startWatchdog();

		assert.strictEqual(consoleLogMock.mock.callCount(), 1);
		assert.strictEqual(
			consoleLogMock.mock.calls[0].arguments[0],
			"[Watchdog] Local folder watcher disabled. X-Rays are now uploaded directly via the web interface (VisiographAnalyzer)."
		);
	});
});
