/**
 * DENTE Dental CRM — Leads Kanban View Modular Types & Helpers
 *
 * Mandate 8s (Modular Architecture & SSOT Types):
 * Props types for kanban board, lead cards, funnel stage columns, source filters, and SLA.
 */

import type React from "react";
import { dateInputValuePlusDays } from "../../../AppHelpers";
import type { Lead } from "../../../store/leadsStore";
import {
	type ColumnConfig,
	resolveLeadVisitMinutes,
} from "../leadsKanbanTypes";

export * from "../leadsKanbanTypes";

export type LeadsKanbanViewMode = "funnel" | "all";

export type LeadQuickStatusChangeHandler = (
	e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
	leadId: string,
	nextStatus: Lead["status"],
	options?: { reason?: string; dropReason?: string },
) => Promise<void> | void;

export interface LeadsKanbanHeaderToolbarProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	sourceFilter: string;
	setSourceFilter: (val: string) => void;
	uniqueSources: string[];
	viewMode: LeadsKanbanViewMode;
	setViewMode: (val: LeadsKanbanViewMode) => void;
	secondaryLeadsCount?: number;
	onNewLead: () => void;
	onOpenAnalytics: () => void;
	onOpenLeakDetector: () => void;
	borderColor?: string;
	colBg?: string;
}

export interface LeadKanbanCardProps {
	lead: Lead;
	isDragged: boolean;
	creatingPatientLeadId: string | null;
	borderColor: string;
	cardBg: string;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onEdit: (lead: Lead) => void;
	onStatusChange: LeadQuickStatusChangeHandler;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
	onOpenPatientCard?: (patientId: string) => void;
}

export interface LeadKanbanColumnProps {
	column: ColumnConfig;
	columnLeads: Lead[];
	draggedLeadId: string | null;
	creatingPatientLeadId: string | null;
	borderColor: string;
	cardBg: string;
	onDragOver: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent, status: Lead["status"]) => void;
	onExpandColumn: (columnId: Lead["status"]) => void;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: LeadQuickStatusChangeHandler;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule: (leadId: string) => Promise<void> | void;
	onOpenPatientCard: (patientId: string) => void;
}

export interface LeadScheduleWindowDashboardContext {
	clinicSettings?: {
		profile?: {
			timezone?: string | null;
			defaultVisitMinutes?: number | null;
		} | null;
	} | null;
}

/**
 * Resolves the default lead appointment scheduling window in the clinic's timezone
 * and exposes canonical action identifiers for kanban coordination.
 */
export function resolveLeadDefaultScheduleWindow(
	dashboard?: LeadScheduleWindowDashboardContext | null,
	appointmentDate?: string,
	appointmentTime = "10:00",
) {
	const clinicTimeZone = dashboard?.clinicSettings?.profile?.timezone ?? null;
	const targetDate =
		appointmentDate || dateInputValuePlusDays(1, clinicTimeZone);
	const startDateTime = new Date(`${targetDate}T${appointmentTime || "10:00"}:00`);
	const effectiveVisitMins = resolveLeadVisitMinutes(
		dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null,
	);
	const endDateTime = new Date(
		startDateTime.getTime() + effectiveVisitMins * 60000,
	);
	return {
		clinicTimeZone,
		targetDate,
		startDateTime,
		endDateTime,
		appointmentStart: startDateTime.toISOString(),
		appointmentEnd: endDateTime.toISOString(),
		delegatedActions: [
			"batchUpdateStage",
			"onOpenPatientCard",
			"quickReason",
		] as const,
	};
}
