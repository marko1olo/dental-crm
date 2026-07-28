/*
 * treatmentEstimatorPricing.test.ts — смета плана лечения не выдумывает деньги.
 *
 * ЧТО ЭТИ ПРОВЕРКИ ДЕРЖАТ
 *
 * Смета хранила ВОСЕМЬ запасных объектов с выдуманными ценами (4000, 5500,
 * 6000, 12500, 35000, 12000, 5000, 28000 ₽) и выдуманными идентификаторами
 * услуг ("service_caries_01", "service_endo_pulpitis",
 * "service_implant_osstem", "service_surgery_guide",
 * "service_crown_zirconia"). Когда подходящей услуги в прайсе клиники не
 * находилось, эти суммы попадали в документ, который подписывает пациент, а
 * идентификаторы уходили на сервер полем `priceId` и сохранялись в базе.
 *
 * Поэтому здесь две главные проверки. Первая: с заполненным прайсом строка
 * несёт цену КЛИНИКИ и точно до копейки. Вторая: с ПУСТЫМ прайсом строка не
 * несёт ни цены, ни идентификатора, но клиническая находка остаётся, и человеку
 * названо, чего не хватает. Вторая проверка не прошла бы ни при одном из
 * восьми возвращённых объектов — в этом её смысл.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "@babel/parser";
import { RU_MONEY_NBSP, formatKopecksRu, parseKopecks } from "@dental/shared";
import type { PlanPriceCatalogItem } from "../plan/planPricing";
import {
	type EstimatorToothInput,
	type PlanItem,
	estimatorContractFrom,
	estimatorDismissalKeys,
	estimatorIssueMessages,
	estimatorItemForApi,
	estimatorRowMoney,
	estimatorSaveBlock,
	estimatorTotals,
	isDeciduousFdiToothNumber,
	planItemFromServer,
	reconcileAutoSuggestions,
} from "./treatmentEstimatorPricing";

/** Суммы, которых не назначала ни одна клиника. Ни одна не имеет права появиться. */
const INVENTED_PRICES_RUB = [4000, 5500, 6000, 12500, 35000, 12000, 5000, 28000];

/** Идентификаторы услуг, которых нет ни в одном прайсе. */
const INVENTED_SERVICE_IDS = [
	"service_caries_01",
	"service_endo_pulpitis",
	"service_implant_osstem",
	"service_surgery_guide",
	"service_crown_zirconia",
];

const EMPTY_CATALOG: PlanPriceCatalogItem[] = [];

/**
 * Сумма как её печатает общий формат: между разрядами и перед знаком рубля стоит
 * неразрывный пробел (U+00A0). В исходнике он берётся константой, а не вписан
 * символом: невидимый U+00A0 глазами не отличить от обычного пробела.
 */
function rubles(text: string): string {
	return `${text.replace(/ /g, RU_MONEY_NBSP)}${RU_MONEY_NBSP}₽`;
}

function service(
	id: string,
	title: string,
	category: string,
	basePriceRub: number,
	active = true,
): PlanPriceCatalogItem {
	return { id, title, category, basePriceRub, active };
}

function tooth(toothNumber: number, state: string): EstimatorToothInput {
	return { toothNumber, state };
}

function build(
	teeth: readonly EstimatorToothInput[],
	catalog: readonly PlanPriceCatalogItem[],
): PlanItem[] {
	return reconcileAutoSuggestions([], teeth, catalog).items;
}

/* ─────────── 1. Заполненный прайс: цена клиники, точно до копейки ─────────── */

test("цена берётся из прайса клиники и не теряет копейки", () => {
	const catalog = [
		service("svc-caries", "Лечение кариеса", "therapy", 1500.5),
	];
	const items = build([tooth(11, "Caries")], catalog);

	assert.equal(items.length, 1);
	const row = items[0];
	assert.ok(row);
	assert.equal(row.priceId, "svc-caries");
	assert.equal(row.name, "Лечение кариеса");
	assert.equal(row.price, 1500.5);
	assert.equal(row.issue, null);

	const money = estimatorRowMoney(row, null);
	assert.equal(money.known, true);
	if (!money.known) return;
	// Ровно 150 050 копеек — ни 150 049, ни 150 050.000000001.
	assert.equal(money.unitKopecks, 150_050);
	assert.equal(money.lineKopecks, 150_050);
	assert.equal(formatKopecksRu(money.payableKopecks), rubles("1 500,50"));
});

