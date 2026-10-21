import type { Appointment, Patient, StaffMember, Chair } from "@dental/shared";
import {
	buildAppointmentActionLinks,
	buildSmsUrl,
	buildTelegramUrl,
	buildWhatsAppUrl,
	generateAppointmentWhatsAppMessage,
} from "../generateAppointmentWhatsAppMessage";
import { resolvePatientReminderChannel } from "./dateHelpers";
import type { CompileRemindersOptions, TomorrowReminderItem } from "./types";

interface ClinicProfileInfo {
	clinicName: string;
	clinicAddress: string;
	clinicPhone: string;
}

export function buildTomorrowReminderItem(
	appt: Appointment,
	patientsMap: Map<string, Patient>,
	staffMap: Map<string, StaffMember>,
	chairsMap: Map<string, Chair>,
	dateIso: string,
	baseUrl: string,
	clinicInfo: ClinicProfileInfo,
	quietHoursStatus: { isQuietHours: boolean; warningRu?: string | null },
	options?: CompileRemindersOptions,
): { item: TomorrowReminderItem; availableChannels: string[] } {
	const patient = appt.patientId ? patientsMap.get(appt.patientId) : undefined;
	const doctor = appt.doctorUserId ? staffMap.get(appt.doctorUserId) : undefined;
	const chair = appt.chairId ? chairsMap.get(appt.chairId) : undefined;

	const patientName = patient?.fullName || "Пациент";
	const patientPhone = patient?.phone || null;
	const telegramUsername =
		(patient as { telegramUsername?: string | null; telegram?: string | null })?.telegramUsername ||
		(patient as { telegram?: string | null })?.telegram ||
		null;

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
		(appt as { isCito?: boolean; cito?: boolean })?.isCito ||
		(appt as { isCito?: boolean; cito?: boolean })?.cito ||
		(treatmentReason ?? "").toLowerCase().includes("cito") ||
		(treatmentReason ?? "").toLowerCase().includes("острая боль"),
	);

	const rawAllergies =
		(patient as { allergies?: string | string[] | null })?.allergies ||
		(patient as { anamnesis?: { allergies?: string | string[] | null } })?.anamnesis?.allergies ||
		"";
	const allergiesStr = Array.isArray(rawAllergies)
		? rawAllergies.join(", ")
		: typeof rawAllergies === "string"
			? rawAllergies
			: "";
	const hasAllergyWarning = Boolean(allergiesStr && allergiesStr.trim());
	const allergyWarningText = hasAllergyWarning ? `[Внимание] ${allergiesStr.trim()}` : null;

	const actionLinks = buildAppointmentActionLinks(appt.id, baseUrl);
	const { preferred, available } = resolvePatientReminderChannel(
		patientPhone,
		telegramUsername,
		options?.channelOverride,
	);

	const baseReminderText = generateAppointmentWhatsAppMessage({
		patientName,
		doctorName,
		doctorSpecialty,
		appointmentStartsAt: appt.startsAt,
		clinicName: clinicInfo.clinicName,
		clinicAddress: clinicInfo.clinicAddress,
		clinicPhone: clinicInfo.clinicPhone,
		treatmentReason,
		cabinetName: chairName,
		messageType: "reminder_24h",
	});

	const interactiveLinksBlock = `\n\nПодтвердите ваш визит:\n[Подтвердить]: ${actionLinks.confirmUrl}\n[Перенести]: ${actionLinks.rescheduleUrl}`;
	const reminderText = `${baseReminderText}${interactiveLinksBlock}`;

	const whatsAppUrl = patientPhone ? buildWhatsAppUrl(patientPhone, reminderText) : null;
	const smsUrl = patientPhone ? buildSmsUrl(patientPhone, reminderText) : null;
	const telegramUrl = telegramUsername
		? buildTelegramUrl(telegramUsername, reminderText)
		: patientPhone
			? buildTelegramUrl(patientPhone, reminderText)
			: null;

	return {
		item: {
			appointmentId: appt.id,
			patientId: appt.patientId || null,
			patientName,
			patientPhone,
			telegramUsername,
			startsAtIso: appt.startsAt,
			timeFormatted,
			dateFormatted,
			doctorName,
			doctorSpecialty,
			chairName,
			treatmentReason,
			reminderText,
			preferredChannel: preferred,
			availableChannels: available,
			whatsAppUrl,
			telegramUrl,
			smsUrl,
			confirmUrl: actionLinks.confirmUrl,
			rescheduleUrl: actionLinks.rescheduleUrl,
			status: appt.status,
			isCito,
			hasAllergyWarning,
			allergyWarningText,
			isQuietHours: quietHoursStatus.isQuietHours && !isCito,
			quietHoursWarning: quietHoursStatus.warningRu ?? null,
		},
		availableChannels: available,
	};
}
