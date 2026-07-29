import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
	DentalPricelistAnalysisRequest,
	DentalPricelistAnalysisResponse,
	ServiceCatalogItem,
} from "@dental/shared";
import { analyzePricelist } from "./analyzer.js";

/**
 * ГОД РЕДАКЦИИ ПРАЙСА НЕ СТАНОВИТСЯ ЦЕНОЙ УСЛУГИ.
 *
 * ЧТО БЫЛО СЛОМАНО. looksLikeYear в analyzer.ts существовал и распознавал
 * 1900–2099, но применялся ровно в ОДНОМ месте — к верхней границе пары через
 * косую черту («Лицензия 5678/2024»). Одиночный год через него не проходил
 * вовсе. Измерено зондом scratch/probe-year-as-price.ts (истинный код выхода 0)
 * на дереве до правки:
 *   «Прайс-лист 2025»      → услуга «Прайс-лист» за 2025 ₽   [category_uncertain]
 *   «Прайс 2025 в рублях»  → услуга «Прайс в рублях» за 2025 ₽ [category_uncertain]
 *   «Редакция 2024»        → услуга «Редакция» за 2024 ₽      [category_uncertain]
 *   «Отбеливание 2025»     → услуга «Отбеливание» за 2025 ₽   ПРЕДУПРЕЖДЕНИЙ НЕТ
 *
 * Худшая строка — последняя, и хуже она КАЧЕСТВЕННО, а не на одно предупреждение.
 * «Прайс-лист» и «Редакция» ни в одно правило categoryRules не попадают, поэтому
 * у них стоит хотя бы category_uncertain. «Отбел» же стоит в правилах hygiene:
 * категория опознана — предупреждения о ней нет; цена формально прочитана —
 * price_not_found нет тем более. Не остаётся НИ ОДНОГО признака, и заголовок
 * раздела прайса с годом уезжает в каталог услуг ценой 2025 ₽, а оттуда в план
 * лечения, в счёт и в документ, который подписывает пациент.
 *
 * ЧЕМ ЗАМЕНЕНО, И ПОЧЕМУ НЕ ПРОСТЫМ ОТКАЗОМ ОТ ЧИСЕЛ 1900–2099. Отвергнуть всю
 * полосу нельзя: прицельный снимок, анестезия и консультация в русском прайсе
 * стоят 300–3000 ₽, а табличный прайс сплошь и рядом приходит без знака рубля в
 * строке — знак стоит в шапке колонки, а шапку splitPricelistLines выбрасывает.
 * Выдуманная цена превратилась бы в потерянную, то есть один дефект обменяли бы
 * на другой. Решают два признака вокруг числа:
 *   1. ЗНАК РУБЛЯ вплотную к числу — подпись человека «это цена». Он снимает
 *      вопрос полностью: «Консультация 2025 руб» остаётся ценой 2025 ₽.
 *   2. Без знака рубля год отвергается, если строка НАЗЫВАЕТ ДОКУМЕНТ («прайс»,
 *      «редакция», «версия», «действителен», «тариф»…) ИЛИ год лежит в окне
 *      года редакции вокруг СЕГОДНЯШНЕГО года.
 *
 * ПОЧЕМУ ОКНО СЧИТАЕТСЯ ОТ СЕГОДНЯШНЕЙ ДАТЫ. Между «Отбеливание 2025»
 * (заголовок раздела прайса 2025 года) и «Прицельный снимок 2000» (цена 2000 ₽)
 * структурной разницы нет никакой: слово услуги плюс четырёхзначное число в
 * конце строки. Различает их только величина числа относительно даты загрузки —
 * годом прайса помечают недавний год, а 2000 в 2026 году годом редакции не
 * бывает. Полоса отказа сужается с 200 значений до восьми.
 *
 * ЧЕСТНО О ПРЕДЕЛЕ. Заголовок с ДАЛЁКИМ годом («Отбеливание 2000») цену получит:
 * от строки «Прицельный снимок 2000» он не отличается ничем, и правила, которое
 * их разводит, не существует. Отказ в этом случае унёс бы законную цену, поэтому
 * такого правила здесь нет и проверки на него тоже — это заявленный предел, а не
 * недосмотр. Цена, от которой разборщик отказался, остаётся НЕИЗВЕСТНОЙ
 * (priceRub: null) и печатается клинике как price_not_found; числом её никто не
 * подменяет.
 */

