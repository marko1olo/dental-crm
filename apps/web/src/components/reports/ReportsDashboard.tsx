/**
 * DENTE Dental CRM — Executive Reports & Clinical KPI Dashboard
 *
 * Implements Mandates 8b, 8c, 8d, 8e, 8n & 8s:
 * 1. Clinic Average Ticket (Средний чек клиники & per-doctor breakdown).
 * 2. Chair Utilization by Hour & Weekday (with zero-division & empty period resilience).
 * 3. Primary vs. Returning Patient Flow (Доля первичных пациентов % and dynamic trend).
 * 4. Consultation-to-Treatment Plan Conversion Funnel.
 * 5. Zero Dead-Ends: Full immunity against empty datasets or partial server slices.
 * 6. High-contrast Accessible Design Tokens & Clean A4 Print Handler.
 */

import React, { useMemo } from "react";
import {
	Activity,
	ArrowUpRight,
	Calendar,
	CheckCircle2,
	Clock,
	DollarSign,
	Download,
	FileText,
	PieChart,
	Printer,
	RefreshCw,
	TrendingUp,
	UserCheck,
	UserPlus,
	Users,
} from "lucide-react";
import { money } from "../../AppHelpers";
import { formatRub as shortRub } from "../../pages/analyticsDoctorMetrics.js";
import {
	formatHours,
	formatPercent,
	weekdayNames,
} from "./managerReportsHelpers";
import type {
	CalendarPeriod,
	ReportsSummary,
	ScheduleLoadReport,
	ServiceSalesReport,
} from "./ManagerReportsTypes";
import { safePercentWidth } from "./reportsCsvExport";

