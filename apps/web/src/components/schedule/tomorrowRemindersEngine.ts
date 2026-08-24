/**
 * DENTE CRM — Tomorrow Appointment Reminders Engine
 *
 * Provides batch compilation and formatting of 24h reminders for patients
 * scheduled for tomorrow, with clinical preparation instructions, doctor names,
 * chair names, and 1-click WhatsApp/SMS links.
 */

import type { Appointment, Dashboard, Patient } from "@dental/shared";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";

export interface TomorrowReminderItem {
	appointmentId: string;
	patientId: string | null;
	patientName: string;
	patientPhone: string | null;
	startsAtIso: string;
	timeFormatted: string;
	dateFormatted: string;
	doctorName: string | null;
	doctorSpecialty: string | null;
	chairName: string | null;
	treatmentReason: string | null;
	reminderText: string;
	whatsAppUrl: string | null;
	status: Appointment["status"];
	isCito: boolean;
	hasAllergyWarning: boolean;
	allergyWarningText?: string | null;
}

export interface TomorrowRemindersSummary {
	targetDateIso: string;
	targetDateFormatted: string;
	totalAppointmentsCount: number;
	validPhoneCount: number;
	missingPhoneCount: number;
	reminders: TomorrowReminderItem[];
}

/**
 * Returns tomorrow's date formatted as YYYY-MM-DD in clinic timezone.
 */
export function getTomorrowDateIso(baseDate: Date = new Date()): string {
	const tomorrow = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
	return tomorrow.toISOString().slice(0, 10);
}

/**
 * Compiles reminder drafts for all active appointments on tomorrow's date.
 */
export function compileTomorrowReminders(
	dashboard: Dashboard,
	targetDateIso?: string,
): TomorrowRemindersSummary {
	const dateIso = targetDateIso || getTomorrowDateIso();
	const clinicProfile = dashboard?.clinicSettings?.profile;
	const clinicName = clinicProfile?.clinicName || "Стоматологическая клиника «ДЕНТЕ»";
	const clinicAddress = dashboard?.clinicSettings?.profile?.address || "г. Москва, ул. Медицинская, д. 10";
	const clinicPhone = dashboard?.clinicSettings?.profile?.phone || "+7 (495) 100-20-30";

	const allAppointments = dashboard?.appointments || [];
	const allPatients = dashboard?.patients || [];
	const allStaff = dashboard?.clinicSettings?.staff || [];
	const allChairs = dashboard?.clinicSettings?.chairs || [];

	// Filter active appointments for the target date
	const tomorrowAppointments = allAppointments.filter((a) => {
		if (a.status === "cancelled" || a.status === "no_show") {
			return false;
		}
		const apptDate = a.startsAt ? a.startsAt.slice(0, 10) : "";
		return apptDate === dateIso;
	});

	// Sort chronologically by startsAt
	tomorrowAppointments.sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));

	const reminders: TomorrowReminderItem[] = tomorrowAppointments.map((appt) => {
		const patient = allPatients.find((p) => p.id === appt.patientId);
		const doctor = allStaff.find((s) => s.id === appt.doctorUserId);
		const chair = allChairs.find((c) => c.id === appt.chairId);

		const patientName = patient?.fullName || "Пациент";
		const patientPhone = patient?.phone || null;
		const startsAtDate = new Date(appt.startsAt);
		const timeFormatted = Number.isNaN(startsAtDate.getTime())
			? ""
			: startsAtDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

		const dateFormatted = Number.isNaN(startsAtDate.getTime())
			? dateIso
			: startsAtDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

		const doctorName = doctor?.fullName || null;
		const doctorSpecialty = doctor?.specialties?.[0] || null;
		const chairName = chair?.name || null;
		const treatmentReason = appt.reason || (appt as { notes?: string | null })?.notes || appt.comment || null;

		const isCito = Boolean(
			(appt as any)?.isCito ||
			(appt as any)?.cito ||
			(treatmentReason ?? "").toLowerCase().includes("cito") ||
			(treatmentReason ?? "").toLowerCase().includes("острая боль"),
		);

		// Check allergy alerts
		const rawAllergies = (patient as { allergies?: string | null })?.allergies || (patient as any)?.anamnesis?.allergies;
		const hasAllergyWarning = Boolean(rawAllergies && rawAllergies.trim());
		const allergyWarningText = hasAllergyWarning ? `⚠️ Внимание: ${rawAllergies.trim()}` : null;

		const reminderText = generateAppointmentWhatsAppMessage({
			patientName,
			doctorName,
			doctorSpecialty,
			appointmentStartsAt: appt.startsAt,
			clinicName,
			clinicAddress,
			clinicPhone,
			treatmentReason,
			cabinetName: chairName,
			messageType: "reminder_24h",
		});

		let whatsAppUrl: string | null = null;
		if (patientPhone) {
			const cleanDigits = patientPhone.replace(/\D/g, "");
			const normalized = cleanDigits.startsWith("8") ? `7${cleanDigits.slice(1)}` : cleanDigits;
			whatsAppUrl = `https://wa.me/${normalized}?text=${encodeURIComponent(reminderText)}`;
		}

		return {
			appointmentId: appt.id,
			patientId: appt.patientId,
			patientName,
			patientPhone,
			startsAtIso: appt.startsAt,
			timeFormatted,
			dateFormatted,
			doctorName,
			doctorSpecialty,
			chairName,
			treatmentReason,
			reminderText,
			whatsAppUrl,
			status: appt.status,
			isCito,
			hasAllergyWarning,
			allergyWarningText,
		};
	});

	const validPhoneCount = reminders.filter((r) => Boolean(r.patientPhone)).length;
	const missingPhoneCount = reminders.length - validPhoneCount;

	const targetDateObj = new Date(dateIso);
	const targetDateFormatted = Number.isNaN(targetDateObj.getTime())
		? dateIso
		: targetDateObj.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

	return {
		targetDateIso: dateIso,
		targetDateFormatted,
		totalAppointmentsCount: reminders.length,
		validPhoneCount,
		missingPhoneCount,
		reminders,
	};
}

/**
 * Formats all reminders into a single combined clipboard text buffer for the registrar.
 */
export function formatAllRemindersClipboardBuffer(summary: TomorrowRemindersSummary): string {
	if (summary.reminders.length === 0) {
		return `Нет записей на ${summary.targetDateFormatted}`;
	}

	const header = `📋 НАПОМИНАНИЯ НА ${summary.targetDateFormatted.toUpperCase()} (${summary.totalAppointmentsCount} пациентов):\n\n`;
	const body = summary.reminders
		.map((r, i) => {
			const phoneStr = r.patientPhone ? ` (${r.patientPhone})` : " [без телефона]";
			return `--- [${i + 1}] ${r.timeFormatted} · ${r.patientName}${phoneStr} ---\n${r.reminderText}\n`;
		})
		.join("\n");

	return header + body;
}
