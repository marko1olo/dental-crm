import {
	currentMonthPeriod,
} from "../../reports/managerReports.js";
import {
	MAX_PAYOUT_PERIOD_DAYS,
	type ResolvedPayoutPeriod,
} from "./types.js";

/**
 * Период расчёта из параметров запроса. Умолчание — текущий месяц целиком:
 * зарплату считают раз в месяц.
 */
export function resolvePayoutPeriod(
	input: {
		readonly from?: string | undefined;
		readonly to?: string | undefined;
	},
	now = new Date(),
	/**
	 * Часовой пояс клиники. Без него границы месяца считались в поясе СЕРВЕРНОГО
	 * процесса: зарплату за месяц клиника получала с чужими границами, и приёмы
	 * последнего вечера уезжали в следующий расчётный период либо считались
	 * дважды. Зарплату считают раз в месяц, поэтому ошибка границы — это не
	 * копейки, а целая смена.
	 *
	 * Необязателен: без него поведение прежнее, ни один вызывающий не ломается,
	 * а отсутствие пояса означает «неизвестно», а не «подставить московский».
	 */
	timeZone?: string | null,
): ResolvedPayoutPeriod {
	const fallback = currentMonthPeriod(now, timeZone);
	const from = input.from ? new Date(input.from) : fallback.from;
	const to = input.to ? new Date(input.to) : fallback.to;

	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
		return {
			ok: false,
			message:
				"Даты периода не разобраны. Передайте начало и конец периода в формате даты со временем.",
		};
	}
	if (from.getTime() > to.getTime()) {
		return {
			ok: false,
			message: "Начало периода позже его конца. Поменяйте даты местами.",
		};
	}
	const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
	if (spanDays > MAX_PAYOUT_PERIOD_DAYS) {
		return {
			ok: false,
			message:
				`Период длиннее ${MAX_PAYOUT_PERIOD_DAYS} дней, а зарплату считают за месяц. ` +
				"Сузьте диапазон: широкий период смешает несколько зарплатных периодов в одну сумму.",
		};
	}
	return { ok: true, from, to };
}
