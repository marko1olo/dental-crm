/**
 * ТРИ РАЗРЕЗА ОТЧЁТОВ ДОХОДЯТ ДО ВЛАДЕЛЬЦА КЛИНИКИ, А НЕ ТОЛЬКО СЧИТАЮТСЯ.
 *
 * Запуск (из apps/web):
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/tests/managerReportSlicesReachTheOwner.test.ts
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ
 *
 * Маршрутов отчётов управляющего девять: выручка, врачи, кресла, приёмы,
 * дебиторка, поток пациентов, эффект напоминаний, загрузка, услуги. Клиент звал
 * ОДИН — `/api/reports/summary`. Сводка отдаёт шесть разрезов из девяти, и панель
 * их рисует; ТРИ до экрана не доходили никак, хотя маршруты дописаны до конца и
 * считают верно:
 *
 *  • `/api/reports/services` — что именно продаётся. Владелец видел «получено
 *    67 400 ₽» и не мог узнать, на чём. Замерено на живой базе этой установки:
 *    4 услуги, назначено 118 800 ₽, скидок 1 600 ₽ — всё это никем не читалось.
 *  • `/api/reports/schedule-load` — загрузка по дням недели и часам. 17 занятых
 *    клеток, самый занятый день четверг, самый занятый час 11:00. По этому
 *    отчёту открывают и закрывают смены, и он не открывался.
 *  • `/api/reports/receivables` — ИМЕНА должников и срок долга. Сводка отдаёт
 *    итог и число: «долг 53 000 ₽, 2 пациент(ов)». По такой строке нельзя
 *    позвонить, а звонок — единственное, что превращает дебиторку в деньги.
 *
 * ПОЧЕМУ ПРОВЕРКА СМОТРИТ НА ЗАПРОС, А НЕ НА СОСТОЯНИЕ КОМПОНЕНТА
 *
 * Самый дорогой класс дефектов этого дерева — «сделано, закоммичено и
 * НЕДОСТИЖИМО». Доказанные случаи: три починки диктовки не дошли до врача, потому
 * что экран не открывался; панель обзвона всегда посылала `?date=` и отменяла
 * серверный расчёт; фотографии лечения не открывались никогда, потому что
 * `<img src>` идёт без заголовков; все починки часовых поясов в отчётах не
 * исполнялись ни разу, потому что маршрут читал пояс только когда период не
 * пришёл целиком. Каждый раз серверные тесты были зелёными. Поэтому здесь
 * подменяется `globalThis.fetch` и читается то, ЧТО УХОДИТ В ЗАПРОС: адрес и
 * заголовки. Уберите заголовки — проверка краснеет; уберите вызывающего —
 * краснеет замок ниже.
 *
 * ПОЧЕМУ НЕ ЧЕРЕЗ ОТРИСОВКУ. В дереве нет ни jsdom, ни happy-dom; тесты веба
 * гоняются через `node --test`, компоненты рисуются `renderToStaticMarkup`, а он
 * эффекты не исполняет — значит `fetch` из `useEffect` не случится и
 * перехватывать было бы нечего. Поэтому запрос собирают отдельные функции, а
 * связь «панель зовёт их и передаёт заголовки» держит текстовый замок по
 * исходнику: другого способа проверить её в этом дереве нет.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	fetchReceivablesDetail,
	fetchReportsSummary,
	fetchScheduleLoad,
	fetchServiceSales,
	sliceRefusalText,
} from "../components/reports/ManagerReportsPanel.js";

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const panelPath = path.join(
	webSrc,
	"components",
	"reports",
	"ManagerReportsPanel.tsx",
);
const panelSource = readFileSync(panelPath, "utf8");

/**
 * Заголовки охраны ровно того состава, который собирает
 * `auth.denteClinicalReadHeaders()` (hooks/domains/useAuthLogic.ts →
 * lib/denteRequestHeaders.ts). Значения выдуманные: проверяется не они, а то, что
 * запрос их несёт. Без `x-dente-admin-secret` настоящая клиника получает 403, и
 * раздел выглядит пустым, а не сломанным.
 */
const SESSION_HEADERS = {
	"x-dente-admin-secret": "секрет-периметра",
	"x-dente-clinic-token": "токен-кабинета",
	"x-dente-staff-token": "токен-сотрудника",
};

const PERIOD = { from: "2026-07-01", to: "2026-07-31" } as const;

