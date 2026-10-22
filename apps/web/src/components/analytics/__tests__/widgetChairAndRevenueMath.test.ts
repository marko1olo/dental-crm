/**
 * apps/web/src/components/analytics/__tests__/widgetChairAndRevenueMath.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock chair utilization % and integer kopecks hourly revenue.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateCapacityYieldKopecks,
	calculateChairUtilizationPercent,
	calculateHourlyRevenueKopecks,
	formatKopecksPerHour,
	formatKopecksToRub,
} from "../analyticsWidgetData.js";

test("калькулятор утилизации кресла корректно считает процент загрузки", () => {
	assert.equal(calculateChairUtilizationPercent(360, 720), 50);
	assert.equal(calculateChairUtilizationPercent(540, 720), 75);
	assert.equal(calculateChairUtilizationPercent(0, 720), 0);
	assert.equal(calculateChairUtilizationPercent(100, 0), 0);
	assert.equal(calculateChairUtilizationPercent(100, -10), 0);
	assert.equal(calculateChairUtilizationPercent(Number.NaN, 720), 0);
	assert.equal(calculateChairUtilizationPercent(800, 720), 100);
});

test("выручка на кресло-час в целых копейках считается без потери точности", () => {
	const hourlyKopecks = calculateHourlyRevenueKopecks(10_000_000, 120);
	assert.equal(hourlyKopecks, 5_000_000);
	assert.equal(formatKopecksToRub(hourlyKopecks, false), "50 000 ₽");
	assert.equal(formatKopecksPerHour(hourlyKopecks), "50 000 ₽/час");

	const capacityYield = calculateCapacityYieldKopecks(10_000_000, 480);
	assert.equal(capacityYield, 1_250_000);
	assert.equal(formatKopecksPerHour(capacityYield), "12 500 ₽/час");

	assert.equal(calculateHourlyRevenueKopecks(0, 120), 0);
	assert.equal(calculateHourlyRevenueKopecks(1000, 0), 0);
	assert.equal(calculateHourlyRevenueKopecks(-500, 120), 0);
});

test("форматирование копеек в рубли работает точно и с разделителями тысяч", () => {
	assert.equal(formatKopecksToRub(14_500_050, true), "145 000,50 ₽");
	assert.equal(formatKopecksToRub(14_500_000, true), "145 000,00 ₽");
	assert.equal(formatKopecksToRub(14_500_000, false), "145 000 ₽");
	assert.equal(formatKopecksToRub(0, true), "0,00 ₽");
	assert.equal(formatKopecksToRub(0, false), "0 ₽");
	assert.equal(formatKopecksToRub(99, true), "0,99 ₽");
});
