/**
 * DENTE Dental CRM — Leads Schedule & Convert Handlers
 * Mandate 8e, Mandate 8n, Mandate 8b (<= 120 lines)
 */

import { dateInputValuePlusDays } from "../../../AppHelpers";
import type { Lead } from "../../../store/leadsStore";
import { showToast } from "../../GlobalToast";
import {
	type BookableChair,
	type BookableDoctor,
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
	resolveLeadVisitMinutes,
} from "../leadsKanbanTypes";
import type { PendingBookingInfo } from "./useLeadBookingNavigation";

interface ScheduleHandlersOptions {
	leads: Lead[];
	staff: BookableDoctor[];
	chairs: BookableChair[];
	selectedDoctorId: string;
	selectedChairId: string;
	appointmentDate: string;
	appointmentTime: string;
	visitMinutes: number | null | undefined;
	clinicTimeZone: string | null | undefined;
	convertLeadToAppointment: (id: string, payload: any) => Promise<any>;
	fetchLeads: () => void;
	navigateToScheduleWithBooking: (b: PendingBookingInfo) => void;
}

export function useLeadScheduleHandlers(opts: ScheduleHandlersOptions) {
	const handleQuickSchedule = async (leadId: string) => {
		const targetDate =
			opts.appointmentDate || dateInputValuePlusDays(1, opts.clinicTimeZone);
		const startDateTime = new Date(
			`${targetDate}T${opts.appointmentTime || "10:00"}:00`,
		);
		const effectiveVisitMins = resolveLeadVisitMinutes(opts.visitMinutes);
		const endDateTime = new Date(
			startDateTime.getTime() + effectiveVisitMins * 60000,
		);

		const effectiveStaff = resolveLeadBookingStaff(opts.staff);
		const effectiveChairs = resolveLeadBookingChairs(opts.chairs);
		const doctorIdToBook =
			opts.selectedDoctorId || effectiveStaff[0]?.id || FALLBACK_SOLO_DOCTOR.id;
		const chairIdToBook =
			opts.selectedChairId ||
			effectiveChairs[0]?.id ||
			FALLBACK_DEFAULT_CHAIR.id;

		const targetLead = opts.leads.find((l) => l.id === leadId);
		const quickReason =
			targetLead &&
			Array.isArray(targetLead.clinicalTags) &&
			targetLead.clinicalTags.length > 0
				? `Первичная консультация: ${targetLead.clinicalTags.join(", ")}`
				: targetLead?.notes
					? `Первичная консультация: ${targetLead.notes.slice(0, 100)}`
					: "Первичная консультация";

		try {
			const res = await opts.convertLeadToAppointment(leadId, {
				appointmentStart: startDateTime.toISOString(),
				appointmentEnd: endDateTime.toISOString(),
				chairId: chairIdToBook,
				doctorId: doctorIdToBook,
				reason: quickReason,
				comment: targetLead?.notes || null,
			});
			const successMsg = targetLead?.existingPatient
				? `Создан приём в расписании для постоянного пациента: ${targetLead.existingPatient.fullName}`
				: "Создан первичный приём в расписании и карта пациента";
			showToast(successMsg, "success");
			opts.fetchLeads();

			const createdPatient = res?.patient as
				| { id?: string; fullName?: string; phone?: string }
				| undefined;
			opts.navigateToScheduleWithBooking({
				patientId:
					createdPatient?.id || targetLead?.existingPatient?.id || null,
				patientName:
					createdPatient?.fullName ||
					targetLead?.existingPatient?.fullName ||
					targetLead?.name ||
					null,
				patientPhone: createdPatient?.phone || targetLead?.phone || null,
				dateKey: targetDate,
				reason: quickReason,
				doctorUserId: doctorIdToBook || null,
				chairId: chairIdToBook || null,
			});
		} catch (err: unknown) {
			const text =
				err instanceof Error && err.message.trim()
					? err.message
					: "Не удалось записать пациента на приём.";
			showToast(text, "error");
		}
	};

	return { handleQuickSchedule };
}
