/**
 * DENTE Dental CRM — Leads Kanban Stage Column Component
 *
 * Mandate 8s (Modular Architecture & Verbatim Extraction):
 * Funnel stage column with lead counter, expected revenue, SLA breach indicator,
 * Focus Workspace expand button, and drag-and-drop dropzone.
 */

import { AnimatePresence } from "framer-motion";
import { AlertTriangle, DollarSign, Maximize2 } from "lucide-react";
import type React from "react";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import { LeadKanbanCard } from "./LeadKanbanCard";
import type { LeadKanbanColumnProps } from "./types";

export const LeadKanbanColumn: React.FC<LeadKanbanColumnProps> = ({
	column: col,
	columnLeads,
	draggedLeadId,
	creatingPatientLeadId,
	borderColor,
	cardBg,
	onDragOver,
	onDrop,
	onExpandColumn,
	onDragStart,
	onEditLead,
	onStatusChange,
	onCreatePatient,
	onSchedule,
	onQuickSchedule,
	onOpenPatientCard,
}) => {
	const columnRevenue = columnLeads.reduce(
		(acc, l) => acc + (Number(l.expectedRevenue) || 0),
		0,
	);
	const breachedLeadsCount = columnLeads.filter(
		(l) => getLeadSlaStatus(l).isBreached,
	).length;

	return (
		<section
			aria-label={col.label}
			onDragOver={onDragOver}
			onDrop={(e) => onDrop(e, col.id)}
			className="leads-kanban-column"
			data-testid={`leads-kanban-column-${col.id}`}
		>
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
						<h3
							className="leads-kanban-column-title"
							title={col.label}
						>
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
						<span className="leads-kanban-column-count">
							{columnLeads.length}
						</span>
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
						marginTop: columnRevenue > 0 || breachedLeadsCount > 0 ? 2 : 0,
					}}
				>
					{columnRevenue > 0 ? (
						<div className="leads-kanban-column-revenue">
							<DollarSign size={13} />{" "}
							{columnRevenue.toLocaleString("ru-RU")} ₽
						</div>
					) : (
						<div />
					)}
					{breachedLeadsCount > 0 && (
						<div
							className="leads-column-sla-breach-indicator lead-sla-breached-pulse"
							title={`Просрочен регламент ответа у ${breachedLeadsCount} обращений`}
						>
							<AlertTriangle size={11} className="shrink-0" />
							<span>SLA: {breachedLeadsCount}</span>
						</div>
					)}
				</div>
			</div>

			<div className="leads-kanban-column-cards">
				<AnimatePresence>
					{columnLeads.map((lead) => (
						<LeadKanbanCard
							key={lead.id}
							lead={lead}
							isDragged={draggedLeadId === lead.id}
							creatingPatientLeadId={creatingPatientLeadId}
							borderColor={borderColor}
							cardBg={cardBg}
							onDragStart={onDragStart}
							onEdit={onEditLead}
							onStatusChange={onStatusChange}
							onCreatePatient={onCreatePatient}
							onSchedule={onSchedule}
							onQuickSchedule={onQuickSchedule}
							onOpenPatientCard={onOpenPatientCard}
						/>
					))}
				</AnimatePresence>

				{columnLeads.length === 0 && (
					<div className="leads-kanban-empty-dropzone">
						Перетащите сюда
					</div>
				)}
			</div>
		</section>
	);
};