/** Каталог не нужен: проверяется чтение цены, а не сопоставление с услугой. */
const EMPTY_CATALOG: ServiceCatalogItem[] = [];

const SKIPPED_PREFIX = "pricelist_rows_skipped:";

/**
 * Год берётся от сегодняшней даты, а не вписан числом, потому что и правило в
 * analyzer.ts считает окно от new Date().getFullYear(). Вписанный «2025»
 * прошёл бы сегодня и молча перестал проверять дефект через несколько лет.
 * В момент замера ведущего (2026 год) это ровно «2025» из зонда.
 */
const previousEditionYear = new Date().getFullYear() - 1;

/**
 * Год, заведомо далёкий от окна редакции, и одновременно обычная цена русского
 * прайса: прицельный снимок стоит 2000 ₽. Держится литералом умышленно — это
 * ЗАКОННАЯ сторона проверки, и она не должна ездить вслед за окном.
 */
const FAR_YEAR_PRICE = 2000;

async function analyze(rawText: string) {
	return analyzePricelist(
		{
			sourceName: "year-price-test",
			sourceKind: "text",
			rawText,
			imageMimeType: "image/jpeg",
			preferredSpecialty: "universal",
			useServerAi: false,
		},
		EMPTY_CATALOG,
	);
}

/** Сколько строк отброшено по предупреждению ответа; null — предупреждения нет. */
function skippedRows(warnings: string[]): number | null {
	const warning = warnings.find((value) => value.startsWith(SKIPPED_PREFIX));
	return warning === undefined
		? null
		: Number(warning.slice(SKIPPED_PREFIX.length));
}

describe("год документа ценой услуги не становится", () => {
	test("заголовок раздела прайса с годом не даёт цену и остаётся видимым", async () => {
		/*
		 * ГЛАВНАЯ СТРОКА ЭТОГО НАБОРА. Категория здесь опознана (hygiene по
		 * «отбел»), поэтому раньше не ставилось ни одного предупреждения, и цена
		 * 2025 ₽ доезжала до подписываемого документа без единого признака.
		 */
		const line = `Отбеливание ${previousEditionYear}`;
		const response = await analyze(line);
		const item = response.items[0];
		assert.ok(item, `строка исчезла из прайса целиком («${line}»)`);
		assert.equal(
			item.priceRub,
			null,
			`год снова стал ценой услуги («${line}»): ${item.priceRub} ₽`,
		);
		assert.equal(item.priceMaxRub, null, "выдумана верхняя граница цены");
		assert.ok(
			item.warnings.includes("price_not_found"),
			`отказ от цены не показан клинике: ${JSON.stringify(item.warnings)}`,
		);
		// Число из строки не выкинуто: клиника видит, что в строке написано, и
		// проверяет её руками.
		assert.ok(
			item.title.includes(String(previousEditionYear)),
			`из названия ушло число, ценой не ставшее: «${item.title}»`,
		);
	});

	test("строка, называющая сам прайс, услугой не становится, и это видно", async () => {
		// Эти три строки ловятся по слову документа, а не по окну года, поэтому
		// год в них вписан числом: от сегодняшней даты проверка не зависит.
		for (const line of [
			"Прайс-лист 2025",
			"Прайс 2025 в рублях",
			"Редакция 2024",
		]) {
			const response = await analyze(line);
			assert.equal(
				response.items.length,
				0,
				`служебная строка стала услугой прайса («${line}»): ` +
					JSON.stringify(response.items.map((item) => item.priceRub)),
			);
			assert.equal(
				skippedRows(response.warnings),
				1,
				`отбрасывание строки не посчитано («${line}»): ${JSON.stringify(response.warnings)}`,
			);
		}
	});

	test("год документа вне окна редакции тоже не цена, если строка назвала документ", async () => {
		// 2015 из окна года редакции выпадает — строку держит слово «прайс-лист».
		const response = await analyze("Прайс-лист 2015");
		assert.equal(
			response.items.length,
			0,
			"старый прайс-лист стал услугой за 2015 ₽",
		);
		assert.equal(skippedRows(response.warnings), 1);
	});

	test("год рядом с настоящей ценой её не крадёт", async () => {
		/*
		 * До правки строка давала цену null: кандидаты «2025» и «25000»
		 * расходились, строка объявлялась неоднозначной, и написанная цена
		 * терялась целиком. Отказ от года снимает неоднозначность.
		 */
		const response = await analyze(`Отбеливание ${previousEditionYear} 25000`);
		const item = response.items[0];
		assert.ok(item, "позиция исчезла из прайса");
		assert.equal(item.priceRub, 25000, "написанная в строке цена не прочитана");
	});
});

