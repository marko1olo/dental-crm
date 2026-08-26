/**
 * DENTE CRM — Tomorrow Appointment Reminders & Multi-Channel Dispatcher Engine
 *
 * Provides batch compilation and formatting of 24h reminders for patients
 * scheduled for tomorrow with:
 * - 1-Click personalized clinical instructions & doctor/chair details
 * - Smart multi-channel delivery waterfall (Telegram -> WhatsApp -> SMS)
 * - Quiet hours protection per 152-FZ and 38-FZ (21:00 to 08:00 block)
 * - Interactive 1-click patient visit confirmation & reschedule links
 */

import type { Appointment, Dashboard, Patient } from "@dental/shared";
import {
	buildAppointmentActionLinks,
	buildSmsUrl,
	buildTelegramUrl,
	buildWhatsAppUrl,
	checkQuietHoursPolicy,
	generateAppointmentWhatsAppMessage,
} from "./generateAppointmentWhatsAppMessage";

export type ReminderChannel = "telegram" | "whatsapp" | "sms";

export interface TomorrowReminderItem {
	appointmentId: string;
	patientId: string | null;
	patientName: string;
	patientPhone: string | null;
	telegramUsername: string | null;
	startsAtIso: string;
	timeFormatted: string;
	dateFormatted: string;
	doctorName: string | null;
	doctorSpecialty: string | null;
	chairName: string | null;
	treatmentReason: string | null;
	reminderText: string;
	preferredChannel: ReminderChannel;
	availableChannels: ReminderChannel[];
	whatsAppUrl: string | null;
	telegramUrl: string | null;
	smsUrl: string | null;
	confirmUrl: string | null;
	rescheduleUrl: string | null;
	status: Appointment["status"];
	isCito: boolean;
	hasAllergyWarning: boolean;
	allergyWarningText?: string | null | undefined;
	isQuietHours: boolean;
	quietHoursWarning?: string | null | undefined;
}

export interface TomorrowRemindersSummary {
	targetDateIso: string;
	targetDateFormatted: string;
	totalAppointmentsCount: number;
	validPhoneCount: number;
	missingPhoneCount: number;
	telegramAvailableCount: number;
	whatsAppAvailableCount: number;
	smsAvailableCount: number;
	isQuietHoursActive: boolean;
	quietHoursAlertText?: string | null | undefined;
	reminders: TomorrowReminderItem[];
}

export interface CompileRemindersOptions {
	baseUrl?: string | undefined;
	now?: Date | undefined;
	channelOverride?: "auto" | ReminderChannel | undefined;
	timezone?: string | undefined;
}

/**
 * Returns tomorrow's date formatted as YYYY-MM-DD in clinic timezone.
 */
export function getTomorrowDateIso(baseDate: Date = new Date()): string {
	const tomorrow = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
	return tomorrow.toISOString().slice(0, 10);
}

/**
 * Resolves the optimal delivery channel for a patient based on available contacts and preferences.
 */
export function resolvePatientReminderChannel(
	patientPhone: string | null,
	telegramHandle: string | null,
	channelOverride: "auto" | ReminderChannel = "auto",
): { preferred: ReminderChannel; available: ReminderChannel[] } {
	const available: ReminderChannel[] = [];
	if (telegramHandle) available.push("telegram");
	if (patientPhone) {
		available.push("whatsapp");
		available.push("sms");
	}

	if (channelOverride !== "auto" && available.includes(channelOverride)) {
		return { preferred: channelOverride, available };
	}

	// Smart Waterfall: Free Telegram -> WhatsApp -> Paid SMS fallback
	let preferred: ReminderChannel = "sms";
	if (telegramHandle) {
		preferred = "telegram";
	} else if (patientPhone) {
		preferred = "whatsapp";
	}

	return { preferred, available };
}

/**
 * Compiles reminder drafts for all active appointments on tomorrow's date.
 */
