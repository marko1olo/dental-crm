/**
 * TELEGRAM MINI APP BOOKING — API & TELEGRAM WEBAPP SUBMISSION
 * (DOMAIN: Telegram WebApp sendData, Backend API Booking & Haptic confirmation)
 */

import type { ToothComplaint } from "../TelegramInteractiveToothPicker";
import type { BookingSuccessResult, CalendarDayItem, DoctorProfile } from "./bookingTypes";

export interface SubmitBookingParams {
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	patientFullName: string;
	patientPhone: string;
	patientComment: string;
	currentDoctor: DoctorProfile;
	selectedSlot: string;
	selectedDay: CalendarDayItem;
	teethSummaryText: string;
	attachedComplaints: readonly ToothComplaint[];
	isDemo: boolean;
}

export interface BookingSubmissionOutput {
	createdId: string;
	successResult: BookingSuccessResult;
}

export async function submitBookingToApi(params: SubmitBookingParams): Promise<BookingSubmissionOutput> {
	const {
		organizationId,
		patientId,
		patientFullName,
		patientPhone,
		patientComment,
		currentDoctor,
		selectedSlot,
		selectedDay,
		teethSummaryText,
		attachedComplaints,
		isDemo,
	} = params;

	const combinedComment = [
		teethSummaryText ? `[ЖАЛОБЫ ИЗ ЗУБНОЙ ФОРМУЛЫ]: ${teethSummaryText}` : null,
		patientComment.trim() ? `[КОММЕНТАРИЙ]: ${patientComment.trim()}` : null,
	].filter(Boolean).join("\n");

	try {
		const tgWebApp = (window as any).Telegram?.WebApp as { sendData?: (data: string) => void } | undefined;
		tgWebApp?.sendData?.(JSON.stringify({
			action: "appointment_booking",
			payload: {
				doctorName: currentDoctor.name,
				date: selectedDay.dateString,
				time: selectedSlot,
				patientName: patientFullName,
				patientPhone,
				teethComplaints: attachedComplaints,
				comment: combinedComment,
			},
		}));
	} catch {
		// Ignore Telegram SDK runtime quirks
	}

	for (const comp of attachedComplaints) {
		try {
			await fetch("/api/telegram/webapp/complaint", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationId: organizationId || "demo-clinic-org",
					patientId: patientId || "demo-patient-id",
					toothNumber: comp.toothNumber,
					symptom: comp.symptomLabel,
					painIntensity: comp.painLevel,
					notes: comp.notes,
					urgency: comp.cito ? "cito" : "routine",
				}),
			});
		} catch {
			// Do not block appointment booking
		}
	}

	let createdId = `appt-${Date.now()}`;
	try {
		const res = await fetch("/api/telegram/webapp/book", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				organizationId: organizationId || (isDemo ? "demo-clinic-org" : ""),
				patientId: patientId || (isDemo ? "demo-patient-id" : ""),
				doctorId: currentDoctor.id,
				date: selectedDay.dateString,
				time: selectedSlot,
				serviceName: currentDoctor.specialty,
				complaintNotes: combinedComment || undefined,
			}),
		});
		if (res.ok) {
			const data = await res.json();
			if (data?.appointmentId) createdId = data.appointmentId;
		}
	} catch {
		// Offline fallback id already created
	}

	return {
		createdId,
		successResult: {
			appointmentId: createdId,
			doctorName: currentDoctor.name,
			dateString: `${selectedDay.dayNum} ${selectedDay.month} (${selectedDay.dayOfWeek})`,
			time: selectedSlot,
			teethSummary: teethSummaryText,
		},
	};
}