describe("законная цена из полосы года не теряется", () => {
	test("знак рубля оставляет год ценой во всех написаниях", async () => {
		for (const line of [
			`Консультация ${previousEditionYear} руб`,
			`Консультация ${previousEditionYear} ₽`,
			`Консультация ${previousEditionYear} рублей`,
		]) {
			const response = await analyze(line);
			const item = response.items[0];
			assert.ok(item, `позиция исчезла («${line}»)`);
			assert.equal(
				item.priceRub,
				previousEditionYear,
				`потеряна цена, подписанная знаком рубля («${line}»)`,
			);
			assert.ok(
				!item.warnings.includes("price_not_found"),
				`цена прочитана, а объявлена ненайденной («${line}»)`,
			);
		}
	});

	test("название услуги при этом чистое: подписанная цена из него ушла", async () => {
		const response = await analyze(`Консультация ${previousEditionYear} руб`);
		const item = response.items[0];
		assert.ok(item);
		assert.equal(item.title, "Консультация");
	});

	test("табличная строка без знака рубля цену сохраняет", async () => {
		// Так приходит выгрузка из таблицы: табуляция становится « ; », а знак
		// рубля стоял в шапке колонки, которую splitPricelistLines выбросил.
		const response = await analyze(`Прицельный снимок\t${FAR_YEAR_PRICE}`);
		const item = response.items[0];
		assert.ok(item, "позиция исчезла из прайса");
		assert.equal(
			item.priceRub,
			FAR_YEAR_PRICE,
			"законная цена унесена вместе с годами",
		);
		assert.equal(item.title, "Прицельный снимок");
	});

	test("диапазон из чисел этой полосы остаётся диапазоном", async () => {
		// Год диапазоном не пишут, поэтому пара «от … до …» проверки года не
		// касается вовсе.
		const response = await analyze("Гигиена от 1900 до 2500 руб");
		const item = response.items[0];
		assert.ok(item, "позиция исчезла из прайса");
		assert.equal(item.priceRub, 1900);
		assert.equal(item.priceMaxRub, 2500);
	});
});

