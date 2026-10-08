/**
 * Расчет календарных границ периодов в часовом поясе клиники.
 * Защита от Daylight Saving сдвигов.
 */

import type { ReportPeriod } from "./types.js";

/**
 * Смещение пояса в миллисекундах для заданного мгновения. `null` — пояса не
 * существует. Готовой функции «местное время → мгновение» в стандартной
 * библиотеке нет, поэтому смещение снимается форматированием.
 */
function zoneOffsetMsAt(timeZone: string, instantMs: number): number | null {
	try {
		const parts = new Map(
			new Intl.DateTimeFormat("en-CA", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
			})
				.formatToParts(new Date(instantMs))
				.map((part) => [part.type, part.value]),
		);
		const year = Number(parts.get("year"));
		const month = Number(parts.get("month"));
		const day = Number(parts.get("day"));
		// hour12: false может отдать 24 для полуночи — приводим к 0.
		const hour = Number(parts.get("hour")) % 24;
		const minute = Number(parts.get("minute"));
		const second = Number(parts.get("second"));
		if (
			![year, month, day, hour, minute, second].every((value) =>
				Number.isFinite(value),
			)
		)
			return null;
		// Показания часов пояса, прочитанные как UTC, минус само мгновение — это и
		// есть смещение. Миллисекунды в вывод не входят, поэтому мгновение
		// усекается до секунды.
		return (
			Date.UTC(year, month - 1, day, hour, minute, second, 0) -
			Math.floor(instantMs / 1000) * 1000
		);
	} catch {
		return null;
	}
}

/**
 * Мгновение, в которое часы пояса показывают заданное местное время.
 *
 * Смещение снимается дважды: первый замер делается в точке, сдвинутой на
 * неизвестное ещё смещение, и у границы перехода на зимнее время он даёт
 * смещение ДРУГОЙ стороны границы. Уточняющий повторный замер — тот же приём,
 * что уже применён в `routes/publicBooking.ts:153-226`.
 */
export function instantOfLocalTime(
	timeZone: string,
	year: number,
	month: number,
	day: number,
): number | null {
	const asIfUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
	const firstOffset = zoneOffsetMsAt(timeZone, asIfUtc);
	if (firstOffset === null) return null;
	const candidate = asIfUtc - firstOffset;
	const refinedOffset = zoneOffsetMsAt(timeZone, candidate);
	if (refinedOffset === null) return null;
	return refinedOffset === firstOffset ? candidate : asIfUtc - refinedOffset;
}

/** Год и месяц, которые показывает календарь пояса. `null` — пояса не существует. */
function calendarMonthInTimeZone(
	timeZone: string,
	now: Date,
): { year: number; month: number } | null {
	try {
		const parts = new Map(
			new Intl.DateTimeFormat("en-CA", {
				timeZone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			})
				.formatToParts(now)
				.map((part) => [part.type, part.value]),
		);
		const year = Number(parts.get("year"));
		const month = Number(parts.get("month"));
		if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
		return { year, month };
	} catch {
		return null;
	}
}

/**
 * ТЕКУЩИЙ МЕСЯЦ ЦЕЛИКОМ — ПЕРИОД ПО УМОЛЧАНИЮ, В ПОЯСЕ КЛИНИКИ.
 *
 * ЧТО БЫЛО СЛОМАНО. Границы месяца брались через `now.getFullYear()` /
 * `now.getMonth()`, то есть в поясе ПРОЦЕССА сервера. Считать календарную дату
 * обязан тот, кто знает пояс клиники (`clinics.timezone`, схема допускает любой
 * IANA-пояс и по умолчанию ставит `Europe/Samara`).
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Пока пояс сервера совпадает с поясом клиники,
 * расчёт случайно верен. Как только они расходятся, месяц отчёта съезжает:
 *   сервер UTC, клиника Самара (+4) — первые 4 часа 1-го числа попадают в
 *   ПРЕДЫДУЩИЙ месяц: выручка ночной смены уходит в закрытый период;
 *   сервер Самара (+4), клиника Москва (+3) — последний час 31-го числа
 *   попадает в СЛЕДУЮЩИЙ месяц.
 * Руководитель сверяет отчёт с кассой и не находит расхождения: суммы
 * правдоподобны, а месяц не тот.
 *
 * ИЗМЕРЕНО на этом хосте: пояс процесса Node и сессии PostgreSQL — оба
 * `Europe/Samara`, поэтому для клиники по умолчанию дефект здесь и сейчас НЕ
 * проявляется. Он проявляется при переносе на сервер в другом поясе и у любой
 * клиники, чей пояс отличается от серверного. Это дефект развёртывания, а не
 * ежедневный, и выдавать его за второе нельзя.
 *
 * Пояс неизвестен или не разобран — прежнее поведение: границы в поясе сервера.
 * Отчёт обязан вернуть какой-то период, отказ здесь хуже приблизительного ответа.
 */
export function currentMonthPeriod(
	now = new Date(),
	timeZone?: string | null,
): ReportPeriod {
	if (timeZone) {
		const calendar = calendarMonthInTimeZone(timeZone, now);
		if (calendar) {
			const monthStart = instantOfLocalTime(
				timeZone,
				calendar.year,
				calendar.month,
				1,
			);
			// Начало следующего месяца минус миллисекунда: конец периода включающий
			// (`lte`), а длину месяца так считать не нужно вообще.
			const nextMonthStart = instantOfLocalTime(
				timeZone,
				calendar.month === 12 ? calendar.year + 1 : calendar.year,
				calendar.month === 12 ? 1 : calendar.month + 1,
				1,
			);
			if (monthStart !== null && nextMonthStart !== null) {
				return { from: new Date(monthStart), to: new Date(nextMonthStart - 1) };
			}
		}
	}

	const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
	const to = new Date(
		now.getFullYear(),
		now.getMonth() + 1,
		0,
		23,
		59,
		59,
		999,
	);
	return { from, to };
}
