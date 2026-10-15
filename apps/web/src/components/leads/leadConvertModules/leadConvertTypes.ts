/**
 * DENTE Dental CRM — Leads Conversion Modal Types (Layer 0)
 * 
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Zero Dead-Ends)
 */

import type React from "react";
import type { Lead } from "../../../store/leadsStore";
import type { BookableChair, BookableDoctor } from "../LeadsKanbanView";

export type LeadConvertMode = "patient_only" | "patient_and_appointment";

export interface LeadConvertSubmitOptions {
	mode?: LeadConvertMode | undefined;
	consentMedical: boolean;
	consentMarketing: boolean;
	reason?: string | undefined;
	comment?: string | undefined;
}

export interface LeadConvertModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (
		e: React.FormEvent,
		options?: LeadConvertSubmitOptions,
	) => void;
	staff: BookableDoctor[];
	chairs: BookableChair[];
	effectiveStaff: BookableDoctor[];
	effectiveChairs: BookableChair[];
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedChairId: string;
	setSelectedChairId: (id: string) => void;
	appointmentDate: string;
	setAppointmentDate: (date: string) => void;
	appointmentTime: string;
	setAppointmentTime: (time: string) => void;
	isBooking: boolean;
	lead?: Lead | null;
	consentMedical?: boolean;
	setConsentMedical?: (val: boolean) => void;
	consentMarketing?: boolean;
	setConsentMarketing?: (val: boolean) => void;
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}

export interface LeadConvertPatientFieldsProps {
	lead: Lead | null;
	borderColor: string;
	consentMedical: boolean;
	setConsentMedical: (val: boolean) => void;
	consentMarketing: boolean;
	setConsentMarketing: (val: boolean) => void;
}

export interface LeadConvertAppointmentFieldsProps {
	staff: BookableDoctor[];
	chairs: BookableChair[];
	effectiveStaff: BookableDoctor[];
	effectiveChairs: BookableChair[];
	selectedDoctorId: string;
	setSelectedDoctorId: (id: string) => void;
	selectedChairId: string;
	setSelectedChairId: (id: string) => void;
	reason: string;
	setReason: (val: string) => void;
	comment: string;
	setComment: (val: string) => void;
	appointmentDate: string;
	setAppointmentDate: (date: string) => void;
	appointmentTime: string;
	setAppointmentTime: (time: string) => void;
	colBg: string;
	borderColor: string;
}
