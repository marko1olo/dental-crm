/**
 * DENTE Dental CRM — Leads Kanban Booking Navigation Hook
 * Mandate 8e (Doctor Autonomy) & Mandate 8b (<= 120 lines)
 */

import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";

export interface PendingBookingInfo {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	patientPhone?: string | null | undefined;
	dateKey?: string | undefined;
	reason?: string | undefined;
	doctorUserId?: string | null | undefined;
	chairId?: string | null | undefined;
}

export function useLeadBookingNavigation() {
	const navigateToScheduleWithBooking = (booking: PendingBookingInfo) => {
		try {
			if (booking.patientId)
				usePatientStore.getState().setSelectedPatientId(booking.patientId);
			if (booking.dateKey)
				useScheduleStore.getState().setScheduleDateFilter(booking.dateKey);
			useScheduleStore.getState().setPendingStageBooking?.(booking);
			useAppStore.getState().setCurrentView("schedule");
			if (typeof window !== "undefined") window.location.hash = "schedule";
		} catch {
			// fallback
		}
	};

	const handleOpenPatientCard = (patientId: string) => {
		usePatientStore.getState().setSelectedPatientId(patientId);
		useAppStore.getState().setCurrentView("patients");
		if (typeof window !== "undefined") window.location.hash = "patients";
	};

	return { navigateToScheduleWithBooking, handleOpenPatientCard };
}
