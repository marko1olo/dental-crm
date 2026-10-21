/**
 * DENTE Dental CRM — Leads Kanban Columns Board Grid
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import type { Lead } from "../../../store/leadsStore";
import { type ColumnConfig, isLeadInKanbanColumn } from "../leadsKanbanTypes";
import { LeadKanbanColumn } from "./LeadKanbanColumn";

interface LeadsKanbanBoardGridProps {
	activeColumns: readonly ColumnConfig[];
	filteredLeads: Lead[];
	draggedLeadId: string | null;
	creatingPatientLeadId: string | null;
	borderColor: string;
	cardBg: string;
	onDragOver: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent, status: Lead["status"]) => void;
	onExpandColumn: (colId: Lead["status"]) => void;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (
		e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
		leadId: string,
		nextStatus: Lead["status"],
		options?: { reason?: string; dropReason?: string },
	) => void;
	onCreatePatient: (lead: Lead) => void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule: (leadId: string) => void;
	onOpenPatientCard: (patientId: string) => void;
}

export const LeadsKanbanBoardGrid: React.FC<LeadsKanbanBoardGridProps> = ({
	activeColumns,
	filteredLeads,
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
	return (
		<div
			className="leads-kanban-board leads-kanban-board--funnel"
			data-testid="leads-kanban-board"
		>
			{activeColumns.map((col) => {
				const columnLeads = filteredLeads.filter((l) =>
					isLeadInKanbanColumn(l.status, col.id),
				);
				return (
					<LeadKanbanColumn
						key={col.id}
						column={col}
						columnLeads={columnLeads}
						draggedLeadId={draggedLeadId}
						creatingPatientLeadId={creatingPatientLeadId}
						borderColor={borderColor}
						cardBg={cardBg}
						onDragOver={onDragOver}
						onDrop={onDrop}
						onExpandColumn={onExpandColumn}
						onDragStart={onDragStart}
						onEditLead={onEditLead}
						onStatusChange={onStatusChange}
						onCreatePatient={onCreatePatient}
						onSchedule={onSchedule}
						onQuickSchedule={onQuickSchedule}
						onOpenPatientCard={onOpenPatientCard}
					/>
				);
			})}
		</div>
	);
};
