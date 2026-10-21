import type {
	CalendarPeriod,
	ReportsSummary,
	ScheduleLoadReport,
} from "../ManagerReportsTypes";
import { formatPercent, weekdayNames } from "../managerReportsHelpers";

export interface PrintDashboardParams {
	readonly clinicName: string;
	readonly period: CalendarPeriod;
	readonly summary: ReportsSummary | null;
	readonly clinicAverageTicketRub: number;
	readonly completedApts: number;
	readonly primarySharePct: number;
	readonly newPatients: number;
	readonly scheduleLoad: ScheduleLoadReport | null | undefined;
}

export function handlePrintDashboard({
	clinicName,
	period,
	summary,
	clinicAverageTicketRub,
	completedApts,
	primarySharePct,
	newPatients,
	scheduleLoad,
}: PrintDashboardParams): void {
	if (typeof window === "undefined") return;
	const printWin = window.open("", "_blank", "width=900,height=950");
	if (!printWin) {
		window.print();
		return;
	}

	const totalRevRub = (summary?.revenue?.totalRub ?? 0).toLocaleString("ru-RU");
	const totalDebtRub = (summary?.receivables?.totalDebtRub ?? 0).toLocaleString(
		"ru-RU",
	);

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

	const busiestDay =
		scheduleLoad?.busiestWeekday !== null &&
		scheduleLoad?.busiestWeekday !== undefined
			? (weekdayNames[scheduleLoad.busiestWeekday] ?? "—")
			: "—";
	const busiestHour =
		scheduleLoad?.busiestHour !== null &&
		scheduleLoad?.busiestHour !== undefined
			? `${String(scheduleLoad.busiestHour).padStart(2, "0")}:00`
			: "—";

	const html = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
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
</style></head><body>
<div class="header"><h1>СВОДНЫЙ УПРАВЛЕНЧЕСКИЙ ОТЧЕТ КЛИНИКИ</h1><p>${clinicName} • Период: ${period.from} — ${period.to}</p></div>
<div class="kpi-grid">
<div class="kpi-card"><div class="val">${totalRevRub} ₽</div><div class="lbl">Выручка за период</div></div>
<div class="kpi-card"><div class="val">${clinicAverageTicketRub.toLocaleString("ru-RU")} ₽</div><div class="lbl">Средний чек клиники</div></div>
<div class="kpi-card"><div class="val">${summary?.appointments?.total ?? 0}</div><div class="lbl">Приемов (завершено ${completedApts})</div></div>
<div class="kpi-card"><div class="val">${primarySharePct}%</div><div class="lbl">Доля первичных (${newPatients} пац.)</div></div>
</div>
<h3>1. Показатели врачей и средний чек</h3>
<table><thead><tr><th>Врач</th><th style="text-align: right;">Выручка</th><th style="text-align: center;">Приемов</th><th style="text-align: right;">Средний чек</th><th style="text-align: center;">Доходимость</th></tr></thead>
<tbody>${doctorsRowsHtml || '<tr><td colspan="5" style="text-align: center;">Данные отсутствуют</td></tr>'}</tbody></table>
<h3>2. Загрузка кресел и дебиторская задолженность</h3>
<p><strong>Пиковый день:</strong> ${busiestDay} • <strong>Пиковый час:</strong> ${busiestHour} • <strong>Текущая дебиторка:</strong> ${totalDebtRub} ₽ (${summary?.receivables?.debtors ?? 0} пациентов)</p>
<script>window.onload = function() { window.print(); };</script>
</body></html>`;

	printWin.document.open();
	printWin.document.write(html);
	printWin.document.close();
}
