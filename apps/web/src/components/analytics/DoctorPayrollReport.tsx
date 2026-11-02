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
	const [loading, setLoading] = useState<boolean>(true);
	const [rows, setRows] = useState<DoctorPayrollItem[]>([]);
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
			const res = await fetch(`/api/reports/doctor-payroll?period=${encodeURIComponent(p)}`);
			if (res.ok) {
				const json = await res.json();
				setRows(json.rows || []);
				setTotals(json.totals || null);
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

			setRows(demoRows);
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
			});
		} else {
			setRows([]);
			setTotals(null);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchPayroll(activePeriod);
	}, [activePeriod, fetchPayroll]);

	return (
		<div className="space-y-6" data-testid="doctor-payroll-report">
			{/* Компактный тулбар (32-36px) */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-nowrap">
					{(["day", "week", "month", "quarter", "year"] as const).map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => handlePeriodSelect(p)}
							className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
								activePeriod === p
									? "bg-[var(--teal)] text-white font-semibold shadow-sm"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)]"
							}`}
						>
							{PERIOD_LABELS[p]}
						</button>
					))}
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

			{/* Таблица начислений для десктопа */}
			<div className="hidden sm:block rounded-xl bg-[var(--paper)] border border-[var(--line)] overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
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
				</div>
			</div>

			{/* Мобильные Grouped Cards (iOS Settings style) для 390px */}
			<div className="sm:hidden space-y-3">
				{rows.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-xl border border-[var(--line)]">
						{loading ? "Загрузка..." : "Нет данных за период"}
					</div>
				) : (
					rows.map((row) => (
						<div
							key={row.doctorId}
							className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm space-y-2"
						>
							<div className="flex items-center justify-between">
								<div>
									<div className="text-sm font-bold text-[var(--ink)]">{row.doctorName}</div>
									<div className="text-[11px] text-[var(--muted)]">{row.specialty}</div>
								</div>
								<span className="text-xs px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] font-semibold text-[var(--ink)]">
									{row.commissionPercent}%
								</span>
							</div>

							<div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--line-subtle)] text-xs">
								<div>
									<span className="text-[var(--muted)] block text-[11px]">Оказано:</span>
									<span className="font-medium text-[var(--ink)]">{formatRub(row.servicesRenderedRub)}</span>
								</div>
								<div>
									<span className="text-[var(--muted)] block text-[11px]">Материалы:</span>
									<span className="text-[var(--muted)]">{formatRub(row.materialsCostRub)}</span>
								</div>
								<div>
									<span className="text-[var(--muted)] block text-[11px]">ЗТЛ:</span>
									<span className="text-[var(--muted)]">{formatRub(row.labCostRub || 0)}</span>
								</div>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)]">
								<span className="text-xs font-medium text-[var(--muted)]">Итого к выплате:</span>
								<span className="text-sm font-bold text-[var(--teal)]">
									{formatRub(row.payoutRub)}
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
};
