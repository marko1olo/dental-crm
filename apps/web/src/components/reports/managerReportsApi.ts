import { operatorReadableErrorDetail } from "../../AppHelpers";
import { logger } from "../../utils/logger";
import type {
	CalendarPeriod,
	ReceivablesDetail,
	ReportSlice,
	ReportsSummary,
	ScheduleLoadReport,
	ServiceSalesReport,
} from "./ManagerReportsTypes";

async function readJson<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch((err: unknown) => {
		logger.error(err);
		return null;
	})) as unknown;
	if (!response.ok) {
		const message =
			payload &&
			typeof payload === "object" &&
			"message" in payload &&
			typeof payload.message === "string"
				? payload.message
				: `Сервер ответил ${response.status}`;
		throw new Error(message);
	}
	return payload as T;
}

export async function fetchReportsSummary(
	period: CalendarPeriod & { readonly granularity: "day" | "week" | "month" },
	headers: Record<string, string>,
): Promise<ReportsSummary> {
	const query = new URLSearchParams({
		from: period.from,
		to: period.to,
		granularity: period.granularity,
	});
	const response = await fetch(`/api/reports/summary?${query.toString()}`, {
		headers,
	});
	return readJson<ReportsSummary>(response);
}

export async function fetchServiceSales(
	period: CalendarPeriod,
	headers: Record<string, string>,
): Promise<ServiceSalesReport> {
	const query = new URLSearchParams({ from: period.from, to: period.to });
	const response = await fetch(`/api/reports/services?${query.toString()}`, {
		headers,
	});
	return readJson<ServiceSalesReport>(response);
}

export async function fetchReceivablesDetail(
	headers: Record<string, string>,
): Promise<ReceivablesDetail> {
	const response = await fetch("/api/reports/receivables", { headers });
	return readJson<ReceivablesDetail>(response);
}

export async function fetchScheduleLoad(
	period: CalendarPeriod,
	headers: Record<string, string>,
): Promise<ScheduleLoadReport> {
	const query = new URLSearchParams({ from: period.from, to: period.to });
	const response = await fetch(
		`/api/reports/schedule-load?${query.toString()}`,
		{ headers },
	);
	return readJson<ScheduleLoadReport>(response);
}

export function sliceOf<T>(result: PromiseSettledResult<T>): ReportSlice<T> {
	if (result.status === "fulfilled") return { data: result.value, error: null };
	return {
		data: null,
		error:
			result.reason instanceof Error
				? result.reason.message
				: String(result.reason),
	};
}

export function sliceRefusalText(subject: string, detail: string | null): string {
	const readable = operatorReadableErrorDetail(detail);
	const cause = readable ? readable.replace(/\s*[.;]\s*$/, "") : "сервер отказал без объяснения";
	return `${subject} не построен: ${cause}. Нажмите «Обновить». Если отказ повторяется — войдите в рабочий кабинет клиники заново, этот раздел закрыт входом.`;
}
