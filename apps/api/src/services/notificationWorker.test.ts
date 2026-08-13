import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	describeAutomaticSending,
	startCommunicationDispatchWorker,
	startDispatchWorker,
} from "./communications/dispatchWorker.js";
import {
	startNotificationWorker,
	stopNotificationWorker,
} from "./notificationWorker.js";

describe("notificationWorker & dispatchWorker delegation", () => {
	it("returns disabled handle when DENTE_COMMUNICATION_WORKER_ENABLED is disabled or unset", async () => {
		stopNotificationWorker();

		const handle = startNotificationWorker({
			env: { DENTE_COMMUNICATION_WORKER_ENABLED: "0" },
		});

		assert.strictEqual(handle.enabled, false);
		assert.strictEqual(typeof handle.stop, "function");

		// No-op invocation verification
		handle.stop();
		const runResult = await handle.runOnce();
		assert.strictEqual(runResult, null);

		const reminderResult = await handle.scheduleRemindersOnce();
		assert.strictEqual(reminderResult, null);
	});

	it("returns enabled handle and can be stopped cleanly when worker is enabled via env", () => {
		stopNotificationWorker();

		const handle = startNotificationWorker({
			env: {
				DENTE_COMMUNICATION_WORKER_ENABLED: "true",
				DENTE_COMMUNICATION_WORKER_INTERVAL_MS: "60000",
			},
		});

		assert.strictEqual(handle.enabled, true);
		assert.strictEqual(typeof handle.stop, "function");
		assert.strictEqual(typeof handle.runOnce, "function");
		assert.strictEqual(typeof handle.scheduleRemindersOnce, "function");

		// Verify clean lifecycle teardown
		handle.stop();
		stopNotificationWorker();
	});

	it("startDispatchWorker and startCommunicationDispatchWorker refer to the same function", () => {
		assert.strictEqual(startDispatchWorker, startCommunicationDispatchWorker);
	});

	it("describeAutomaticSending correctly reflects environment configuration", () => {
		const disabledState = describeAutomaticSending({
			DENTE_COMMUNICATION_WORKER_ENABLED: "false",
		});
		assert.strictEqual(disabledState.enabled, false);
		assert.strictEqual(disabledState.intervalSeconds, null);
		assert.strictEqual(disabledState.batchSize, null);

		const enabledState = describeAutomaticSending({
			DENTE_COMMUNICATION_WORKER_ENABLED: "1",
			DENTE_COMMUNICATION_WORKER_INTERVAL_MS: "15000",
			DENTE_COMMUNICATION_WORKER_BATCH_SIZE: "50",
		});
		assert.strictEqual(enabledState.enabled, true);
		assert.strictEqual(enabledState.intervalSeconds, 15);
		assert.strictEqual(enabledState.batchSize, 50);
	});
});
