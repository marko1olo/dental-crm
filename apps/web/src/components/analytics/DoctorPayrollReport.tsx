/**
 * apps/web/src/components/analytics/DoctorPayrollReport.tsx
 *
 * Расчетная ведомость начисления заработной платы врачам и ассистентам (SSOT).
 * ФОРМУЛА NET REVENUE:
 * 1. Оказано услуг (руб.) — валовая выручка по приёмам врача
 * 2. Списано материалов техкарт (руб.) — себестоимость расходников
 * 3. Зуботехническая лаборатория ЗТЛ (руб.) — себестоимость ортопедических конструкций
 * 4. Чистая выручка (Net Revenue) = Оказано услуг - Списано материалов - ЗТЛ
 * 5. Процентная ставка врача (%) — индивидуальный процент комиссии
 * 6. Итого к выплате (руб.) = Чистая выручка * (Ставка / 100)
 *
 * ВСЕ РАСЧЁТЫ В ЦЕЛОЧИСЛЕННЫХ КОПЕЙКАХ БЕЗ FLOAT-ОШИБОК (МАНДАТ 8wy).
 * КНОПКИ НИКОГДА НЕ DISABLED (МАНДАТ 8e).
 * ДЕКОМПОЗИРОВАН В SWEET SPOT 200–260 СТРОК (МАНДАТ 8b).
 */

import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
	Calculator,
	Download,
	Printer,
	RefreshCw,
} from "lucide-react";
import { formatKopecksToRub, rublesToKopecks } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders";
import type { DoctorPayrollStudioModalProps } from "../payroll/DoctorPayrollStudioModal";
import { AssistantPayrollTable } from "./AssistantPayrollTable";
import {
	type AssistantPayrollItem,
	type DoctorPayrollItem,
	type DoctorPayrollTotals,
	exportAssistantPayrollToCsv,
	exportDoctorPayrollToCsv,
	formatRub,
	PERIOD_LABELS,
	payoutMonthCalendarBounds,
	requestDoctorPayouts,
} from "./doctorPayrollExportUtils";
import { DoctorPayrollTable } from "./DoctorPayrollTable";

export type {
	DoctorPayrollItem,
	DoctorPayrollTotals,
	AssistantPayrollItem,
};
export { payoutMonthCalendarBounds, requestDoctorPayouts };

const DoctorPayrollStudioModal = lazy<React.FC<DoctorPayrollStudioModalProps>>(() =>
	import("../payroll/DoctorPayrollStudioModal").then((m) => ({
		default: m.DoctorPayrollStudioModal,
	})),
);

