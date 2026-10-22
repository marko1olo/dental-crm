/**
 * DENTE Dental CRM — Leads Convert Modal Submit Hook
 * Mandate 8e, Mandate 8n, Mandate 8b (<= 120 lines)
 */

import { dateInputValuePlusDays } from "../../../AppHelpers";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { LeadConvertSubmitOptions } from "../LeadConvertModal";
import {
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
	resolveLeadBookingChairs,
	resolveLeadBookingStaff,
	resolveLeadVisitMinutes,
} from "../leadsKanbanTypes";
import { submitPatientOnlyConversion } from "./submitPatientOnlyConversion";
import type { ConvertSubmitOptions } from "./convertSubmitTypes";

export type { ConvertSubmitOptions };

export function useLeadConvertModalSubmit(opts: ConvertSubmitOptions) {
	const handleConvertSubmit = async (e: React.FormEvent, options?: LeadConvertSubmitOptions) => {
		e.preventDefault();
		if (!opts.convertingLeadId || opts.isBooking) return;

		if (options?.mode === "patient_only") {
			await submitPatientOnlyConversion({
				convertingLeadId: opts.convertingLeadId,
				options,
				leads: opts.leads,
				convertLeadToAppointment: opts.convertLeadToAppointment,
				fetchLeads: opts.fetchLeads,
				setIsConvertOpen: opts.setIsConvertOpen,
				setConvertingLeadId: opts.setConvertingLeadId,
				setIsBooking: opts.setIsBooking,
			});
			return;
		}

		const targetDate = opts.appointmentDate || dateInputValuePlusDays(1, opts.clinicTimeZone);
		const targetTime = opts.appointmentTime || "10:00";
		const startDateTime = new Date(`${targetDate}T${targetTime}:00`);
		if (Number.isNaN(startDateTime.getTime())) {
			showToast("Проверьте дату и время приема", "error");
			return;
		}
		const effectiveVisitMins = resolveLeadVisitMinutes(opts.visitMinutes);
		const endDateTime = new Date(startDateTime.getTime() + effectiveVisitMins * 60000);
		const doctorIdToBook =
			opts.selectedDoctorId || resolveLeadBookingStaff(opts.staff)[0]?.id || FALLBACK_SOLO_DOCTOR.id;
		const chairIdToBook =
			opts.selectedChairId || resolveLeadBookingChairs(opts.chairs)[0]?.id || FALLBACK_DEFAULT_CHAIR.id;

		opts.setIsBooking(true);
		try {
			const res = await opts.convertLeadToAppointment(opts.convertingLeadId, {
				appointmentStart: startDateTime.toISOString(),
				appointmentEnd: endDateTime.toISOString(),
				chairId: chairIdToBook,
				doctorId: doctorIdToBook,
				reason: options?.reason,
				comment: options?.comment,
			});
			const activeLead = opts.leads.find((l) => l.id === opts.convertingLeadId);
			const src = activeLead?.source ? ` (источник: ${activeLead.source})` : "";
			const consent = options?.consentMarketing ? " [рассылки: разрешены]" : " [рассылки: отключены]";
			const msg = activeLead?.existingPatient
				? `Обращение записано на прием к пациенту (${activeLead.existingPatient.fullName})${src}${consent}`
				: `Обращение записано на прием, создана карта пациента${src}${consent}`;
			showToast(msg, "success");
			opts.setIsConvertOpen(false);
			opts.setConvertingLeadId(null);
			opts.fetchLeads();

			const createdPatient = res?.patient as { id?: string; fullName?: string; phone?: string } | undefined;
			opts.navigateToScheduleWithBooking({
				patientId: createdPatient?.id || activeLead?.existingPatient?.id || null,
				patientName: createdPatient?.fullName || activeLead?.existingPatient?.fullName || activeLead?.name || null,
				patientPhone: createdPatient?.phone || activeLead?.phone || null,
				dateKey: targetDate,
				reason: options?.reason || "Первичная консультация",
				doctorUserId: doctorIdToBook || null,
				chairId: chairIdToBook || null,
				source: activeLead?.source || null,
				comment: options?.comment || (activeLead?.source ? `Источник: ${activeLead.source}` : undefined),
			});
		} catch (err: unknown) {
			logger.error(err);
			showToast(err instanceof Error && err.message.trim() ? err.message : "Запись не создана", "error");
		} finally {
			opts.setIsBooking(false);
		}
	};

	return { handleConvertSubmit };
}