describe("отказ от года не сломал чтение обычных цен", () => {
	test("цены, за каждой из которых стоит свой коммит, читаются по-прежнему", async () => {
		const expected: Array<[string, number]> = [
			// Хвост кода модели больше не склеивается с ценой.
			["Отбеливание Zoom 4 25000", 25000],
			["Имплантация Osstem TS3 45000", 45000],
			["Пломба Filtek Z550 3500", 3500],
			// Разряды пробелом.
			["Коронка 12 500 руб", 12500],
			["Имплантация 1 200 000", 1200000],
			// Копейки.
			["Лечение кариеса 1500,50", 1500.5],
			// Последнее число строки ценой не является.
			["Седация 5000/120 мин кабинет 412", 5000],
		];
		for (const [line, price] of expected) {
			const response = await analyze(line);
			const item = response.items[0];
			assert.ok(item, `позиция исчезла из прайса («${line}»)`);
			assert.equal(item.priceRub, price, `цена изменилась («${line}»)`);
		}
	});

	test("строка со знаком рубля остаётся позицией даже без прочитанной цены", async () => {
		for (const line of [
			"Полировка одного зуба 290 руб",
			"Полная реабилитация обеих челюстей 2 500 000 руб",
			"Полная реабилитация 2 000 001 руб",
		]) {
			const response = await analyze(line);
			assert.equal(
				response.items.length,
				1,
				`услуга исчезла из прайса целиком («${line}»)`,
			);
		}
	});
});

/**
 * ВТОРАЯ ЧАСТЬ ЭТОГО ФАЙЛА: У ОДНОГО ПРАЙСА ОДНО ПРАВИЛО СУЩЕСТВОВАНИЯ СТРОКИ,
 * а не два разных в двух режимах разбора.
 *
 * Живёт здесь, а не в отдельном наборе, потому что предмет тот же: строка прайса,
 * которая либо становится услугой каталога без права на это, либо исчезает молча.
 *
 * ЧТО БЫЛО СЛОМАНО. Детерминированная ветка звала isPricelistServiceRow, считала
 * отброшенные строки и печатала pricelist_rows_skipped:N. Успешная НЕЙРО-ветка
 * звала responseFromItems напрямую — без гейта, без счётчика, без
 * no_pricelist_rows_detected вовсе. Значит служебная запись модели («Прайс-лист
 * действителен с 01.01.2025») становилась услугой каталога, а записи, из которых
 * позиция не собралась, исчезали без следа: itemFromGroq отдаёт null на не-объекте
 * и на пустом sourceText.
 *
 * НЕВИДИМА БЫЛА ИМЕННО ЧАСТИЧНАЯ ПОТЕРЯ. Если отброшены ВСЕ записи,
 * callGroqPricelist бросает исключение, ветка откатывается на детерминированный
 * разбор и клиника видит groq_failed:. А когда часть записей прошла, а часть
 * исчезла, ответ приходил без единого признака недостачи.
 *
 * ПОЧЕМУ ЭТО ЗОВЁТСЯ ЧЕРЕЗ analyzePricelist, А НЕ ПЕРЕСОБИРАЕТСЯ ТЕСТОМ. Здесь
 * стояла версия этих же четырёх проверок, которая звала pricelistItemsFromGroqRows
 * и selectPricelistServiceRows подряд сама, помощником analyzeGroqRows. Она
 * проверяла КОМПОЗИЦИЮ ДВУХ ФУНКЦИЙ, КОТОРУЮ СОБИРАЛ САМ ТЕСТ, а что эту
 * композицию собирает analyzePricelist — не проверяла ничем. Измерено ревьюером:
 * он вернул в analyzePricelist ровно тот дефект, который здесь описан
 * (responseFromItems прямо с parsedRows.items — без гейта и без счётчика), прогнал
 * набор и получил tests 15, pass 15, fail 0. Проверка, зелёная на сломанном коде,
 * хуже отсутствующей: она создаёт уверенность.
 *
 * ПРЕЖНЕЕ ОБОСНОВАНИЕ ОТКАЗА ОТ НАСТОЯЩЕЙ ВЕТКИ ОПРОВЕРГНУТО. Оно гласило, что
 * поднять ветку подделкой fetch нельзя, потому что recordProviderKeySuccess писала
 * бы на диск состояние здоровья ключей. Побочный эффект реален, но у него есть
 * выключатель: keyHealthFilePath в apps/api/src/speech/keyPool.ts возвращает null
 * при DENTAL_SPEECH_KEY_HEALTH_FILE=off, и saveKeyHealthToDisk на этом выходит. Им
 * уже пользуются scripts/smoke-speech-key-rotation.mjs,
 * scripts/smoke-speech-provider-errors.mjs и
 * scripts/smoke-speech-groq-chunk-floor.mjs. Что выключатель ДЕЙСТВИТЕЛЬНО
 * отменяет запись, измерено ниже отдельным тестом, а не принято на слово.
 *
 * ЧЕСТНО О ПРЕДЕЛЕ. Платного вызова Groq здесь нет: HTTP-ответ отдаёт заглушка
 * globalThis.fetch. Значит НЕ проверены сама сеть, приём заголовков стороной Groq и
 * поведение при смене формата ответа модели. Всё, что ниже этой границы, —
 * выбор ключа из пула, чтение JSON из choices[0].message.content, сборка позиций,
 * гейт строк, счёт потерь и подстановка счёта в warnings ответа — исполняется
 * настоящим кодом analyzePricelist. Сквозной путь POST /api/pricelist/analyze
 * остаётся не проверенным: маршрут в этом наборе не поднимается.
 */

