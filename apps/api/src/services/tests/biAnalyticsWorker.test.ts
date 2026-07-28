import test, { describe } from "node:test";
import assert from "node:assert";
import {
	doctorProfitabilityRow,
	startBiAnalyticsWorker,
} from "../biAnalyticsWorker.js";

describe("doctorProfitabilityRow", () => {
	test("выручка берётся в рублях, а не делится на 100", () => {
		// Раньше запрос считал sum(CAST(amount_rub AS float) / 100), хотя колонка
		// хранит целые рубли: врач с выручкой 500 000 руб. показывался как 5 000.
		const row = doctorProfitabilityRow("Иванов", 500_000, 3);
		assert.strictEqual(row.revenue, "500000.00");
	});

	test("материалы, комиссия и маржа в сумме дают выручку до копейки", () => {
		for (const revenue of [0, 1, 7, 333, 100_000, 123_457]) {
			const row = doctorProfitabilityRow("Врач", revenue, 1);
			const back = (value: string) => Math.round(Number(value) * 100);
			assert.strictEqual(
				back(row.materialCost) + back(row.commission) + back(row.margin),
				back(row.revenue),
				`выручка ${revenue} руб. не сходится`,
			);
		}
	});

	test("доли считаются точно: 15% и 25% от 1000 руб.", () => {
		const row = doctorProfitabilityRow("Врач", 1000, 1);
		assert.strictEqual(row.revenue, "1000.00");
		assert.strictEqual(row.materialCost, "150.00");
		assert.strictEqual(row.commission, "250.00");
		assert.strictEqual(row.margin, "600.00");
	});

	test("bigint из драйвера приходит строкой и разбирается без потерь", () => {
		// sum() над integer в PostgreSQL — bigint, node-postgres отдаёт его строкой.
		const row = doctorProfitabilityRow("Врач", "1000", 1);
		assert.strictEqual(row.revenue, "1000.00");
	});

	test("нулевая выручка не ломает расчёт", () => {
		const row = doctorProfitabilityRow("Врач", null, 0);
		assert.strictEqual(row.revenue, "0.00");
		assert.strictEqual(row.margin, "0.00");
		assert.strictEqual(row.completionRate, 0);
	});
});

test("startBiAnalyticsWorker scheduling", (t) => {
	t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
	const setTimeoutMock = t.mock.method(global, "setTimeout");
	const setIntervalMock = t.mock.method(global, "setInterval");

	startBiAnalyticsWorker();

	assert.strictEqual(setTimeoutMock.mock.calls.length, 1);
	const timeoutCall = setTimeoutMock.mock.calls[0];
	assert.ok(timeoutCall);
	assert.strictEqual(timeoutCall.arguments[1], 5000);

	assert.strictEqual(setIntervalMock.mock.calls.length, 1);
	const intervalCall = setIntervalMock.mock.calls[0];
	assert.ok(intervalCall);
	assert.strictEqual(
		intervalCall.arguments[1],
		1000 * 60 * 60,
	);

	const timeoutFn = timeoutCall.arguments[0] as Function;
	const intervalFn = intervalCall.arguments[0] as Function;

	assert.strictEqual(typeof timeoutFn, 'function');
	assert.strictEqual(typeof intervalFn, 'function');

	t.mock.timers.reset();
});
