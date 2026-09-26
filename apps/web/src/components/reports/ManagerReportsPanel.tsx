/**
 * Отчёты руководителю: выручка, врачи, кресла, потери, дебиторка.
 *
 * Архитектура:
 * Четыре параллельных запроса к /api/reports/* с защитой от единой точки отказа (Promise.allSettled).
 * Календарные даты передаются в формате YYYY-MM-DD (сервер сам определяет таймзону клиники).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { money, operatorReadableErrorDetail } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { type ClinicMode, hasCapability } from "../../lib/clinicCapabilities";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import { DoctorPayoutDashboard } from "../../pages/DoctorPayoutDashboard.js";
import { logger } from "../../utils/logger";
import {
	monthBounds,
	formatHours,
	weekdayNames,
} from "./managerReportsHelpers";
import { ManagerReportsKpisSection } from "./ManagerReportsKpisSection";
import { ManagerReportsPrepaymentsSection } from "./ManagerReportsPrepaymentsSection";
import { ManagerReportsQualitySection } from "./ManagerReportsQualitySection";
import { ManagerReportsStaffAndChairsSection } from "./ManagerReportsStaffAndChairsSection";
import type {
	CalendarPeriod,
	ChairRow,
	DoctorRow,
	ManagerReportsPanelProps,
	ReceivablesDetail,
	ReminderGroup,
	ReportSectionTab,
	ReportSlice,
	ReportsSummary,
	RevenuePoint,
	ScheduleLoadReport,
	ServiceSalesReport,
} from "./ManagerReportsTypes";
import {
	generateManagerReportsCsv,
	safePercentWidth,
	triggerCsvDownload,
} from "./reportsCsvExport";

export type {
	ReportSectionTab,
	RevenuePoint,
	DoctorRow,
	ChairRow,
	ReportsSummary,
	ReminderGroup,
	CalendarPeriod,
	ServiceSalesReport,
	ReceivablesDetail,
	ScheduleLoadReport,
	ReportSlice,
	ManagerReportsPanelProps,
};

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

const RECEIVABLES_BUCKET_LABELS: Record<string, string> = {
	current: "До 7 дней",
	up_to_30: "До 30 дней",
	up_to_90: "До 90 дней",
	over_90: "Более 90 дней",
	undated: "Без даты",
};

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

const pendingSlice = { data: null, error: null };

function sliceOf<T>(result: PromiseSettledResult<T>): ReportSlice<T> {
	if (result.status === "fulfilled") return { data: result.value, error: null };
	return {
		data: null,
		error:
			result.reason instanceof Error
				? result.reason.message
				: String(result.reason),
	};
}

export function sliceRefusalText(
	subject: string,
	detail: string | null,
): string {
	const readable = operatorReadableErrorDetail(detail);
	const cause = readable
		? readable.replace(/\s*[.;]\s*$/, "")
		: "сервер отказал без объяснения";
	return (
		`${subject} не построен: ${cause}. Нажмите «Обновить». ` +
		"Если отказ повторяется — войдите в рабочий кабинет клиники заново, этот раздел закрыт входом."
	);
}

export function ManagerReportsPanel({
	clinicMode = null,
}: ManagerReportsPanelProps = {}) {
	const appLogic = useAppLogicContext();
	const authRef = useRef(appLogic?.auth);
	authRef.current = appLogic?.auth;
	const showDoctorBreakdown = hasCapability(clinicMode, "doctorBreakdown");
	const showChairUtilisation = hasCapability(clinicMode, "chairUtilisation");
	const initial = useMemo(() => monthBounds(), []);
	const [from, setFrom] = useState(initial.from);
	const [to, setTo] = useState(initial.to);
	const [granularity, setGranularity] = useState<"day" | "week" | "month">(
		"day",
	);
	const [summary, setSummary] = useState<ReportsSummary | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [services, setServices] =
		useState<ReportSlice<ServiceSalesReport>>(pendingSlice);
	const [debtors, setDebtors] =
		useState<ReportSlice<ReceivablesDetail>>(pendingSlice);
	const [scheduleLoad, setScheduleLoad] =
		useState<ReportSlice<ScheduleLoadReport>>(pendingSlice);
	const [activeSection, setActiveSection] = useState<ReportSectionTab>("all");

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const auth = authRef.current;
			const readHeaders =
				auth && typeof auth.denteClinicalReadHeaders === "function"
					? auth.denteClinicalReadHeaders()
					: {};

			const [summaryResult, servicesResult, debtorsResult, scheduleResult] =
				await Promise.allSettled([
					fetchReportsSummary({ from, to, granularity }, readHeaders),
					fetchServiceSales({ from, to }, readHeaders),
					fetchReceivablesDetail(readHeaders),
					fetchScheduleLoad({ from, to }, readHeaders),
				]);

			if (summaryResult.status === "fulfilled") {
				setSummary(summaryResult.value);
				setError(null);
			} else {
				const reason = summaryResult.reason;
				const message =
					reason instanceof Error
						? reason.message
						: typeof reason === "string" && reason.trim().length > 0
							? reason
							: "сервер отказал в выдаче сводного отчёта";
				setError(message);
				setSummary(null);
			}
			setServices(sliceOf(servicesResult));
			setDebtors(sliceOf(debtorsResult));
			setScheduleLoad(sliceOf(scheduleResult));
		} catch (loadError) {
			const message =
				loadError instanceof Error
					? loadError.message
					: typeof loadError === "string" && loadError.trim().length > 0
						? loadError
						: "сервер отказал без объяснения";
			setError(message);
			setSummary(null);
			setServices(pendingSlice);
			setDebtors(pendingSlice);
			setScheduleLoad(pendingSlice);
		} finally {
			setLoading(false);
		}
	}, [from, to, granularity]);

	useEffect(() => {
		void load();
	}, [load]);

	const maxRevenue = useMemo(
		() =>
			summary?.revenue?.points?.reduce(
				(max, point) => Math.max(max, point.revenueRub),
				0,
			) ?? 0,
		[summary],
	);

	const scheduleMargins = useMemo(() => {
		const cells = scheduleLoad.data?.cells ?? [];
		const weekdayMinutes = new Map<number, number>();
		const hourMinutes = new Map<number, number>();
		for (const cell of cells) {
			weekdayMinutes.set(
				cell.weekday,
				(weekdayMinutes.get(cell.weekday) ?? 0) + cell.bookedMinutes,
			);
			hourMinutes.set(
				cell.hour,
				(hourMinutes.get(cell.hour) ?? 0) + cell.bookedMinutes,
			);
		}
		const byWeekday = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
			key: weekday,
			minutes: weekdayMinutes.get(weekday) ?? 0,
		}));
		const busyHours = [...hourMinutes.keys()].sort(
			(left, right) => left - right,
		);
		const byHour: { key: number; minutes: number }[] = [];
		const firstHour = busyHours[0];
		const lastHour = busyHours[busyHours.length - 1];
		if (firstHour !== undefined && lastHour !== undefined) {
			for (let hour = firstHour; hour <= lastHour; hour += 1) {
				byHour.push({ key: hour, minutes: hourMinutes.get(hour) ?? 0 });
			}
		}
		return {
			byWeekday,
			byHour,
			peakWeekdayMinutes: (byWeekday ?? []).reduce(
				(peak, row) => Math.max(peak, row?.minutes ?? 0),
				0,
			),
			peakHourMinutes: (byHour ?? []).reduce(
				(peak, row) => Math.max(peak, row?.minutes ?? 0),
				0,
			),
		};
	}, [scheduleLoad.data]);

	const handleExportCsv = useCallback(() => {
		const csv = generateManagerReportsCsv({
			period: { from, to },
			summary,
			services: services.data,
			receivables: debtors.data,
			scheduleLoad: scheduleLoad.data,
		});
		triggerCsvDownload(csv, `dente_report_${from}_${to}.csv`);
	}, [from, to, summary, services.data, debtors.data, scheduleLoad.data]);

	return (
		<section className="panel ops-panel" data-testid="manager-reports-panel">
			<div className="panel-heading">
				<h2>Отчёты руководителю</h2>
			</div>

			<div className="ops-toolbar">
				<span className="ops-field">
					<label htmlFor="report-from">Период с</label>
					<input
						id="report-from"
						type="date"
						value={from}
						onChange={(event) => setFrom(event.target.value)}
					/>
				</span>
				<span className="ops-field">
					<label htmlFor="report-to">по</label>
					<input
						id="report-to"
						type="date"
						value={to}
						onChange={(event) => setTo(event.target.value)}
					/>
				</span>
				<span className="ops-field">
					<label htmlFor="report-granularity">Детализация</label>
					<select
						id="report-granularity"
						value={granularity}
						onChange={(event) =>
							setGranularity(event.target.value as "day" | "week" | "month")
						}
					>
						<option value="day">по дням</option>
						<option value="week">по неделям</option>
						<option value="month">по месяцам</option>
					</select>
				</span>
				<button
					className="secondary-button"
					type="button"
					onClick={() => void load()}
					disabled={loading}
				>
					{loading ? "Считаю…" : "Обновить"}
				</button>
				<button
					className="secondary-button"
					type="button"
					onClick={handleExportCsv}
					title="Экспорт всех отчётов за выбранный период в файл CSV (RFC 4180 с UTF-8 BOM для Excel)"
					data-testid="reports-export-csv-btn"
				>
					Экспорт в CSV
				</button>
			</div>

			<div className="ops-section-tabs mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Разделы отчёта">
				{[
					{ id: "all", label: "Все разделы" },
					{ id: "revenue", label: "Выручка" },
					{ id: "doctors", label: "Врачи" },
					{ id: "chairs", label: "Кресла" },
					{ id: "services", label: "Услуги" },
					{ id: "schedule", label: "Загрузка" },
					{ id: "receivables", label: "Должники" },
				].map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={activeSection === tab.id}
						className={`secondary-button ${activeSection === tab.id ? "ops-tab-active font-bold" : ""}`}
						onClick={() => setActiveSection(tab.id as ReportSectionTab)}
						data-testid={`reports-tab-${tab.id}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{error ? (
				<div className="ops-notice ops-notice--error flex items-center justify-between gap-3" role="alert">
					<span>Отчёт не построен: {error}</span>
					<button
						type="button"
						className="secondary-button"
						onClick={() => void load()}
						disabled={loading}
					>
						Повторить
					</button>
				</div>
			) : null}

			{loading && summary === null ? (
				<div className="ops-skeleton" aria-hidden="true">
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
					<span className="ops-skeleton__line" />
				</div>
			) : null}

			{summary ? (
				summary?.isEmpty ? (
					<p className="ops-empty">
						За выбранный период данных нет: ни платежей, ни приёмов. Это не
						нулевые показатели, а отсутствие записей.
					</p>
				) : (
					<>
						{(activeSection === "all" || activeSection === "revenue") && (
							<ManagerReportsKpisSection summary={summary} maxRevenue={maxRevenue} />
						)}

						{(activeSection === "all" || activeSection === "doctors" || activeSection === "chairs") && (
							<ManagerReportsStaffAndChairsSection
								summary={summary}
								showDoctorBreakdown={showDoctorBreakdown && (activeSection === "all" || activeSection === "doctors")}
								showChairUtilisation={showChairUtilisation && (activeSection === "all" || activeSection === "chairs")}
							/>
						)}

						{(activeSection === "all" || activeSection === "revenue") && (
							<ManagerReportsQualitySection summary={summary} />
						)}

						{(activeSection === "all" || activeSection === "revenue") && (summary?.patientFlow?.points?.length ?? 0) > 0 ? (
							<>
								<h3 className="ops-section-title">
									Первичные и повторные пациенты
								</h3>
								<div className="ops-table-wrap">
									<table className="ops-table">
										<thead>
											<tr>
												<th scope="col">Месяц</th>
												<th scope="col">Первичные</th>
												<th scope="col">Повторные</th>
											</tr>
										</thead>
										<tbody>
											{(summary?.patientFlow?.points ?? []).map((point, idx) => (
												<tr key={point?.bucket ?? `flow-pt-${idx}`}>
													<td className="ops-strong" data-label="Месяц">
														{point?.bucket ?? "—"}
													</td>
													<td className="ops-num" data-label="Первичные">
														{point?.newPatients ?? 0}
													</td>
													<td className="ops-num" data-label="Повторные">
														{point?.returningPatients ?? 0}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								<p className="ops-hint">
									Первичный — тот, у кого это первый завершённый приём за всю
									историю клиники, а не первый в выбранном периоде. Пациент,
									пришедший в одном месяце и первично, и повторно, посчитан
									первичным один раз. Считаются пациенты, дошедшие до кресла, а
									не все записи периода — поэтому эти числа меньше числа приёмов
									выше.
								</p>
							</>
						) : null}

						{(activeSection === "all" || activeSection === "receivables") && (
							<ManagerReportsPrepaymentsSection summary={summary} />
						)}

						<p className="ops-hint">
							Период:{" "}
							{summary?.period?.from
								? new Date(summary.period.from).toLocaleDateString("ru-RU")
								: "—"}{" "}
							—{" "}
							{summary?.period?.to
								? new Date(summary.period.to).toLocaleDateString("ru-RU")
								: "—"}
							. В выручку входят только полученные платежи; назначенные и
							возвращённые не учитываются.
						</p>
					</>
				)
			) : null}

			{(activeSection === "all" || activeSection === "services") && (services.error !== null || services.data !== null) ? (
				<>
					<h3 className="ops-section-title">Что продаётся</h3>
					{services.error !== null ? (
						<p className="ops-notice ops-notice--error" role="alert">
							{sliceRefusalText("Разрез по услугам", services.error)}
						</p>
					) : services.data === null || services.data.isEmpty ? (
						<p className="ops-empty">
							За выбранный период не назначено ни одной позиции лечения. Это не
							нулевая выручка, а отсутствие записей: услуги попадают в отчёт из
							карты приёма.
						</p>
					) : (
						<>
							<div className="ops-table-wrap">
								<table className="ops-table">
									<thead>
										<tr>
											<th scope="col">Услуга</th>
											<th scope="col">Количество</th>
											<th scope="col">Назначено</th>
											<th scope="col">Средняя цена</th>
											<th scope="col">Скидка</th>
										</tr>
									</thead>
									<tbody>
										{(services.data.rows ?? []).map((row, idx) => (
											<tr key={row?.title ?? `srv-row-${idx}`}>
												<td className="ops-strong" data-label="Услуга">
													{row?.title ?? "—"}
												</td>
												<td className="ops-num" data-label="Количество">
													{row.quantity}
												</td>
												<td className="ops-num" data-label="Назначено">
													{money(row.plannedRub)}
												</td>
												<td className="ops-num" data-label="Средняя цена">
													{money(row.averagePriceRub)}
												</td>
												<td className="ops-num" data-label="Скидка">
													{row.discountRub > 0 ? money(row.discountRub) : "—"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<p className="ops-hint">
								Назначено всего {money(services?.data?.plannedTotalRub ?? 0)},
								из них отдано скидками{" "}
								{money(services?.data?.discountTotalRub ?? 0)}.{" "}
								{services?.data?.note}
							</p>
						</>
					)}
				</>
			) : null}

			{(activeSection === "all" || activeSection === "schedule") && (scheduleLoad.error !== null || scheduleLoad.data !== null) ? (
				<>
					<h3 className="ops-section-title">Когда клиника занята</h3>
					{scheduleLoad.error !== null ? (
						<p className="ops-notice ops-notice--error" role="alert">
							{sliceRefusalText(
								"Разрез загрузки по дням и часам",
								scheduleLoad.error,
							)}
						</p>
					) : scheduleLoad.data === null || scheduleLoad.data.isEmpty ? (
						<p className="ops-empty">
							Приёмов за выбранный период не было — распределять по дням и часам
							нечего.
						</p>
					) : (
						<>
							<ul className="ops-bars">
								{(scheduleMargins?.byWeekday ?? []).map((row) => (
									<li className="ops-bar" key={`weekday-${row?.key}`}>
										<span className="ops-bar__label">
											{weekdayNames[row?.key] ?? row?.key}
										</span>
										<span className="ops-bar__track">
											<span
												className="ops-bar__fill"
												style={{
													width: `${safePercentWidth(row?.minutes, scheduleMargins?.peakWeekdayMinutes, 2)}%`,
												}}
											/>
										</span>
										<span className="ops-bar__value">
											{formatHours(row?.minutes ?? 0)}
										</span>
									</li>
								))}
							</ul>
							<h3 className="ops-section-title">Часы приёма</h3>
							<ul className="ops-bars">
								{(scheduleMargins?.byHour ?? []).map((row) => (
									<li className="ops-bar" key={`hour-${row?.key}`}>
										<span className="ops-bar__label">
											{String(row.key).padStart(2, "0")}:00
										</span>
										<span className="ops-bar__track">
											<span
												className="ops-bar__fill"
												style={{
													width: `${safePercentWidth(row.minutes, scheduleMargins?.peakHourMinutes, 2)}%`,
												}}
											/>
										</span>
										<span className="ops-bar__value">
											{formatHours(row.minutes)}
										</span>
									</li>
								))}
							</ul>
							<p className="ops-hint">
								{scheduleLoad.data.busiestWeekday !== null &&
								scheduleLoad.data.busiestHour !== null
									? `Самый занятый день — ${weekdayNames[scheduleLoad.data.busiestWeekday] ?? scheduleLoad.data.busiestWeekday}, самый занятый час — ${String(scheduleLoad.data.busiestHour).padStart(2, "0")}:00. `
									: ""}
								День недели и час берутся в часовом поясе клиники, а не
								браузера. Отменённые приёмы в занятые минуты не входят; неявка
								кресло занимала и учтена.
							</p>
						</>
					)}
				</>
			) : null}

			{(activeSection === "all" || activeSection === "receivables") && (debtors.error !== null || debtors.data !== null) ? (
				<>
					<h3 className="ops-section-title">Кто именно не доплатил</h3>
					{debtors.error !== null ? (
						<p className="ops-notice ops-notice--error" role="alert">
							{sliceRefusalText("Список должников", debtors.error)}
						</p>
					) : debtors?.data === null ||
						(debtors?.data?.rows ?? []).length === 0 ? (
						<p className="ops-empty ops-empty--good">
							Должников нет: ни у одного пациента нет неоплаченного лечения.
						</p>
					) : (
						<>
							<div className="ops-table-wrap">
								<table className="ops-table">
									<caption className="sr-only">
										Пациенты с неоплаченным лечением, от крупного долга к
										мелкому
									</caption>
									<thead>
										<tr>
											<th scope="col">Пациент</th>
											<th scope="col">Долг</th>
											<th scope="col">Срок</th>
											<th scope="col">Первая позиция</th>
										</tr>
									</thead>
									<tbody>
										{(debtors?.data?.rows ?? []).map((row, idx) => (
											<tr key={row?.patientId ?? `debtor-row-${idx}`}>
												<td className="ops-strong" data-label="Пациент">
													{row?.patientName ?? "—"}
												</td>
												<td className="ops-num" data-label="Долг">
													{money(row.debtRub)}
												</td>
												<td data-label="Срок">
													{RECEIVABLES_BUCKET_LABELS[row.bucket] ?? row.bucket}
												</td>
												<td className="ops-num" data-label="Первая позиция">
													{row.oldestChargeAt === null
														? "дата не определена"
														: new Date(row.oldestChargeAt).toLocaleDateString(
																"ru-RU",
															)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<p className="ops-hint">
								Итого {money(debtors?.data?.totalDebtRub ?? 0)} у{" "}
								{(debtors?.data?.rows ?? []).length} пациент(ов).{" "}
								{debtors?.data?.note}
							</p>
						</>
					)}
				</>
			) : null}

			{showDoctorBreakdown && (activeSection === "all" || activeSection === "doctors") ? (
				<DoctorPayoutDashboard />
			) : null}
			<div className="h-32 w-full shrink-0 pointer-events-none" aria-hidden="true" />
		</section>
	);
}

export default ManagerReportsPanel;

export { weekdayNames };
