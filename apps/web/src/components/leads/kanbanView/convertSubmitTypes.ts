/**
 * DENTE Dental CRM — Leads Convert Submit Options Types
 * Mandate 8b (<= 120 lines)
 */

import type {
	ConvertLeadResult,
	ConvertLeadToAppointmentPayload,
	Lead,
} from "../../../store/leadsStore";
import type { BookableChair, BookableDoctor } from "../leadsKanbanTypes";
export type { PendingBookingInfo } from "./useLeadBookingNavigation";
import type { PendingBookingInfo } from "./useLeadBookingNavigation";

export interface ConvertSubmitOptions {
	convertingLeadId: string | null;
	isBooking: boolean;
	setIsBooking: (b: boolean) => void;
	leads: Lead[];
	staff: BookableDoctor[];
	chairs: BookableChair[];
	selectedDoctorId: string;
	selectedChairId: string;
	appointmentDate: string;
	appointmentTime: string;
	visitMinutes: number | null | undefined;
	clinicTimeZone: string | null | undefined;
	convertLeadToAppointment: (
		id: string,
		payload: ConvertLeadToAppointmentPayload,
	) => Promise<ConvertLeadResult>;
	fetchLeads: () => void;
	setIsConvertOpen: (b: boolean) => void;
	setConvertingLeadId: (id: string | null) => void;
	navigateToScheduleWithBooking: (b: PendingBookingInfo) => void;
}
