/**
 * ГРАНИЦЫ ПЕРИОДА УХОДЯТ НА СЕРВЕР КАЛЕНДАРНОЙ ДАТОЙ, А НЕ МГНОВЕНИЕМ.
 *
 * ЧТО БЫЛО СЛОМАНО И СКОЛЬКО ЭТО СТОИЛО КЛИНИКЕ
 *
 * Границы периода в отчётах считал БРАУЗЕР. Панель отчётов превращала
 * календарную дату из поля `<input type="date">` в мгновение так:
 *   from: new Date(`${from}T00:00:00`).toISOString()
 *   to:   new Date(`${to}T23:59:59`).toISOString()
 * Строка вида `2026-07-01T00:00:00` БЕЗ смещения разбирается в поясе БРАУЗЕРА.
 * Экран выплат врачам делал то же самое через `new Date(год, месяц, 1)`.
 *
 * ИЗМЕРЕНО на выборе «июль 2026»: браузер в Москве (+3) посылал
 * `2026-06-30T21:00:00.000Z`, браузер на Камчатке (+12) —
 * `2026-06-30T12:00:00.000Z`. Девять часов разницы на одном и том же выборе.
 * Владелец сети из Москвы, глядя на камчатский филиал, получал границу «1 июля
 * 09:00» по часам клиники: месячный отчёт терял кассу первой смены месяца и
 * захватывал девять часов следующего месяца. В выплатах врачам та же граница —
 * это уже зарплата, и ошибка там равна целой смене.
 *
 * ПОЧЕМУ ПРОВЕРКА СМОТРИТ НА АДРЕС ЗАПРОСА, А НЕ НА СОСТОЯНИЕ КОМПОНЕНТА
 * В этом дереве трижды случалось, что зелёная проверка не доказывала работу
 * пути, которым ходит клиент: панель обзвона всегда посылала `?date=` и отменяла
 * серверный расчёт «на завтра»; маршрут отчётов читал пояс клиники только без
 * явных границ, а панель присылала обе; три починки диктовки не дошли до врача,
 * потому что экран не открывался. Поэтому здесь подменяется `globalThis.fetch` и
 * читается АДРЕС, который уходит на сервер.
 *
 * ПОЧЕМУ НЕ ЧЕРЕЗ ОТРИСОВКУ КОМПОНЕНТА. В дереве нет ни jsdom, ни happy-dom
 * (проверено: ни одного такого пакета в node_modules), тесты веба гоняются через
 * `node --test`, а компоненты рисуются `renderToStaticMarkup` — он эффекты не
 * исполняет, значит `fetch` из `useEffect` не случится и перехватывать было бы
 * нечего. Поэтому запрос собирают отдельные функции `fetchReportsSummary` и
 * `requestDoctorPayouts`, и других построителей этих двух адресов в вебе нет:
 * последняя проверка в этом файле держит именно это.
 *
 * ПОЯС БРАУЗЕРА ПОДМЕНЯЕТСЯ ЧЕРЕЗ `process.env.TZ` ВНУТРИ ПРОЦЕССА. Префикс
 * `TZ=... node` на этом хосте НЕ РАБОТАЕТ: Git Bash (MSYS) вырезает `TZ` из
 * окружения родных процессов Windows, и `process.env.TZ` приходит `undefined` —
 * замер молча выдаёт пояс хоста для любого заданного значения. Присваивание
 * внутри процесса пояс меняет по-настоящему, это измерено.
 *
 * ЗАПУСК (из apps/web):
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/tests/periodBoundsGoToServerAsCalendarDate.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import { fetchReportsSummary } from "../components/reports/ManagerReportsPanel.js";
import { payoutMonthCalendarBounds, requestDoctorPayouts } from "../pages/DoctorPayoutDashboard.js";

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Пустой, но правдоподобный ответ сервера: проверяется запрос, а не разбор. */
const emptySummary = {
	period: { from: "", to: "" },
	revenue: { granularity: "day", points: [], totalRub: 0, isEmpty: true },
	doctors: { rows: [], unattributedRevenueRub: 0, attributionNote: "", isEmpty: true },
	chairs: { rows: [], basis: { workingDays: 0, minutesPerDay: 0, totalMinutesPerChair: 0, note: "" }, isEmpty: true },
	appointments: {
		byStatus: {},
		total: 0,
		arrivalRate: null,
		completionRate: null,
		cancellationRate: null,
		noShowRate: null,
		lostAppointments: 0,
		isEmpty: true
	},
	reminderEffect: {
		reminded: { appointments: 0, completed: 0, cancelled: 0, noShow: 0, lost: 0, lostRate: null },
		notReminded: { appointments: 0, completed: 0, cancelled: 0, noShow: 0, lost: 0, lostRate: null },
		lostRateDifference: null,
		caveat: "",
		smallestGroupSize: 0,
		enoughData: false,
		isEmpty: true
	},
	patientFlow: { points: [], newTotal: 0, returningTotal: 0 },
	receivables: { totalDebtRub: 0, byBucket: {}, debtors: 0 },
	isEmpty: true
};