test("название строки — из прайса клиники, а не из зашитого списка", () => {
	const catalog = [
		service("svc-crown", "Коронка E-max, наша цена", "prosthetics", 21_300),
	];
	const items = build([tooth(21, "Crown")], catalog);
	assert.equal(items[0]?.name, "Коронка E-max, наша цена");
	assert.equal(items[0]?.price, 21_300);
});

/* ─────────── 2. Пустой прайс: ни цены, ни выдуманного идентификатора ─────────── */

test("пустой прайс не даёт ни цены, ни выдуманного идентификатора услуги", () => {
	const items = build(
		[tooth(11, "Caries"), tooth(21, "Crown"), tooth(16, "Planned_Implant")],
		EMPTY_CATALOG,
	);

	// Клиническая находка НЕ потеряна: зуб нуждается в лечении, и это видно.
	assert.equal(items.length, 4, "кариес, коронка, имплантат и шаблон");
	assert.deepEqual(
		items.map((row) => row.toothNumber),
		[11, 21, 16, 16],
	);

	for (const row of items) {
		assert.equal(row.price, null, `у «${row.name}» появилась цена из воздуха`);
		assert.equal(row.priceId, null, `у «${row.name}» появился идентификатор`);
		assert.ok(row.issue, `у «${row.name}» не названа причина отсутствия цены`);
		assert.equal(row.issue?.kind, "catalog_empty");
		// Ноль вместо неизвестной цены запрещён так же, как выдуманная сумма.
		assert.notEqual(row.price as number | null, 0);
		assert.ok(
			!INVENTED_PRICES_RUB.includes(row.price as unknown as number),
			"вернулась одна из восьми выдуманных цен",
		);
		assert.ok(
			!INVENTED_SERVICE_IDS.includes(row.priceId as unknown as string),
			"вернулся один из выдуманных идентификаторов услуг",
		);
	}

	// Названия — человеческие слова о лечении, а не позиции несуществующего прайса.
	assert.deepEqual(
		items.map((row) => row.name),
		[
			"Лечение кариеса",
			"Коронка",
			"Установка имплантата",
			"Хирургический шаблон",
		],
	);
});

test("человеку названо, какого лечения не хватает в прайсе и куда идти", () => {
	const items = build([tooth(11, "Caries"), tooth(21, "Crown")], EMPTY_CATALOG);
	const messages = estimatorIssueMessages(items);

	// Пустой прайс — одна новость на весь план, а не по фразе на каждое лечение:
	// иначе в списке оказывались побуквенно одинаковые строки (и одинаковые
	// ключи React).
	assert.equal(messages.length, 1, messages.join(" | "));
	const [message] = messages;
	assert.ok(message);
	assert.equal(new Set(messages).size, messages.length);

	assert.match(message, /прайс/i);
	assert.match(message, /Настройки → Прайс/);
	// Названо КАЖДОЕ лечение, которому не хватает цены, и на каких зубах.
	assert.match(message, /лечение кариеса \(зуб 11\)/);
	assert.match(message, /коронка \(зуб 21\)/);
	assert.match(message, /не исчезло/);
	// Ни одной латинской буквы и ни одного технического слова.
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

test("пять зубов с одной бедой — одна фраза и один список зубов", () => {
	const catalog = [service("svc-crown", "Коронка", "prosthetics", 19_000)];
	const items = build(
		[11, 12, 13, 14, 15].map((number) => tooth(number, "Caries")),
		catalog,
	);
	const messages = estimatorIssueMessages(items);
	assert.equal(messages.length, 1);
	assert.match(messages[0] ?? "", /зубы 11, 12, 13, 14, 15/);
});

/* ─────────── 3. Прайс есть, но выбор за врача программа не делает ─────────── */

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
	// Кнопки выбора услуги в строке сметы нет — обещать её нельзя.
	assert.doesNotMatch(message, /выберите нужную в строке/i);
});