/** Служебная строка: услугой не является ни в одном режиме разбора. */
const SERVICE_HEADER_LINE = "Прайс-лист действителен с 01.01.2025";

/** Настоящая услуга с ценой: обязана выжить в обоих режимах. */
const REAL_SERVICE_LINE = "Коронка 12 500 руб";

/** Вторая настоящая услуга: нужна там, где потерь быть не должно вовсе. */
const SECOND_SERVICE_LINE = "Лечение кариеса 1500,50";

/**
 * Запрос того же вида, что приходит на POST /api/pricelist/analyze. rawText
 * вынесен из фикстуры намеренно: у каждого прогона он свой, и значение по
 * умолчанию однажды стало бы молчаливой подменой присланного прайса.
 */
const AI_REQUEST: Omit<DentalPricelistAnalysisRequest, "rawText"> = {
	sourceName: "year-price-ai-test",
	sourceKind: "text",
	imageMimeType: "image/jpeg",
	preferredSpecialty: "universal",
	useServerAi: true,
};

/*
 * СРЕДА НЕЙРО-ВЕТКИ. Стоит на верхнем уровне модуля, потому что тела тестов
 * node:test исполняются только после того, как модуль вычислен целиком, а keyPool
 * читает переменные среды в момент вызова, а не в момент импорта.
 */

/**
 * Синтетический ключ пула. В Groq не уходит и для Groq непригоден: он нужен
 * ровно затем, чтобы selectProviderKey вернул кандидата, — иначе analyzePricelist
 * уйдёт в откат с groq_key_pool_empty, не дойдя до разбора.
 */
const SYNTHETIC_GROQ_KEY = "gsk_synthetic_pricelist_branch_key_do_not_leak_4444";

/**
 * Отдельный ключ для прогона с отказом Groq: отказ 500 ставит ключу остывание
 * (recordProviderKeyFailure), и общий ключ унёс бы за собой остальные прогоны
 * файла — независимо от порядка тестов.
 */
const SYNTHETIC_GROQ_FAILURE_KEY =
	"gsk_synthetic_pricelist_failure_key_do_not_leak_5555";

process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";
/*
 * Пул обязан состоять РОВНО из одного синтетического ключа. Ключи машины,
 * попавшие в пул, сделали бы выбор ключа случайным, а число попыток — переменным.
 */
delete process.env.GROQ_API_KEYS;
process.env.DENTAL_SPEECH_MAX_NUMBERED_KEYS = "1";
delete process.env.GROQ_API_KEY_1;
process.env.GROQ_API_KEY = SYNTHETIC_GROQ_KEY;
/*
 * Прокси снимается намеренно: при заданном PROXY_URL/HTTPS_PROXY/HTTP_PROXY
 * fetchWithProviderTimeout зовёт undici напрямую, минуя globalThis.fetch, и
 * заглушка перестала бы перехватывать вызов — прогон ушёл бы в настоящую сеть.
 */
