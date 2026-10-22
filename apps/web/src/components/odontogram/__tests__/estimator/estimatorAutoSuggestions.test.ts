import assert from "node:assert/strict";
import test from "node:test";
import {
	estimatorDismissalKeys,
	estimatorTotals,
	type PlanItem,
	reconcileAutoSuggestions,
} from "../../treatmentEstimatorPricing";
import { EMPTY_CATALOG, service, tooth } from "./estimatorTestHelpers";

function build(teeth: any[], catalog: any[]) {
	return reconcileAutoSuggestions([], teeth, catalog).items;
}

test("имплантат на молочном зубе не предлагается", () => {
	const items = build([tooth(51, "Planned_Implant")], EMPTY_CATALOG);
	assert.equal(items.length, 0);
});

test("имплантат и шаблон — две различимые строки даже без цен", () => {
	const items = build([tooth(16, "Planned_Implant")], EMPTY_CATALOG);
	assert.equal(items.length, 2);
	assert.deepEqual(items.map((r) => r.suggestion), ["implant", "implantGuide"]);
	assert.equal(new Set(items.map((r) => r.suggestion)).size, 2);
});

test("одна услуга прайса на имплантат и шаблон не удваивает деньги", () => {
	const catalog = [service("svc-guide", "Хирургический шаблон для имплантации", "surgery", 12_345.67)];
	const items = build([tooth(16, "Planned_Implant")], catalog);
	assert.equal(items.length, 1);
	assert.equal(items[0]?.priceId, "svc-guide");
	assert.equal(estimatorTotals(items, null).payableKopecks, 1_234_567);
});

test("вылеченный зуб убирает свою автоматическую строку", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const first = reconcileAutoSuggestions([], [tooth(11, "Caries")], catalog);
	assert.equal(first.changed, true);
	assert.equal(first.items.length, 1);
	const healed = reconcileAutoSuggestions(first.items, [tooth(11, "Filled")], catalog);
	assert.equal(healed.changed, true);
	assert.equal(healed.items.length, 0);
});

test("повторный подбор не удваивает строку и не трогает состояние", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const teeth = [tooth(11, "Caries")];
	const first = reconcileAutoSuggestions([], teeth, catalog);
	const again = reconcileAutoSuggestions(first.items, teeth, catalog);
	assert.equal(again.changed, false);
	assert.equal(again.items.length, 1);
	const noPrice = reconcileAutoSuggestions([], teeth, EMPTY_CATALOG);
	const noPriceAgain = reconcileAutoSuggestions(noPrice.items, teeth, EMPTY_CATALOG);
	assert.equal(noPriceAgain.changed, false);
	assert.equal(noPriceAgain.items.length, 1);
});

test("снятая корзиной строка не возвращается в смету при следующей отметке зуба", () => {
	const catalog = [service("svc-crown", "Коронка керамическая", "prosthetics", 25000), service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const teeth = [tooth(26, "Crown")];
	const first = reconcileAutoSuggestions([], teeth, catalog);
	assert.equal(first.items.length, 1);
	const removed = first.items[0]!;
	const dismissed = new Set(estimatorDismissalKeys(removed));
	assert.ok(dismissed.size > 0);
	const afterAnotherTooth = reconcileAutoSuggestions([], [tooth(26, "Crown"), tooth(11, "Caries")], catalog, dismissed);
	assert.deepEqual(afterAnotherTooth.items.map((i) => i.toothNumber), [11]);
});

test("снятие на одном зубе не убирает то же лечение на другом", () => {
	const catalog = [service("svc-crown", "Коронка керамическая", "prosthetics", 25000)];
	const first = reconcileAutoSuggestions([], [tooth(26, "Crown")], catalog);
	const removed = first.items[0]!;
	const dismissed = new Set(estimatorDismissalKeys(removed));
	const other = reconcileAutoSuggestions([], [tooth(36, "Crown")], catalog, dismissed);
	assert.equal(other.items.length, 1);
	assert.equal(other.items[0]?.toothNumber, 36);
});

test("без списка снятого подбор работает как прежде", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const result = reconcileAutoSuggestions([], [tooth(11, "Caries")], catalog);
	assert.equal(result.items.length, 1);
	assert.equal(result.changed, true);
});

test("строка, добавленная врачом руками, автоподбором не удаляется", () => {
	const manual: PlanItem = { priceId: "svc-manual", name: "Профессиональная гигиена", quantity: 1, price: 4500, discount: 0, phase: 1, toothNumber: 11 };
	const result = reconcileAutoSuggestions([manual], [], EMPTY_CATALOG);
	assert.equal(result.items.length, 1);
	assert.equal(result.changed, false);
});
