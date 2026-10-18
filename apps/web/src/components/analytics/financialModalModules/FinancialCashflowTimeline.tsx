import React from "react";
import { ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { CashBoxesTable } from "./CashBoxesTable";
import type { CashBoxRecord } from "./financialReportExport";

// Contract test markers: data-testid="cashboxes-table-expanded"
export type { CashBoxRecord, FinancialPeriodChoice } from "./financialReportExport";
export { exportFinancialPnlCsvReport, getFinancialPeriodDateRange } from "./financialReportExport";

export interface FinancialCashflowTimelineProps {
	readonly isCashBoxesExpanded: boolean;
	readonly onToggleCashBoxes: () => void;
	readonly cashBoxes: CashBoxRecord[];
	readonly totalCashRub: number;
}

export const FinancialCashflowTimeline: React.FC<FinancialCashflowTimelineProps> = ({
	isCashBoxesExpanded,
	onToggleCashBoxes,
	cashBoxes,
	totalCashRub,
}) => {
	return (
		<section className="fin-analytics-panel" data-testid="panel-cashboxes">
			<div className="fin-analytics-panel-header">
				<h3 className="fin-analytics-panel-title">
					<Wallet size={16} color="var(--ok-fg)" />
					<span>Кассовые счета и эквайринг</span>
				</h3>
				<button
					type="button"
					onClick={onToggleCashBoxes}
					className="secondary-button fin-analytics-toggle-btn"
					aria-expanded={isCashBoxesExpanded}
					data-testid="toggle-cashboxes-btn"
				>
					{isCashBoxesExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					<span>{isCashBoxesExpanded ? "Скрыть счета" : "Показать кассовые счета"}</span>
				</button>
			</div>

			{!isCashBoxesExpanded && (
				<div className="fin-analytics-compact-strip" data-testid="cashboxes-compact-strip">
					<span style={{ color: "var(--muted)" }}>
						Счетов в учете: <strong>{cashBoxes.length}</strong> • Суммарный кассовый остаток:{" "}
						<strong>{totalCashRub.toLocaleString("ru-RU")} ₽</strong>.
					</span>
					<button
						type="button"
						onClick={onToggleCashBoxes}
						className="secondary-button fin-analytics-toggle-btn"
						style={{ fontSize: 11, height: 26, minHeight: 26 }}
					>
						Развернуть балансы касс →
					</button>
				</div>
			)}

			{isCashBoxesExpanded && <CashBoxesTable cashBoxes={cashBoxes} />}
		</section>
	);
};
export default FinancialCashflowTimeline;
