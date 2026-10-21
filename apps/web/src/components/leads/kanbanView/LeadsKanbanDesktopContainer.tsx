/**
 * DENTE Dental CRM — Leads Kanban Desktop Container
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { COLUMNS } from "../leadsKanbanConstants";
import { LeadsKanbanBoardGrid } from "./LeadsKanbanBoardGrid";
import { LeadsKanbanExpandedModal } from "./LeadsKanbanExpandedModal";
import { LeadsKanbanHeaderToolbar } from "./LeadsKanbanHeaderToolbar";
import type { LeadViewMode } from "./types";

interface LeadsKanbanDesktopContainerProps {
	leads: Lead[];
	filteredLeads: Lead[];
	staff: Array<{ id: string; fullName: string; role?: string }>;
	loadError: string | null;
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	sourceFilter: string;
	setSourceFilter: (s: string) => void;
	uniqueSources: string[];
	viewMode: LeadViewMode;
	setViewMode: (m: LeadViewMode) => void;
	secondaryLeadsCount: number;
	draggedLeadId: string | null;
	creatingPatientLeadId: string | null;
	expandedColumnId: string | null;
	setExpandedColumnId: (id: string | null) => void;
	onNewLead: () => void;
	onOpenAnalytics: () => void;
	onOpenLeakDetector: () => void;
	onDragOver: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent, status: Lead["status"]) => void;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (id: string, status: Lead["status"]) => void;
	onCreatePatient: (lead: Lead) => void;
	onSchedule: (id: string) => void;
	onQuickSchedule: (id: string) => void;
	onOpenPatientCard: (id: string) => void;
	updateLeadStatus: (id: string, status: Lead["status"]) => Promise<void>;
	batchUpdateStage: (ids: string[], status: Lead["status"]) => Promise<void>;
	updateLeadDetails: (id: string, updates: Partial<Lead>) => Promise<void>;
	fetchLeads: () => Promise<void>;
	modals: React.ReactNode;
}

export const LeadsKanbanDesktopContainer: React.FC<LeadsKanbanDesktopContainerProps> = (props) => {
	return (
		<div className="leads-board-container">
			<LeadsKanbanHeaderToolbar
				searchQuery={props.searchQuery}
				setSearchQuery={props.setSearchQuery}
				sourceFilter={props.sourceFilter}
				setSourceFilter={props.setSourceFilter}
				uniqueSources={props.uniqueSources}
				viewMode={props.viewMode}
				setViewMode={props.setViewMode}
				secondaryLeadsCount={props.secondaryLeadsCount}
				totalLeadsCount={props.leads.length}
				onNewLead={props.onNewLead}
				onOpenAnalytics={props.onOpenAnalytics}
				onOpenLeakDetector={props.onOpenLeakDetector}
				borderColor="var(--line)"
				colBg="var(--paper-soft)"
			/>
			{props.loadError && (
				<div role="alert" className="leads-error-banner">
					{props.loadError}
				</div>
			)}
			<LeadsKanbanBoardGrid
				activeColumns={COLUMNS}
				filteredLeads={props.filteredLeads}
				draggedLeadId={props.draggedLeadId}
				creatingPatientLeadId={props.creatingPatientLeadId}
				borderColor="var(--line)"
				cardBg="var(--paper)"
				onDragOver={props.onDragOver}
				onDrop={props.onDrop}
				onExpandColumn={(id) => props.setExpandedColumnId(id)}
				onDragStart={props.onDragStart}
				onEditLead={props.onEditLead}
				onStatusChange={props.onStatusChange}
				onCreatePatient={props.onCreatePatient}
				onSchedule={props.onSchedule}
				onQuickSchedule={props.onQuickSchedule}
				onOpenPatientCard={props.onOpenPatientCard}
			/>
			{props.modals}
			<LeadsKanbanExpandedModal
				expandedColumnId={props.expandedColumnId}
				onClose={() => props.setExpandedColumnId(null)}
				leads={props.leads}
				staff={props.staff}
				updateLeadStatus={props.updateLeadStatus}
				batchUpdateStage={props.batchUpdateStage}
				updateLeadDetails={props.updateLeadDetails}
				fetchLeads={props.fetchLeads}
				onEditLead={props.onEditLead}
				onScheduleLead={props.onSchedule}
				onCreatePatient={props.onCreatePatient}
				onQuickSchedule={props.onQuickSchedule}
			/>
		</div>
	);
};
