/**
 * DENTE Dental CRM — Lead Card Types
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import type { Lead } from "../../../store/leadsStore";

export interface LeadCardProps {
	lead: Lead;
	isDragged: boolean;
	creatingPatientLeadId: string | null;
	borderColor: string;
	cardBg: string;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onEdit: (lead: Lead) => void;
	onStatusChange: (
		e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
		leadId: string,
		nextStatus: Lead["status"],
		options?: { reason?: string; dropReason?: string },
	) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
	onOpenPatientCard?: (patientId: string) => void;
}