/*
 * Здесь ожидание было "catalog_empty", и оно устарело.
 *
 * Прайс в этом наборе НЕ пуст: в нём лежит «Лечение кариеса» за 2500 ₽, просто
 * выключенная. Сообщение «прайс ещё не заполнен» отправило бы врача добавлять
 * услугу, которая у него уже есть, а «услуга выключена в прайсе» отправляет
 * включить её обратно — одно нажатие вместо заведения дубля. Само название
 * теста говорит «выключенная услуга», то есть точный разбор совпадает с
 * замыслом теста лучше, чем его прежнее утверждение.
 *
 * Поэтому исправлен ТЕСТ, а не код, и утверждение при этом усилено: проверяется
 * не только вид отказа, но и то, что человеку названа конкретная выключенная
 * услуга. Ослабленный тест принял бы и расплывчатый ответ.
 */
test("выключенная услуга не попадает в подписываемую смету", () => {
	const catalog = [
		service("svc-old", "Лечение кариеса", "therapy", 2500, false),
	];
	const items = build([tooth(11, "Caries")], catalog);
	assert.equal(items[0]?.priceId, null);
	assert.equal(items[0]?.price, null);
	assert.equal(items[0]?.issue?.kind, "service_disabled");
	assert.equal(items[0]?.issue?.catalogTitle, "Лечение кариеса");
	const message = estimatorIssueMessages(items)[0] ?? "";
	// Услуга названа по имени: без этого совет «включите её» некуда применить.
	assert.match(message, /«Лечение кариеса»/);
	assert.match(message, /она выключена/);
	// Самое ценное в этом тексте — запрет на дубль. Прежний совет «добавьте
	// услугу» заставлял врача завести в прайсе ВТОРУЮ такую же.
	assert.match(message, /вторую такую же услугу не нужно/);
});

test("услуга без читаемой цены не превращается в ноль", () => {
	const catalog = [
		service("svc-caries", "Лечение кариеса", "therapy", Number.NaN),
	];
	const items = build([tooth(11, "Caries")], catalog);
	assert.equal(items[0]?.priceId, "svc-caries");
	assert.equal(items[0]?.price, null);
	assert.equal(items[0]?.issue?.kind, "price_missing");
	assert.match(estimatorIssueMessages(items)[0] ?? "", /не указана цена/);
});

/* ─────────── 4. Итог: точный до копейки и честный о неполноте ─────────── */

test("итог плана складывается целыми копейками", () => {
	const catalog = [
		service("svc-caries", "Лечение кариеса", "therapy", 300.01),
		service("svc-endo", "Лечение пульпита", "therapy", 300.05),
		service("svc-crown", "Коронка", "prosthetics", 300.07),
	];
	const items = build(
		[tooth(11, "Caries"), tooth(12, "Pulpitis"), tooth(21, "Crown")],
		catalog,
	);
	const totals = estimatorTotals(items, null);

	assert.equal(totals.incompleteRows, 0);
	assert.equal(totals.payableKopecks, 90_013);
	assert.equal(formatKopecksRu(totals.payableKopecks), rubles("900,13"));
	// Та же сумма в плавающей точке даёт 900.1299999999999 — из-за такого
	// сложения законная квитанция отклонялась как «не сходится».
	assert.notEqual(300.01 + 300.05 + 300.07, 900.13);
	assert.equal(parseKopecks(300.01 + 300.05 + 300.07), 90_013);
});

test("строка без цены не считается нулём, и итог назван неполным", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const items = build([tooth(11, "Caries"), tooth(21, "Crown")], catalog);
	const totals = estimatorTotals(items, null);

	assert.equal(totals.payableKopecks, 200_000);
	assert.equal(totals.incompleteRows, 1, "неполнота итога должна быть видна");
	assert.equal(totals.pricedRows, 1);
});

test("на пустом прайсе итога нет вовсе, а не «0 ₽»", () => {
	// Это состояние по умолчанию: в живой базе service_catalog_items пуст у ОБЕИХ
	// организаций, то есть каждая смета сегодня идёт именно этим путём.
	const items = build(
		[tooth(11, "Caries"), tooth(21, "Crown"), tooth(16, "Planned_Implant")],
		EMPTY_CATALOG,
	);
	const totals = estimatorTotals(items, null);

	assert.equal(items.length, 4);
	assert.equal(totals.incompleteRows, 4);
	// Ноль посчитанных строк — единственный признак, по которому разметка обязана
	// не печатать сумму: «Итого: 0 ₽» под планом из четырёх процедур читается как
	// «лечение бесплатное», и это тот же выдуманный ноль, только в итоге.
	assert.equal(totals.pricedRows, 0);
});

