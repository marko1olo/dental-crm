/**
 * DENTE Dental CRM — Lead Form Modal Types
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import type { Lead } from "../../../store/leadsStore";

export interface LeadFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	editingLeadId: string | null;
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	onSubmit: (e: React.FormEvent) => void;
	isDeleting: boolean;
	onDelete: () => void;
	creatingPatientLeadId: string | null;
	onCreatePatient: (lead: Lead) => void;
	leads: Lead[];
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}