/**
 * Перехват настоящего `globalThis.fetch` и подмена пояса браузера на время
 * прогона. И то и другое восстанавливается в `finally`: оставленный пояс сдвинул
 * бы остальным проверкам всё, что зависит от даты, а оставленный перехват увёл бы
 * их запросы в пустоту.
 */
async function requestedUrlIn(browserZone: string, run: () => Promise<unknown>): Promise<string> {
	const realFetch = globalThis.fetch;
	const zoneWasSet = Object.hasOwn(process.env, "TZ");
	const previousZone = process.env.TZ;
	const captured: string[] = [];

	process.env.TZ = browserZone;
	globalThis.fetch = (async (input: unknown, _init?: unknown) => {
		captured.push(typeof input === "string" ? input : String(input));
		return new Response(JSON.stringify(emptySummary), {
			status: 200,
			headers: { "content-type": "application/json" }
		});
	}) as typeof globalThis.fetch;

	try {
		await run();
	} finally {
		globalThis.fetch = realFetch;
		if (zoneWasSet && previousZone !== undefined) process.env.TZ = previousZone;
		else delete process.env.TZ;
	}

	assert.equal(captured.length, 1, `ожидался ровно один запрос, случилось ${captured.length}`);
	return captured[0] ?? "";
}

/** Признак мгновения в адресе: час, минута или суффикс UTC. */
const LOOKS_LIKE_AN_INSTANT = /T\d{2}(:|%3A)\d{2}|\dZ|%2B\d{2}(:|%3A)\d{2}/;

