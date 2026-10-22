import assert from "node:assert/strict";
import test from "node:test";
import { formatKopecksRu, parseKopecks } from "@dental/shared";
import { calculatePrepaymentDiscountKopecks } from "../../../treatment-plans/treatmentPlanPricingEngine";
import {
	type EstimatorContract,
	estimatorContractFrom,
	estimatorRowMoney,
	estimatorTotals,
	type PlanItem,
	reconcileAutoSuggestions,
} from "../../treatmentEstimatorPricing";
import { EMPTY_CATALOG, rubles, service, tooth } from "./estimatorTestHelpers";

function build(teeth: any[], catalog: any[]) {
	return reconcileAutoSuggestions([], teeth, catalog).items;
}

test("итог плана складывается целыми копейками", () => {
	const catalog = [
		service("svc-caries", "Лечение кариеса", "therapy", 300.01),
		service("svc-endo", "Лечение пульпита", "therapy", 300.05),
		service("svc-crown", "Коронка", "prosthetics", 300.07),
	];
	const items = build([tooth(11, "Caries"), tooth(12, "Pulpitis"), tooth(21, "Crown")], catalog);
	const totals = estimatorTotals(items, null);
	assert.equal(totals.incompleteRows, 0);
	assert.equal(totals.payableKopecks, 90_013);
	assert.equal(formatKopecksRu(totals.payableKopecks), rubles("900,13"));
	assert.notEqual(300.01 + 300.05 + 300.07, 900.13);
	assert.equal(parseKopecks(300.01 + 300.05 + 300.07), 90_013);
});

test("строка без цены не считается нулём, и итог назван неполным", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const items = build([tooth(11, "Caries"), tooth(21, "Crown")], catalog);
	const totals = estimatorTotals(items, null);
	assert.equal(totals.payableKopecks, 200_000);
	assert.equal(totals.incompleteRows, 1);
	assert.equal(totals.pricedRows, 1);
});

test("на пустом прайсе итога нет вовсе, а не «0 ₽»", () => {
	const items = build([tooth(11, "Caries"), tooth(21, "Crown"), tooth(16, "Planned_Implant")], EMPTY_CATALOG);
	const totals = estimatorTotals(items, null);
	assert.equal(items.length, 4);
	assert.equal(totals.incompleteRows, 4);
	assert.equal(totals.pricedRows, 0);
});

test("скидка вычитается рублями и не уводит строку ниже нуля", () => {
	const row: PlanItem = { priceId: "svc", name: "Лечение кариеса", quantity: 2, price: 1000.5, discount: 500, phase: 1 };
	const money = estimatorRowMoney(row, null);
	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.lineKopecks, 150_100);
	const overDiscounted = estimatorRowMoney({ ...row, discount: 99_999 }, null);
	assert.equal(overDiscounted.known, true);
	if (!overDiscounted.known) return;
	assert.equal(overDiscounted.lineKopecks, 0);
});

test("со-оплата по ДМС считается целыми копейками", () => {
	const contract = estimatorContractFrom({ coverageTherapyPct: 30, coverageOrthoPct: 0, coverageHygienePct: 0, coverageSurgeryPct: 0 });
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 1500.5)];
	const items = build([tooth(11, "Caries")], catalog);
	const money = estimatorRowMoney(items[0] as PlanItem, contract);
	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.coveragePct, 30);
	assert.equal(money.copayPct, 70);
	assert.equal(money.unitPayableKopecks, 105_035);
	assert.equal(formatKopecksRu(money.unitPayableKopecks), rubles("1 050,35"));
});

test("недочитанный договор ДМС даёт полную цену, а не NaN", () => {
	const contract = estimatorContractFrom({ coverageTherapyPct: undefined });
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 4300)];
	const items = build([tooth(11, "Caries")], catalog);
	const money = estimatorRowMoney(items[0] as PlanItem, contract);
	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.coveragePct, 0);
	assert.equal(money.payableKopecks, 430_000);
	assert.ok(Number.isInteger(money.payableKopecks));
});

test("calculatePrepaymentDiscountKopecks: расчет 5% скидки за единовременную оплату с копеечной точностью", () => {
	const res1 = calculatePrepaymentDiscountKopecks(10_000_000, 5, true);
	assert.equal(res1.totalKopecks, 10_000_000);
	assert.equal(res1.discountKopecks, 500_000);
	assert.equal(res1.finalPriceKopecks, 9_500_000);
	const res2 = calculatePrepaymentDiscountKopecks(1_234_567, 5, true);
	assert.equal(res2.discountKopecks, 61_728);
	assert.equal(res2.finalPriceKopecks, 1_172_839);
});
