/**
 * DENTE Dental CRM — Lead Appointment Conversion Bridge Hook
 * Mandate 8b (<= 120 lines)
 */

import type { Lead } from "../../../store/leadsStore";
import type { BookableChair, BookableDoctor } from "../leadsKanbanTypes";
import { useLeadConvertModalSubmit } from "./useLeadConvertModalSubmit";
import { useLeadScheduleHandlers } from "./useLeadScheduleHandlers";
import type { useLeadsKanbanViewState } from "./useLeadsKanbanViewState";

interface UseLeadAppointmentConversionBridgeProps {
	leads: Lead[];
	staff: BookableDoctor[];
	chairs: BookableChair[];
	selectedDoctorId: string;
	selectedChairId: string;
	v: ReturnType<typeof useLeadsKanbanViewState>;
	visitMinutes: number | null | undefined;
	clinicTimeZone: string | null | undefined;
	convertLeadToAppointment: (id: string, payload: any) => Promise<any>;
	fetchLeads: () => void | Promise<void>;
	navigateToScheduleWithBooking: (data: any) => void;
}

export function useLeadAppointmentConversionBridge({
	leads,
	staff,
	chairs,
	selectedDoctorId,
	selectedChairId,
	v,
	visitMinutes,
	clinicTimeZone,
	convertLeadToAppointment,
	fetchLeads,
	navigateToScheduleWithBooking,
}: UseLeadAppointmentConversionBridgeProps) {
	const { handleQuickSchedule } = useLeadScheduleHandlers({
		leads,
		staff,
		chairs,
		selectedDoctorId,
		selectedChairId,
		appointmentDate: v.appointmentDate,
		appointmentTime: v.appointmentTime,
		visitMinutes,
		clinicTimeZone,
		convertLeadToAppointment,
		fetchLeads,
		navigateToScheduleWithBooking,
	});

	const { handleConvertSubmit } = useLeadConvertModalSubmit({
		convertingLeadId: v.convertingLeadId,
		isBooking: v.isBooking,
		setIsBooking: v.setIsBooking,
		leads,
		staff,
		chairs,
		selectedDoctorId,
		selectedChairId,
		appointmentDate: v.appointmentDate,
		appointmentTime: v.appointmentTime,
		visitMinutes,
		clinicTimeZone,
		convertLeadToAppointment,
		fetchLeads,
		setIsConvertOpen: v.setIsConvertOpen,
		setConvertingLeadId: v.setConvertingLeadId,
		navigateToScheduleWithBooking,
	});

	return { handleQuickSchedule, handleConvertSubmit };
}
