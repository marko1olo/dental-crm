/**
 * DENTE Dental CRM — Leads Kanban Shared Modals Props
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import type { Lead } from "../../../store/leadsStore";
import type { LeadConvertSubmitOptions } from "../LeadConvertModal";
import type { BookableChair, BookableDoctor } from "../leadsKanbanTypes";

export interface LeadsKanbanSharedModalsProps {
	isConvertOpen: boolean;
	onCloseConvert: () => void;
	onConvertSubmit: (
		e: React.FormEvent,
		options?: LeadConvertSubmitOptions,
	) => Promise<void> | void;
	staff: BookableDoctor[];
	chairs: BookableChair[];
	selectedDoctorId: string;
	setSelectedDoctorId: React.Dispatch<React.SetStateAction<string>>;
	selectedChairId: string;
	setSelectedChairId: React.Dispatch<React.SetStateAction<string>>;
	appointmentDate: string;
	setAppointmentDate: (date: string) => void;
	appointmentTime: string;
	setAppointmentTime: (time: string) => void;
	isBooking: boolean;
	convertingLead: Lead | null;
	isEditOpen: boolean;
	onCloseEdit: () => void;
	editingLeadId: string | null;
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	onEditSubmit: (e: React.FormEvent) => Promise<void> | void;
	isDeleting: boolean;
	onDeleteLead: () => Promise<void> | void;
	creatingPatientLeadId: string | null;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	leads: Lead[];
	isAnalyticsOpen: boolean;
	onCloseAnalytics: () => void;
	isLeakDetectorOpen: boolean;
	onCloseLeakDetector: () => void;
	onOpenLeakDetector: () => void;
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}
