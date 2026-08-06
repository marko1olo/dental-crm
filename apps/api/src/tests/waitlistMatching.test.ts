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
describe("разбор дня недели (parsePreferredWeekday)", () => {
	test("числа от 0 до 6 понимаются как дни недели", () => {
		assert.equal(parsePreferredWeekday(0), 0);
		assert.equal(parsePreferredWeekday(3), 3);
		assert.equal(parsePreferredWeekday(6), 6);
	});

	test("числа вне диапазона 0-6 возвращают null", () => {
		assert.equal(parsePreferredWeekday(-1), null);
		assert.equal(parsePreferredWeekday(7), null);
		assert.equal(parsePreferredWeekday(10), null);
	});

	test("строковые числа от 0 до 6 понимаются как дни недели", () => {
		assert.equal(parsePreferredWeekday("0"), 0);
		assert.equal(parsePreferredWeekday("3"), 3);
		assert.equal(parsePreferredWeekday("6"), 6);
	});

	test("строковые числа вне диапазона возвращают null", () => {
		assert.equal(parsePreferredWeekday("-1"), null);
		assert.equal(parsePreferredWeekday("7"), null);
		assert.equal(parsePreferredWeekday("10"), null);
	});

	test("названия дней недели на русском и английском (полные и краткие) понимаются правильно", () => {
		assert.equal(parsePreferredWeekday("понедельник"), 1);
		assert.equal(parsePreferredWeekday("пн"), 1);
		assert.equal(parsePreferredWeekday("monday"), 1);
		assert.equal(parsePreferredWeekday("mon"), 1);
		assert.equal(parsePreferredWeekday("суббота"), 6);
		assert.equal(parsePreferredWeekday("сб"), 6);
		assert.equal(parsePreferredWeekday("saturday"), 6);
		assert.equal(parsePreferredWeekday("sat"), 6);
	});

	test("регистр и пробелы игнорируются при разборе названий", () => {
		assert.equal(parsePreferredWeekday(" Вторник "), 2);
		assert.equal(parsePreferredWeekday("  WEDNESDAY  "), 3);
		assert.equal(parsePreferredWeekday("чТ"), 4);
	});

	test("конкретная дата в формате YYYY-MM-DD преобразуется в день недели", () => {
		assert.equal(parsePreferredWeekday("2023-10-15"), 0);
		assert.equal(parsePreferredWeekday("2023-10-18"), 3);
	});

	test("некорректная дата возвращает null", () => {
		assert.equal(parsePreferredWeekday("2023-99-99"), null);
		assert.equal(parsePreferredWeekday("not-a-date"), null);
	});

	test("пустые строки, null, undefined и другие типы возвращают null", () => {
		assert.equal(parsePreferredWeekday(""), null);
		assert.equal(parsePreferredWeekday("   "), null);
		assert.equal(parsePreferredWeekday(null), null);
		assert.equal(parsePreferredWeekday(undefined), null);
		assert.equal(parsePreferredWeekday(true), null);
		assert.equal(parsePreferredWeekday({}), null);
		assert.equal(parsePreferredWeekday([]), null);
	});
});

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

	test("без ограничений подходит любое окно", () => {
		// Иначе человек, не назвавший время, никогда не попадёт в подбор — а он
		// как раз самый удобный кандидат.
		assert.equal(slotFitsRanges(9 * 60, []), true);
		assert.equal(slotFitsRanges(21 * 60, []), true);
	});

	test("окно внутри интервала подходит, снаружи — нет", () => {
		const ranges = [{ fromMinute: 600, toMinute: 780 }];
		assert.equal(slotFitsRanges(600, ranges), true, "начало интервала входит");
		assert.equal(slotFitsRanges(779, ranges), true);
		assert.equal(
			slotFitsRanges(780, ranges),
			false,
			"конец интервала не входит: в 13:00 приём уже не начнётся",
		);
		assert.equal(slotFitsRanges(599, ranges), false);
	});

	test("несколько интервалов: подходит попадание в любой", () => {
		const ranges = parsePreferredRanges(["09:00-11:00", "17:00-20:00"]);
		assert.equal(ranges.length, 2);
		assert.equal(slotFitsRanges(10 * 60, ranges), true);
		assert.equal(slotFitsRanges(18 * 60, ranges), true);
		assert.equal(slotFitsRanges(14 * 60, ranges), false);
	});
});