delete process.env.PROXY_URL;
delete process.env.HTTPS_PROXY;
delete process.env.HTTP_PROXY;

/** Куда и с каким ключом ветка постучалась вместо Groq. */
type GroqStubCall = {
	url: string;
	authorization: string | null;
	body: string;
};

type NeuroRun = {
	response: DentalPricelistAnalysisResponse;
	calls: GroqStubCall[];
};

const GROQ_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Успешный ответ Groq того вида, который читает callGroqPricelist. */
function groqSuccessReply(rows: unknown[]): Response {
	const content = JSON.stringify({ items: rows, warnings: [] });
	return new Response(
		JSON.stringify({ choices: [{ message: { content } }] }),
		{ status: 200, headers: { "content-type": "application/json" } },
	);
}

function stubbedUrl(input: string | URL | Request): string {
	if (typeof input === "string") return input;
	return input instanceof URL ? input.href : input.url;
}

/**
 * Один прогон НАСТОЯЩЕЙ нейро-ветки analyzePricelist: подменён только HTTP-вызов.
 * Всё остальное — выбор ключа, чтение ответа, сборка позиций, гейт и счётчик —
 * исполняет analyzer.ts.
 */
async function runNeuroBranch(options: {
	rawText: string;
	reply: () => Response;
	poolKey?: string;
}): Promise<NeuroRun> {
	const originalFetch = globalThis.fetch;
	const calls: GroqStubCall[] = [];
	if (options.poolKey) process.env.GROQ_API_KEY = options.poolKey;
	const stub = async (
		input: string | URL | Request,
		init?: RequestInit,
	): Promise<Response> => {
		calls.push({
			url: stubbedUrl(input),
			authorization: new Headers(init?.headers).get("authorization"),
			body: typeof init?.body === "string" ? init.body : "",
		});
		return options.reply();
	};
	globalThis.fetch = stub as typeof globalThis.fetch;
	try {
		const response = await analyzePricelist(
			{ ...AI_REQUEST, rawText: options.rawText },
			EMPTY_CATALOG,
		);
		return { response, calls };
	} finally {
		globalThis.fetch = originalFetch;
		process.env.GROQ_API_KEY = SYNTHETIC_GROQ_KEY;
	}
}

/**
 * ЛЮБОЕ УТВЕРЖДЕНИЕ О НЕЙРО-ВЕТКЕ ЛОЖНО, ЕСЛИ ВЕТКА ОТКАТИЛАСЬ.
 *
 * При отказе Groq analyzePricelist возвращает разбор ТОГО ЖЕ rawText
 * детерминированной ветвью, где гейт и счётчик стоят всегда. Такой ответ на части
 * прайсов совпадает с ожидаемым нейро-ответом, то есть тест был бы зелен, ни разу
 * не исполнив предмет проверки. Поэтому признаки исполнения ветки проверяются в
 * одном месте и на каждом прогоне.
 */
function assertGroqBranchExecuted(run: NeuroRun): void {
	assert.equal(
		run.calls.length,
		1,
		`нейро-ветка сделала не один вызов Groq, а ${run.calls.length}`,
	);
	assert.equal(run.calls[0]?.url, GROQ_COMPLETIONS_URL, "стучались не в Groq");
	assert.equal(
		run.calls[0]?.authorization,
		`Bearer ${SYNTHETIC_GROQ_KEY}`,
		"ключ пришёл не из пула ключей",
	);
	assert.ok(
		run.calls[0]?.body.includes("json_object"),
		"у Groq не запрошен JSON-ответ",
	);
	assert.equal(
		run.response.parserMode,
		"groq_json",
		`ветка откатилась на детерминированный разбор: ${JSON.stringify(run.response.warnings)}`,
	);
	assert.equal(run.response.aiVision.used, true, "нейро-разбор не отмечен");
	assert.ok(
		!run.response.warnings.some((warning) => warning.startsWith("groq_failed:")),
		`Groq отказал: ${JSON.stringify(run.response.warnings)}`,
	);
}