export interface DoctorPayrollReportProps {
	readonly period?: string;
	readonly onPeriodChange?: (period: string) => void;
	readonly onPrint?: () => void;
}

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
	const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

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
				fetch(`/api/reports/doctor-payroll?period=${encodeURIComponent(p)}`, {
					headers: denteClinicalReadHeaders(),
				}),
				fetch(`/api/reports/assistant-payroll?period=${encodeURIComponent(p)}`, {
					headers: denteClinicalReadHeaders(),
				}),
			]);

			let docData: {
				rows?: DoctorPayrollItem[];
				assistantRows?: AssistantPayrollItem[];
				totals?: DoctorPayrollTotals | null;
			} | null = null;
			let asstData: {
				rows?: AssistantPayrollItem[];
			} | null = null;

			if (docRes.status === "fulfilled" && docRes.value.ok) {
				docData = await docRes.value.json();
			}
			if (asstRes.status === "fulfilled" && asstRes.value.ok) {
				asstData = await asstRes.value.json();
			}

			if (docData || asstData) {
				setRows(Array.isArray(docData?.rows) ? docData.rows : []);
				setAssistantRows(
					Array.isArray(asstData?.rows)
						? asstData.rows
						: (Array.isArray(docData?.assistantRows) ? docData.assistantRows : []),
				);
				setTotals(docData?.totals || null);
			} else {
				setRows([]);
				setAssistantRows([]);
				setTotals(null);
			}
		} catch (err: unknown) {
			console.error("[DoctorPayrollReport] Failed to fetch payroll data:", err);
			setRows([]);
			setAssistantRows([]);
			setTotals(null);
		} finally {
			setLoading(false);
		}
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

	const handleExport = () => {
		const periodLabel = PERIOD_LABELS[activePeriod] || activePeriod;
		if (roleTab === "doctors") {
			exportDoctorPayrollToCsv(rows, totals, periodLabel);
		} else {
			exportAssistantPayrollToCsv(assistantRows, periodLabel);
		}
	};

	return (
		<div className="space-y-6" data-testid="doctor-payroll-report">
			{/* Компактный тулбар (32-36px) с переключением периодов и ролей */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
					{/* Apple Segmented Control: Врачи / Ассистенты */}
					<div className="flex items-center p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 w-full sm:w-auto">
						<button
							type="button"
							data-testid="payroll-role-doctors"
							onClick={() => setRoleTab("doctors")}
							className={`flex-1 sm:flex-initial h-8 sm:h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
								roleTab === "doctors"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-semibold"
									: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							Врачи ({rows.length})
						</button>
						<button
							type="button"
							data-testid="payroll-role-assistants"
							onClick={() => setRoleTab("assistants")}
							className={`flex-1 sm:flex-initial h-8 sm:h-7 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
								roleTab === "assistants"
									? "bg-[var(--paper)] text-[var(--ink)] shadow-xs font-semibold"
									: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
							}`}
						>
							Ассистенты ({assistantRows.length})
						</button>
					</div>

					<div className="h-4 w-px bg-[var(--line)] shrink-0 hidden sm:block" />

					{/* Периоды */}
					<div className="flex items-center justify-between sm:justify-start gap-1 overflow-x-auto py-0.5 no-scrollbar flex-nowrap w-full sm:w-auto">
						{(["day", "week", "month", "quarter", "year"] as const).map((p) => (
							<button
								key={p}
								type="button"
								data-testid={`payroll-period-${p}`}
								onClick={() => handlePeriodSelect(p)}
								className={`flex-1 sm:flex-initial h-8 sm:h-7 px-2.5 sm:px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 text-center ${
									activePeriod === p
										? "bg-[var(--primary)] text-white font-semibold shadow-xs"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)]"
								}`}
							>
								{PERIOD_LABELS[p]}
							</button>
						))}
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={() => fetchPayroll(activePeriod)}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:border-[var(--primary)] transition-colors cursor-pointer"
						title="Обновить ведомость"
					>
						<RefreshCw size={14} className={loading ? "animate-spin" : ""} />
					</button>

					<button
						type="button"
						onClick={handleExport}
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 sm:px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--primary)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
						title="Экспорт в CSV"
					>
						<Download size={14} aria-hidden="true" />
						<span className="hidden sm:inline">Экспорт CSV</span>
					</button>

					<button
						type="button"
						onClick={onPrint || (() => window.print())}
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 sm:px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--primary)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
					>
						<Printer size={14} aria-hidden="true" />
						<span className="hidden sm:inline">Печать</span>
					</button>

					<button
						type="button"
						onClick={() => setIsStudioOpen(true)}
						data-testid="payroll-open-studio-cta"
						className="primary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs shrink-0"
					>
						<Calculator size={14} aria-hidden="true" />
						<span className="hidden sm:inline">Расчетная ведомость</span>
						<span className="sm:hidden">Ведомость</span>
					</button>
				</div>
			</div>

			{/* Сводные плитки фонда оплаты труда (ФОТ) */}
			{roleTab === "doctors" ? (
				<div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Оказано услуг</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading
								? "..."
								: formatKopecksToRub(
										totals?.totalServicesRenderedKopecks ??
											rublesToKopecks(totals?.totalServicesRenderedRub || 0),
									)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Приёмов: {totals?.totalAppointmentsCompleted || 0}
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Списано техкарт</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading
								? "..."
								: formatKopecksToRub(
										totals?.totalMaterialsCostKopecks ??
											rublesToKopecks(totals?.totalMaterialsCostRub || 0),
									)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Расходные материалы
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Лаборатория (ЗТЛ)</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading
								? "..."
								: formatKopecksToRub(
										totals?.totalLabCostKopecks ??
											rublesToKopecks(totals?.totalLabCostRub || 0),
									)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Ортопедические наряды
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Чистая выручка (Net)</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading
								? "..."
								: formatKopecksToRub(
										totals?.totalNetRevenueKopecks ??
											rublesToKopecks(totals?.totalNetRevenueRub || 0),
									)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							База для комиссии врача
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Итого к выплате (ФОТ)</div>
						<div className="text-xl font-bold text-[var(--primary)]">
							{loading
								? "..."
								: formatKopecksToRub(
										totals?.totalPayoutKopecks ??
											rublesToKopecks(totals?.totalPayoutRub || 0),
									)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Начислено врачам
						</div>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Смен ассистентов</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : totalAssistantShifts}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Отработано часов: {totalAssistantHours} ч
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Приёмов с врачами</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading
								? "..."
								: assistantRows.reduce((acc, r) => acc + r.appointmentsAssisted, 0)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Ассистирование у кресла
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">Снимки и хирургия</div>
						<div className="text-xl font-bold text-[var(--ink)]">
							{loading ? "..." : `${totalAssistantRadiographs} / ${totalAssistantSurgeries}`}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							RVG снимки / Операции
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">НДФЛ 13%</div>
						<div className="text-xl font-bold text-[var(--ink-muted)]">
							{loading
								? "..."
								: formatRub(
										assistantRows.reduce((acc, r) => acc + r.ndflTaxRub, 0),
									)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Удержание налога
						</div>
					</div>

					<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
						<div className="text-xs text-[var(--ink-muted)] mb-1">К выплате на руки</div>
						<div className="text-xl font-bold text-[var(--primary)]">
							{loading ? "..." : formatRub(totalAssistantPayout)}
						</div>
						<div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
							Чистая зарплата ассистентов
						</div>
					</div>
				</div>
			)}

			{/* Таблицы начислений врачей и ассистентов */}
			{roleTab === "doctors" ? (
				<DoctorPayrollTable
					rows={rows}
					loading={loading}
					onOpenStudio={() => setIsStudioOpen(true)}
				/>
			) : (
				<AssistantPayrollTable
					assistantRows={assistantRows}
					loading={loading}
				/>
			)}

			{isStudioOpen && (
				<Suspense fallback={null}>
					<DoctorPayrollStudioModal
						isOpen={isStudioOpen}
						onClose={() => {
							setIsStudioOpen(false);
							void fetchPayroll(activePeriod);
						}}
					/>
				</Suspense>
			)}
		</div>
	);
};
