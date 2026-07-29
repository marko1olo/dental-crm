/**
 * Подбор кандидатов из листа ожидания под освободившееся окно.
 *
 * Проверяется то, что легко сломать незаметно: разбор желаемых интервалов
 * (поле хранится как jsonb без схемы) и порядок кандидатов. Ошибка в разборе
 * времени не роняет ничего — она просто прячет подходящего человека, и клиника
 * теряет запись, не узнав об этом.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	parsePreferredRanges,
	parsePreferredWeekday,
	slotFitsRanges,
} from "../services/schedule/waitlistMatching.js";

/*
 * Эти проверки появились после сверки с ФАКТИЧЕСКИМ контрактом. В первой
 * редакции разбор понимал «10:00-13:00» и {from, to} — формы, которые я
 * предположил. А zod-схема POST /api/waitlist задаёт другое: массив
 * {day: string, slot: string}. То есть подбор не понимал того, что пишет
 * единственный писатель, и вдобавок игнорировал день недели — человек,
 * просивший вторник, попадал в подбор на пятничное окно.
 */
describe("контракт поля из POST /api/waitlist", () => {
	test("форма {day, slot} с интервалом понимается", () => {
		assert.deepEqual(
			parsePreferredRanges([{ day: "вт", slot: "10:00-13:00" }]),
			[{ fromMinute: 600, toMinute: 780 }],
		);
	});

	test("одно время в slot считается началом получаса, а не всем днём", () => {
		// «10:00» означает это время, а не «когда угодно»: полчаса — самый
		// короткий приём в прайсе.
		assert.deepEqual(parsePreferredRanges([{ day: "пн", slot: "10:00" }]), [
			{ fromMinute: 600, toMinute: 630 },
		]);
	});

	test("день недели читается из названия, номера и даты", () => {
		assert.equal(parsePreferredWeekday("вторник"), 2);
		assert.equal(parsePreferredWeekday("ВТ"), 2);
		assert.equal(parsePreferredWeekday("tuesday"), 2);
		assert.equal(parsePreferredWeekday(2), 2);
		// Конкретная дата: 29 июля 2026 — среда.
		assert.equal(parsePreferredWeekday("2026-07-29"), 3);
	});

	test("незнакомый день не превращается в ограничение", () => {
		// Иначе человека спрячет из подбора выдуманное правило.
		assert.equal(parsePreferredWeekday("как получится"), null);
		assert.equal(parsePreferredWeekday(""), null);
		assert.equal(parsePreferredWeekday(9), null);
		assert.equal(parsePreferredWeekday(null), null);
	});
});

describe("желаемое время в листе ожидания", () => {
	test("строка «10:00-13:00» понимается", () => {
		assert.deepEqual(parsePreferredRanges(["10:00-13:00"]), [
			{ fromMinute: 600, toMinute: 780 },
		]);
	});

	test("тире в любом написании: дефис, среднее и длинное", () => {
		// В поле попадает то, что набрал администратор, а не то, что удобно коду.
		assert.equal(parsePreferredRanges(["09:00–12:00"]).length, 1);
		assert.equal(parsePreferredRanges(["09:00—12:00"]).length, 1);
	});

	test("объект {from, to} понимается наравне со строкой", () => {
		assert.deepEqual(parsePreferredRanges([{ from: "14:30", to: "18:00" }]), [
			{ fromMinute: 870, toMinute: 1080 },
		]);
	});

	test("мусор и невозможное время отбрасываются, а не роняют подбор", () => {
		assert.deepEqual(parsePreferredRanges("после обеда"), []);
		assert.deepEqual(parsePreferredRanges(["25:00-26:00"]), []);
		// Конец раньше начала — это не интервал.
		assert.deepEqual(parsePreferredRanges(["18:00-09:00"]), []);
		assert.deepEqual(parsePreferredRanges(null), []);
		assert.deepEqual(parsePreferredRanges(undefined), []);
	});
});

describe("slotFitsRanges", () => {
	test("без ограничений подходит любое окно", () => {
		// Иначе человек, не назвавший время, никогда не попадёт в подбор — а он
		// как раз самый удобный кандидат.
		assert.equal(slotFitsRanges(9 * 60, []), true);
		assert.equal(slotFitsRanges(21 * 60, []), true);
	});

	test("окно внутри интервала подходит, снаружи — нет", () => {
		const ranges = [{ fromMinute: 600, toMinute: 780 }]; // 10:00 to 13:00

		// Boundary checks
		assert.equal(
			slotFitsRanges(600, ranges),
			true,
			"начало интервала входит (ровно 10:00)",
		);
		assert.equal(
			slotFitsRanges(599, ranges),
			false,
			"минута до начала не входит (09:59)",
		);

		assert.equal(
			slotFitsRanges(779, ranges),
			true,
			"минута до конца входит (12:59)",
		);
		assert.equal(
			slotFitsRanges(780, ranges),
			false,
			"конец интервала не входит: в 13:00 приём уже не начнётся",
		);

		// Middle
		assert.equal(
			slotFitsRanges(700, ranges),
			true,
			"середина интервала входит",
		);

		// Far outside
		assert.equal(slotFitsRanges(0, ranges), false, "полночь не входит");
		assert.equal(slotFitsRanges(1440, ranges), false, "конец дня не входит");
	});

	test("несколько интервалов: подходит попадание в любой", () => {
		const ranges = [
			{ fromMinute: 540, toMinute: 660 }, // 09:00-11:00
			{ fromMinute: 1020, toMinute: 1200 }, // 17:00-20:00
		];

		assert.equal(
			slotFitsRanges(10 * 60, ranges),
			true,
			"внутри первого интервала",
		);
		assert.equal(
			slotFitsRanges(18 * 60, ranges),
			true,
			"внутри второго интервала",
		);
		assert.equal(slotFitsRanges(14 * 60, ranges), false, "между интервалами");
		assert.equal(slotFitsRanges(8 * 60, ranges), false, "до первого интервала");
		assert.equal(
			slotFitsRanges(21 * 60, ranges),
			false,
			"после второго интервала",
		);
	});

	test("пересекающиеся или некорректные интервалы (защита)", () => {
		// Даже если парсер такого не выдаст, функция должна вести себя предсказуемо
		const overlapRanges = [
			{ fromMinute: 600, toMinute: 720 }, // 10:00-12:00
			{ fromMinute: 660, toMinute: 780 }, // 11:00-13:00
		];
		assert.equal(
			slotFitsRanges(630, overlapRanges),
			true,
			"подходит под первый",
		);
		assert.equal(slotFitsRanges(690, overlapRanges), true, "подходит под оба");
		assert.equal(
			slotFitsRanges(750, overlapRanges),
			true,
			"подходит под второй",
		);

		const invalidRange = [{ fromMinute: 800, toMinute: 600 }]; // End before start
		assert.equal(
			slotFitsRanges(700, invalidRange),
			false,
			"невозможно попасть в перевернутый интервал",
		);
	});
});
