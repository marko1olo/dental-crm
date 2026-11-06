/**
 * apps/web/src/components/analytics/DoctorPayrollReport.tsx
 *
 * Прозрачная расчетная ведомость начисления заработной платы врачам (SSOT).
 *
 * ФОРМУЛА NET REVENUE:
 * 1. Оказано услуг (руб.) — валовая выручка по приёмам врача
 * 2. Списано материалов техкарт (руб.) — нормативная себестоимость расходников
 * 3. Зуботехническая лаборатория ЗТЛ (руб.) — себестоимость ортопедических конструкций
 * 4. Чистая выручка (Net Revenue) = Оказано услуг - Списано материалов - ЗТЛ
 * 5. Процентная ставка врача (%) — индивидуальный процент комиссии
 * 6. Итого к выплате (руб.) = Чистая выручка * (Ставка / 100)
 *
 * ВСЕ РАСЧЁТЫ В ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ БЕЗ FLOAT-ОШИБОК (МАНДАТ 8wy).
 * КНОПКИ НИКОГДА НЕ DISABLED (МАНДАТ 8e).
 *
 * Sweet Spot: 300–380 строк.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	Calculator,
	ChevronRight,
	Download,
	FlaskConical,
	Percent,
	Printer,
	RefreshCw,
	UserCheck,
	Users,
} from "lucide-react";
import { isDemoShowcaseMode } from "../../lib/demoMode";

export interface DoctorPayrollItem {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly specialty: string;
	readonly servicesRenderedRub: number;
	readonly servicesRenderedKopecks: number;
	readonly materialsCostRub: number;
	readonly materialsCostKopecks: number;
	readonly labCostRub: number;
	readonly labCostKopecks: number;
	readonly netRevenueRub: number;
	readonly netRevenueKopecks: number;
	readonly commissionPercent: number;
	readonly payoutRub: number;
	readonly payoutKopecks: number;
	readonly appointmentsCompleted: number;
}

export interface DoctorPayrollTotals {
	readonly totalServicesRenderedRub: number;
	readonly totalServicesRenderedKopecks: number;
	readonly totalMaterialsCostRub: number;
	readonly totalMaterialsCostKopecks: number;
	readonly totalLabCostRub: number;
	readonly totalLabCostKopecks: number;
	readonly totalNetRevenueRub: number;
	readonly totalNetRevenueKopecks: number;
	readonly totalPayoutRub: number;
	readonly totalPayoutKopecks: number;
	readonly totalAppointmentsCompleted: number;
	readonly totalAssistantPayoutRub?: number;
	readonly totalAssistantPayoutKopecks?: number;
	readonly totalClinicPayrollRub?: number;
	readonly totalClinicPayrollKopecks?: number;
}

export interface AssistantPayrollItem {
	readonly assistantId: string;
	readonly assistantName: string;
	readonly role: string;
	readonly appointmentsAssisted: number;
	readonly shiftsCount: number;
	readonly hoursWorked: number;
	readonly radiographCount: number;
	readonly surgeryCount: number;
	readonly baseShiftPayoutRub: number;
	readonly baseShiftPayoutKopecks: number;
	readonly radiographPayoutRub: number;
	readonly radiographPayoutKopecks: number;
	readonly surgeryPayoutRub: number;
	readonly surgeryPayoutKopecks: number;
	readonly grossPayoutRub: number;
	readonly grossPayoutKopecks: number;
	readonly ndflTaxRub: number;
	readonly ndflTaxKopecks: number;
	readonly payoutRub: number;
	readonly payoutKopecks: number;
}

export interface DoctorPayrollReportProps {
	readonly period?: string;
	readonly onPeriodChange?: (period: string) => void;
	readonly onPrint?: () => void;
}

function formatRub(rub: number): string {
	return `${Math.round(rub || 0).toLocaleString("ru-RU")} ₽`;
}

const PERIOD_LABELS: Record<string, string> = {
	day: "Сегодня",
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	year: "Год",
};

export const DoctorPayrollReport: React.FC<DoctorPayrollReportProps> = ({
	period = "month",
	onPeriodChange,
	onPrint,
}) => {
	const [activePeriod, setActivePeriod] = useState<string>(period);
	const [roleTab, setRoleTab] = useState<"doctors" | "assistants">("doctors");
	const [loading, setLoading] = useState<boolean>(true);
	const [rows, setRows] = useState<DoctorPayrollItem[]>([]);
	const [assistantRows, setAssistantRows] = useState<AssistantPayrollItem[]>([]);
	const [totals, setTotals] = useState<DoctorPayrollTotals | null>(null);

	const handlePeriodSelect = useCallback(
		(p: string) => {
			setActivePeriod(p);
			if (onPeriodChange) onPeriodChange(p);
		},
		[onPeriodChange],
	);

	const fetchPayroll = useCallback(async (p: string) => {
		setLoading(true);
		try {
			const [docRes, asstRes] = await Promise.allSettled([
				fetch(`/api/reports/doctor-payroll?period=${encodeURIComponent(p)}`),
				fetch(`/api/reports/assistant-payroll?period=${encodeURIComponent(p)}`),
			]);

			let docData: any = null;
			let asstData: any = null;

			if (docRes.status === "fulfilled" && docRes.value.ok) {
				docData = await docRes.value.json();
			}
			if (asstRes.status === "fulfilled" && asstRes.value.ok) {
				asstData = await asstRes.value.json();
			}

			if (docData || asstData) {
				setRows(docData?.rows || []);
				setAssistantRows(asstData?.rows || docData?.assistantRows || []);
				setTotals(docData?.totals || null);
				setLoading(false);
				return;
			}
		} catch {
			// fallback
		}

		if (isDemoShowcaseMode()) {
			const demoRows: DoctorPayrollItem[] = [
				{
					doctorId: "doc-1",
					doctorName: "Д-р Смирнова Е.В.",
					specialty: "Стоматолог-терапевт",
					servicesRenderedRub: 580000,
					servicesRenderedKopecks: 58000000,
					materialsCostRub: 58000,
					materialsCostKopecks: 5800000,
					labCostRub: 0,
					labCostKopecks: 0,
					netRevenueRub: 522000,
					netRevenueKopecks: 52200000,
					commissionPercent: 28.0,
					payoutRub: 146160,
					payoutKopecks: 14616000,
					appointmentsCompleted: 42,
				},
				{
					doctorId: "doc-2",
					doctorName: "Д-р Иванов Д.С.",
					specialty: "Стоматолог-ортопед",
					servicesRenderedRub: 520000,
					servicesRenderedKopecks: 52000000,
					materialsCostRub: 52000,
					materialsCostKopecks: 5200000,
					labCostRub: 68000,
					labCostKopecks: 6800000,
					netRevenueRub: 400000,
					netRevenueKopecks: 40000000,
					commissionPercent: 25.0,
					payoutRub: 100000,
					payoutKopecks: 10000000,
					appointmentsCompleted: 28,
				},
				{
					doctorId: "doc-3",
					doctorName: "Д-р Воронов М.И.",
					specialty: "Стоматолог-хирург / имплантолог",
					servicesRenderedRub: 350000,
					servicesRenderedKopecks: 35000000,
					materialsCostRub: 35000,
					materialsCostKopecks: 3500000,
					labCostRub: 25000,
					labCostKopecks: 2500000,
					netRevenueRub: 290000,
					netRevenueKopecks: 29000000,
					commissionPercent: 30.0,
					payoutRub: 87000,
					payoutKopecks: 8700000,
					appointmentsCompleted: 19,
				},
			];

			const demoAssistants: AssistantPayrollItem[] = [
				{
					assistantId: "ast-1",
					assistantName: "Ковалева А.С.",
					role: "Ассистент стоматолога",
					appointmentsAssisted: 38,
					shiftsCount: 18,
					hoursWorked: 110,
					radiographCount: 34,
					surgeryCount: 8,
					baseShiftPayoutRub: 45000,
					baseShiftPayoutKopecks: 4500000,
					radiographPayoutRub: 3400,
					radiographPayoutKopecks: 340000,
					surgeryPayoutRub: 4000,
					surgeryPayoutKopecks: 400000,
					grossPayoutRub: 52400,
					grossPayoutKopecks: 5240000,
					ndflTaxRub: 6812,
					ndflTaxKopecks: 681200,
					payoutRub: 45588,
					payoutKopecks: 4558800,
				},
				{
					assistantId: "ast-2",
					assistantName: "Морозова Е.П.",
					role: "Ассистент стоматолога",
					appointmentsAssisted: 30,
					shiftsCount: 15,
					hoursWorked: 92,
					radiographCount: 22,
					surgeryCount: 4,
					baseShiftPayoutRub: 37500,
					baseShiftPayoutKopecks: 3750000,
					radiographPayoutRub: 2200,
					radiographPayoutKopecks: 220000,
					surgeryPayoutRub: 2000,
					surgeryPayoutKopecks: 200000,
					grossPayoutRub: 41700,
					grossPayoutKopecks: 4170000,
					ndflTaxRub: 5421,
					ndflTaxKopecks: 542100,
					payoutRub: 36279,
					payoutKopecks: 3627900,
				},
			];

			setRows(demoRows);
			setAssistantRows(demoAssistants);
			setTotals({
				totalServicesRenderedRub: 1450000,
				totalServicesRenderedKopecks: 145000000,
				totalMaterialsCostRub: 145000,
				totalMaterialsCostKopecks: 14500000,
				totalLabCostRub: 93000,
				totalLabCostKopecks: 9300000,
				totalNetRevenueRub: 1212000,
				totalNetRevenueKopecks: 121200000,
				totalPayoutRub: 333160,
				totalPayoutKopecks: 33316000,
				totalAppointmentsCompleted: 89,
				totalAssistantPayoutRub: 81867,
				totalAssistantPayoutKopecks: 8186700,
				totalClinicPayrollRub: 415027,
				totalClinicPayrollKopecks: 41502700,
			});
		} else {
			setRows([]);
			setAssistantRows([]);
			setTotals(null);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchPayroll(activePeriod);
	}, [activePeriod, fetchPayroll]);

	const totalAssistantShifts = assistantRows.reduce((acc, r) => acc + r.shiftsCount, 0);
	const totalAssistantHours = assistantRows.reduce((acc, r) => acc + r.hoursWorked, 0);
	const totalAssistantRadiographs = assistantRows.reduce((acc, r) => acc + r.radiographCount, 0);
	const totalAssistantSurgeries = assistantRows.reduce((acc, r) => acc + r.surgeryCount, 0);
	const totalAssistantPayout =
		totals?.totalAssistantPayoutRub ?? assistantRows.reduce((acc, r) => acc + r.payoutRub, 0);

	return (
		<div className="space-y-6" data-testid="doctor-payroll-report">
			{/* Компактный тулбар (32-36px) с переключением периодов и ролей */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar flex-nowrap">
					{/* Apple Segmented Control: Врачи / Ассистенты */}
					<div className="flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0">
						<button
							type="button"
							data-testid="payroll-role-doctors"
							onClick={() => setRoleTab("doctors")}
							className={`h-8 sm:h-7 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
								roleTab === "doctors"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-semibold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Врачи ({rows.length})
						</button>
						<button
							type="button"
							data-testid="payroll-role-assistants"
							onClick={() => setRoleTab("assistants")}
							className={`h-8 sm:h-7 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
								roleTab === "assistants"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-semibold"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
						>
							Ассистенты ({assistantRows.length})
						</button>
					</div>

					<div className="h-4 w-px bg-[var(--line)] shrink-0 hidden sm:block" />

					{/* Периоды */}
					<div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-nowrap">
						{(["day", "week", "month", "quarter", "year"] as const).map((p) => (
							<button
								key={p}
								type="button"
								data-testid={`payroll-period-${p}`}
								onClick={() => handlePeriodSelect(p)}
								className={`h-8 sm:h-7 px-2.5 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
									activePeriod === p
										? "bg-[var(--teal)] text-white font-semibold shadow-xs"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]"
								}`}
							>
								{PERIOD_LABELS[p]}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 shrink-0">
					{/* Кнопка обновления НИКОГДА не блокируется (Мандат 8e) */}
					<button
						type="button"
						onClick={() => fetchPayroll(activePeriod)}
						className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] transition-colors cursor-pointer"
						title="Обновить ведомость"
					>
						<RefreshCw size={14} className={loading ? "animate-spin" : ""} />
					</button>

					<button
						type="button"
						onClick={onPrint || (() => window.print())}
						className="secondary-button h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--teal)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
					>
						<Printer size={14} aria-hidden="true" />
						<span>Печать ведомости</span>
					</button>
				</div>
			</div>

			{/* Сводные плитки фонда оплаты труда (ФОТ) */}
			{roleTab === "doctors" ? (
				<div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Оказано услуг</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : formatRub(totals?.totalServicesRenderedRub || 0)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Приёмов: {totals?.totalAppointmentsCompleted || 0}
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Списано техкарт</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : formatRub(totals?.totalMaterialsCostRub || 0)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Расходные материалы
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Лаборатория (ЗТЛ)</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : formatRub(totals?.totalLabCostRub || 0)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Ортопедические наряды
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Чистая выручка (Net)</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : formatRub(totals?.totalNetRevenueRub || 0)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							База для комиссии врача
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Итого к выплате (ФОТ)</div>
						<div className="text-xl font-bold text-[var(--teal)]">
							{loading ? "..." : formatRub(totals?.totalPayoutRub || 0)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Начислено врачам
						</div>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Смен ассистентов</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : totalAssistantShifts}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Отработано часов: {totalAssistantHours} ч
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Приёмов с врачами</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading
								? "..."
								: assistantRows.reduce((acc, r) => acc + r.appointmentsAssisted, 0)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Ассистирование у кресла
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">Снимки и хирургия</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : `${totalAssistantRadiographs} / ${totalAssistantSurgeries}`}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							RVG снимки / Операции
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">НДФЛ 13%</div>
						<div className="text-xl font-bold text-[var(--muted)]">
							{loading
								? "..."
								: formatRub(
										totals?.totalAssistantPayoutKopecks
											? Math.round(
													((totals?.totalAssistantPayoutKopecks / 0.87) * 0.13) / 100,
												)
											: assistantRows.reduce((acc, r) => acc + r.ndflTaxRub, 0),
									)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Удержание налога
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--muted)] mb-1">К выплате на руки</div>
						<div className="text-xl font-bold text-[var(--teal)]">
							{loading ? "..." : formatRub(totalAssistantPayout)}
						</div>
						<div className="text-[11px] text-[var(--muted)] mt-0.5">
							Чистая зарплата ассистентов
						</div>
					</div>
				</div>
			)}

			{/* Таблица начислений для десктопа */}
			<div className="hidden sm:block rounded-xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					{roleTab === "doctors" ? (
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] font-medium">
									<th className="py-2.5 px-3">Врач клиники</th>
									<th className="py-2.5 px-3">Специализация</th>
									<th className="py-2.5 px-3 text-right">Оказано услуг</th>
									<th className="py-2.5 px-3 text-right">Списано техкарт</th>
									<th className="py-2.5 px-3 text-right">Лаборатория (ЗТЛ)</th>
									<th className="py-2.5 px-3 text-right">Чистая выручка (Net)</th>
									<th className="py-2.5 px-3 text-right">Ставка %</th>
									<th className="py-2.5 px-3 text-right font-semibold text-[var(--ink)]">
										К выплате
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line-subtle)] text-[var(--ink)]">
								{rows.length === 0 ? (
									<tr>
										<td colSpan={8} className="py-8 text-center text-[var(--muted)]">
											{loading ? "Формирование ведомости..." : "Нет данных о начислениях за выбранный период"}
										</td>
									</tr>
								) : (
									rows.map((row) => (
										<tr key={row.doctorId} className="hover:bg-[var(--paper-soft)] transition-colors">
											<td className="py-2.5 px-3 font-semibold">{row.doctorName}</td>
											<td className="py-2.5 px-3 text-[var(--muted)]">{row.specialty}</td>
											<td className="py-2.5 px-3 text-right tabular-nums">
												{formatRub(row.servicesRenderedRub)}
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums text-[var(--muted)]">
												{formatRub(row.materialsCostRub)}
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums text-[var(--muted)]">
												{formatRub(row.labCostRub || 0)}
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums font-medium">
												{formatRub(row.netRevenueRub)}
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums">
												{row.commissionPercent.toFixed(1)}%
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums font-bold text-[var(--teal)]">
												{formatRub(row.payoutRub)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					) : (
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] font-medium">
									<th className="py-2.5 px-3">Ассистент клиники</th>
									<th className="py-2.5 px-3">Должность</th>
									<th className="py-2.5 px-3 text-center">Смен / Часов</th>
									<th className="py-2.5 px-3 text-center">Приёмов</th>
									<th className="py-2.5 px-3 text-center">Снимки / Хирургия</th>
									<th className="py-2.5 px-3 text-right">Базовая ставка</th>
									<th className="py-2.5 px-3 text-right">Доплаты</th>
									<th className="py-2.5 px-3 text-right">НДФЛ 13%</th>
									<th className="py-2.5 px-3 text-right font-semibold text-[var(--ink)]">
										К выплате (на руки)
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line-subtle)] text-[var(--ink)]">
								{assistantRows.length === 0 ? (
									<tr>
										<td colSpan={9} className="py-8 text-center text-[var(--muted)]">
											{loading ? "Формирование ведомости..." : "Нет данных по ассистентам за выбранный период"}
										</td>
									</tr>
								) : (
									assistantRows.map((ast) => (
										<tr key={ast.assistantId} className="hover:bg-[var(--paper-soft)] transition-colors">
											<td className="py-2.5 px-3 font-semibold">{ast.assistantName}</td>
											<td className="py-2.5 px-3 text-[var(--muted)]">{ast.role}</td>
											<td className="py-2.5 px-3 text-center tabular-nums">
												{ast.shiftsCount} см / {ast.hoursWorked} ч
											</td>
											<td className="py-2.5 px-3 text-center tabular-nums">
												{ast.appointmentsAssisted}
											</td>
											<td className="py-2.5 px-3 text-center tabular-nums text-[var(--muted)]">
												{ast.radiographCount} сн / {ast.surgeryCount} хир
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums">
												{formatRub(ast.baseShiftPayoutRub)}
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums text-[var(--muted)]">
												{formatRub(ast.radiographPayoutRub + ast.surgeryPayoutRub)}
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums text-[var(--muted)]">
												-{formatRub(ast.ndflTaxRub)}
											</td>
											<td className="py-2.5 px-3 text-right tabular-nums font-bold text-[var(--teal)]">
												{formatRub(ast.payoutRub)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{/* Мобильные Grouped Cards (iOS Settings style) для 390px — Apple HIG min-h 52px, 0px horizontal scroll */}
			<div className="sm:hidden space-y-3 overflow-x-clip max-w-full">
				{roleTab === "doctors" ? (
					rows.length === 0 ? (
						<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)]">
							{loading ? "Загрузка..." : "Нет данных за период"}
						</div>
					) : (
						rows.map((row) => (
							<div
								key={row.doctorId}
								data-testid="payroll-card-doctor"
								className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm space-y-2.5 min-h-[52px]"
							>
								<div className="flex items-center justify-between">
									<div className="min-w-0 pr-2">
										<div className="text-sm font-bold text-[var(--ink)] truncate">{row.doctorName}</div>
										<div className="text-[11px] text-[var(--muted)] truncate">{row.specialty}</div>
									</div>
									<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] font-semibold text-[var(--ink)] shrink-0">
										{row.commissionPercent}%
									</span>
								</div>

								<div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--line-subtle)] text-xs">
									<div>
										<span className="text-[var(--muted)] block text-[11px]">Оказано:</span>
										<span className="font-medium text-[var(--ink)] tabular-nums">{formatRub(row.servicesRenderedRub)}</span>
									</div>
									<div>
										<span className="text-[var(--muted)] block text-[11px]">Материалы:</span>
										<span className="text-[var(--muted)] tabular-nums">{formatRub(row.materialsCostRub)}</span>
									</div>
									<div>
										<span className="text-[var(--muted)] block text-[11px]">ЗТЛ:</span>
										<span className="text-[var(--muted)] tabular-nums">{formatRub(row.labCostRub || 0)}</span>
									</div>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)]">
									<span className="text-xs font-medium text-[var(--muted)]">Итого к выплате:</span>
									<span className="text-sm font-bold text-[var(--teal)] tabular-nums">
										{formatRub(row.payoutRub)}
									</span>
								</div>
							</div>
						))
					)
				) : (
					assistantRows.length === 0 ? (
						<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)]">
							{loading ? "Загрузка..." : "Нет данных по ассистентам"}
						</div>
					) : (
						assistantRows.map((ast) => (
							<div
								key={ast.assistantId}
								data-testid="payroll-card-assistant"
								className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm space-y-2.5 min-h-[52px]"
							>
								<div className="flex items-center justify-between">
									<div className="min-w-0 pr-2">
										<div className="text-sm font-bold text-[var(--ink)] truncate">{ast.assistantName}</div>
										<div className="text-[11px] text-[var(--muted)] truncate">{ast.role}</div>
									</div>
									<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] font-medium text-[var(--ink)] shrink-0">
										{ast.shiftsCount} смен / {ast.hoursWorked} ч
									</span>
								</div>

								<div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--line-subtle)] text-xs">
									<div>
										<span className="text-[var(--muted)] block text-[11px]">Приёмов:</span>
										<span className="font-medium text-[var(--ink)] tabular-nums">{ast.appointmentsAssisted}</span>
									</div>
									<div>
										<span className="text-[var(--muted)] block text-[11px]">Снимки:</span>
										<span className="text-[var(--muted)] tabular-nums">{ast.radiographCount} шт</span>
									</div>
									<div>
										<span className="text-[var(--muted)] block text-[11px]">Хирургия:</span>
										<span className="text-[var(--muted)] tabular-nums">{ast.surgeryCount} опер</span>
									</div>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)] text-xs">
									<span className="text-[var(--muted)]">Ставка + Доплаты:</span>
									<span className="font-medium text-[var(--ink)] tabular-nums">
										{formatRub(ast.baseShiftPayoutRub + ast.radiographPayoutRub + ast.surgeryPayoutRub)}
									</span>
								</div>

								<div className="flex items-center justify-between pt-1 text-xs">
									<span className="text-[var(--muted)]">НДФЛ 13%:</span>
									<span className="text-[var(--muted)] tabular-nums">-{formatRub(ast.ndflTaxRub)}</span>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)]">
									<span className="text-xs font-medium text-[var(--muted)]">К выплате на руки:</span>
									<span className="text-sm font-bold text-[var(--teal)] tabular-nums">
										{formatRub(ast.payoutRub)}
									</span>
								</div>
							</div>
						))
					)
				)}
			</div>
		</div>
	);
};
