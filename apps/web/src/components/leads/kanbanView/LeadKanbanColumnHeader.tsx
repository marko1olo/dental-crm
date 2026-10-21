/**
 * DENTE Dental CRM — Leads Kanban Column Header
 * Stage Icon, Label, Counter, Revenue, SLA Breach Pulse & Expand Button
 * Mandate 8b (<= 120 lines)
 */

import { AlertTriangle, DollarSign, Maximize2 } from "lucide-react";
import React from "react";
import type { LeadStatus } from "../../../store/leadsStore";
import type { ColumnConfig } from "../leadsKanbanConstants";

interface LeadKanbanColumnHeaderProps {
	column: ColumnConfig;
	count: number;
	revenue: number;
	breachedCount: number;
	onExpandColumn: (id: LeadStatus) => void;
}

export const LeadKanbanColumnHeader: React.FC<LeadKanbanColumnHeaderProps> = ({
	column: col,
	count,
	revenue,
	breachedCount,
	onExpandColumn,
}) => {
	return (
		<div className="leads-kanban-column-header">
			<div className="leads-kanban-column-title-row">
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						minWidth: 0,
					}}
				>
					<div
						className="leads-kanban-column-icon"
						style={{ background: col.color }}
					>
						{col.icon}
					</div>
					<h3 className="leads-kanban-column-title" title={col.label}>
						{col.label}
					</h3>
				</div>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 5,
						flexShrink: 0,
					}}
				>
					<span className="leads-kanban-column-count">{count}</span>
					<button
						type="button"
						onClick={() => onExpandColumn(col.id)}
						className="leads-kanban-column-expand-btn"
						title={`Распахнуть этап «${col.label}» во весь экран (Focus Workspace)`}
						aria-label={`Распахнуть этап ${col.label}`}
						data-testid={`expand-column-${col.id}`}
					>
						<Maximize2 size={13} />
					</button>
				</div>
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 6,
					marginTop: revenue > 0 || breachedCount > 0 ? 2 : 0,
				}}
			>
				{revenue > 0 ? (
					<div className="leads-kanban-column-revenue">
						<DollarSign size={13} /> {revenue.toLocaleString("ru-RU")} ₽
					</div>
				) : (
					<div />
				)}
				{breachedCount > 0 && (
					<div
						className="leads-column-sla-breach-indicator lead-sla-breached-pulse"
						title={`Просрочен регламент ответа у ${breachedCount} обращений`}
					>
						<AlertTriangle size={11} className="shrink-0" />
						<span>SLA: {breachedCount}</span>
					</div>
				)}
			</div>
		</div>
	);
};
