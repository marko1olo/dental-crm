/**
 * Общие типы, схемы валидации и разрешение часового пояса для маршрутов отчётов.
 * Sweet Spot: 150-200 строк.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { replyBadRequest } from "../routeErrors.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import {
	clinicTimeZone,
	currentMonthPeriod,
	instantOfLocalTime,
	type ReportScope,
} from "../../services/reports/managerReports.js";

/** Календарная дата: ровно то, что показывает и отдаёт `<input type="date">`. */
export const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Граница периода: либо календарная дата (YYYY-MM-DD), либо полный ISO со смещением.
 */
export const periodBoundarySchema = z.union([
	z.string().regex(CALENDAR_DATE_PATTERN),
	z.string().datetime({ offset: true }),
]);

export const periodQuerySchema = z.object({
	from: periodBoundarySchema.optional(),
	to: periodBoundarySchema.optional(),
	period: z.enum(["day", "week", "month", "quarter", "year"]).optional(),
	granularity: z.enum(["day", "week", "month"]).optional(),
	minutesPerDay: z.coerce.number().int().min(60).max(1440).optional(),
	workingDaysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
	limit: z.coerce.number().int().min(1).max(500).optional(),
	minDebtRub: z.coerce.number().int().min(1).max(10_000_000).optional(),
}).strict();

export type PeriodQuery = z.infer<typeof periodQuerySchema>;

export const MAX_PERIOD_DAYS = 400;

export function badRequest(reply: FastifyReply, message: string) {
	return replyBadRequest(reply, "ReportValidationError", message);
}

/**
 * Разрешение границы периода в Date с учетом таймзоны клиники.
 */
export function resolvePeriodBoundary(
	raw: string,
	edge: "from" | "to",
	timeZone: string | null,
): Date | null {
	const calendar = CALENDAR_DATE_PATTERN.exec(raw);
	if (!calendar) {
		const instant = new Date(raw);
		return Number.isNaN(instant.getTime()) ? null : instant;
	}

	const year = Number(calendar[1]);
	const month = Number(calendar[2]);
	const day = Number(calendar[3]);
	if (month < 1 || month > 12 || day < 1) return null;
	if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;

	const boundaryDay = edge === "to" ? day + 1 : day;
	if (timeZone) {
		const instant = instantOfLocalTime(timeZone, year, month, boundaryDay);
		if (instant !== null)
			return new Date(edge === "to" ? instant - 1 : instant);
	}

	const local = new Date(year, month - 1, boundaryDay, 0, 0, 0, 0);
	if (Number.isNaN(local.getTime())) return null;
	return new Date(edge === "to" ? local.getTime() - 1 : local.getTime());
}

/**
 * Разрешение диапазона периода из параметров запроса с защитой от скачков часовых поясов.
 */
