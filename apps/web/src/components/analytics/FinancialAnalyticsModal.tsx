import React, { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import "./financialAnalytics.css";
import {
	FinancialCashflowTimeline,
	type FinancialPeriodChoice,
} from "./financialModalModules/FinancialCashflowTimeline";
import { FinancialModalHeader } from "./financialModalModules/FinancialModalHeader";
import { FinancialModalFooter } from "./financialModalModules/FinancialModalFooter";
import {
	FinancialDepartmentsSection,
	FinancialExpensesSection,
	FinancialPnlKpiStrip,
} from "./financialModalModules/FinancialPnlBreakdownSection";
import { useFinancialModalData } from "./financialModalModules/useFinancialModalData";

// Contract endpoints: /api/analytics/executive, /api/cash/cash-box, /api/cash/expense-reasons
export interface FinancialAnalyticsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialPeriod?: FinancialPeriodChoice;
}

export function FinancialAnalyticsModal({
	isOpen,
	onClose,
	initialPeriod = "month",
}: FinancialAnalyticsModalProps) {
	const {
		period,
		setPeriod,
		isLoading,
		isDeptsExpanded,
		setIsDeptsExpanded,
		isCashBoxesExpanded,
		setIsCashBoxesExpanded,
		isExpensesExpanded,
		setIsExpensesExpanded,
		executiveKpis,
		departments,
		cashBoxes,
		expenseReasons,
		realPnl,
		metrics,
		totalCashRub,
		loadFinancialData,
	} = useFinancialModalData(isOpen, initialPeriod);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="fin-analytics-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label="Финансовая аналитика и P&L"
			data-testid="financial-analytics-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="fin-analytics-modal">
				<FinancialModalHeader
					period={period}
					onPeriodChange={setPeriod}
					metrics={metrics}
					isLoading={isLoading}
					onRefresh={loadFinancialData}
					onClose={onClose}
				/>

				<FinancialPnlKpiStrip metrics={metrics} executiveKpis={executiveKpis} realPnl={realPnl} />

				<div className="fin-analytics-body">
					<FinancialDepartmentsSection
						isDeptsExpanded={isDeptsExpanded}
						onToggleDepts={() => setIsDeptsExpanded(!isDeptsExpanded)}
						departments={departments}
						totalCompletedVisits={executiveKpis?.totalCompletedVisits || 0}
					/>
					<FinancialCashflowTimeline
						isCashBoxesExpanded={isCashBoxesExpanded}
						onToggleCashBoxes={() => setIsCashBoxesExpanded(!isCashBoxesExpanded)}
						cashBoxes={cashBoxes}
						totalCashRub={totalCashRub}
					/>
					<FinancialExpensesSection
						isExpensesExpanded={isExpensesExpanded}
						onToggleExpenses={() => setIsExpensesExpanded(!isExpensesExpanded)}
						expenseReasons={expenseReasons}
						realPnl={realPnl}
						totalOpexRub={metrics.totalOpexRub}
					/>
					<div className="fin-analytics-privacy-note" data-testid="financial-privacy-note">
						<ShieldCheck size={16} style={{ color: "var(--teal)", flexShrink: 0 }} />
						<span>Защита персональных данных и врачебной тайны: финансовый учёт оперирует исключительно агрегированными кассовыми суммами.</span>
					</div>
					<FinancialModalFooter onClose={onClose} />
				</div>
			</div>
		</div>
	);
}

export default FinancialAnalyticsModal;