test("скидка вычитается рублями и не уводит строку ниже нуля", () => {
	const row: PlanItem = {
		priceId: "svc",
		name: "Лечение кариеса",
		quantity: 2,
		price: 1000.5,
		discount: 500,
		phase: 1,
	};
	const money = estimatorRowMoney(row, null);
	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.lineKopecks, 150_100);

	const overDiscounted = estimatorRowMoney({ ...row, discount: 99_999 }, null);
	assert.equal(overDiscounted.known, true);
	if (!overDiscounted.known) return;
	assert.equal(overDiscounted.lineKopecks, 0);
});

/* ─────────── 5. Покрытие ДМС ─────────── */

test("со-оплата по ДМС считается целыми копейками", () => {
	const contract = estimatorContractFrom({
		coverageTherapyPct: 30,
		coverageOrthoPct: 0,
		coverageHygienePct: 0,
		coverageSurgeryPct: 0,
	});
	const catalog = [
		service("svc-caries", "Лечение кариеса", "therapy", 1500.5),
	];
	const items = build([tooth(11, "Caries")], catalog);
	const money = estimatorRowMoney(items[0] as PlanItem, contract);

	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.coveragePct, 30);
	assert.equal(money.copayPct, 70);
	// 150 050 − 45 015 = 105 035 копеек ровно.
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

/* ─────────── 6. Сохранение: отказ назван конкретно ─────────── */

test("сохранение остановлено и названы лечение и зуб", () => {
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const items = build([tooth(11, "Caries"), tooth(21, "Crown")], catalog);
	const block = estimatorSaveBlock(items);

	assert.ok(block, "план со строкой без цены не должен уходить на сервер");
	assert.equal(block.rows.length, 1);
	assert.match(block.message, /«коронка» \(зуб 21\)/);
	assert.match(block.message, /Настройки → Прайс/);
	assert.match(block.message, /корзиной/);
	// Общая фраза «проверьте услуги, цены и этапы» здесь недопустима.
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
	const catalog = [
		service("svc-caries", "Лечение кариеса", "therapy", 1500.5),
	];
	const items = build([tooth(11, "Caries")], catalog);
	const body = estimatorItemForApi({ ...(items[0] as PlanItem), id: "row-1" });

	assert.ok(body);
	assert.deepEqual(Object.keys(body).sort(), [
		"discount",
		"isAuto",
		"name",
		"phase",
		"price",
		"priceId",
		"quantity",
		"toothNumber",
	]);
	assert.equal(body.priceId, "svc-caries");
	assert.equal(body.price, 1500.5);
});

/* ─────────── 7. Ответ сервера ─────────── */

test("позиция плана без цены приходит как «цены нет», а не как ноль", () => {
	const row = planItemFromServer({
		id: "row-1",
		toothNumber: 11,
		priceId: "svc-caries",
		name: "Лечение кариеса",
		quantity: 1,
		price: null,
		discount: 0,
		phase: 1,
	});
	assert.ok(row);
	assert.equal(row.price, null);
	assert.equal(row.issue?.kind, "price_missing");
	assert.equal(estimatorRowMoney(row, null).known, false);
});

test("позиция плана с копейками читается точно", () => {
	const row = planItemFromServer({
		priceId: "svc",
		name: "Лечение кариеса",
		quantity: 3,
		price: 990.99,
		discount: 0.5,
		phase: 1,
	});
	assert.ok(row);
	const money = estimatorRowMoney(row, null);
	assert.equal(money.known, true);
	if (!money.known) return;
	assert.equal(money.lineKopecks, 297_247);
});

test("пустой priceId с сервера не считается услугой прайса", () => {
	const row = planItemFromServer({
		priceId: "  ",
		name: "Лечение кариеса",
		price: 2000,
	});
	assert.ok(row);
	assert.equal(row.priceId, null);
	assert.ok(estimatorSaveBlock([row]));
});

test("номер зуба проверяется общим правилом FDI", () => {
	const invalid = planItemFromServer({
		toothNumber: 99,
		priceId: "svc",
		name: "Лечение кариеса",
		price: 2000,
	});
	assert.ok(invalid);
	assert.equal(invalid.toothNumber, undefined);

	const deciduous = planItemFromServer({
		toothNumber: 51,
		priceId: "svc",
		name: "Лечение кариеса",
		price: 2000,
	});
	assert.equal(deciduous?.toothNumber, 51);
	assert.equal(isDeciduousFdiToothNumber(51), true);
	assert.equal(isDeciduousFdiToothNumber(11), false);
	assert.equal(isDeciduousFdiToothNumber(99), false);
});

/* ─────────── 8. Автоподбор ─────────── */

test("имплантат на молочном зубе не предлагается", () => {
	const items = build([tooth(51, "Planned_Implant")], EMPTY_CATALOG);
	assert.equal(items.length, 0);
});

test("имплантат и шаблон — две различимые строки даже без цен", () => {
	const items = build([tooth(16, "Planned_Implant")], EMPTY_CATALOG);
	assert.equal(items.length, 2);
	assert.deepEqual(
		items.map((row) => row.suggestion),
		["implant", "implantGuide"],
	);
	// Раньше строки различались только выдуманным priceId; без него они слились
	// бы в одну, и половина хирургического этапа исчезла бы из плана.
	assert.equal(new Set(items.map((row) => row.suggestion)).size, 2);
});

test("одна услуга прайса на имплантат и шаблон не удваивает деньги", () => {
	// «Хирургический шаблон для имплантации» подходит под оба правила: и слово
	// «имплант», и слово «шаблон», и раздел один. Двух строк с одной и той же
	// услугой в подписываемой смете быть не должно.
	const catalog = [
		service(
			"svc-guide",
			"Хирургический шаблон для имплантации",
			"surgery",
			12_345.67,
		),
	];
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

	const healed = reconcileAutoSuggestions(
		first.items,
		[tooth(11, "Filled")],
		catalog,
	);
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

	// Пустой прайс — тот же случай: строка без priceId не должна размножаться.
	const noPrice = reconcileAutoSuggestions([], teeth, EMPTY_CATALOG);
	const noPriceAgain = reconcileAutoSuggestions(
		noPrice.items,
		teeth,
		EMPTY_CATALOG,
	);
	assert.equal(noPriceAgain.changed, false);
	assert.equal(noPriceAgain.items.length, 1);
});

test("снятая корзиной строка не возвращается в смету при следующей отметке зуба", () => {
	/*
	 * БЫЛО: подбор смотрит только на зубную формулу, а формула про снятие не
	 * знает. Врач снимал корзиной коронку на 26, отмечал любой другой зуб — и
	 * коронка с ценой возвращалась в документ для подписи пациентом.
	 */
	const catalog = [
		service("svc-crown", "Коронка керамическая", "prosthetics", 25000),
		service("svc-caries", "Лечение кариеса", "therapy", 2000),
	];
	const teeth = [tooth(26, "Crown")];
	const first = reconcileAutoSuggestions([], teeth, catalog);
	assert.equal(first.items.length, 1);
	const removed = first.items[0];
	assert.ok(removed);

	// Врач снял строку корзиной: панель запоминает ключи снятия.
	const dismissed = new Set(estimatorDismissalKeys(removed));
	assert.ok(dismissed.size > 0, "снятие обязано чем-то запоминаться");

	// Тот же зуб в той же формуле плюс отметка на другом зубе.
	const afterAnotherTooth = reconcileAutoSuggestions(
		[],
		[tooth(26, "Crown"), tooth(11, "Caries")],
		catalog,
		dismissed,
	);
	assert.deepEqual(
		afterAnotherTooth.items.map((item) => item.toothNumber),
		[11],
		"снятая коронка на 26 вернулась в смету",
	);
});

test("снятие на одном зубе не убирает то же лечение на другом", () => {
	const catalog = [service("svc-crown", "Коронка керамическая", "prosthetics", 25000)];
	const first = reconcileAutoSuggestions([], [tooth(26, "Crown")], catalog);
	const removed = first.items[0];
	assert.ok(removed);
	const dismissed = new Set(estimatorDismissalKeys(removed));

	const other = reconcileAutoSuggestions([], [tooth(36, "Crown")], catalog, dismissed);
	assert.equal(other.items.length, 1, "коронка на 36 снята вместе с коронкой на 26");
	assert.equal(other.items[0]?.toothNumber, 36);
});

test("без списка снятого подбор работает как прежде", () => {
	// Четвёртый параметр необязателен: старые вызовы обязаны вести себя так же.
	const catalog = [service("svc-caries", "Лечение кариеса", "therapy", 2000)];
	const result = reconcileAutoSuggestions([], [tooth(11, "Caries")], catalog);
	assert.equal(result.items.length, 1);
	assert.equal(result.changed, true);
});

test("строка, добавленная врачом руками, автоподбором не удаляется", () => {
	const manual: PlanItem = {
		priceId: "svc-manual",
		name: "Профессиональная гигиена",
		quantity: 1,
		price: 4500,
		discount: 0,
		phase: 1,
		toothNumber: 11,
	};
	const result = reconcileAutoSuggestions([manual], [], EMPTY_CATALOG);
	assert.equal(result.items.length, 1);
	assert.equal(result.changed, false);
});

/* ─────────── 9. В самом компоненте выдуманных значений не осталось ─────────── */

/**
 * Все узлы разбора подряд.
 *
 * Своего обхода здесь ровно столько, сколько нужно: `@babel/traverse` в
 * зависимостях не заявлен, а разбор — обычное дерево объектов.
 *
 * Комментарии в обход не попадают намеренно: в компоненте записана история
 * дефекта, и она НАЗЫВАЕТ прежние выдуманные идентификаторы. Искать их простым
 * поиском по тексту значило бы требовать удаления объяснения — проверять надо
 * код, а не документацию.
 */
function* astNodes(node: unknown): Generator<Record<string, unknown>> {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const child of node) yield* astNodes(child);
		return;
	}
	const record = node as Record<string, unknown>;
	if (typeof record.type === "string") yield record;
	for (const [key, value] of Object.entries(record)) {
		if (
			key === "loc" ||
			key === "comments" ||
			key === "leadingComments" ||
			key === "trailingComments" ||
			key === "innerComments"
		) {
			continue;
		}
		yield* astNodes(value);
	}
}

