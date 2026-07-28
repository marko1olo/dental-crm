import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calendarDayInTimeZone,
	dateInputValuePlusDays,
	shiftCalendarDay,
	todayDateInputValue
} from "../AppHelpers";

/**
 * ДАТА В ПОЛЕ МЕДИЦИНСКОГО ДОКУМЕНТА — ЭТО ДЕНЬ КЛИНИКИ, А НЕ ДЕНЬ ПО UTC.
 *
 * Запуск: из apps/web
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/tests/dateInputValueLocalDay.test.ts
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. `todayDateInputValue` возвращала
 * `new Date().toISOString().slice(0, 10)` — день по UTC. У всех российских
 * поясов смещение положительное, поэтому день по UTC отстаёт от местного каждую
 * ночь: в Москве с 00:00 до 03:00, в Самаре (пояс по умолчанию) до 04:00, на
 * Камчатке — половину суток. Отсюда заполнялись дата открытия карты 025/у и
 * период выписки из медкарты, то есть документы государственного учёта уходили
 * с датой на день раньше факта.
 *
 * Часы здесь ПРИБИТЫ (`t.mock.timers`), потому что иначе проверка проходила бы
 * половину суток и падала другую половину — а сторож, который зависит от времени
 * прогона, не сторож.
 *
 * Момент выбран так, чтобы день по UTC и день клиники ГАРАНТИРОВАННО не
 * совпадали: 2026-07-29T22:00:00Z — это 29 июля по UTC и уже 30 июля в Москве
 * (+3), в Самаре (+4) и на Камчатке (+12). Если расчёт вернётся к UTC, каждая
 * проверка ниже покраснеет независимо от того, когда её запустили.
 */

/** 29 июля 22:00 по Гринвичу: в России уже 30-е. */
const PINNED = Date.parse("2026-07-29T22:00:00Z");

describe("день для поля ввода date считается в поясе клиники", () => {
	it("Москва получает 30 июля, когда по UTC ещё 29-е", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		assert.equal(new Date().toISOString().slice(0, 10), "2026-07-29", "проверка самого стенда");
		assert.equal(todayDateInputValue("Europe/Moscow"), "2026-07-30");
	});

	it("Самара — пояс по умолчанию в схеме клиник — тоже 30 июля", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		assert.equal(todayDateInputValue("Europe/Samara"), "2026-07-30");
	});

	it("Камчатка получает 30 июля: там уже десять утра", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		assert.equal(todayDateInputValue("Asia/Kamchatka"), "2026-07-30");
	});

	it("пояс, где действительно 29-е, получает 29-е — расчёт не сдвигает всё вперёд", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		assert.equal(todayDateInputValue("America/New_York"), "2026-07-29");
		assert.equal(todayDateInputValue("UTC"), "2026-07-29");
	});

	it("неизвестный пояс не роняет поле и не отдаёт пустоту", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		assert.match(todayDateInputValue("Марс/Олимп"), /^\d{4}-\d{2}-\d{2}$/);
	});

	it("без пояса берётся местный день машины, а не день по UTC", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		const now = new Date();
		const pad = (value: number) => String(value).padStart(2, "0");
		const localDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
		assert.equal(todayDateInputValue(), localDay);
	});
});

describe("сдвиг на сутки считается календарно", () => {
	it("срок оплаты через 7 дней от дня клиники, а не от дня по UTC", (t) => {
		t.mock.timers.enable({ apis: ["Date"], now: PINNED });
		// 30 июля в Москве + 7 = 6 августа. От дня по UTC (29-е) вышло бы 5-е.
		assert.equal(dateInputValuePlusDays(7, "Europe/Moscow"), "2026-08-06");
	});

	it("переход через конец месяца и конец года", () => {
		assert.equal(shiftCalendarDay("2026-07-31", 1), "2026-08-01");
		assert.equal(shiftCalendarDay("2026-12-31", 1), "2027-01-01");
		assert.equal(shiftCalendarDay("2028-02-28", 1), "2028-02-29", "2028 — високосный");
		assert.equal(shiftCalendarDay("2026-03-01", -1), "2026-02-28");
	});

	it("сутки длиной 25 часов не сбивают шаг — и вот чем это отличается от прежнего расчёта", () => {
		/*
		 * 1 ноября 2026 года в America/New_York переводят стрелки назад: сутки
		 * длятся 25 часов. Проверяемый пример из разбора: момент
		 * 2026-11-01T04:30:00Z — это 1 ноября 00:30 по местному времени.
		 */
		const moment = new Date("2026-11-01T04:30:00Z");
		const zone = "America/New_York";
		const today = calendarDayInTimeZone(moment, zone);
		assert.equal(today, "2026-11-01", "стенд: местный день — 1 ноября");

		// Календарный шаг доводит до 2-го числа, как и должен.
		assert.equal(shiftCalendarDay(today, 1), "2026-11-02");

		// А прежний приём — прибавить 24 часа и отформатировать в поясе клиники —
		// остаётся на 1-м числе. Ровно из-за этого список «на завтра» молча
		// становился списком на сегодня.
		const byMilliseconds = new Intl.DateTimeFormat("en-CA", {
			timeZone: zone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		}).format(new Date(moment.getTime() + 24 * 60 * 60 * 1000));
		assert.equal(byMilliseconds, "2026-11-01", "стенд: 24 часа не доводят до следующей даты");
		assert.notEqual(
			shiftCalendarDay(today, 1),
			byMilliseconds,
			"календарный шаг и арифметика по миллисекундам обязаны здесь расходиться"
		);
	});

	it("неразобранный день возвращается как есть, а не превращается в NaN", () => {
		assert.equal(shiftCalendarDay("", 1), "");
		assert.equal(shiftCalendarDay("не дата", 1), "не дата");
	});
});
