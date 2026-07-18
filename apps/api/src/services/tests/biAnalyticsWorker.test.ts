import test from "node:test";
import assert from "node:assert";
import { startBiAnalyticsWorker } from "../biAnalyticsWorker.js";

test("startBiAnalyticsWorker scheduling", (t) => {
	t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
	const setTimeoutMock = t.mock.method(global, "setTimeout");
	const setIntervalMock = t.mock.method(global, "setInterval");

	startBiAnalyticsWorker();

	assert.strictEqual(setTimeoutMock.mock.calls.length, 1);
	assert.strictEqual(setTimeoutMock.mock.calls[0].arguments[1], 5000);

	assert.strictEqual(setIntervalMock.mock.calls.length, 1);
	assert.strictEqual(
		setIntervalMock.mock.calls[0].arguments[1],
		1000 * 60 * 60,
	);

	const timeoutFn = setTimeoutMock.mock.calls[0].arguments[0] as Function;
	const intervalFn = setIntervalMock.mock.calls[0].arguments[0] as Function;

	assert.strictEqual(typeof timeoutFn, 'function');
	assert.strictEqual(typeof intervalFn, 'function');

	t.mock.timers.reset();
});
