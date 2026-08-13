import assert from "node:assert";
import { describe, test } from "node:test";
import { db } from "../db/client.js";
import * as workerModule from "./notificationWorker.js";

describe("startNotificationWorker", () => {
	test("calls setInterval with correct timing and handles queue processing", async (t) => {
		// biome-ignore lint/complexity/noBannedTypes: automated suppression
		let capturedCallback: Function | undefined;
		const setIntervalMock = t.mock.method(
			global,
			"setInterval",
			// biome-ignore lint/complexity/noBannedTypes: automated suppression
			(cb: Function) => {
				capturedCallback = cb;
				return 123;
			},
		);

		const dbSelectMock = t.mock.method(db, "select", () => {
			return {
				from: () => ({
					where: () => ({
						limit: () => Promise.resolve([]),
					}),
				}),
			};
		});

		workerModule.startNotificationWorker();

		assert.strictEqual(setIntervalMock.mock.callCount(), 1);
		const intervalCall = setIntervalMock.mock.calls[0];
		assert.ok(intervalCall);
		const args = intervalCall.arguments;
		assert.strictEqual(args[1], 10000);
		assert.strictEqual(typeof args[0], "function");

		assert.ok(capturedCallback);
		await capturedCallback();

		assert.strictEqual(dbSelectMock.mock.callCount(), 1);
	});
});
