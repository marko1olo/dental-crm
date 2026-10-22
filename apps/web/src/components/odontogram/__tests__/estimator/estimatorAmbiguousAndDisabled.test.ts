import assert from "node:assert/strict";
import test from "node:test";
import {
	estimatorIssueMessages,
	reconcileAutoSuggestions,
} from "../../treatmentEstimatorPricing";
import { service, tooth } from "./estimatorTestHelpers";

function build(teeth: any[], catalog: any[]) {
	return reconcileAutoSuggestions([], teeth, catalog).items;
}

test("пять зубов с одной бедой — одна фраза и один список зубов", () => {
	const catalog = [service("svc-crown", "Коронка", "prosthetics", 19_000)];
	const items = build([11, 12, 13, 14, 15].map((num) => tooth(num, "Caries")), catalog);
	const messages = estimatorIssueMessages(items);
	assert.equal(messages.length, 1);
	assert.match(messages[0] ?? "", /зубы 11, 12, 13, 14, 15/);
});

test("несколько подходящих услуг — цены нет, и выбор оставлен врачу", () => {
	const catalog = [
		service("svc-1", "Лечение кариеса I класса", "therapy", 3000),
		service("svc-2", "Лечение кариеса II класса", "therapy", 4200),
	];
	const items = build([tooth(11, "Caries")], catalog);
	assert.equal(items[0]?.price, null);
	assert.equal(items[0]?.priceId, null);
	assert.equal(items[0]?.issue?.kind, "ambiguous");
	assert.equal(items[0]?.issue?.matches, 2);
	const [message] = estimatorIssueMessages(items);
	assert.ok(message);
	assert.match(message, /несколько подходящих услуг \(2\)/);
	assert.doesNotMatch(message, /выберите нужную в строке/i);
});

test("выключенная услуга не попадает в подписываемую смету", () => {
	const catalog = [service("svc-old", "Лечение кариеса", "therapy", 2500, false)];
	const items = build([tooth(11, "Caries")], catalog);
	assert.equal(items[0]?.priceId, null);
	assert.equal(items[0]?.price, null);
	assert.equal(items[0]?.issue?.kind, "service_disabled");
	assert.equal(items[0]?.issue?.catalogTitle, "Лечение кариеса");
	const message = estimatorIssueMessages(items)[0] ?? "";
	assert.match(message, /«Лечение кариеса»/);
	assert.match(message, /она выключена/);
	assert.match(message, /вторую такую же услугу не нужно/);
});

test("услуга без читаемой цены не превращается в ноль", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", Number.NaN)];
	const items = build([tooth(11, "Caries")], catalog);
	assert.equal(items[0]?.priceId, "svc-caries");
	assert.equal(items[0]?.price, null);
	assert.equal(items[0]?.issue?.kind, "price_missing");
	assert.match(estimatorIssueMessages(items)[0] ?? "", /не указана цена/);
});
