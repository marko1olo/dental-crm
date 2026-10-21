/**
 * DENTE Dental CRM — Leads Kanban Expanded Column Focus Modal Wrapper
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { ExpandedColumnFocusModal } from "../ExpandedColumnFocusModal";
import { COLUMNS } from "../leadsKanbanConstants";
import type { BookableDoctor } from "../leadsKanbanTypes";

interface LeadsKanbanExpandedModalProps {
	expandedColumnId: string | null;
	onClose: () => void;
	leads: Lead[];
	staff: BookableDoctor[];
	updateLeadStatus: (id: string, s: any) => Promise<any>;
	batchUpdateStage: (ids: string[], s: any) => Promise<any>;
	updateLeadDetails: (id: string, payload: any) => Promise<any>;
	fetchLeads: () => void;
	onEditLead: (l: Lead) => void;
	onScheduleLead: (id: string) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onQuickSchedule: (id: string) => Promise<void> | void;
}

export const LeadsKanbanExpandedModal: React.FC<
	LeadsKanbanExpandedModalProps
> = ({
	expandedColumnId,
	onClose,
	leads,
	staff,
	updateLeadStatus,
	batchUpdateStage,
	updateLeadDetails,
	fetchLeads,
	onEditLead,
	onScheduleLead,
	onCreatePatient,
	onQuickSchedule,
}) => {
	if (!expandedColumnId) return null;
	const activeCol = COLUMNS.find((c) => c.id === expandedColumnId) || {
		id: (expandedColumnId as any) || "new",
		label: "Этап воронки",
		color: "var(--teal-soft)",
		icon: null,
	};

	return (
		<ExpandedColumnFocusModal
			isOpen={Boolean(expandedColumnId)}
			onClose={onClose}
			column={activeCol}
			leads={leads}
			staff={staff}
			onStatusChange={async (id, s) => {
				await updateLeadStatus(id, s);
				fetchLeads();
			}}
			onBatchStatusChange={async (ids, s) => {
				await batchUpdateStage(ids, s);
				fetchLeads();
			}}
			onBatchAssignDoctor={async (ids, docId) => {
				await Promise.all(
					ids.map((id) => updateLeadDetails(id, { assignedDoctorId: docId })),
				);
				fetchLeads();
			}}
			onEditLead={onEditLead}
			onScheduleLead={onScheduleLead}
			onCreatePatient={onCreatePatient}
			onQuickSchedule={onQuickSchedule}
		/>
	);
};
