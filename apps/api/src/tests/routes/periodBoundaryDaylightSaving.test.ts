/**
 * КАЛЕНДАРНАЯ ДАТА В ПОЯСЕ С ПЕРЕХОДОМ НА ЗИМНЕЕ ВРЕМЯ.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ ОСТАЛЬНЫХ ПРОВЕРОК ПЕРИОДА. Все они гоняются на `Asia/Kamchatka`
 * и `Europe/Moscow` — поясах без перехода, где сутки всегда 24 часа. Там неверная
 * арифметика перехода не проявляется вовсе. А в поясе с переходом сутки бывают 23 и
 * 25 часов, и именно на этой границе однократного снятия смещения не хватает:
 * первый замер делается в точке, сдвинутой на ЕЩЁ НЕИЗВЕСТНОЕ смещение, и у границы
 * перехода он возвращает смещение ДРУГОЙ стороны. Поэтому `instantOfLocalTime`
 * (`services/reports/managerReports.ts`) снимает смещение ДВАЖДЫ.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Ошибка на переходе — это ровно один час на границе
 * периода, дважды в год. Час на стыке суток — это вечерняя или ночная смена: её
 * касса либо пропадает из отчёта, либо считается в двух периодах сразу. Заметить
 * это по сумме нельзя: отчёт выглядит правдоподобным, а сходиться перестаёт ровно в
 * те два месяца, когда пояс переводят.
 *
 * ЭТО НЕ ГИПОТЕТИЧЕСКИЙ СЛУЧАЙ. Схема допускает любой IANA-пояс в
 * `clinics.timezone`; Россия перехода не делает, но продукт его не запрещает, и
 * первая же клиника в Берлине или Нью-Йорке получит эти сутки.
 *
 * Проверяется НАСТОЯЩАЯ функция маршрута, а не её пересказ: разрешённое мгновение
 * читается обратно часами пояса и обязано показать ровно запрошенную календарную
 * дату и 00:00:00. База здесь не нужна — функция чистая.
 *
 * ЗАПУСК: npx tsx --test apps/api/src/tests/routes/periodBoundaryDaylightSaving.test.ts
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolvePeriodBoundary } from "../../routes/reports.js";

/** Показания часов пояса в заданное мгновение, вместе со смещением. */
function wallClock(zone: string, at: Date): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: zone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
		timeZoneName: "shortOffset",
	}).format(at);
}

/**
 * Сутки перехода. Часы — то, сколько их в этих сутках НА САМОМ ДЕЛЕ; если бы
 * границы считались вычитанием 24 часов или подстановкой 23:59:59, здесь вышло бы
 * ровно 24 и проверка бы упала.
 */
const days: { zone: string; date: string; hours: number; what: string }[] = [
	{
		zone: "America/New_York",
		date: "2026-03-08",
		hours: 23,
		what: "переход на летнее время, час пропадает",
	},
	{
		zone: "America/New_York",
		date: "2026-11-01",
		hours: 25,
		what: "переход на зимнее время, час повторяется",
	},
	{
		zone: "Europe/Berlin",
		date: "2026-03-29",
		hours: 23,
		what: "переход на летнее время, час пропадает",
	},
	{
		zone: "Europe/Berlin",
		date: "2026-10-25",
		hours: 25,
		what: "переход на зимнее время, час повторяется",
	},
	{
		zone: "Asia/Kamchatka",
		date: "2026-07-01",
		hours: 24,
		what: "перехода нет, +12",
	},
	{
		zone: "Europe/Moscow",
		date: "2026-07-01",
		hours: 24,
		what: "перехода нет, +3",
	},
];

describe("календарная дата в поясе с переходом на зимнее время", () => {
	for (const { zone, date, hours, what } of days) {
		test(`${zone} ${date}: сутки ${hours} ч (${what})`, () => {
			const from = resolvePeriodBoundary(date, "from", zone);
			const to = resolvePeriodBoundary(date, "to", zone);
			assert.ok(from, `${zone} ${date}: начало суток не разобрано`);
			assert.ok(to, `${zone} ${date}: конец суток не разобран`);

			// Начало периода — полночь ЗАПРОШЕННОГО дня по часам пояса.
			assert.ok(
				wallClock(zone, from).startsWith(`${date}, 00:00:00`),
				`начало суток попало не в полночь запрошенного дня: ${wallClock(zone, from)} (${from.toISOString()})`,
			);

			// Конец периода ВКЛЮЧАЮЩИЙ: ещё одна миллисекунда — уже следующие сутки,
			// и они начинаются в свою полночь, каким бы ни было новое смещение.
			const justAfter = new Date(to.getTime() + 1);
			assert.match(
				wallClock(zone, justAfter),
				/, 00:00:00/,
				`конец суток не совпал с началом следующих: ${wallClock(zone, justAfter)} (${justAfter.toISOString()})`,
			);

			// Длина суток. Именно здесь однократное снятие смещения ошибается на час.
			const measured = (to.getTime() + 1 - from.getTime()) / 3_600_000;
			assert.equal(
				measured,
				hours,
				`длина суток ${measured} ч вместо ${hours}: смещение перехода снято неверно (${from.toISOString()} .. ${to.toISOString()})`,
			);
		});
	}

	/**
	 * Календарный МЕСЯЦ, внутри которого лежит переход. Конец месяца считается как
	 * начало следующего минус миллисекунда, поэтому ни длина месяца, ни лишний или
	 * пропавший час в его середине не участвуют в расчёте вообще.
	 */
	test("месяц с переходом: конец периода совпадает с началом следующего месяца", () => {
		// Последний день назван явно. В первой редакции он выводился условием по
		// поясу, и март получил 30 дней вместо 31 — проверка справедливо упала на
		// щели ровно в сутки. Условная арифметика календаря в проверке календаря —
		// это второй источник той же ошибки, которую она ловит.
		for (const [zone, lastDay, nextFirst] of [
			["Europe/Berlin", "2026-10-31", "2026-11-01"],
			["America/New_York", "2026-11-30", "2026-12-01"],
			["America/New_York", "2026-03-31", "2026-04-01"],
		] as const) {
			const monthEnd = resolvePeriodBoundary(lastDay, "to", zone);
			const nextMonthStart = resolvePeriodBoundary(nextFirst, "from", zone);
			assert.ok(
				monthEnd && nextMonthStart,
				`${zone} ${lastDay}: границы не разобраны`,
			);
			assert.equal(
				monthEnd.getTime() + 1,
				nextMonthStart.getTime(),
				`${zone} ${lastDay}: между концом месяца и началом следующего образовалась щель или наложение`,
			);
		}
	});
});
