import React from "react";
import type { ExecutiveDepartmentItem } from "@dental/shared";
import { formatRublesClean } from "./executiveModules/executiveAnalyticsTypes";
import { ExecutiveDeptCard } from "./executiveModules/ExecutiveDeptCard";

export interface ExecutivePnlWidgetProps {
	readonly departments: readonly ExecutiveDepartmentItem[];
	readonly totalRevenueFormatted: string;
	readonly totalPlanFormatted: string;
	readonly overallFulfillmentPercent: number;
	readonly onOpenPnl?: () => void;
}

export const ExecutivePnlWidget: React.FC<ExecutivePnlWidgetProps> = ({
	departments,
	totalRevenueFormatted,
	totalPlanFormatted,
	overallFulfillmentPercent,
	onOpenPnl,
}) => {
	return (
		<div className="executive-dept-list" role="region" aria-label="План/факт выручки по отделениям клиники">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0.875rem 0.5rem",
					background: "transparent",
					borderBottom: "1px solid var(--line, #cbd5e1)",
					fontWeight: 600,
					fontSize: "0.875rem",
					flexWrap: "wrap",
					gap: "0.5rem",
				}}
			>
				<div>
					<span>Итого по клинике: </span>
					<strong style={{ fontSize: "1rem", color: "var(--ink, #0f172a)", marginLeft: "0.25rem" }}>
						{formatRublesClean(totalRevenueFormatted)}
					</strong>
					<span style={{ color: "var(--muted, #64748b)", marginLeft: "0.5rem" }}>
						(план: {formatRublesClean(totalPlanFormatted)})
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<span>Выполнение: </span>
					<strong style={{ color: overallFulfillmentPercent >= 95 ? "var(--ok-fg, #10b981)" : "var(--warn-fg, #f59e0b)" }}>
						{overallFulfillmentPercent}%
					</strong>
				</div>
			</div>

			{departments.map((dept) => (
				<ExecutiveDeptCard key={dept.departmentKey} dept={dept} />
			))}

			{onOpenPnl && (
				<div style={{ padding: "0.75rem 0.5rem", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line, #cbd5e1)" }}>
					<button
						type="button"
						className="secondary-button executive-refresh-btn"
						onClick={onOpenPnl}
						style={{ fontSize: "12px", height: "30px" }}
					>
						Открыть детальный P&amp;L отчет
					</button>
				</div>
			)}
		</div>
	);
};

export default ExecutivePnlWidget;