describe("границы периода уходят на сервер календарной датой", () => {
	test("сводка отчётов: адрес не зависит от пояса браузера", async () => {
		const period = { from: "2026-07-01", to: "2026-07-31", granularity: "day" } as const;

		const fromMoscow = await requestedUrlIn("Europe/Moscow", () => fetchReportsSummary(period, {}));
		const fromKamchatka = await requestedUrlIn("Asia/Kamchatka", () => fetchReportsSummary(period, {}));
		const fromNewYork = await requestedUrlIn("America/New_York", () => fetchReportsSummary(period, {}));

		assert.equal(
			fromMoscow,
			"/api/reports/summary?from=2026-07-01&to=2026-07-31&granularity=day",
			"панель снова считает границы сама: календарная дата не доходит до сервера как есть"
		);
		assert.equal(
			fromKamchatka,
			fromMoscow,
			`запрос зависит от пояса браузера: Камчатка ${fromKamchatka}, Москва ${fromMoscow}`
		);
		assert.equal(
			fromNewYork,
			fromMoscow,
			`запрос зависит от пояса браузера: Нью-Йорк ${fromNewYork}, Москва ${fromMoscow}`
		);
		assert.ok(
			!LOOKS_LIKE_AN_INSTANT.test(fromMoscow),
			`в адрес сводки вернулось мгновение вместо календарной даты: ${fromMoscow}`
		);
	});

	test("выплаты врачам: адрес не зависит от пояса браузера", async () => {
		const bounds = payoutMonthCalendarBounds("2026-07");
		assert.ok(bounds, "границы зарплатного месяца не разобраны");

		const fromMoscow = await requestedUrlIn("Europe/Moscow", () => requestDoctorPayouts(bounds));
		const fromKamchatka = await requestedUrlIn("Asia/Kamchatka", () => requestDoctorPayouts(bounds));

		assert.equal(
			fromMoscow,
			"/api/billing/payouts?from=2026-07-01&to=2026-07-31",
			"экран выплат снова считает границы месяца сам — это зарплата, и граница здесь стоит денег"
		);
		assert.equal(
			fromKamchatka,
			fromMoscow,
			`запрос выплат зависит от пояса браузера: Камчатка ${fromKamchatka}, Москва ${fromMoscow}`
		);
		assert.ok(
			!LOOKS_LIKE_AN_INSTANT.test(fromMoscow),
			`в адрес выплат вернулось мгновение вместо календарной даты: ${fromMoscow}`
		);
	});

	/**
	 * Номер последнего дня месяца определяется годом и месяцем, и больше ничем.
	 * Пояс на него влиять не должен — а через `new Date(год, месяц + 1, 0)` влиял
	 * бы на всё, что из этой даты потом выводится.
	 */
	test("последний день зарплатного месяца верен и не зависит от пояса браузера", () => {
		const zoneWasSet = Object.hasOwn(process.env, "TZ");
		const previousZone = process.env.TZ;
		try {
			for (const zone of ["Pacific/Kiritimati", "Pacific/Niue", "Europe/Moscow"]) {
				process.env.TZ = zone;
				assert.deepEqual(payoutMonthCalendarBounds("2026-02"), { from: "2026-02-01", to: "2026-02-28" }, zone);
				assert.deepEqual(payoutMonthCalendarBounds("2024-02"), { from: "2024-02-01", to: "2024-02-29" }, zone);
				assert.deepEqual(payoutMonthCalendarBounds("2026-12"), { from: "2026-12-01", to: "2026-12-31" }, zone);
				assert.deepEqual(payoutMonthCalendarBounds("2026-01"), { from: "2026-01-01", to: "2026-01-31" }, zone);
			}
		} finally {
			if (zoneWasSet && previousZone !== undefined) process.env.TZ = previousZone;
			else delete process.env.TZ;
		}
		assert.equal(payoutMonthCalendarBounds("2026-13"), null);
		assert.equal(payoutMonthCalendarBounds("июль"), null);
	});

	/**
	 * ЗАМОК НА ОБХОД. Проверки выше держат ДВЕ функции запроса. Если превращение
	 * календарной даты в мгновение вернётся куда-нибудь ещё в этих же файлах — в
	 * тело `load`, в обработчик кнопки — адрес снова начнёт зависеть от пояса
	 * браузера, а проверки выше останутся зелёными. Превратить календарную дату в
	 * значение для запроса иначе как через `toISOString` нельзя, поэтому граница
	 * ставится здесь: в этих двух файлах его быть не должно вовсе.
	 */
	test("ни в панели отчётов, ни в выплатах не осталось превращения даты в мгновение", () => {
		for (const relative of ["components/reports/ManagerReportsPanel.tsx", "pages/DoctorPayoutDashboard.tsx"]) {
			const source = readFileSync(path.join(webSrc, relative), "utf8");
			/*
			 * Считается ВЕСЬ файл, включая пояснения. Это осознанно: разбирать
			 * комментарии пришлось бы своим разборщиком, а он на шаблонных строках и
			 * регулярных выражениях этих файлов ошибётся раньше, чем поймает дефект.
			 * Цена — прежний вызов нельзя цитировать дословно в пояснении; в шапках
			 * обоих файлов это сказано прямо, и точно так же поступает страж
			 * оформления `tests/operationsPanelsStyling.test.ts` с цитатой цвета.
			 */
			const calls = source.match(/\.toISOString\(\)/g) ?? [];
			assert.equal(
				calls.length,
				0,
				`${relative}: вернулось ${calls.length} превращений даты в мгновение. Пояс клиники знает сервер, браузер — нет.`
			);
		}
	});
});
