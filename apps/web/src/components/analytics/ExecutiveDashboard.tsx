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
	TrendingUp,
	Users,
} from "lucide-react";
import { ChairOccupancyReport } from "./ChairOccupancyReport";
import { DoctorPayrollReport } from "./DoctorPayrollReport";
import { ExecutiveFinancialSummary } from "./ExecutiveFinancialSummary";
import { CANONICAL_PERIOD_OPTIONS } from "./executiveModules/ExecutiveCanonicalToolbar";
import type {
	ExecutiveDashboardProps,
	MobileAnalyticsPeriod,
} from "./executiveModules/executiveAnalyticsTypes";

const FinancialAnalyticsModal = lazy(() =>
	import("./FinancialAnalyticsModal").then((m) => ({
		default: m.FinancialAnalyticsModal,
	})),
);

export { CANONICAL_PERIOD_OPTIONS };
export type { ExecutiveDashboardProps, MobileAnalyticsPeriod };

export type ExecutiveActiveTab = "financial" | "payroll" | "chairs";

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = (props) => {
	const {
		period = "month",
		onPeriodChange,
		onNavigateToSection,
		onOpenFinancialAnalytics,
	} = props;

	const [activeTab, setActiveTab] = useState<ExecutiveActiveTab>("financial");
	const [currentPeriod, setCurrentPeriod] = useState<string>(period);
	const [isPnlModalOpen, setIsPnlModalOpen] = useState(false);

	const handlePeriodSelect = useCallback(
		(p: string) => {
			setCurrentPeriod(p);
			if (onPeriodChange) onPeriodChange(p as any);
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
					className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-nowrap"
					role="tablist"
					aria-label="Вкладки финансового пульта"
				>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "financial"}
						onClick={() => setActiveTab("financial")}
						className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
							activeTab === "financial"
								? "bg-[var(--teal)] text-white font-semibold shadow-sm"
								: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<CreditCard size={14} aria-hidden="true" />
						<span className="sm:hidden">Финансы</span>
						<span className="hidden sm:inline">Финансовый пульт</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "payroll"}
						onClick={() => setActiveTab("payroll")}
						className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
							activeTab === "payroll"
								? "bg-[var(--teal)] text-white font-semibold shadow-sm"
								: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<Users size={14} aria-hidden="true" />
						<span className="sm:hidden">Зарплаты</span>
						<span className="hidden sm:inline">Зарплаты врачей (Net)</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "chairs"}
						onClick={() => setActiveTab("chairs")}
						className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
							activeTab === "chairs"
								? "bg-[var(--teal)] text-white font-semibold shadow-sm"
								: "bg-transparent text-[var(--ink)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						<Armchair size={14} aria-hidden="true" />
						<span className="sm:hidden">Кресла</span>
						<span className="hidden sm:inline">Загрузка кресел</span>
					</button>
				</div>

				<div className="flex items-center justify-end gap-2 shrink-0">
					<button
						type="button"
						onClick={handlePrint}
						className="secondary-button h-8 px-2.5 sm:px-3 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium hover:border-[var(--teal)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
						className="primary-button h-8 px-3 rounded-lg bg-[var(--teal)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
					>
						<Calculator size={13} aria-hidden="true" />
						<span>Калькулятор P&amp;L</span>
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
			</div>

			{isPnlModalOpen && (
				<Suspense fallback={null}>
					<FinancialAnalyticsModal
						isOpen={isPnlModalOpen}
						onClose={() => setIsPnlModalOpen(false)}
						initialPeriod={
							currentPeriod === "quarter" || currentPeriod === "year"
								? (currentPeriod as any)
								: "month"
						}
					/>
				</Suspense>
			)}
		</div>
	);
};