function componentAstNodes(): Record<string, unknown>[] {
	const source = readFileSync(
		new URL("./TreatmentEstimator.tsx", import.meta.url),
		"utf8",
	);
	const ast = parse(source, {
		sourceType: "module",
		plugins: ["typescript", "jsx"],
	});
	return [...astNodes(ast)];
}

test("в коде сметы не осталось ни одного выдуманного идентификатора услуги", () => {
	const strings = componentAstNodes()
		.filter((node) => node.type === "StringLiteral")
		.map((node) => String(node.value));
	for (const id of INVENTED_SERVICE_IDS) {
		assert.ok(!strings.includes(id), `в коде компонента остался «${id}»`);
	}
	// Название услуги и производителя тоже были выдуманы вместе с ценами.
	for (const invented of [
		"Коронка из диоксида циркония",
		"Коронка детская стандартная",
		"Эндодонтическое лечение (Пульпит)",
	]) {
		assert.ok(!strings.includes(invented), `в коде осталось «${invented}»`);
	}
});

test("в коде сметы ни одному денежному полю не присвоено число", () => {
	/*
	 * Именно так выглядели все восемь дефектов: `priceRub: 4000`. Проверка идёт
	 * по СВОЙСТВУ, а не по числу: 12000 в этом файле есть и сейчас — это
	 * длительность показа уведомления, и запрещать числа вообще значило бы
	 * ловить не тот дефект.
	 *
	 * `priceRub` попадает в список отдельно: такого поля у услуги прайса нет
	 * вовсе (там `basePriceRub`), и из-за него заполненный прайс давал
	 * undefined, то есть «0 ₽» и отказ сохранения.
	 */
	const moneyProperties = new Set(["price", "priceRub", "basePriceRub"]);
	const offenders: string[] = [];
	for (const node of componentAstNodes()) {
		if (node.type !== "ObjectProperty") continue;
		const key = node.key as Record<string, unknown> | null;
		const name = key && typeof key.name === "string" ? key.name : null;
		if (!name) continue;
		if (name === "priceRub") offenders.push("priceRub");
		if (!moneyProperties.has(name)) continue;
		const value = node.value as Record<string, unknown> | null;
		if (value && value.type === "NumericLiteral") {
			offenders.push(`${name}: ${String(value.value)}`);
		}
	}
	assert.deepEqual(offenders, [], `в коде зашиты деньги: ${offenders.join(", ")}`);
});