export function resolvePeriod(
	query: PeriodQuery,
	timeZone: string | null,
): { ok: true; from: Date; to: Date } | { ok: false; message: string } {
	let fallback = currentMonthPeriod(new Date(), timeZone);
	if (query.period && query.from === undefined && query.to === undefined) {
		const now = new Date();
		let y = now.getFullYear();
		let m = now.getMonth() + 1; // 1-12
		let d = now.getDate();
		let dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Mon, 6 = Sun

		if (timeZone) {
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
				const tzYear = Number(parts.get("year"));
				const tzMonth = Number(parts.get("month"));
				const tzDay = Number(parts.get("day"));
				if (
					Number.isFinite(tzYear) &&
					Number.isFinite(tzMonth) &&
					Number.isFinite(tzDay)
				) {
					y = tzYear;
					m = tzMonth;
					d = tzDay;
					const asUtc = new Date(Date.UTC(y, m - 1, d));
					dayOfWeek = asUtc.getUTCDay() === 0 ? 6 : asUtc.getUTCDay() - 1;
				}
			} catch {
				// fallback к серверному времени при неизвестном поясе
			}
		}

		if (query.period === "day") {
			const dayStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			const startOfDay =
				resolvePeriodBoundary(dayStr, "from", timeZone) ??
				new Date(y, m - 1, d, 0, 0, 0, 0);
			const endOfDay =
				resolvePeriodBoundary(dayStr, "to", timeZone) ??
				new Date(y, m - 1, d, 23, 59, 59, 999);
			fallback = { from: startOfDay, to: endOfDay };
		} else if (query.period === "week") {
			const mondayUtc = new Date(Date.UTC(y, m - 1, d - dayOfWeek));
			const sundayUtc = new Date(Date.UTC(y, m - 1, d - dayOfWeek + 6));
			const monStr = `${mondayUtc.getUTCFullYear()}-${String(mondayUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(mondayUtc.getUTCDate()).padStart(2, "0")}`;
			const sunStr = `${sundayUtc.getUTCFullYear()}-${String(sundayUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(sundayUtc.getUTCDate()).padStart(2, "0")}`;
			const startOfWeek =
				resolvePeriodBoundary(monStr, "from", timeZone) ??
				new Date(y, m - 1, d - dayOfWeek, 0, 0, 0, 0);
			const endOfWeek =
				resolvePeriodBoundary(sunStr, "to", timeZone) ??
				new Date(y, m - 1, d - dayOfWeek + 6, 23, 59, 59, 999);
			fallback = { from: startOfWeek, to: endOfWeek };
		} else if (query.period === "quarter") {
			const currentQuarterMonth = Math.floor((m - 1) / 3) * 3 + 1;
			const endQuarterMonth = currentQuarterMonth + 2;
			const lastDayOfEndMonth = new Date(
				Date.UTC(y, endQuarterMonth, 0),
			).getUTCDate();
			const startQuarterStr = `${y}-${String(currentQuarterMonth).padStart(2, "0")}-01`;
			const endQuarterStr = `${y}-${String(endQuarterMonth).padStart(2, "0")}-${String(lastDayOfEndMonth).padStart(2, "0")}`;
			const startOfQuarter =
				resolvePeriodBoundary(startQuarterStr, "from", timeZone) ??
				new Date(y, currentQuarterMonth - 1, 1, 0, 0, 0, 0);
			const endOfQuarter =
				resolvePeriodBoundary(endQuarterStr, "to", timeZone) ??
				new Date(y, endQuarterMonth - 1, lastDayOfEndMonth, 23, 59, 59, 999);
			fallback = { from: startOfQuarter, to: endOfQuarter };
		} else if (query.period === "year") {
			const startOfYear =
				resolvePeriodBoundary(`${y}-01-01`, "from", timeZone) ??
				new Date(y, 0, 1, 0, 0, 0, 0);
			const endOfYear =
				resolvePeriodBoundary(`${y}-12-31`, "to", timeZone) ??
				new Date(y, 11, 31, 23, 59, 59, 999);
			fallback = { from: startOfYear, to: endOfYear };
		}
	}

	const from =
		query.from === undefined
			? fallback.from
			: resolvePeriodBoundary(query.from, "from", timeZone);
	const to =
		query.to === undefined
			? fallback.to
			: resolvePeriodBoundary(query.to, "to", timeZone);

	if (from === null || to === null) {
		return { ok: false, message: "Даты периода не разобраны." };
	}
	if (from > to)
		return { ok: false, message: "Начало периода позже его конца." };

	const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
	if (spanDays > MAX_PERIOD_DAYS) {
		return {
			ok: false,
			message: `Период длиннее ${MAX_PERIOD_DAYS} дней. Сузьте диапазон.`,
		};
	}
	return { ok: true, from, to };
}

export type ReportScopeContext = {
	readonly scope: ReportScope;
	readonly query: PeriodQuery;
};

/**
 * Единый разбор параметров отчёта: аутентификация, права доступа analytics.read,
 * чтение таймзоны клиники и валидация периода.
 */
export async function scopeForReport(
	request: FastifyRequest,
	reply: FastifyReply,
	area: string,
): Promise<ReportScopeContext | null> {
	const context = await requireClinicalReadContext(request, reply, area);
	if (!context) return null;
	if (!enforcePermissionWhenStaffKnown(request, reply, "analytics.read"))
		return null;

	const parsed = periodQuerySchema.safeParse(request.query);
	if (!parsed.success) {
		badRequest(
			reply,
			"Проверьте параметры отчёта: даты, детализацию и пределы.",
		);
		return null;
	}

	const timeZone = await clinicTimeZone(context.organizationId);
	const period = resolvePeriod(parsed.data, timeZone);
	if (!period.ok) {
		badRequest(reply, period.message);
		return null;
	}

	return {
		scope: {
			organizationId: context.organizationId,
			from: period.from,
			to: period.to,
			timeZone,
			logger: request.log,
		},
		query: parsed.data,
	};
}