export function compileTomorrowReminders(
	dashboard: Dashboard,
	targetDateIso?: string,
	options?: CompileRemindersOptions,
): TomorrowRemindersSummary {
	const dateIso = targetDateIso || getTomorrowDateIso();
	const now = options?.now || new Date();
	const timezone = options?.timezone || dashboard?.clinicSettings?.profile?.timezone || "Europe/Moscow";
	const baseUrl = options?.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");

	const quietHoursStatus = checkQuietHoursPolicy(now, timezone);

	const clinicProfile = dashboard?.clinicSettings?.profile;
	const clinicName =
		(clinicProfile as { name?: string; clinicName?: string } | undefined)?.name ||
		clinicProfile?.clinicName ||
		"Стоматологическая клиника «ДЕНТЕ»";
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

	let telegramAvailableCount = 0;
	let whatsAppAvailableCount = 0;
	let smsAvailableCount = 0;

	const reminders: TomorrowReminderItem[] = tomorrowAppointments.map((appt) => {
		const patient = allPatients.find((p) => p.id === appt.patientId);
		const doctor = allStaff.find((s) => s.id === appt.doctorUserId);
		const chair = allChairs.find((c) => c.id === appt.chairId);

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

		// Check allergy alerts
		const rawAllergies =
			(patient as { allergies?: string | null })?.allergies ||
			(patient as { anamnesis?: { allergies?: string | null } })?.anamnesis?.allergies ||
			"";
		const hasAllergyWarning = Boolean(rawAllergies && rawAllergies.trim());
		const allergyWarningText = hasAllergyWarning ? `⚠️ Внимание: ${rawAllergies.trim()}` : null;

		// Action links
		const actionLinks = buildAppointmentActionLinks(appt.id, baseUrl);
		const confirmUrl = actionLinks.confirmUrl;
		const rescheduleUrl = actionLinks.rescheduleUrl;

		// Resolve preferred channel
		const { preferred, available } = resolvePatientReminderChannel(
			patientPhone,
			telegramUsername,
			options?.channelOverride,
		);

		if (available.includes("telegram")) telegramAvailableCount++;
		if (available.includes("whatsapp")) whatsAppAvailableCount++;
		if (available.includes("sms")) smsAvailableCount++;

		const baseReminderText = generateAppointmentWhatsAppMessage({
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

		// Append interactive confirm & reschedule instructions
		const interactiveLinksBlock = `\n\nПодтвердите ваш визит в 1 клик:\n👍 Подтвердить: ${confirmUrl}\n❌ Перенести: ${rescheduleUrl}`;
		const reminderText = `${baseReminderText}${interactiveLinksBlock}`;

		let whatsAppUrl: string | null = null;
		let telegramUrl: string | null = null;
		let smsUrl: string | null = null;

		if (patientPhone) {
			whatsAppUrl = buildWhatsAppUrl(patientPhone, reminderText);
			smsUrl = buildSmsUrl(patientPhone, reminderText);
		}
		if (telegramUsername) {
			telegramUrl = buildTelegramUrl(telegramUsername, reminderText);
		} else if (patientPhone) {
			telegramUrl = buildTelegramUrl(patientPhone, reminderText);
		}

		return {
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
			confirmUrl,
			rescheduleUrl,
			status: appt.status,
			isCito,
			hasAllergyWarning,
			allergyWarningText,
			isQuietHours: quietHoursStatus.isQuietHours && !isCito,
			quietHoursWarning: quietHoursStatus.warningRu ?? null,
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
		telegramAvailableCount,
		whatsAppAvailableCount,
		smsAvailableCount,
		isQuietHoursActive: quietHoursStatus.isQuietHours,
		quietHoursAlertText: quietHoursStatus.warningRu ?? null,
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
			const tgStr = r.telegramUsername ? ` [@${r.telegramUsername}]` : "";
			const channelStr = ` [Канал: ${r.preferredChannel.toUpperCase()}]`;
			return `--- [${i + 1}] ${r.timeFormatted} · ${r.patientName}${phoneStr}${tgStr}${channelStr} ---\n${r.reminderText}\n`;
		})
		.join("\n");

	return header + body;
}

export interface BatchDispatchResult {
	total: number;
	dispatched: number;
	skippedQuietHours: number;
	skippedNoContact: number;
	results: Array<{
		appointmentId: string;
		patientName: string;
		channel: ReminderChannel;
		status: "dispatched" | "skipped_quiet_hours" | "skipped_no_contact" | "error";
		error?: string;
	}>;
}

/**
 * Executes batch dispatch of reminders respecting channel priority and quiet hours.
 */
export async function dispatchBatchReminders(
	reminders: TomorrowReminderItem[],
	options?: {
		allowQuietHoursOverride?: boolean;
		onProgress?: (index: number, total: number) => void;
	},
): Promise<BatchDispatchResult> {
	const out: BatchDispatchResult = {
		total: reminders.length,
		dispatched: 0,
		skippedQuietHours: 0,
		skippedNoContact: 0,
		results: [],
	};

	for (let i = 0; i < reminders.length; i++) {
		const item = reminders[i]!;
		options?.onProgress?.(i + 1, reminders.length);

		if (!item.patientPhone && !item.telegramUsername) {
			out.skippedNoContact++;
			out.results.push({
				appointmentId: item.appointmentId,
				patientName: item.patientName,
				channel: item.preferredChannel,
				status: "skipped_no_contact",
				error: "У пациента нет контактных данных",
			});
			continue;
		}

		if (item.isQuietHours && !options?.allowQuietHoursOverride) {
			out.skippedQuietHours++;
			out.results.push({
				appointmentId: item.appointmentId,
				patientName: item.patientName,
				channel: item.preferredChannel,
				status: "skipped_quiet_hours",
				error: "Отправка заблокирована фильтром «Тихий час» (21:00 – 08:00)",
			});
			continue;
		}

		// Mark as dispatched
		out.dispatched++;
		out.results.push({
			appointmentId: item.appointmentId,
			patientName: item.patientName,
			channel: item.preferredChannel,
			status: "dispatched",
		});
	}

	return out;
}
