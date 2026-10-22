import assert from "node:assert/strict";
import test from "node:test";
import { formatKopecksRu } from "@dental/shared";
import {
	estimatorIssueMessages,
	estimatorRowMoney,
	reconcileAutoSuggestions,
} from "../../treatmentEstimatorPricing";
import {
	EMPTY_CATALOG,
	INVENTED_PRICES_RUB,
	INVENTED_SERVICE_IDS,
	rubles,
	service,
	tooth,
} from "./estimatorTestHelpers";

function build(teeth: any[], catalog: any[]) {
	return reconcileAutoSuggestions([], teeth, catalog).items;
}

test("цена берётся из прайса клиники и не теряет копейки", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 1500.5)];
	const items = build([tooth(11, "Caries")], catalog);
	assert.equal(items.length, 1);
	const row = items[0]!;
	assert.equal(row.priceId, "svc-caries");
	assert.equal(row.name, "Лечение кариеса");
	assert.equal(row.price, 1500.5);
	assert.equal(row.issue, null);
	const money = estimatorRowMoney(row, null);
	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.unitKopecks, 150_050);
	assert.equal(money.lineKopecks, 150_050);
	assert.equal(formatKopecksRu(money.payableKopecks), rubles("1 500,50"));
});

test("название строки — из прайса клиники, а не из зашитого списка", () => {
	const catalog = [service("svc-crown", "Коронка E-max, наша цена", "prosthetics", 21_300)];
	const items = build([tooth(21, "Crown")], catalog);
	assert.equal(items[0]?.name, "Коронка E-max, наша цена");
	assert.equal(items[0]?.price, 21_300);
});

test("пустой прайс не даёт ни цены, ни выдуманного идентификатора услуги", () => {
	const items = build([tooth(11, "Caries"), tooth(21, "Crown"), tooth(16, "Planned_Implant")], EMPTY_CATALOG);
	assert.equal(items.length, 4);
	assert.deepEqual(items.map((r) => r.toothNumber), [11, 21, 16, 16]);
	for (const row of items) {
		assert.equal(row.price, null);
		assert.equal(row.priceId, null);
		assert.ok(row.issue);
		assert.equal(row.issue?.kind, "catalog_empty");
		assert.notEqual(row.price as number | null, 0);
		assert.ok(!INVENTED_PRICES_RUB.includes(row.price as unknown as number));
		assert.ok(!INVENTED_SERVICE_IDS.includes(row.priceId as unknown as string));
	}
	assert.deepEqual(items.map((r) => r.name), ["Лечение кариеса", "Коронка", "Установка имплантата", "Хирургический шаблон"]);
});

test("человеку названо, какого лечения не хватает в прайсе и куда идти", () => {
	const items = build([tooth(11, "Caries"), tooth(21, "Crown")], EMPTY_CATALOG);
	const messages = estimatorIssueMessages(items);
	assert.equal(messages.length, 1);
	const [message] = messages;
	assert.ok(message);
	assert.match(message, /прайс/i);
	assert.match(message, /Настройки → Прайс/);
	assert.match(message, /лечение кариеса \(зуб 11\)/);
	assert.match(message, /коронка \(зуб 21\)/);
	assert.match(message, /не исчезло/);
	assert.doesNotMatch(message, /[A-Za-z]/);
});

test("отсутствие услуги в непустом прайсе называет саму услугу", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 3200)];
	const items = build([tooth(11, "Caries"), tooth(21, "Crown")], catalog);
	const messages = estimatorIssueMessages(items);
	assert.equal(messages.length, 1);
	const [message] = messages;
	assert.ok(message);
	assert.match(message, /«коронка» \(зуб 21\)/);
	assert.match(message, /нет в вашем прайсе/);
	assert.match(message, /Настройки → Прайс/);
	assert.doesNotMatch(message, /[A-Za-z]/);
});
