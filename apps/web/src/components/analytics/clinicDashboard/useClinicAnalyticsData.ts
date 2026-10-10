/**
 * apps/web/src/components/analytics/clinicDashboard/useClinicAnalyticsData.ts
 *
 * Кастомный React-хук агрегации и загрузки данных аналитики клиники (Layer 3).
 * Содержит параллельную загрузку из API, расчет фискальных и операционных KPI,
 * экспорт отчета в CSV/Excel и управление периодами.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { buildRfc4180Csv, triggerCsvDownload } from "../../reports/reportsCsvExport.js";
import { showToast } from "../../GlobalToast.js";
import {
	type RawPaymentItem,
	type RawInvoiceItem,
	type RawVisitFinancialItem,
	type FinancialAnalyticsSummary,
	calculateFinancialAnalytics,
	formatMoneyKopecks,
} from "../financialAnalyticsEngine.js";
import {
	type RawAppointmentItem,
	type ClinicChairUtilizationSummary,
	DEFAULT_CLINIC_CHAIRS,
	calculateClinicChairUtilization,
} from "../chairUtilizationEngine.js";
import {
	type RawDoctorVisitItem,
	type ClinicDoctorProductivitySummary,
	calculateDoctorProductivity,
} from "../doctorProductivityEngine.js";
import type {
	AnalyticsPeriodChoice,
	AnalyticsTabChoice,
	ClinicAnalyticsDashboardProps,
	ClinicAnalyticsDataState,
} from "./types.js";

export function useClinicAnalyticsData(
	props: ClinicAnalyticsDashboardProps = {},
): ClinicAnalyticsDataState {
	const {
		initialPeriod = "month",
		initialTab = "overview",
		customPayments,
		customInvoices,
		customAppointments,
		customDoctorVisits,
		chairsConfig = DEFAULT_CLINIC_CHAIRS,
	} = props;

	const [period, setPeriod] = useState<AnalyticsPeriodChoice>(initialPeriod);
	const [activeTab, setActiveTab] = useState<AnalyticsTabChoice>(initialTab);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Живые сырые данные из API
	const [serverPayments, setServerPayments] = useState<RawPaymentItem[]>([]);
	const [serverInvoices, setServerInvoices] = useState<RawInvoiceItem[]>([]);
	const [serverAppointments, setServerAppointments] = useState<RawAppointmentItem[]>([]);
	const [serverDoctorVisits, setServerDoctorVisits] = useState<RawDoctorVisitItem[]>([]);

	// Вычисление количества дней в периоде
	const periodDaysCount = useMemo(() => {
		switch (period) {
			case "day":
				return 1;
			case "week":
				return 7;
			case "month":
				return 30;
			case "quarter":
				return 90;
			case "year":
				return 365;
			default:
				return 30;
		}
	}, [period]);

	const periodLabel = useMemo(() => {
		switch (period) {
			case "day":
				return "За сегодня";
			case "week":
				return "За текущую неделю (7 дней)";
			case "month":
				return "За текущий месяц";
			case "quarter":
				return "За текущий квартал";
			case "year":
				return "За 2026 год";
			default:
				return "За период";
		}
	}, [period]);

	// Загрузка живых данных с бэкенда
	const loadLiveData = useCallback(async () => {
		if (customPayments || customAppointments) {
			return; // Работаем от переданных пропсов
		}

		setIsLoading(true);
		setError(null);

		try {
			const headers = denteAdminSecretRequestHeaders();

			// Параллельный запрос платежей, счетов и расписания
			const [payRes, invRes, apptRes] = await Promise.all([
				fetch(`/api/billing/payments?period=${period}`, { headers }).catch(() => null),
				fetch(`/api/billing/invoices?period=${period}`, { headers }).catch(() => null),
				fetch(`/api/appointments?period=${period}`, { headers }).catch(() => null),
			]);

			if (payRes && payRes.ok) {
				const json = await payRes.json();
				if (Array.isArray(json?.data)) {
					const list: RawPaymentItem[] = json.data.map((row: any) => ({
						id: String(row.id),
						amountKopecks: Math.round(Number(row.amountRub || (row.amountKopecks ? row.amountKopecks / 100 : 0)) * 100),
						status: row.status === "paid" ? "paid" : row.status === "refunded" ? "refunded" : "cancelled",
						paymentMethod: row.method || row.paymentMethod || "card",
						patientId: row.patientId ? String(row.patientId) : undefined,
						isPrimaryPatient: Boolean(row.isPrimaryPatient),
						paidAt: row.paidAt || row.createdAt,
					}));
					setServerPayments(list);
				}
			}

			if (invRes && invRes.ok) {
				const json = await invRes.json();
				if (Array.isArray(json?.data)) {
					const list: RawInvoiceItem[] = json.data.map((row: any) => ({
						id: String(row.id),
						totalAmountKopecks: Math.round(Number(row.totalRub || 0) * 100),
						paidAmountKopecks: Math.round(Number(row.paidRub || 0) * 100),
						status: row.status || "issued",
						patientId: row.patientId ? String(row.patientId) : undefined,
						dueDate: row.dueDate,
					}));
					setServerInvoices(list);
				}
			}

			if (apptRes && apptRes.ok) {
				const json = await apptRes.json();
				if (Array.isArray(json?.data)) {
					const list: RawAppointmentItem[] = json.data.map((row: any) => ({
						id: String(row.id),
						chairId: row.chairId ? String(row.chairId) : undefined,
						chairName: row.chairName,
						startsAt: row.startsAt,
						endsAt: row.endsAt,
						status: row.status || "completed",
						revenueKopecks: Math.round(Number(row.priceRub || 0) * 100),
						doctorId: row.doctorId ? String(row.doctorId) : undefined,
						doctorName: row.doctorName,
						patientId: row.patientId ? String(row.patientId) : undefined,
					}));
					setServerAppointments(list);

					// Также формируем список визитов для докторов
					const docVisits: RawDoctorVisitItem[] = list.map((a) => ({
						id: a.id,
						doctorId: a.doctorId || "unassigned",
						doctorName: a.doctorName || "Врач клиники",
						specialty: "Стоматолог",
						status: a.status,
						patientId: a.patientId,
						isPrimaryPatient: false,
						billedKopecks: a.revenueKopecks,
						paidKopecks: a.revenueKopecks,
					}));
					setServerDoctorVisits(docVisits);
				}
			}
		} catch (err: any) {
			setError(err?.message || "Ошибка загрузки данных аналитики");
		} finally {
			setIsLoading(false);
		}
	}, [period, customPayments, customAppointments]);

	useEffect(() => {
		loadLiveData();
	}, [loadLiveData]);

	// Итоговые наборы данных (пропсы либо сервер)
	const effectivePayments = useMemo(() => customPayments || serverPayments, [customPayments, serverPayments]);
	const effectiveInvoices = useMemo(() => customInvoices || serverInvoices, [customInvoices, serverInvoices]);
	const effectiveAppointments = useMemo(() => customAppointments || serverAppointments, [customAppointments, serverAppointments]);
	const effectiveDoctorVisits = useMemo(() => customDoctorVisits || serverDoctorVisits, [customDoctorVisits, serverDoctorVisits]);

	// Преобразование записей расписания в визиты для финансового движка
	const visitsForFinances = useMemo<RawVisitFinancialItem[]>(() => {
		return effectiveAppointments.map((a) => ({
			id: a.id,
			status: a.status,
			patientId: a.patientId,
			billedAmountKopecks: a.revenueKopecks,
		}));
	}, [effectiveAppointments]);

	// 1. ДВИЖОК ФИНАНСОВОЙ АНАЛИТИКИ
	const financialSummary: FinancialAnalyticsSummary = useMemo(() => {
		return calculateFinancialAnalytics({
			payments: effectivePayments,
			invoices: effectiveInvoices,
			visits: visitsForFinances,
			periodLabel,
		});
	}, [effectivePayments, effectiveInvoices, visitsForFinances, periodLabel]);

	// 2. ДВИЖОК ЗАГРУЗКИ КРЕСЕЛ
	const chairSummary: ClinicChairUtilizationSummary = useMemo(() => {
		return calculateClinicChairUtilization({
			appointments: effectiveAppointments,
			chairsConfig,
			daysCount: periodDaysCount,
			periodLabel,
		});
	}, [effectiveAppointments, chairsConfig, periodDaysCount, periodLabel]);

	// 3. ДВИЖОК ПРОДУКТИВНОСТИ ВРАЧЕЙ
	const doctorSummary: ClinicDoctorProductivitySummary = useMemo(() => {
		return calculateDoctorProductivity({
			visits: effectiveDoctorVisits,
			periodLabel,
		});
	}, [effectiveDoctorVisits, periodLabel]);

	// Экспорт отчета в CSV
	const handleExportCsv = useCallback(() => {
		try {
			const rows: (string | number)[][] = [
				["АНАЛИТИЧЕСКИЙ ОТЧЕТ СТОМАТОЛОГИЧЕСКОЙ КЛИНИКИ", periodLabel],
				["Дата формирования", new Date().toLocaleString("ru-RU")],
				[],
				["1. ФИНАНСОВЫЕ ПОКАЗАТЕЛИ (P&L)", "Сумма (₽)"],
				["Выручка нетто", formatMoneyKopecks(financialSummary.netRevenueKopecks, false)],
				["Средний чек", formatMoneyKopecks(financialSummary.averageCheckKopecks, false)],
				["Дебиторская задолженность пациентов", formatMoneyKopecks(financialSummary.accountsReceivable.totalDebtKopecks, false)],
				["Себестоимость материалов (COGS ~18%)", formatMoneyKopecks(financialSummary.pnl.cogsKopecks, false)],
				["ФОТ персонала (~40%)", formatMoneyKopecks(financialSummary.pnl.payrollKopecks, false)],
				["EBITDA", formatMoneyKopecks(financialSummary.pnl.ebitdaKopecks, false)],
				["Чистая прибыль", formatMoneyKopecks(financialSummary.pnl.netProfitKopecks, false)],
				["Рентабельность (%)", `${financialSummary.pnl.netMarginPercent}%`],
				[],
				["2. ЗАГРУЗКА КРЕСЕЛ КЛИНИКИ", "Полезная загрузка (%)", "Выручка (₽)", "Приемы (шт)"],
			];

			for (const ch of chairSummary.chairs) {
				rows.push([
					ch.chairName,
					`${ch.effectiveUtilizationPercent}%`,
					formatMoneyKopecks(ch.totalRevenueKopecks, false),
					ch.completedCount,
				]);
			}

			rows.push([]);
			rows.push(["3. ВЫРАБОТКА ВРАЧЕЙ", "Начислено (₽)", "Визитов", "Доходимость (%)", "Ср. чек (₽)"]);

			for (const doc of doctorSummary.doctors) {
				rows.push([
					doc.doctorName,
					formatMoneyKopecks(doc.totalBilledKopecks, false),
					doc.completedVisitsCount,
					`${doc.attendanceRatePercent}%`,
					formatMoneyKopecks(doc.averageBillKopecks, false),
				]);
			}

			const csv = buildRfc4180Csv(rows, ";");
			triggerCsvDownload(csv, `Dente_Analytics_${period}_${Date.now()}.csv`);
			showToast("Аналитический отчет успешно выгружен в CSV", "success");
		} catch {
			showToast("Не удалось экспортировать отчет", "error");
		}
	}, [period, periodLabel, financialSummary, chairSummary, doctorSummary]);

	return {
		period,
		setPeriod,
		activeTab,
		setActiveTab,
		isLoading,
		error,
		periodDaysCount,
		periodLabel,
		effectivePayments,
		effectiveInvoices,
		effectiveAppointments,
		effectiveDoctorVisits,
		visitsForFinances,
		financialSummary,
		chairSummary,
		doctorSummary,
		loadLiveData,
		handleExportCsv,
	};
}
