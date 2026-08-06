import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentMonthPeriod } from "../../services/reports/managerReports.js";

/**
 * МЕСЯЦ ОТЧЁТА РУКОВОДИТЕЛЮ — МЕСЯЦ КЛИНИКИ, А НЕ МЕСЯЦ СЕРВЕРНОГО ПРОЦЕССА.
 *
 * Запуск: из apps/api
 *   node --import tsx --test src/tests/services/reportMonthPeriodClinicZone.test.ts
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Границы периода по умолчанию брались как
 * `new Date(now.getFullYear(), now.getMonth(), 1)` — календарь ПРОЦЕССА сервера.
 * Пока пояс сервера совпадает с поясом клиники, расчёт случайно верен; как
 * только они расходятся, месяц отчёта съезжает на величину разницы. Выручка
 * ночной смены 1-го числа уходит в закрытый предыдущий месяц, и руководитель
 * сверяет отчёт с кассой, не находя расхождения: суммы правдоподобны, месяц не тот.
 *
 * ЧТО ЭТОТ ФАЙЛ НЕ УТВЕРЖДАЕТ. Что дефект срабатывает на этом хосте. Измерено:
 * и пояс процесса Node, и пояс сессии PostgreSQL здесь `Europe/Samara`, то есть
 * для клиники с поясом по умолчанию границы совпадают. Дефект проявляется при
 * развёртывании в другом поясе и у клиники, чей пояс отличается от серверного.
 * Проверки ниже сравнивают расчёт с ЯВНО заданным поясом, а не с поясом машины,
 * поэтому они детерминированы на любом хосте.
 *
 * Часы прибиты параметром `now`: момент 2026-07-31T20:30:00Z лежит внутри
 * опасного окна и разводит три пояса по РАЗНЫМ месяцам — по UTC ещё 31 июля
 * 20:30, в Москве (+3) ещё 31 июля 23:30, а в Самаре (+4) уже 1 августа 00:30.
 */

/** 31 июля 20:30 по Гринвичу: в Самаре уже август, в Москве ещё июль. */
const PINNED = new Date("2026-07-31T20:30:00Z");

const asIso = (date: Date) => date.toISOString();

describe("период отчёта по умолчанию считается в поясе клиники", () => {
	it("самарская клиника в 00:30 первого августа получает АВГУСТ, а не июль", () => {
		const period = currentMonthPeriod(PINNED, "Europe/Samara");
		// Полночь 1 августа в Самаре (+4) — это 31 июля 20:00 по Гринвичу.
		assert.equal(asIso(period.from), "2026-07-31T20:00:00.000Z");
		// Последняя миллисекунда 31 августа в Самаре — 31 августа 19:59:59.999Z.
		assert.equal(asIso(period.to), "2026-08-31T19:59:59.999Z");
		assert.ok(
			period.from <= PINNED && PINNED <= period.to,
			"текущий момент обязан лежать внутри периода",
		);
	});

	it("московская клиника в тот же момент получает ИЮЛЬ: у неё ещё 31-е", () => {
		const period = currentMonthPeriod(PINNED, "Europe/Moscow");
		// В Москве (+3) в этот момент 31 июля 23:30 — месяц ещё июль.
		assert.equal(asIso(period.from), "2026-06-30T21:00:00.000Z");
		assert.equal(asIso(period.to), "2026-07-31T20:59:59.999Z");
		assert.ok(period.from <= PINNED && PINNED <= period.to);
	});

	it("два пояса в один момент дают РАЗНЫЕ месяцы — иначе пояс ни на что не влияет", () => {
		const samara = currentMonthPeriod(PINNED, "Europe/Samara");
		const moscow = currentMonthPeriod(PINNED, "Europe/Moscow");
		assert.notEqual(asIso(samara.from), asIso(moscow.from));
		assert.notEqual(asIso(samara.to), asIso(moscow.to));
	});

	it("границы стыкуются без зазора и без наложения: конец июля + 1 мс = начало августа", () => {
		const july = currentMonthPeriod(
			new Date("2026-07-15T09:00:00Z"),
			"Europe/Samara",
		);
		const august = currentMonthPeriod(
			new Date("2026-08-15T09:00:00Z"),
			"Europe/Samara",
		);
		assert.equal(
			july.to.getTime() + 1,
			august.from.getTime(),
			"между месяцами не должно быть ни потерянной миллисекунды, ни двойного учёта",
		);
	});

	it("переход через конец года: декабрь закрывается началом января", () => {
		const december = currentMonthPeriod(
			new Date("2026-12-20T09:00:00Z"),
			"Europe/Samara",
		);
		assert.equal(asIso(december.from), "2026-11-30T20:00:00.000Z");
		assert.equal(asIso(december.to), "2026-12-31T19:59:59.999Z");
	});

	it("февраль високосного года кончается 29-м, а не 28-м", () => {
		const february = currentMonthPeriod(
			new Date("2028-02-10T09:00:00Z"),
			"Europe/Samara",
		);
		// Полночь 1 марта 2028 в Самаре минус миллисекунда.
		assert.equal(asIso(february.to), "2028-02-29T19:59:59.999Z");
	});

	it("пояс с переходом на летнее время: границы месяца всё равно местная полночь", () => {
		// В America/New_York 1 ноября 2026 переводят стрелки: ноябрь начинается
		// при -4, а кончается при -5. Оба конца обязаны быть местной полночью.
		const november = currentMonthPeriod(
			new Date("2026-11-15T15:00:00Z"),
			"America/New_York",
		);
		assert.equal(
			asIso(november.from),
			"2026-11-01T04:00:00.000Z",
			"1 ноября 00:00 местного — это ещё -4",
		);
		assert.equal(
			asIso(november.to),
			"2026-12-01T04:59:59.999Z",
			"1 декабря 00:00 местного — уже -5",
		);
	});

	it("без пояса берутся границы серверного процесса — прежнее поведение сохранено", () => {
		const period = currentMonthPeriod(PINNED);
		const from = new Date(
			PINNED.getFullYear(),
			PINNED.getMonth(),
			1,
			0,
			0,
			0,
			0,
		);
		const to = new Date(
			PINNED.getFullYear(),
			PINNED.getMonth() + 1,
			0,
			23,
			59,
			59,
			999,
		);
		assert.equal(asIso(period.from), asIso(from));
		assert.equal(asIso(period.to), asIso(to));
	});

	it("несуществующий пояс не роняет отчёт: период остаётся серверным", () => {
		const period = currentMonthPeriod(PINNED, "Марс/Олимп");
		const fallback = currentMonthPeriod(PINNED);
		assert.equal(asIso(period.from), asIso(fallback.from));
		assert.equal(asIso(period.to), asIso(fallback.to));
	});

	it("UTC как пояс клиники: месяц по Гринвичу, и он отличается от самарского", () => {
		const utc = currentMonthPeriod(PINNED, "UTC");
		assert.equal(asIso(utc.from), "2026-07-01T00:00:00.000Z");
		assert.equal(asIso(utc.to), "2026-07-31T23:59:59.999Z");
		assert.notEqual(
			asIso(utc.from),
			asIso(currentMonthPeriod(PINNED, "Europe/Samara").from),
		);
	});
});