/**
 * Нейро-разбор прайса: rawText — присланный клиникой текст, rows — записи, которые
 * вернула модель. Они умышленно задаются раздельно: расхождение между присланным
 * текстом и ответом модели — это и есть предмет проверки.
 */
async function analyzeWithModelRows(
	rawText: string,
	rows: unknown[],
): Promise<DentalPricelistAnalysisResponse> {
	const run = await runNeuroBranch({
		rawText,
		reply: () => groqSuccessReply(rows),
	});
	assertGroqBranchExecuted(run);
	return run.response;
}

describe("нейро-ветка считает потерянные строки прайса", () => {
	test("частичная потеря записей модели больше не молчит", async () => {
		// Запись без текста и запись-строка вместо объекта — ровно те два случая,
		// на которых itemFromGroq отдаёт null.
		const response = await analyzeWithModelRows(
			[REAL_SERVICE_LINE, SECOND_SERVICE_LINE].join("\n"),
			[{ sourceText: REAL_SERVICE_LINE }, {}, REAL_SERVICE_LINE],
		);
		assert.equal(response.items.length, 1, "потеряна настоящая услуга");
		assert.equal(
			skippedRows(response.warnings),
			2,
			`записи модели исчезли, не оставив следа: ${JSON.stringify(response.warnings)}`,
		);
	});

	test("служебная запись модели услугой каталога не становится", async () => {
		const response = await analyzeWithModelRows(
			[SERVICE_HEADER_LINE, REAL_SERVICE_LINE].join("\n"),
			[{ sourceText: SERVICE_HEADER_LINE }, { sourceText: REAL_SERVICE_LINE }],
		);
		assert.equal(
			response.items.length,
			1,
			`гейт не применён к записям модели: ${JSON.stringify(response.items.map((item) => item.title))}`,
		);
		assert.equal(response.items[0]?.priceRub, 12500);
		assert.equal(
			skippedRows(response.warnings),
			1,
			`отброшенная запись не посчитана: ${JSON.stringify(response.warnings)}`,
		);
	});

	test("потери на двух шагах складываются в одно число", async () => {
		// Клинике важно, сколько строк проверить руками, а не на каком шаге они
		// выпали: одна не собралась в позицию, одна отброшена гейтом.
		const response = await analyzeWithModelRows(
			[REAL_SERVICE_LINE, SERVICE_HEADER_LINE].join("\n"),
			[
				{ sourceText: REAL_SERVICE_LINE },
				{ sourceText: "" },
				{ sourceText: SERVICE_HEADER_LINE },
			],
		);
		assert.equal(response.items.length, 1);
		assert.equal(skippedRows(response.warnings), 2);
	});

	test("без потерь счётчик не выдумывается", async () => {
		const response = await analyzeWithModelRows(
			[REAL_SERVICE_LINE, SECOND_SERVICE_LINE].join("\n"),
			[{ sourceText: REAL_SERVICE_LINE }, { sourceText: SECOND_SERVICE_LINE }],
		);
		assert.equal(response.items.length, 2, "потеряна законная услуга");
		// Именно null, а не 0: предупреждения нет вовсе, и подставлять вместо него
		// число значило бы печатать клинике измеренный ноль потерь.
		assert.equal(
			skippedRows(response.warnings),
			null,
			`выдумано отбрасывание строк, которых не было: ${JSON.stringify(response.warnings)}`,
		);
	});

	test("отказ Groq виден клинике, а нейро-разбором не выдаётся", async () => {
		/*
		 * Обратная сторона assertGroqBranchExecuted: parserMode groq_json стоит в
		 * ответе НЕ всегда, поэтому проверка исполнения ветки не тавтология. Здесь
		 * же видно, что при отказе прайс клиника всё равно получает.
		 */
		const run = await runNeuroBranch({
			rawText: REAL_SERVICE_LINE,
			reply: () =>
				new Response(JSON.stringify({ error: { message: "upstream down" } }), {
					status: 500,
					statusText: "Internal Server Error",
				}),
			poolKey: SYNTHETIC_GROQ_FAILURE_KEY,
		});
		assert.equal(run.calls.length, 1);
		assert.equal(run.response.parserMode, "deterministic_groq_fallback");
		assert.equal(run.response.aiVision.used, false);
		assert.ok(
			run.response.warnings.some((warning) =>
				warning.startsWith("groq_failed:"),
			),
			`отказ модели не показан клинике: ${JSON.stringify(run.response.warnings)}`,
		);
		assert.equal(run.response.items.length, 1, "прайс потерян вместе с отказом");
	});
});

