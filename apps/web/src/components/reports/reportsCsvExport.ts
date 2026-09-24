/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RFC 4180 CSV EXPORT & SAFE CALCULATION ENGINE FOR MANAGER REPORTS
 * UTF-8 BOM (\uFEFF) for Excel compatibility | CRLF line breaks
 * Full quoting & escaping | Zero Division-by-Zero Guarantee
 * Mandates 8d, 8e, 8n
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	ReportsSummary,
	ServiceSalesReport,
	ReceivablesDetail,
	ScheduleLoadReport,
} from "./ManagerReportsPanel";

/**
 * Безопасное деление, гарантирующее 0 случаев Division-by-Zero (Infinity / NaN).
 */
export function safeDivide(
	numerator: number | null | undefined,
	denominator: number | null | undefined,
	fallback: number | null = null,
): number | null {
	if (
		numerator === null ||
		numerator === undefined ||
		denominator === null ||
		denominator === undefined ||
		!Number.isFinite(numerator) ||
		!Number.isFinite(denominator) ||
		denominator === 0
	) {
		return fallback;
	}
	const result = numerator / denominator;
	return Number.isFinite(result) ? result : fallback;
}

/**
 * Безопасное вычисление ширины процентной полосы для CSS.
 */
export function safePercentWidth(
	value: number | null | undefined,
	total: number | null | undefined,
	minPercent = 2,
	maxPercent = 100,
): number {
	if (
		value === null ||
		value === undefined ||
		total === null ||
		total === undefined ||
		!Number.isFinite(value) ||
		!Number.isFinite(total) ||
		total <= 0 ||
		value <= 0
	) {
		return minPercent;
	}
	const ratio = value / total;
	if (!Number.isFinite(ratio)) return minPercent;
	const rounded = Math.round(ratio * 100);
	return Math.min(maxPercent, Math.max(minPercent, rounded));
}

/**
 * Экранирование поля по стандарту RFC 4180.
 * Поля с кавычками, запятыми, точками с запятой или переносами строк берутся в кавычки,
 * а внутренние двойные кавычки удваиваются (" -> "").
 */
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

/**
 * Формирование строки CSV по стандарту RFC 4180 с разделителем (по умолчанию запятая или точка с запятой для ru-RU Excel).
 */
export function formatCsvRow(fields: readonly unknown[], delimiter = ";"): string {
	return fields.map(escapeCsvField).join(delimiter);
}

/**
 * Генерация полного CSV документа со спецификацией UTF-8 BOM и CRLF.
 */
export function buildRfc4180Csv(rows: readonly (readonly unknown[])[], delimiter = ";"): string {
	const bom = "\uFEFF";
	const content = rows.map((r) => formatCsvRow(r, delimiter)).join("\r\n");
	return `${bom}${content}\r\n`;
}

export interface ManagerReportsDataBundle {
	readonly period: { readonly from: string; readonly to: string };
	readonly summary: ReportsSummary | null;
	readonly services: ServiceSalesReport | null;
	readonly receivables: ReceivablesDetail | null;
	readonly scheduleLoad: ScheduleLoadReport | null;
}

/**
 * Генерация комплексного управленческого отчёта в CSV (выручка, врачи, услуги, долги).
 */
export function generateManagerReportsCsv(bundle: ManagerReportsDataBundle): string {
	const rows: unknown[][] = [];

	// 1. Шапка документа
	rows.push(["ОТЧЁТ РУКОВОДИТЕЛЯ КЛИНИКИ (DENTE CRM)"]);
	rows.push(["Период", `${bundle.period.from} — ${bundle.period.to}`]);
	rows.push(["Дата выгрузки", new Date().toLocaleString("ru-RU")]);
	rows.push([]);

	// 2. Сводка по выручке
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

		// Динамика по периодам
		if (bundle.summary.revenue?.points?.length) {
			rows.push(["Период/Дата", "Выручка (руб)", "Оплат", "Платящих пациентов"]);
			for (const p of bundle.summary.revenue.points) {
				rows.push([p.bucket, p.revenueRub, p.paymentCount, p.payingPatients]);
			}
			rows.push([]);
		}

		// Врачи
		if (bundle.summary.doctors?.rows?.length) {
			rows.push(["--- ВРАЧИ И ВЫРАБОТКА ---"]);
			rows.push([
				"Врач",
				"Выручка (руб)",
				"Всего приёмов",
				"Завершено",
				"Отменено",
				"Неявки",
				"Доходимость",
				"Средний чек (руб)",
			]);
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

		// Кресла
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

	// 3. Услуги и продажи
	if (bundle.services?.rows?.length) {
		rows.push(["--- ТОП ПРОДАВАЕМЫХ УСЛУГ ---"]);
		rows.push(["Услуга", "Количество", "Назначено (руб)", "Средняя цена (руб)", "Скидки (руб)"]);
		for (const s of bundle.services.rows) {
			rows.push([s.title, s.quantity, s.plannedRub, s.averagePriceRub, s.discountRub]);
		}
		rows.push(["ИТОГО УСЛУГ", "", bundle.services.plannedTotalRub, "", bundle.services.discountTotalRub]);
		rows.push([]);
	}

	// 4. Дебиторская задолженность
	if (bundle.receivables?.rows?.length) {
		rows.push(["--- ДЕБИТОРСКАЯ ЗАДОЛЖЕННОСТЬ (ПАЦИЕНТЫ-ДОЛЖНИКИ) ---"]);
		rows.push(["Пациент", "Сумма долга (руб)", "Срок долга", "Дата первой задолженности"]);
		for (const r of bundle.receivables.rows) {
			rows.push([r.patientName, r.debtRub, r.bucket, r.oldestChargeAt ?? "—"]);
		}
		rows.push(["ИТОГО ДОЛГ", bundle.receivables.totalDebtRub]);
		rows.push([]);
	}

	// 5. Переплаты пациентов
	if (bundle.receivables?.prepayments?.length) {
		rows.push(["--- АВАНСЫ И ПЕРЕПЛАТЫ ПАЦИЕНТОВ ---"]);
		rows.push(["Пациент", "Аванс на счёте (руб)"]);
		for (const p of bundle.receivables.prepayments) {
			rows.push([p.patientName, p.prepaidRub]);
		}
		rows.push(["ИТОГО АВАНСОВ", bundle.receivables.totalPrepaidRub]);
		rows.push([]);
	}

	return buildRfc4180Csv(rows, ";");
}

/**
 * Инициация скачивания CSV-файла в браузере.
 */
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
