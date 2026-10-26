import { money } from "../../AppHelpers";
import type { CalendarPeriod, ReportsSummary } from "./ManagerReportsTypes";

export function getQuickPeriod(type: "today" | "yesterday" | "week" | "month"): CalendarPeriod {
	const now = new Date();
	const toIso = (d: Date) => d.toISOString().slice(0, 10);

	if (type === "today") {
		const d = toIso(now);
		return { from: d, to: d };
	}
	if (type === "yesterday") {
		const y = new Date(now.getTime() - 86_400_000);
		const d = toIso(y);
		return { from: d, to: d };
	}
	if (type === "week") {
		const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
		return { from: toIso(start), to: toIso(now) };
	}
	// month
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	return { from: toIso(start), to: toIso(now) };
}

export function formatEveningZReportText(
	summary: ReportsSummary | null,
	period: CalendarPeriod,
	clinicName = "DENTE Clinic",
): string {
	if (!summary) return `Сводка за ${period.from}: данных нет.`;
	const total = money(summary.revenue?.totalRub ?? 0);
	const apts = summary.appointments?.total ?? 0;
	const completed = Math.max(0, apts - (summary.appointments?.lostAppointments ?? 0));
	const debts = money(summary.receivables?.totalDebtRub ?? 0);

	return [
		`📊 Вечерний Z-отчёт: ${clinicName}`,
		`Период: ${period.from} — ${period.to}`,
		`💰 Выручка: ${total}`,
		`🩺 Приёмов: ${completed} из ${apts}`,
		`👥 Новые пациенты: ${summary.patientFlow?.newTotal ?? 0}`,
		`⚠️ Долг пациентов: ${debts}`,
	].join("\n");
}