describe("оба режима разбора дают одно правило существования строки", () => {
	test("один и тот же прайс даёт одинаковый состав и одинаковый счёт потерь", async () => {
		const rawText = [SERVICE_HEADER_LINE, REAL_SERVICE_LINE].join("\n");

		const deterministic = await analyze(rawText);
		const neuro = await analyzeWithModelRows(rawText, [
			{ sourceText: SERVICE_HEADER_LINE },
			{ sourceText: REAL_SERVICE_LINE },
		]);

		assert.equal(
			neuro.items.length,
			deterministic.items.length,
			"состав прайса зависит от режима разбора",
		);
		assert.deepEqual(
			neuro.items.map((item) => item.title),
			deterministic.items.map((item) => item.title),
			"выжили разные строки",
		);
		assert.equal(
			skippedRows(neuro.warnings),
			skippedRows(deterministic.warnings),
			"число потерянных строк зависит от режима разбора",
		);
	});
});

describe("проверка нейро-ветки не пишет состояние ключей на диск", () => {
	test("выключатель отменяет запись, а без выключателя запись есть", async () => {
		/*
		 * ЗАЧЕМ ЭТО ИЗМЕРЕНО ЗДЕСЬ. Отказ прежней версии набора от настоящей
		 * нейро-ветки обосновывался тем, что подделка fetch заставила бы
		 * recordProviderKeySuccess писать состояние здоровья ключей на диск. Эффект
		 * реален — и первая половина этого теста его показывает, иначе проверять
		 * выключатель было бы нечего. Вторая половина показывает, что
		 * DENTAL_SPEECH_KEY_HEALTH_FILE=off его отменяет. Это утверждение о
		 * продукте, а не о тесте, поэтому оно измерено, а не описано словами.
		 *
		 * Путь ведёт в каталог временных файлов ОС: боевой .data-файл состояния
		 * ключей набор не читает и не пишет ни в одной половине.
		 */
		const sentinel = join(
			tmpdir(),
			`dental-pricelist-key-health-${process.pid}-${Date.now()}.json`,
		);
		try {
			process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = sentinel;
			await analyzeWithModelRows(REAL_SERVICE_LINE, [
				{ sourceText: REAL_SERVICE_LINE },
			]);
			assert.equal(
				existsSync(sentinel),
				true,
				"запись состояния ключей не исполнилась — выключать было бы нечего",
			);

			rmSync(sentinel);
			process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";
			await analyzeWithModelRows(REAL_SERVICE_LINE, [
				{ sourceText: REAL_SERVICE_LINE },
			]);
			assert.equal(
				existsSync(sentinel),
				false,
				"выключатель не отменил запись состояния ключей на диск",
			);
		} finally {
			process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";
			rmSync(sentinel, { force: true });
		}
	});
});