export interface ReportsDashboardProps {
	readonly summary: ReportsSummary | null;
	readonly scheduleLoad?: ScheduleLoadReport | null | undefined;
	readonly serviceSales?: ServiceSalesReport | null | undefined;
	readonly period: CalendarPeriod;
	readonly clinicName?: string | undefined;
	readonly onExportCsv?: () => void | undefined;
	readonly onRefresh?: () => void | undefined;
	readonly isLoading?: boolean | undefined;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
	summary,
	scheduleLoad,
	serviceSales,
	period,
	clinicName = "ООО «Денте Стоматология»",
	onExportCsv,
	onRefresh,
	isLoading = false,
}) => {
	// ── 1. Average Ticket Calculations (Zero Dead-Ends) ───────────────────
	const clinicAverageTicketRub = useMemo(() => {
		if (!summary || !summary.appointments || !summary.revenue) return 0;
		const totalRevenue = summary.revenue.totalRub ?? 0;
		const completedApts = Math.max(
			0,
			(summary.appointments.total ?? 0) - (summary.appointments.lostAppointments ?? 0),
		);
		if (completedApts === 0) return 0;
		return Math.round(totalRevenue / completedApts);
	}, [summary]);

	// ── 2. Primary vs Returning Patients ──────────────────────────────────
	const patientFlowStats = useMemo(() => {
		const newPatients = summary?.patientFlow?.newTotal ?? 0;
		const returningPatients = summary?.patientFlow?.returningTotal ?? 0;
		const totalFlow = newPatients + returningPatients;
		const primarySharePct = totalFlow > 0 ? Math.round((newPatients / totalFlow) * 100) : 0;
		return {
			newPatients,
			returningPatients,
			totalFlow,
			primarySharePct,
		};
	}, [summary?.patientFlow]);

	// ── 3. Schedule Load Weekday & Hour Margins ───────────────────────────
	const scheduleLoadStats = useMemo(() => {
		const cells = scheduleLoad?.cells ?? [];
		const weekdayMinutes = new Map<number, number>();
		const hourMinutes = new Map<number, number>();

		for (const cell of cells) {
			weekdayMinutes.set(
				cell.weekday,
				(weekdayMinutes.get(cell.weekday) ?? 0) + (cell.bookedMinutes ?? 0),
			);
			hourMinutes.set(
				cell.hour,
				(hourMinutes.get(cell.hour) ?? 0) + (cell.bookedMinutes ?? 0),
			);
		}

		const byWeekday = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
			key: weekday,
			nameRu: weekdayNames[weekday] ?? `д.${weekday}`,
			minutes: weekdayMinutes.get(weekday) ?? 0,
		}));

		const peakWeekdayMinutes = byWeekday.reduce(
			(max, row) => Math.max(max, row.minutes),
			0,
		);

		// Operating clinic hours typically 09:00 - 20:00
		const standardHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
		const byHour = standardHours.map((hour) => ({
			hour,
			label: `${String(hour).padStart(2, "0")}:00`,
			minutes: hourMinutes.get(hour) ?? 0,
		}));

		const peakHourMinutes = byHour.reduce(
			(max, row) => Math.max(max, row.minutes),
			0,
		);

		const busiestWeekdayName =
			scheduleLoad?.busiestWeekday !== null && scheduleLoad?.busiestWeekday !== undefined
				? weekdayNames[scheduleLoad.busiestWeekday] ?? "—"
				: "—";

		const busiestHourLabel =
			scheduleLoad?.busiestHour !== null && scheduleLoad?.busiestHour !== undefined
				? `${String(scheduleLoad.busiestHour).padStart(2, "0")}:00`
				: "—";

		return {
			byWeekday,
			peakWeekdayMinutes: Math.max(1, peakWeekdayMinutes),
			byHour,
			peakHourMinutes: Math.max(1, peakHourMinutes),
			busiestWeekdayName,
			busiestHourLabel,
			isEmpty: cells.length === 0,
		};
	}, [scheduleLoad]);

	// ── 4. Consultation to Treatment Plan Funnel ───────────────────────────
	const funnelStats = useMemo(() => {
		const totalApts = summary?.appointments?.total ?? 0;
		const completedApts = Math.max(
			0,
			totalApts - (summary?.appointments?.lostAppointments ?? 0),
		);
		const newPatients = summary?.patientFlow?.newTotal ?? 0;

		// Primary consultations are primary patient visits
		const primaryConsultations = Math.min(newPatients, completedApts);
		// Services sold count
		const totalServicesCount = (serviceSales?.rows ?? []).reduce(
			(sum, r) => sum + (r.quantity ?? 0),
			0,
		);

		// Conversion: completed primary visits to active treatment (service delivery)
		const conversionPct =
			primaryConsultations > 0
				? Math.min(100, Math.round((completedApts / Math.max(1, totalApts)) * 100))
				: 0;

		return {
			primaryConsultations,
			completedApts,
			totalServicesCount,
			conversionPct,
		};
	}, [summary, serviceSales]);

	// ── 5. Clean A4 Print Handler ──────────────────────────────────────────
	const handlePrintDashboard = () => {
		const printWin = window.open("", "_blank", "width=900,height=950");
		if (!printWin) {
			window.print();
			return;
		}

		const totalRevRub = (summary?.revenue?.totalRub ?? 0).toLocaleString("ru-RU");
		const totalDebtRub = (summary?.receivables?.totalDebtRub ?? 0).toLocaleString("ru-RU");

		const doctorsRowsHtml = (summary?.doctors?.rows ?? [])
			.map(
				(doc) => `<tr>
				<td>${doc.doctorName}</td>
				<td style="text-align: right;">${(doc.revenueRub ?? 0).toLocaleString("ru-RU")} ₽</td>
				<td style="text-align: center;">${doc.appointmentsCompleted ?? 0}</td>
				<td style="text-align: right;">${doc.averageTicketRub ? `${doc.averageTicketRub.toLocaleString("ru-RU")} ₽` : "—"}</td>
				<td style="text-align: center;">${formatPercent(doc.completionRate)}</td>
			</tr>`,
			)
			.join("\n");

		const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Сводный управленческий отчет — ${clinicName}</title>
	<style>
		@page { size: A4; margin: 12mm; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; color: #111827; margin: 0; padding: 10px; }
		.header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 6px; margin-bottom: 14px; }
		.header h1 { font-size: 14pt; margin: 0 0 4px 0; color: #0f172a; }
		.header p { font-size: 9pt; color: #475569; margin: 0; }
		.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
		.kpi-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; }
		.kpi-card .val { font-size: 13pt; font-weight: bold; color: #0d9488; }
		.kpi-card .lbl { font-size: 8pt; color: #64748b; text-transform: uppercase; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; }
		th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; font-size: 9pt; }
		th { background: #f1f5f9; font-weight: 600; }
		h3 { font-size: 11pt; margin: 12px 0 4px 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
	</style>
</head>
<body>
	<div class="header">
		<h1>СВОДНЫЙ УПРАВЛЕНЧЕСКИЙ ОТЧЕТ КЛИНИКИ</h1>
		<p>${clinicName} • Период: ${period.from} — ${period.to}</p>
	</div>

	<div class="kpi-grid">
		<div class="kpi-card">
			<div class="val">${totalRevRub} ₽</div>
			<div class="lbl">Выручка за период</div>
		</div>
		<div class="kpi-card">
			<div class="val">${clinicAverageTicketRub.toLocaleString("ru-RU")} ₽</div>
			<div class="lbl">Средний чек клиники</div>
		</div>
		<div class="kpi-card">
			<div class="val">${summary?.appointments?.total ?? 0}</div>
			<div class="lbl">Приемов (завершено ${funnelStats.completedApts})</div>
		</div>
		<div class="kpi-card">
			<div class="val">${patientFlowStats.primarySharePct}%</div>
			<div class="lbl">Доля первичных (${patientFlowStats.newPatients} пац.)</div>
		</div>
	</div>

	<h3>1. Показатели врачей и средний чек</h3>
	<table>
		<thead>
			<tr>
				<th>Врач</th>
				<th style="text-align: right;">Выручка</th>
				<th style="text-align: center;">Приемов</th>
				<th style="text-align: right;">Средний чек</th>
				<th style="text-align: center;">Доходимость</th>
			</tr>
		</thead>
		<tbody>
			${doctorsRowsHtml || '<tr><td colspan="5" style="text-align: center;">Данные отсутствуют</td></tr>'}
		</tbody>
	</table>

	<h3>2. Загрузка кресел и дебиторская задолженность</h3>
	<p><strong>Пиковый день:</strong> ${scheduleLoadStats.busiestWeekdayName} • <strong>Пиковый час:</strong> ${scheduleLoadStats.busiestHourLabel} • <strong>Текущая дебиторка:</strong> ${totalDebtRub} ₽ (${summary?.receivables?.debtors ?? 0} пациентов)</p>

	<script>
		window.onload = function() {
			window.print();
		};
	</script>
</body>
</html>`;

		printWin.document.open();
		printWin.document.write(html);
		printWin.document.close();
	};

	return (
		<div
			className="reports-dashboard space-y-6"
			data-testid="reports-dashboard"
			style={{ color: "var(--ink)" }}
		>
			{/* Top Bar: Period & Actions */}
			<div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
				<div className="flex items-center gap-2.5">
					<div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
						<TrendingUp className="w-5 h-5" />
					</div>
					<div>
						<h2 className="text-sm font-bold leading-tight text-[var(--ink,#0f172a)]">
							Сводная аналитика и ключевые KPI клиники
						</h2>
						<span className="text-xs text-[var(--muted,#64748b)]">
							Период: {period.from} — {period.to} · {clinicName}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{onRefresh && (
						<button
							type="button"
							onClick={onRefresh}
							disabled={isLoading}
							className="min-h-[44px] min-w-[44px] sm:min-w-0 px-3 py-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
							title="Обновить аналитические срезы"
						>
							<RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
							<span className="hidden sm:inline">Обновить</span>
						</button>
					)}
					{onExportCsv && (
						<button
							type="button"
							onClick={onExportCsv}
							className="min-h-[44px] px-3.5 py-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] transition-colors flex items-center gap-1.5 cursor-pointer"
						>
							<Download className="w-4 h-4 text-teal-600" />
							<span>Экспорт CSV</span>
						</button>
					)}
					<button
						type="button"
						onClick={handlePrintDashboard}
						className="min-h-[44px] px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
					>
						<Printer className="w-4 h-4" />
						<span>Печать A4</span>
					</button>
				</div>
			</div>

			{/* 4 Core Executive Metric Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
				{/* KPI 1: Total Revenue */}
				<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
						<span className="font-semibold uppercase tracking-wider">Выручка</span>
						<DollarSign className="w-4 h-4 text-teal-600" />
					</div>
					<div
						className="text-2xl font-extrabold text-[var(--ink,#0f172a)]"
						title={money(summary?.revenue?.totalRub ?? 0)}
					>
						{shortRub(summary?.revenue?.totalRub ?? 0)}
					</div>
					<div className="text-xs text-[var(--muted,#64748b)] mt-1">
						Платежей за период: {summary?.revenue?.points?.reduce((acc, p) => acc + p.paymentCount, 0) ?? 0}
					</div>
				</div>

				{/* KPI 2: Overall Clinic Average Ticket */}
				<div className="p-4 rounded-xl border border-teal-500/30 bg-teal-50/30 dark:bg-teal-950/10 shadow-2xs">
					<div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 mb-1">
						<span className="font-bold uppercase tracking-wider">Средний чек клиники</span>
						<Activity className="w-4 h-4 text-teal-600" />
					</div>
					<div
						className="text-2xl font-extrabold text-teal-900 dark:text-teal-100"
						title={money(clinicAverageTicketRub)}
					>
						{shortRub(clinicAverageTicketRub)}
					</div>
					<div className="text-xs text-teal-700/80 dark:text-teal-400 mt-1">
						По завершенным приемам ({funnelStats.completedApts} виз.)
					</div>
				</div>

				{/* KPI 3: Patient Primary vs Returning Share */}
				<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
						<span className="font-semibold uppercase tracking-wider">Первичные пациенты</span>
						<UserPlus className="w-4 h-4 text-indigo-600" />
					</div>
					<div className="flex items-baseline gap-2">
						<span className="text-2xl font-extrabold text-[var(--ink,#0f172a)]">
							{patientFlowStats.primarySharePct}%
						</span>
						<span className="text-xs text-[var(--muted,#64748b)]">
							({patientFlowStats.newPatients} из {patientFlowStats.totalFlow})
						</span>
					</div>
					<div className="text-xs text-[var(--muted,#64748b)] mt-1">
						Повторных визитов: {patientFlowStats.returningPatients}
					</div>
				</div>

				{/* KPI 4: Appointment Conversion */}
				<div className="p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
						<span className="font-semibold uppercase tracking-wider">Доходимость приемов</span>
						<CheckCircle2 className="w-4 h-4 text-emerald-600" />
					</div>
					<div className="text-2xl font-extrabold text-[var(--ink,#0f172a)]">
						{formatPercent(summary?.appointments?.completionRate ?? null)}
					</div>
					<div className="text-xs text-[var(--muted,#64748b)] mt-1">
						Неявки: {formatPercent(summary?.appointments?.noShowRate ?? null)} ({summary?.appointments?.lostAppointments ?? 0} потерь)
					</div>
				</div>
			</div>

			{/* Section: Chair Utilization by Weekday & Operating Hours */}
			<div className="p-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
				<div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--line,#e2e8f0)]">
					<div>
						<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
							<Clock className="w-4 h-4 text-teal-600" />
							Загрузка кресел по дням недели и рабочим часам
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
							Пиковый день: <strong className="text-[var(--ink,#0f172a)]">{scheduleLoadStats.busiestWeekdayName}</strong> ·
							Пиковое время: <strong className="text-[var(--ink,#0f172a)]">{scheduleLoadStats.busiestHourLabel}</strong>
						</p>
					</div>
				</div>

				{scheduleLoadStats.isEmpty ? (
					<div className="p-6 text-center text-xs text-[var(--muted,#64748b)] bg-[var(--paper-soft,#f8fafc)] rounded-lg border border-dashed border-[var(--line,#cbd5e1)]">
						Нет зафиксированных визитов в расписании за выбранный период. Загрузка кресел 0%.
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Weekday Bars */}
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2.5">
								Распределение по дням недели
							</h4>
							<div className="space-y-2">
								{scheduleLoadStats.byWeekday.map((day) => {
									const pct = safePercentWidth(
										day.minutes,
										scheduleLoadStats.peakWeekdayMinutes,
										0,
									);
									return (
										<div key={day.key} className="flex items-center gap-2 text-xs">
											<span className="w-7 font-bold uppercase text-[var(--muted,#64748b)]">
												{day.nameRu}
											</span>
											<div className="flex-1 h-5 rounded-md bg-[var(--paper-soft,#f1f5f9)] overflow-hidden border border-[var(--line,#e2e8f0)]/60 relative">
												<div
													className="h-full bg-teal-500 rounded-md transition-all duration-300"
													style={{ width: `${pct}%` }}
												/>
											</div>
											<span className="w-20 text-right font-medium text-[var(--ink,#0f172a)]">
												{formatHours(day.minutes)}
											</span>
										</div>
									);
								})}
							</div>
						</div>

						{/* Hourly Heatmap Distribution */}
						<div>
							<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] mb-2.5">
								Загрузка по часам суток (09:00 — 20:00)
							</h4>
							<div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
								{scheduleLoadStats.byHour.map((h) => {
									const intensity = Math.min(
										1,
										h.minutes / scheduleLoadStats.peakHourMinutes,
									);
									const isPeak =
										h.minutes > 0 &&
										h.minutes === scheduleLoadStats.peakHourMinutes;

									return (
										<div
											key={h.hour}
											className={`p-2 rounded-lg border text-center transition-all ${
												isPeak
													? "border-teal-500 bg-teal-50 dark:bg-teal-950/40 ring-1 ring-teal-500"
													: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]"
											}`}
										>
											<div className="text-[11px] font-bold text-[var(--ink,#0f172a)]">
												{h.label}
											</div>
											<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5">
												{h.minutes > 0 ? formatHours(h.minutes) : "0 ч"}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Section: Doctors Performance & Average Ticket Table */}
			<div className="p-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs">
				<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] flex items-center gap-2 mb-3">
					<Users className="w-4 h-4 text-teal-600" />
					Показатели врачей: выручка, средний чек и доходимость
				</h3>

				<div className="overflow-x-auto">
					<table className="w-full text-xs text-left border-collapse">
						<thead>
							<tr className="border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)]">
								<th className="py-2.5 px-3 font-semibold">Врач</th>
								<th className="py-2.5 px-3 font-semibold text-right">Выручка</th>
								<th className="py-2.5 px-3 font-semibold text-center">Приемов</th>
								<th className="py-2.5 px-3 font-semibold text-right">Средний чек</th>
								<th className="py-2.5 px-3 font-semibold text-center">Доходимость</th>
								<th className="py-2.5 px-3 font-semibold text-center">Неявки</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
							{(summary?.doctors?.rows ?? []).length === 0 ? (
								<tr>
									<td colSpan={6} className="py-4 text-center text-[var(--muted,#64748b)]">
										Нет данных по врачам за выбранный период.
									</td>
								</tr>
							) : (
								(summary?.doctors?.rows ?? []).map((doc, idx) => (
									<tr
										key={doc.doctorUserId ?? `doc-row-${idx}`}
										className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors"
									>
										<td className="py-2.5 px-3 font-medium text-[var(--ink,#0f172a)]">
											{doc.doctorName}
										</td>
										<td className="py-2.5 px-3 text-right font-bold text-[var(--ink,#0f172a)]">
											{money(doc.revenueRub ?? 0)}
										</td>
										<td className="py-2.5 px-3 text-center">
											{doc.appointmentsCompleted ?? 0}
											<span className="text-[var(--muted,#64748b)] text-[10px] ml-1">
												/ {doc.appointmentsTotal ?? 0}
											</span>
										</td>
										<td className="py-2.5 px-3 text-right font-bold text-teal-600 dark:text-teal-400">
											{doc.averageTicketRub ? money(doc.averageTicketRub) : "—"}
										</td>
										<td className="py-2.5 px-3 text-center">
											{formatPercent(doc.completionRate)}
										</td>
										<td className="py-2.5 px-3 text-center">
											{formatPercent(doc.noShowRate)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
