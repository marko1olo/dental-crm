/**
 * apps/web/src/components/analytics/analyticsCsvUtils.ts
 *
 * Канонические утилиты генерации RFC 4180 CSV с UTF-8 BOM для безупречного открытия в Excel.
 * Sweet Spot: 60-90 строк (Мандат 8b).
 */

export function safeDivide(
	numerator: unknown,
	denominator: unknown,
	fallback: number | null = null,
): number | null {
	const num = Number(numerator);
	const den = Number(denominator);
	if (
		numerator === null ||
		numerator === undefined ||
		denominator === null ||
		denominator === undefined ||
		Number.isNaN(num) ||
		Number.isNaN(den) ||
		!Number.isFinite(num) ||
		!Number.isFinite(den) ||
		den === 0
	) {
		return fallback;
	}
	return num / den;
}

export function safePercentWidth(
	value: unknown,
	total: unknown,
	minPercent = 2,
	maxPercent = 100,
): number {
	const ratio = safeDivide(value, total, 0) ?? 0;
	if (ratio <= 0) return minPercent;
	const pct = Math.round(ratio * 100);
	return Math.min(maxPercent, Math.max(minPercent, pct));
}

export function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	const str = String(value);
	if (
		str.includes('"') ||
		str.includes(",") ||
		str.includes(";") ||
		str.includes("\n") ||
		str.includes("\r")
	) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function formatCsvRow(fields: readonly unknown[], delimiter = ";"): string {
	return fields.map(escapeCsvField).join(delimiter);
}

export function buildRfc4180Csv(
	rows: readonly (readonly unknown[])[],
	delimiter = ";",
): string {
	const bom = "\uFEFF";
	const content = rows.map((r) => formatCsvRow(r, delimiter)).join("\r\n");
	return `${bom}${content}\r\n`;
}

export function triggerCsvDownload(csvContent: string, fileName: string): void {
	if (typeof window === "undefined" || !window.document) return;
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", fileName);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export interface ManagerReportsDataBundle {
	readonly period: { readonly from: string; readonly to: string };
	readonly summary: {
		readonly revenue?: { readonly totalRub?: number; readonly points?: readonly { readonly bucket: string; readonly revenueRub: number; readonly paymentCount: number; readonly payingPatients: number }[] };
		readonly appointments?: { readonly total?: number; readonly completionRate?: number | null; readonly noShowRate?: number | null };
		readonly doctors?: { readonly rows?: readonly { readonly doctorName: string; readonly revenueRub: number; readonly appointmentsTotal: number; readonly appointmentsCompleted: number; readonly appointmentsCancelled: number; readonly appointmentsNoShow: number; readonly completionRate?: number | null; readonly averageTicketRub?: number | null }[]; readonly unattributedRevenueRub?: number };
		readonly chairs?: { readonly rows?: readonly { readonly chairName: string; readonly appointments: number; readonly bookedMinutes: number; readonly utilization?: number | null }[] };
	} | null;
	readonly services: {
		readonly rows?: readonly { readonly title: string; readonly quantity: number; readonly plannedRub: number; readonly averagePriceRub: number; readonly discountRub: number }[];
		readonly plannedTotalRub?: number;
		readonly discountTotalRub?: number;
	} | null;
	readonly receivables: {
		readonly rows?: readonly { readonly patientName: string; readonly debtRub: number; readonly bucket: string; readonly oldestChargeAt?: string | null }[];
		readonly totalDebtRub?: number;
		readonly prepayments?: readonly { readonly patientName: string; readonly prepaidRub: number }[];
		readonly totalPrepaidRub?: number;
	} | null;
	readonly scheduleLoad: unknown;
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
			const unattributed = bundle.summary.doctors.unattributedRevenueRub ?? 0;
			if (unattributed > 0) {
				rows.push(["Без указания врача", unattributed]);
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

export function generateManagerReportsCsv(bundle: ManagerReportsDataBundle): string {
	const rows = buildManagerReportsRows(bundle);
	return buildRfc4180Csv(rows, ";");
}
