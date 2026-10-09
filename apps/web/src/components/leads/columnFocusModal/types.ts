/**
 * DENTE Dental CRM — Expanded Column Focus Workspace Types (Layer 0)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * Pure type definitions and interfaces for the focused kanban column workspace.
 */

import type React from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";
import type {
	BookableDoctor,
	LeadSlaUrgency,
	LeadSortOption,
} from "../leadsKanbanTypes";

export type ViewMode = "cards" | "table";

export interface ColumnFocusColumnInfo {
	id: LeadStatus;
	label: string;
	color: string;
	icon: React.ReactNode;
}

export interface ExpandedColumnFocusModalProps {
	isOpen: boolean;
	onClose: () => void;
	column: ColumnFocusColumnInfo;
	leads: Lead[];
	staff: BookableDoctor[];
	onStatusChange: (leadId: string, nextStatus: LeadStatus) => Promise<void> | void;
	onBatchStatusChange: (leadIds: string[], nextStatus: LeadStatus) => Promise<void> | void;
	onBatchAssignDoctor: (leadIds: string[], doctorId: string) => Promise<void> | void;
	onEditLead: (lead: Lead) => void;
	onScheduleLead: (leadId: string) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
}

export interface ColumnMetrics {
	totalCount: number;
	totalRevenue: number;
	breachedCount: number;
	warningCount: number;
	freshCount: number;
	avgWaitMinutes: number;
}

export interface NextStageInfo {
	status: LeadStatus;
	label: string;
	color?: string;
}

export interface ColumnFocusHeaderProps {
	column: ColumnFocusColumnInfo;
	metrics: ColumnMetrics;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	onClose: () => void;
}

export interface ColumnFocusBatchToolbarProps {
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
	urgencyFilter: "all" | LeadSlaUrgency;
	onUrgencyFilterChange: (urgency: "all" | LeadSlaUrgency) => void;
	metrics: ColumnMetrics;
	sortOption: LeadSortOption;
	onSortOptionChange: (sort: LeadSortOption) => void;
	onExportCsv: (onlySelected?: boolean) => void;
	selectedLeadIds: Set<string>;
	totalDisplayLeads: number;
	onToggleSelectAll: () => void;
	nextStageInfo?: NextStageInfo;
	isProcessingBatch: boolean;
	onBatchAdvance: () => void;
	onBatchMoveToStage: (nextStatus: LeadStatus) => void;
	staff: BookableDoctor[];
	batchTargetDoctorId: string;
	onBatchTargetDoctorIdChange: (doctorId: string) => void;
	onBatchAssign: () => void;
	onClearSelection: () => void;
}

export interface ColumnFocusListBaseProps {
	displayLeads: Lead[];
	visibleLeads: Lead[];
	selectedLeadIds: Set<string>;
	onToggleSelectLead: (id: string, e?: React.MouseEvent) => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (leadId: string, nextStatus: LeadStatus) => Promise<void> | void;
	onScheduleLead: (leadId: string) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onClose: () => void;
	nextStageInfo?: NextStageInfo;
	visibleLimit: number;
	onLoadMore: () => void;
}

export interface ColumnFocusCardsListProps extends ColumnFocusListBaseProps {}

export interface ColumnFocusTableViewProps extends ColumnFocusListBaseProps {
	onToggleSelectAll: () => void;
}
