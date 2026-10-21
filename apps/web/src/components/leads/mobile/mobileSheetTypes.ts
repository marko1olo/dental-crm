/**
 * DENTE Dental CRM — Mobile Bottom Sheet Types
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import type { Lead, LeadStatus } from "../../../store/leadsStore";

export interface LeadMobileBottomSheetProps {
	lead: Lead | null;
	isOpen: boolean;
	onClose: () => void;
	onStatusChange: (
		e: React.MouseEvent,
		leadId: string,
		nextStatus: LeadStatus,
		options?: { reason?: string; dropReason?: string },
	) => void;
	onSchedule?: ((leadId: string) => void) | undefined;
	onQuickSchedule?: ((leadId: string) => Promise<void> | void) | undefined;
	onCreatePatient?: ((lead: Lead) => Promise<void> | void) | undefined;
	onUpdateNotes?:
		| ((leadId: string, notes: string) => Promise<void> | void)
		| undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	creatingPatientLeadId?: string | null | undefined;
}
