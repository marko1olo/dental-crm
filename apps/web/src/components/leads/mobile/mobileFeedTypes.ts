/**
 * DENTE Dental CRM — Leads Mobile Feed View Types
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";

export interface LeadsMobileFeedViewProps {
	leads: Lead[];
	onNewLead: () => void;
	onEditLead: (lead: Lead) => void;
	onStatusChange: (
		e: React.MouseEvent,
		leadId: string,
		nextStatus: LeadStatus,
		options?: { reason?: string; dropReason?: string },
	) => void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
	onCreatePatient?: (lead: Lead) => Promise<void> | void;
	onUpdateLeadDetails?: (
		id: string,
		details: Partial<Omit<Lead, "id">>,
	) => Promise<void> | void;
	onOpenPatientCard?: (patientId: string) => void;
	creatingPatientLeadId?: string | null;
	onOpenAnalytics?: () => void;
	onOpenLeakDetector?: () => void;
}
