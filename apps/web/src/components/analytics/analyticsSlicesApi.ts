/**
 * apps/web/src/components/analytics/analyticsSlicesApi.ts
 *
 * API клиенты для аналитических разрезов клиники (выручка, услуги, должники, расписание).
 * Границы периода передаются СТРОГО календарной датой (YYYY-MM-DD), без вызова toISOString().
 * Мандат 8b: лаконичный размер (< 150 строк).
 */

import { operatorReadableErrorDetail } from "../../AppHelpers";

export interface PeriodBounds {
	readonly from: string;
	readonly to: string;
	readonly granularity?: string;
}

export function sliceRefusalText(subject: string, detail: string | null): string {
	const readable = operatorReadableErrorDetail(detail);
	const cause = readable ? readable.replace(/\s*[.;]\s*$/, "") : "сервер отказал без объяснения";
	return `${subject} не построен: ${cause}. Нажмите «Обновить». Если отказ повторяется — войдите в рабочий кабинет клиники заново, этот раздел закрыт входом.`;
}

export async function fetchReportsSummary(
	period: PeriodBounds,
	headers?: Record<string, string>,
): Promise<Response> {
	const params = new URLSearchParams();
	if (period.from) params.set("from", period.from);
	if (period.to) params.set("to", period.to);
	if (period.granularity) params.set("granularity", period.granularity);
	const query = params.toString();
	return fetch(`/api/reports/summary${query ? `?${query}` : ""}`, {
		headers: headers ?? {},
	});
}

export async function fetchServiceSales(
	period: PeriodBounds,
	headers?: Record<string, string>,
): Promise<Response> {
	const params = new URLSearchParams();
	if (period.from) params.set("from", period.from);
	if (period.to) params.set("to", period.to);
	const query = params.toString();
	return fetch(`/api/reports/services${query ? `?${query}` : ""}`, {
		headers: headers ?? {},
	});
}

export async function fetchReceivablesDetail(
	headers?: Record<string, string>,
): Promise<Response> {
	return fetch("/api/reports/receivables", {
		headers: headers ?? {},
	});
}

export async function fetchScheduleLoad(
	period: PeriodBounds,
	headers?: Record<string, string>,
): Promise<Response> {
	const params = new URLSearchParams();
	if (period.from) params.set("from", period.from);
	if (period.to) params.set("to", period.to);
	const query = params.toString();
	return fetch(`/api/reports/schedule-load${query ? `?${query}` : ""}`, {
		headers: headers ?? {},
	});
}
