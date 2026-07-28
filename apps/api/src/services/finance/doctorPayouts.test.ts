/**
 * Тесты формулы выплаты врачу и границ расчёта.
 *
 * Проверяется ровно то, что определяет размер зарплаты и что нельзя увидеть
 * глазами в коде: порядок операций, округление до копейки, отказ считать без
 * ставки и отрицательная выплата. Запрос к базе здесь не проверяется — он
 * измеряется живым прогоном (src/tests/routes/doctorPayoutsProof.ts).
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	MAX_PAYOUT_PERIOD_DAYS,
	computeDoctorPayout,
	materialsStateOf,
	payoutRowNote,
	percentOfMoney,
	resolvePayoutPeriod,
} from "./doctorPayouts.js";

test("без ставки выплата не считается: null, а не ноль", () => {
	const result = computeDoctorPayout({
		revenueRub: 44000,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: null,
		materialDeductionPct: null,
	});
	assert.equal(result.state, "rate_missing");
	assert.equal(result.accruedRub, null);
	assert.equal(result.withheldMaterialRub, null);
	assert.equal(result.payoutRub, null);

	// Ноль к выплате прочитали бы как «врач ничего не заработал», поэтому в
	// строке обязана быть причина и действие.
	const note = payoutRowNote({
		state: result.state,
		materialsState: "no_movements",
		materialMovementsUnpriced: 0,
		commissionPct: null,
		rateRowCount: 0,
		payoutRub: null,
		revenueRub: 44000,
	});
	assert.match(note, /Ставка врача не задана/);
	assert.match(note, /Задайте процент/);
});

test("30 % из diary.ts не подставляется молча вместо отсутствующей ставки", () => {
	const result = computeDoctorPayout({
		revenueRub: 44000,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: null,
		materialDeductionPct: 100,
	});
	// 44000 × 30 % = 13200. Такого числа быть не должно ни при каких условиях:
	// 30 % — это значение, которое код пишет при СОЗДАНИИ строки ставки, а не
	// факт о договорённости с врачом.
	assert.notEqual(result.accruedRub, 13200);
	assert.equal(result.state, "rate_missing");
});

test("нулевая касса при заданной ставке даёт ноль, а не отказ", () => {
	const result = computeDoctorPayout({
		revenueRub: 0,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: 30,
		materialDeductionPct: 100,
	});
	assert.equal(result.state, "computed");
	assert.equal(result.accruedRub, 0);
	assert.equal(result.withheldMaterialRub, 0);
	assert.equal(result.payoutRub, 0);

	const note = payoutRowNote({
		state: result.state,
		materialsState: "no_movements",
		materialMovementsUnpriced: 0,
		commissionPct: 30,
		rateRowCount: 1,
		payoutRub: 0,
		revenueRub: 0,
	});
	assert.match(note, /Кассы за период нет/);
});

test("удержание идёт ПОСЛЕ начисления процента, а не до", () => {
	const result = computeDoctorPayout({
		revenueRub: 10000,
		materialCostRub: 4000,
		materialMovements: 3,
		commissionPct: 30,
		materialDeductionPct: 100,
	});
	assert.equal(result.accruedRub, 3000);
	assert.equal(result.withheldMaterialRub, 4000);
	assert.equal(result.payoutRub, -1000);
	// Обратный порядок (касса − материалы) × ставка дал бы 1800: другая
	// договорённость с врачом и другая зарплата.
	assert.notEqual(result.payoutRub, 1800);
});

test("материалы дороже начисленного: выплата отрицательная и не обнуляется", () => {
	const result = computeDoctorPayout({
		revenueRub: 5000,
		materialCostRub: 4000,
		materialMovements: 2,
		commissionPct: 25,
		materialDeductionPct: 100,
	});
	assert.equal(result.accruedRub, 1250);
	assert.equal(result.withheldMaterialRub, 4000);
	assert.equal(result.payoutRub, -2750);

	const note = payoutRowNote({
		state: result.state,
		materialsState: "counted",
		materialMovementsUnpriced: 0,
		commissionPct: 25,
		rateRowCount: 1,
		payoutRub: result.payoutRub,
		revenueRub: 5000,
	});
	assert.match(note, /долг врача клинике/);
});

test("копейка не теряется: половина округляется вверх", () => {
	// 23 400,55 × 30 % = 7 020,165. Двоичный float через Math.round дал бы
	// 7 020,16 — расхождение в копейку в зарплатной ведомости.
	assert.equal(percentOfMoney(23400.55, 30), 7020.17);
	assert.equal(percentOfMoney(0.01, 50), 0.01);
	assert.equal(percentOfMoney(1500.5, 30), 450.15);

	const result = computeDoctorPayout({
		revenueRub: 23400.55,
		materialCostRub: 1500.5,
		materialMovements: 1,
		commissionPct: 30,
		materialDeductionPct: 100,
	});
	assert.equal(result.accruedRub, 7020.17);
	assert.equal(result.withheldMaterialRub, 1500.5);
	assert.equal(result.payoutRub, 5519.67);
});

test("списаний нет — удерживать нечего, даже если процент удержания не задан", () => {
	const result = computeDoctorPayout({
		revenueRub: 10000,
		materialCostRub: 0,
		materialMovements: 0,
		commissionPct: 40,
		materialDeductionPct: null,
	});
	assert.equal(result.state, "computed");
	assert.equal(result.withheldMaterialRub, 0);
	assert.equal(result.payoutRub, 4000);
});

test("себестоимость есть, а процент удержания не задан — итог не выдумывается", () => {
	const result = computeDoctorPayout({
		revenueRub: 10000,
		materialCostRub: 2500,
		materialMovements: 4,
		commissionPct: 40,
		materialDeductionPct: null,
	});
	assert.equal(result.state, "material_policy_missing");
	// Начисленное показать можно, итог — нет: ноль удержания выплатил бы врачу
	// материалы клиники, а 100 % удержало бы то, о чём не договаривались.
	assert.equal(result.accruedRub, 4000);
	assert.equal(result.withheldMaterialRub, null);
	assert.equal(result.payoutRub, null);
});

test("непригодная ставка не превращается в число", () => {
	for (const badPercent of [-5, 150, Number.NaN, Number.POSITIVE_INFINITY]) {
		const result = computeDoctorPayout({
			revenueRub: 10000,
			materialCostRub: 0,
			materialMovements: 0,
			commissionPct: badPercent,
			materialDeductionPct: 0,
		});
		assert.equal(result.state, "rate_invalid", `ставка ${badPercent} должна быть отвергнута`);
		assert.equal(result.payoutRub, null);
	}
});

test("ноль себестоимости отличается от отсутствия списаний", () => {
	assert.equal(materialsStateOf(0, 0), "no_movements");
	assert.equal(materialsStateOf(3, 0), "counted");
	assert.equal(materialsStateOf(3, 1), "cost_missing");

	const note = payoutRowNote({
		state: "computed",
		materialsState: "cost_missing",
		materialMovementsUnpriced: 2,
		commissionPct: 30,
		rateRowCount: 1,
		payoutRub: 1000,
		revenueRub: 5000,
	});
	assert.match(note, /без цены или без количества: 2/);
});

test("несколько активных ставок у врача — расчёт сообщает об этом", () => {
	const note = payoutRowNote({
		state: "computed",
		materialsState: "no_movements",
		materialMovementsUnpriced: 0,
		commissionPct: 30,
		rateRowCount: 2,
		payoutRub: 1000,
		revenueRub: 5000,
	});
	assert.match(note, /Активных ставок у врача найдено 2/);
});

test("период по умолчанию — текущий месяц целиком", () => {
	const period = resolvePayoutPeriod({}, new Date(2026, 6, 15, 13, 45));
	assert.equal(period.ok, true);
	if (!period.ok) return;
	assert.equal(period.from.getFullYear(), 2026);
	assert.equal(period.from.getMonth(), 6);
	assert.equal(period.from.getDate(), 1);
	assert.equal(period.to.getMonth(), 6);
	assert.equal(period.to.getDate(), 31);
});

test("период отвергается, а не обрезается молча", () => {
	const reversed = resolvePayoutPeriod({ from: "2026-07-31T00:00:00.000Z", to: "2026-07-01T00:00:00.000Z" });
	assert.equal(reversed.ok, false);
	if (!reversed.ok) assert.match(reversed.message, /Начало периода позже/);

	const tooWide = resolvePayoutPeriod({ from: "2020-01-01T00:00:00.000Z", to: "2026-01-01T00:00:00.000Z" });
	assert.equal(tooWide.ok, false);
	if (!tooWide.ok) assert.match(tooWide.message, new RegExp(String(MAX_PAYOUT_PERIOD_DAYS)));

	const garbage = resolvePayoutPeriod({ from: "первое июля", to: "2026-07-31T00:00:00.000Z" });
	assert.equal(garbage.ok, false);
	if (!garbage.ok) assert.match(garbage.message, /не разобраны/);
});