/** Признак мгновения в адресе: час, минута или суффикс UTC. */
const LOOKS_LIKE_AN_INSTANT = /T\d{2}(:|%3A)\d{2}|\dZ|%2B\d{2}(:|%3A)\d{2}/;

type CapturedRequest = { url: string; headers: unknown };

/**
 * Перехват настоящего `globalThis.fetch` с подменой пояса браузера. И то и другое
 * возвращается в `finally`: оставленный перехват увёл бы запросы остальных
 * проверок в пустоту, а оставленный пояс сдвинул бы им всё, что зависит от даты.
 *
 * Пояс подменяется присваиванием ВНУТРИ процесса: префикс `TZ=... node` на этом
 * хосте не работает — Git Bash вырезает TZ из окружения родных процессов Windows.
 */
async function captureRequests(
	browserZone: string,
	body: unknown,
	run: () => Promise<unknown>,
): Promise<CapturedRequest[]> {
	const realFetch = globalThis.fetch;
	const zoneWasSet = Object.hasOwn(process.env, "TZ");
	const previousZone = process.env.TZ;
	const captured: CapturedRequest[] = [];

	process.env.TZ = browserZone;
	globalThis.fetch = (async (input: unknown, init?: { headers?: unknown }) => {
		captured.push({
			url: typeof input === "string" ? input : String(input),
			headers: init === undefined ? undefined : init.headers,
		});
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof globalThis.fetch;

	try {
		await run();
	} finally {
		globalThis.fetch = realFetch;
		if (zoneWasSet && previousZone !== undefined) process.env.TZ = previousZone;
		else delete process.env.TZ;
	}
	return captured;
}

/** Правдоподобные, но пустые ответы: проверяется запрос, а не разбор. */
const emptyServices = {
	rows: [],
	plannedTotalRub: 0,
	discountTotalRub: 0,
	note: "",
	isEmpty: true,
};
const emptyReceivables = {
	rows: [],
	totalDebtRub: 0,
	byBucket: {},
	prepayments: [],
	totalPrepaidRub: 0,
	note: "",
	isEmpty: true,
};
const emptySchedule = {
	cells: [],
	busiestWeekday: null,
	busiestHour: null,
	isEmpty: true,
};

/**
 * Код без комментариев: иначе замки ловят собственное объяснение дефекта.
 *
 * ПОРЯДОК ЗДЕСЬ КРИТИЧЕН, и первая редакция этой функции его перепутала —
 * поймано собственным прогоном, а не рассуждением. Сначала снимались строки,
 * начинающиеся со звёздочки (продолжение блочного комментария), и вместе с ними
 * исчезала строка с закрывающей `*​/`. Незакрытый `/*` после этого съедал ЖИВОЙ
 * код до следующего закрывающего — в App.tsx так испарились первые двести строк
 * вместе с подгрузкой панели, и замок точки входа покраснел на верном коде.
 * Сторож, который краснеет на правильном, учит себя выключать.
 *
 * Поэтому блочные комментарии снимаются ПЕРВЫМИ и целиком, и только потом
 * строчные. Строка `https://…` комментарием не считается: снимаются только те
 * строки, которые с `//` НАЧИНАЮТСЯ.
 */
function withoutComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

const panelCode = withoutComments(panelSource);

/** Текст аргументов вызова `name(...)` от открывающей скобки до парной закрывающей. */
function callArguments(code: string, name: string): string | null {
	const start = code.indexOf(`${name}(`);
	if (start === -1) return null;
	const open = code.indexOf("(", start);
	let depth = 0;
	for (let index = open; index < code.length; index += 1) {
		const character = code[index];
		if (character === "(") depth += 1;
		else if (character === ")") {
			depth -= 1;
			if (depth === 0) return code.slice(open + 1, index);
		}
	}
	return null;
}

/**
 * Тело `load` — единственное место, откуда уходят запросы панели. Если разметка
 * этой функции изменится, проверка обязана падать громко и с объяснением, а не
 * молча проверять пустую строку.
 */
function loadBody(): string {
	const start = panelCode.indexOf("const load = useCallback(");
	assert.notEqual(
		start,
		-1,
		"в панели больше нет `const load = useCallback(` — замок потерял предмет проверки",
	);
	const end = panelCode.indexOf("}, [from, to, granularity]);", start);
	assert.notEqual(
		end,
		-1,
		"у `load` изменился список зависимостей — перечитайте, что и когда он теперь грузит",
	);
	return panelCode.slice(start, end);
}

describe("разрезы отчётов управляющего доходят до владельца", () => {
	test("каждый разрез уходит на свой адрес, календарной датой и без пояса браузера", async () => {
		const asked = async (zone: string) => {
			const requests: CapturedRequest[] = [];
			requests.push(
				...(await captureRequests(zone, emptyServices, () =>
					fetchServiceSales(PERIOD, SESSION_HEADERS),
				)),
			);
			requests.push(
				...(await captureRequests(zone, emptyReceivables, () =>
					fetchReceivablesDetail(SESSION_HEADERS),
				)),
			);
			requests.push(
				...(await captureRequests(zone, emptySchedule, () =>
					fetchScheduleLoad(PERIOD, SESSION_HEADERS),
				)),
			);
			return requests.map((request) => request.url);
		};

		const fromMoscow = await asked("Europe/Moscow");
		assert.deepEqual(
			fromMoscow,
			[
				"/api/reports/services?from=2026-07-01&to=2026-07-31",
				"/api/reports/receivables",
				"/api/reports/schedule-load?from=2026-07-01&to=2026-07-31",
			],
			"адрес разреза изменился или запрос перестал уходить: владелец снова не увидит этот разрез",
		);

		// Дебиторка периода не принимает намеренно: долг существует на дату отчёта,
		// а не «за март». Появившиеся здесь `from`/`to` означают, что кто-то привязал
		// долг к периоду — тогда долг за прошлый месяц исчезнет с экрана.
		assert.equal(fromMoscow[1], "/api/reports/receivables");

		for (const zone of ["Asia/Kamchatka", "America/New_York"]) {
			assert.deepEqual(
				await asked(zone),
				fromMoscow,
				`запрос зависит от пояса браузера (${zone}): границы периода снова считает браузер, а пояс клиники знает только сервер`,
			);
		}
		for (const url of fromMoscow) {
			assert.ok(
				!LOOKS_LIKE_AN_INSTANT.test(url),
				`в адрес вернулось мгновение вместо календарной даты: ${url}`,
			);
		}
	});

	test("каждый запрос несёт заголовки охраны — без них клиника получает 403", async () => {
		const requests: CapturedRequest[] = [
			...(await captureRequests("Europe/Moscow", emptyServices, () =>
				fetchServiceSales(PERIOD, SESSION_HEADERS),
			)),
			...(await captureRequests("Europe/Moscow", emptyReceivables, () =>
				fetchReceivablesDetail(SESSION_HEADERS),
			)),
			...(await captureRequests("Europe/Moscow", emptySchedule, () =>
				fetchScheduleLoad(PERIOD, SESSION_HEADERS),
			)),
			...(await captureRequests(
				"Europe/Moscow",
				{ period: { from: "", to: "" } },
				() =>
					fetchReportsSummary(
						{ ...PERIOD, granularity: "day" },
						SESSION_HEADERS,
					),
			)),
		];

		assert.equal(
			requests.length,
			4,
			"ушло не четыре запроса — состав разрезов изменился",
		);
		for (const request of requests) {
			assert.deepEqual(
				request.headers,
				SESSION_HEADERS,
				`${request.url}: запрос ушёл без заголовков сеанса. Охрана accessGuard отвечает на такой 403, ` +
					"и раздел выглядит пустым, а не сломанным — локально этого не видно, потому что в .env " +
					"включены лазейки для чтения.",
			);
		}
	});

	test("панель зовёт все четыре запроса и передаёт им заголовки сеанса", () => {
		const body = loadBody();

		assert.match(
			body,
			/denteClinicalReadHeaders\(\)/,
			"панель перестала собирать заголовки охраны: с обычным fetch раздел в клинике мёртв (403)",
		);

		for (const caller of [
			"fetchReportsSummary",
			"fetchServiceSales",
			"fetchReceivablesDetail",
			"fetchScheduleLoad",
		]) {
			const argumentsText = callArguments(body, caller);
			assert.notEqual(
				argumentsText,
				null,
				`${caller} больше не вызывается из load(): разрез считается на сервере и не доходит до владельца`,
			);
			assert.match(
				argumentsText ?? "",
				/readHeaders/,
				`${caller} вызывается без заголовков сеанса — сервер ответит 403`,
			);
		}

		// `allSettled`, а не `all`: с `all` отказ одного разреза гасит остальные три
		// вместе со сводкой, то есть достижимость отбирается обратно первым же 403.
		assert.match(
			body,
			/Promise\.allSettled\(/,
			"запросы разрезов снова объединены так, что отказ одного гасит остальные",
		);

		// Без этого вызова load() не случается вовсе, и панель показывает пустоту.
		assert.match(
			panelCode,
			/useEffect\(\(\) => \{\s*void load\(\);\s*\}, \[load\]\)/,
			"панель больше не запускает загрузку при открытии раздела",
		);
	});

	test("ответ каждого разреза доходит до разметки", () => {
		// Место ОТРИСОВКИ. «Функция экспортируется» и «маршрут отвечает 200» ничего
		// не доказывают: до этой правки маршруты отвечали 200 годами.
		const renderSites: [string, RegExp][] = [
			["услуги", /services\.data\.rows\.map\(/],
			["должники", /debtors\.data\.rows\.map\(/],
			["загрузка по дням недели", /scheduleMargins\.byWeekday\.map\(/],
			["загрузка по часам", /scheduleMargins\.byHour\.map\(/],
			["поток пациентов по месяцам", /summary\.patientFlow\.points\.map\(/],
		];
		for (const [what, pattern] of renderSites) {
			assert.match(
				panelCode,
				pattern,
				`разрез «${what}» больше не рисуется: данные приходят и пропадают`,
			);
		}

		// Адрес обязан стоять в вызове ЛИТЕРАЛОМ. Недостижимость этих отчётов нашла
		// перепись адресов по упоминанию в клиенте; собранный в переменной адрес
		// снова прочитается как «маршрут не зовёт никто».
		for (const address of [
			"/api/reports/summary",
			"/api/reports/services",
			"/api/reports/receivables",
			"/api/reports/schedule-load",
		]) {
			assert.ok(
				panelCode.includes(address),
				`адрес ${address} исчез из кода панели`,
			);
		}

		// Отказ виден на экране русским текстом, а не в консоли: три раздела плюс
		// объявление самой функции.
		assert.ok(
			(panelCode.match(/sliceRefusalText\(/g) ?? []).length >= 4,
			"отказ разреза больше не превращается в текст на экране",
		);
		assert.ok(
			panelCode.includes('role="alert"'),
			"отказ разреза не объявлен для программ чтения с экрана",
		);
	});

	test("отказ сервера показан по-русски, с причиной и следующим шагом", () => {
		// Причина от сервера, которую человеку показывать можно, доходит до экрана.
		const readable = sliceRefusalText(
			"Список должников",
			"Даты периода не разобраны.",
		);
		assert.match(readable, /Список должников не построен/);
		assert.match(readable, /Даты периода не разобраны/);
		assert.match(
			readable,
			/Обновить/,
			"в отказе нет следующего шага — это код ответа русскими словами",
		);
		assert.match(
			readable,
			/кабинет/,
			"в отказе нет действия, которое лечит самую частую причину — истёкший вход",
		);

		// Техническая строка гасится и заменяется действием: «Failed to fetch» на
		// экране клиники — это то же самое, что пустой экран.
		const technical = sliceRefusalText(
			"Разрез по услугам",
			"TypeError: Failed to fetch",
		);
		assert.ok(
			!technical.includes("Failed to fetch"),
			"техническая строка ушла на экран владельцу",
		);
		assert.match(technical, /сервер отказал без объяснения/);
		assert.match(technical, /Обновить/);

		// И то же для полного отсутствия причины.
		assert.match(
			sliceRefusalText("Разрез загрузки", null),
			/сервер отказал без объяснения/,
		);
	});

	test("точка входа владельца на месте: панель смонтирована в разделе аналитики", () => {
		// До панели надо ДОЙТИ. Если её перестанут монтировать, все проверки выше
		// останутся зелёными, а владелец снова не увидит ни одного разреза — так уже
		// было с тремя починками диктовки и с таблицей выплат врачам.
		const app = withoutComments(
			readFileSync(path.join(webSrc, "App.tsx"), "utf8"),
		);
		assert.match(
			app,
			/import\("\.\/components\/reports\/ManagerReportsPanel"\)/,
			"App.tsx больше не подгружает панель отчётов",
		);
		assert.match(
			app,
			/<ManagerReportsPanel\s/,
			"панель отчётов больше не отрисовывается ни на одном экране",
		);
	});
});
