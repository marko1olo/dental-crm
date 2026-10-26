import type {
	ReceivablesDetail,
	ReportsSummary,
	ScheduleLoadReport,
	ServiceSalesReport,
} from "./ManagerReportsTypes";

export interface ManagerReportsDataBundle {
	readonly period: { readonly from: string; readonly to: string };
	readonly summary: ReportsSummary | null;
	readonly services: ServiceSalesReport | null;
	readonly receivables: ReceivablesDetail | null;
	readonly scheduleLoad: ScheduleLoadReport | null;
}

export function buildManagerReportsRows(bundle: ManagerReportsDataBundle): unknown[][] {
	const rows: unknown[][] = [];
	rows.push(["ОТЧЁТ РУКОВОДИТЕЛЯ КЛИНИКИ (DENTE CRM)"]);
	rows.push(["Период", `${bundle.period.from} — ${bundle.period.to}`]);
	rows.push(["Дата выгрузки", new Date().toLocaleString("ru-RU")]);
	rows.push([]);

	if (bundle.summary) {
		rows.push(["--- ВЫРУЧКА И ПАЦИЕНТОПОТОК ---"]);
		rows.push(["Итого выручка (руб)", bundle.summary.revenue?.totalRub ?? 0]);
		rows.push([
			"Всего приёмов",
			bundle.summary.appointments?.total ?? 0,
			"Доля завершённых",
			bundle.summary.appointments?.completionRate != null
				? `${Math.round(bundle.summary.appointments.completionRate * 100)}%`
				: "—",
			"Доля неявок",
			bundle.summary.appointments?.noShowRate != null
				? `${Math.round(bundle.summary.appointments.noShowRate * 100)}%`
				: "—",
		]);
		rows.push([]);

		if (bundle.summary.revenue?.points?.length) {
			rows.push(["Период/Дата", "Выручка (руб)", "Оплат", "Платящих пациентов"]);
			for (const p of bundle.summary.revenue.points) {
				rows.push([p.bucket, p.revenueRub, p.paymentCount, p.payingPatients]);
			}
			rows.push([]);
		}

		if (bundle.summary.doctors?.rows?.length) {
			rows.push(["--- ВРАЧИ И ВЫРАБОТКА ---"]);
			rows.push(["Врач", "Выручка (руб)", "Всего приёмов", "Завершено", "Отменено", "Неявки", "Доходимость", "Средний чек"]);
			for (const d of bundle.summary.doctors.rows) {
				rows.push([
					d.doctorName,
					d.revenueRub,
					d.appointmentsTotal,
					d.appointmentsCompleted,
					d.appointmentsCancelled,
					d.appointmentsNoShow,
					d.completionRate != null ? `${Math.round(d.completionRate * 100)}%` : "—",
					d.averageTicketRub != null ? Math.round(d.averageTicketRub) : "—",
				]);
			}
			if (bundle.summary.doctors.unattributedRevenueRub > 0) {
				rows.push(["Без указания врача", bundle.summary.doctors.unattributedRevenueRub]);
			}
			rows.push([]);
		}

		if (bundle.summary.chairs?.rows?.length) {
			rows.push(["--- ЗАГРУЗКА КРЕСЕЛ ---"]);
			rows.push(["Кресло", "Приёмов", "Занято (минут)", "Загрузка %"]);
			for (const c of bundle.summary.chairs.rows) {
				rows.push([
					c.chairName,
					c.appointments,
					c.bookedMinutes,
					c.utilization != null ? `${Math.round(c.utilization * 100)}%` : "—",
				]);
			}
			rows.push([]);
		}
	}

	if (bundle.services?.rows?.length) {
		rows.push(["--- ТОП ПРОДАВАЕМЫХ УСЛУГ ---"]);
		rows.push(["Услуга", "Количество", "Назначено (руб)", "Средняя цена (руб)", "Скидки (руб)"]);
		for (const s of bundle.services.rows) {
			rows.push([s.title, s.quantity, s.plannedRub, s.averagePriceRub, s.discountRub]);
		}
		rows.push(["ИТОГО УСЛУГ", "", bundle.services.plannedTotalRub, "", bundle.services.discountTotalRub]);
		rows.push([]);
	}

	if (bundle.receivables?.rows?.length) {
		rows.push(["--- ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ (ПАЦИЕНТЫ-ДОЛЖНИКИ) ---"]);
		rows.push(["Пациент", "Сумма долга (руб)", "Срок долга", "Дата первой задолженности"]);
		for (const r of bundle.receivables.rows) {
			rows.push([r.patientName, r.debtRub, r.bucket, r.oldestChargeAt ?? "—"]);
		}
		rows.push(["ИТОГО ДОЛГ", bundle.receivables.totalDebtRub]);
		rows.push([]);
	}

	if (bundle.receivables?.prepayments?.length) {
		rows.push(["--- АВАНСЫ И ПЕРЕПЛАТЫ ПАЦИЕНТОВ ---"]);
		rows.push(["Пациент", "Аванс на счёте (руб)"]);
		for (const p of bundle.receivables.prepayments) {
			rows.push([p.patientName, p.prepaidRub]);
		}
		rows.push(["ИТОГО АВАНСОВ", bundle.receivables.totalPrepaidRub]);
		rows.push([]);
	}

	return rows;
}
