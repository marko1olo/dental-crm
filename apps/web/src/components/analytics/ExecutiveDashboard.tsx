/**
 * apps/web/src/components/analytics/ExecutiveDashboard.tsx
 *
 * Главный пульт руководителя DENTE CRM (SSOT Оркестратор).
 *
 * ОБЪЕДИНЯЕТ 3 КАНОНИЧЕСКИХ ЭКРАНА БЕЗ МИКРО-ШРЕДЕРА:
 * 1. ExecutiveFinancialSummary — Финансовый пульт клиники и типы оплат
 * 2. DoctorPayrollReport — Ведомость начисления зарплаты врачам (Net Revenue)
 * 3. ChairOccupancyReport — Загрузка кресел и свободные окна
 *
 * Полное соответствие Apple HIG, отсутствие слоёного пирога, единый дизайн-код.
 */

import React, { lazy, Suspense, useCallback, useState } from "react";
import {
	Armchair,
	Calculator,
	CreditCard,
	DollarSign,
	FileSpreadsheet,
	Printer,
	Repeat,
	TrendingUp,
	Users,
} from "lucide-react";
import { ChairOccupancyReport } from "./ChairOccupancyReport";
import { DoctorPayrollReport } from "./DoctorPayrollReport";
import { ExecutiveFinancialSummary } from "./ExecutiveFinancialSummary";
import { RebookingConversionPanel } from "./RebookingConversionPanel";
import {
	CANONICAL_PERIOD_OPTIONS,
	type ExecutiveDashboardProps,
	type MobileAnalyticsPeriod,
} from "./executiveTypes";

const ManagerialPnlDashboardModal = lazy(() =>
	import("../finance/pnl/ManagerialPnlDashboardModal").then((m) => ({
		default: m.ManagerialPnlDashboardModal,
	})),
);

export { CANONICAL_PERIOD_OPTIONS };
export type { ExecutiveDashboardProps, MobileAnalyticsPeriod };

export type ExecutiveActiveTab = "financial" | "payroll" | "chairs" | "rebooking";

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = (props) => {
	const {
		period = "month",
		initialTab,
		onPeriodChange,
		onNavigateToSection,
		onOpenFinancialAnalytics,
	} = props;

	const [activeTab, setActiveTab] = useState<ExecutiveActiveTab>(() => {
		if (initialTab) return initialTab;
		if (typeof window !== "undefined") {
			const savedTab = sessionStorage.getItem("dente_executive_tab") || localStorage.getItem("dente_executive_tab");
			if (savedTab === "payroll" || savedTab === "chairs" || savedTab === "financial" || savedTab === "rebooking") {
				return savedTab;
			}
			const h = window.location.hash.toLowerCase();
			const s = window.location.search.toLowerCase();
			if (
				h.includes("payroll") ||
				s.includes("payroll") ||
				h.includes("payout") ||
				s.includes("payout") ||
				h.includes("salary") ||
				s.includes("salary")
			) {
				return "payroll";
			}
			if (h.includes("chairs") || s.includes("chairs")) {
				return "chairs";
			}
			if (h.includes("rebooking") || s.includes("rebooking") || h.includes("retention") || s.includes("retention")) {
				return "rebooking";
			}
		}
		return "financial";
	});
	const [currentPeriod, setCurrentPeriod] = useState<string>(period);
	const [isPnlModalOpen, setIsPnlModalOpen] = useState(false);

	const handlePeriodSelect = useCallback(
		(p: string) => {
			setCurrentPeriod(p);
			if (onPeriodChange) onPeriodChange(p as MobileAnalyticsPeriod);
		},
		[onPeriodChange],
	);

	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") window.print();
	}, []);

	return (
		<div
			className="executive-dashboard-container space-y-4"
			data-testid="executive-dashboard-root"
		>
			{/* Верхний лаконичный селектор режима (32-36px) — ровно 1 строка */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
				<div
					className="p-0.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] grid grid-cols-4 sm:flex sm:flex-nowrap gap-1 w-full sm:w-auto"
					role="tablist"
					aria-label="Вкладки финансового пульта"
				>
					<button
						type="button"
						role="tab"
						data-testid="executive-tab-financial"
						aria-selected={activeTab === "financial"}
						onClick={() => setActiveTab("financial")}
						className={`h-8 px-1.5 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 ${
							activeTab === "financial"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<CreditCard size={14} aria-hidden="true" className="shrink-0" />
						<span className="sm:hidden text-[11px]">Финансы</span>
						<span className="hidden sm:inline">Финансовый пульт</span>
					</button>

					<button
						type="button"
						role="tab"
						data-testid="executive-tab-payroll"
						aria-selected={activeTab === "payroll"}
						onClick={() => setActiveTab("payroll")}
						className={`h-8 px-1.5 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 ${
							activeTab === "payroll"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Users size={14} aria-hidden="true" className="shrink-0" />
						<span className="sm:hidden text-[11px]">Зарплаты</span>
						<span className="hidden sm:inline">Зарплаты врачей (Net)</span>
					</button>

					<button
						type="button"
						role="tab"
						data-testid="executive-tab-chairs"
						aria-selected={activeTab === "chairs"}
						onClick={() => setActiveTab("chairs")}
						className={`h-8 px-1.5 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 ${
							activeTab === "chairs"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Armchair size={14} aria-hidden="true" className="shrink-0" />
						<span className="sm:hidden text-[11px]">Кресла</span>
						<span className="hidden sm:inline">Загрузка кресел</span>
					</button>

					<button
						type="button"
						role="tab"
						data-testid="executive-tab-rebooking"
						aria-selected={activeTab === "rebooking"}
						onClick={() => setActiveTab("rebooking")}
						className={`h-8 px-1.5 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 ${
							activeTab === "rebooking"
								? "bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-xs"
								: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Repeat size={14} aria-hidden="true" className="shrink-0" />
						<span className="sm:hidden text-[11px]">Повтор</span>
						<span className="hidden sm:inline">Повторная запись</span>
					</button>
				</div>

				<div className="flex items-center justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={handlePrint}
						className="secondary-button h-8 px-2.5 sm:px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--primary)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
						title="Распечатать отчёт"
					>
						<Printer size={13} aria-hidden="true" />
						<span className="hidden sm:inline">Печать</span>
					</button>

					<button
						type="button"
						onClick={() => {
							if (onOpenFinancialAnalytics) onOpenFinancialAnalytics();
							else if (onNavigateToSection) onNavigateToSection("financial_analytics");
							else setIsPnlModalOpen(true);
						}}
						className="primary-button h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
					>
						<Calculator size={13} aria-hidden="true" />
						<span>Управленческий P&amp;L</span>
					</button>
				</div>
			</div>

			{/* Контент активного экрана */}
			<div className="executive-active-view-wrapper min-h-[400px]">
				{activeTab === "financial" && (
					<ExecutiveFinancialSummary
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}

				{activeTab === "payroll" && (
					<DoctorPayrollReport
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}

				{activeTab === "chairs" && (
					<ChairOccupancyReport
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}

				{activeTab === "rebooking" && (
					<RebookingConversionPanel
						period={currentPeriod}
						onPeriodChange={handlePeriodSelect}
						onPrint={handlePrint}
					/>
				)}
			</div>

			{isPnlModalOpen && (
				<Suspense fallback={null}>
					<ManagerialPnlDashboardModal
						isOpen={isPnlModalOpen}
						onClose={() => setIsPnlModalOpen(false)}
					/>
				</Suspense>
			)}
		</div>
	);
};
