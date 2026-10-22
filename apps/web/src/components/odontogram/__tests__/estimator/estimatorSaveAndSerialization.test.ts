import assert from "node:assert/strict";
import test from "node:test";
import {
	estimatorItemForApi,
	estimatorRowMoney,
	estimatorSaveBlock,
	isDeciduousFdiToothNumber,
	type PlanItem,
	planItemFromServer,
	reconcileAutoSuggestions,
} from "../../treatmentEstimatorPricing";
import { EMPTY_CATALOG, service, tooth } from "./estimatorTestHelpers";

function build(teeth: any[], catalog: any[]) {
	return reconcileAutoSuggestions([], teeth, catalog).items;
}

test("сохранение остановлено и названы лечение и зуб", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const items = build([tooth(11, "Caries"), tooth(21, "Crown")], catalog);
	const block = estimatorSaveBlock(items);
	assert.ok(block);
	assert.equal(block.rows.length, 1);
	assert.match(block.message, /«коронка» \(зуб 21\)/);
	assert.match(block.message, /Настройки → Прайс/);
	assert.match(block.message, /корзиной/);
	assert.doesNotMatch(block.message, /проверьте услуги, цены и этапы/);
	assert.doesNotMatch(block.message, /[A-Za-z]/);
});

test("полностью посчитанный план сохранять не запрещено", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const items = build([tooth(11, "Caries")], catalog);
	assert.equal(estimatorSaveBlock(items), null);
});

test("строка без услуги прайса не превращается в тело запроса", () => {
	const items = build([tooth(11, "Caries")], EMPTY_CATALOG);
	assert.equal(estimatorItemForApi(items[0] as PlanItem), null);
});

test("в тело запроса уходят только поля контракта сервера", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 1500.5)];
	const items = build([tooth(11, "Caries")], catalog);
	const body = estimatorItemForApi({ ...(items[0] as PlanItem), id: "row-1" });
	assert.ok(body);
	assert.deepEqual(Object.keys(body).sort(), ["discount", "isAuto", "name", "phase", "price", "priceId", "quantity", "toothNumber"]);
	assert.equal(body.priceId, "svc-caries");
	assert.equal(body.price, 1500.5);
});

test("позиция плана без цены приходит как «цены нет», а не как ноль", () => {
	const row = planItemFromServer({ id: "row-1", toothNumber: 11, priceId: "svc-caries", name: "Лечение кариеса", quantity: 1, price: null, discount: 0, phase: 1 });
	assert.ok(row);
	assert.equal(row.price, null);
	assert.equal(row.issue?.kind, "price_missing");
	assert.equal(estimatorRowMoney(row, null).known, false);
});

test("позиция плана с копейками читается точно", () => {
	const row = planItemFromServer({ priceId: "svc", name: "Лечение кариеса", quantity: 3, price: 990.99, discount: 0.5, phase: 1 });
	assert.ok(row);
	const money = estimatorRowMoney(row, null);
	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.lineKopecks, 297_247);
});

test("пустой priceId с сервера не считается услугой прайса", () => {
	const row = planItemFromServer({ priceId: "  ", name: "Лечение кариеса", price: 2000 });
	assert.ok(row);
	assert.equal(row.priceId, null);
	assert.ok(estimatorSaveBlock([row]));
});

test("номер зуба проверяется общим правилом FDI", () => {
	const invalid = planItemFromServer({ toothNumber: 99, priceId: "svc", name: "Лечение кариеса", price: 2000 });
	assert.ok(invalid);
	assert.equal(invalid.toothNumber, undefined);
	const deciduous = planItemFromServer({ toothNumber: 51, priceId: "svc", name: "Лечение кариеса", price: 2000 });
	assert.equal(deciduous?.toothNumber, 51);
	assert.equal(isDeciduousFdiToothNumber(51), true);
	assert.equal(isDeciduousFdiToothNumber(11), false);
	assert.equal(isDeciduousFdiToothNumber(99), false);
});
