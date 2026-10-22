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
export type LeadViewMode = LeadsKanbanViewMode;

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
	totalLeadsCount?: number;
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

export * from "./leadScheduleWindow";
