/**
 * DENTE Dental CRM — Leads Kanban Stage Column Component
 * Mandate 8s (Modular Architecture & Verbatim Extraction), Mandate 8b (<= 120 lines)
 */

import React from "react";
import { AnimatePresence } from "framer-motion";
import { getLeadSlaStatus } from "../leadsKanbanTypes";
import { LeadKanbanCard } from "./LeadKanbanCard";
import { LeadKanbanColumnHeader } from "./LeadKanbanColumnHeader";
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
	const columnRevenue = columnLeads.reduce((acc, l) => acc + (Number(l.expectedRevenue) || 0), 0);
	const breachedLeadsCount = columnLeads.filter((l) => getLeadSlaStatus(l).isBreached).length;

	return (
		<section
			aria-label={col.label}
			onDragOver={onDragOver}
			onDrop={(e) => onDrop(e, col.id)}
			className="leads-kanban-column"
			data-testid={`leads-kanban-column-${col.id}`}
		>
			<LeadKanbanColumnHeader
				column={col}
				count={columnLeads.length}
				revenue={columnRevenue}
				breachedCount={breachedLeadsCount}
				onExpandColumn={(id) => onExpandColumn(id as any)}
			/>

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
