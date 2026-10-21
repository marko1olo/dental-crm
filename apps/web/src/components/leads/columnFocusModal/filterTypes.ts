/**
 * DENTE Dental CRM — Column Focus Filter Types
 * Mandate 8b (<= 120 lines)
 */

import type { LeadStatus } from "../../../store/leadsStore";
import type { BookableDoctor } from "../leadsKanbanBooking";
import type { LeadSlaUrgency, LeadSortOption } from "../leadsKanbanTypes";
import type { ColumnMetrics } from "./types";

export interface ColumnFocusFilterRowProps {
	searchQuery: string;
	onSearchQueryChange: (q: string) => void;
	urgencyFilter: "all" | LeadSlaUrgency;
	onUrgencyFilterChange: (u: "all" | LeadSlaUrgency) => void;
	metrics: ColumnMetrics;
	sortOption: LeadSortOption;
	onSortOptionChange: (s: LeadSortOption) => void;
	onExportCsv: (onlySelected?: boolean) => void;
}

export interface ColumnFocusBulkActionBarProps {
	selectedLeadIds: Set<string>;
	totalDisplayLeads: number;
	onToggleSelectAll: () => void;
	nextStageInfo?: { status: LeadStatus; label: string } | null | undefined;
	isProcessingBatch: boolean;
	onBatchAdvance: () => void;
	onBatchMoveToStage: (status: LeadStatus) => void;
	staff: BookableDoctor[];
	batchTargetDoctorId: string;
	onBatchTargetDoctorIdChange: (id: string) => void;
	onBatchAssign: () => void;
	onExportCsv: (onlySelected?: boolean) => void;
	onClearSelection: () => void;
}
