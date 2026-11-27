import { tomorrowDateKeyInTimeZone } from "@dental/shared";
import type { ReminderChannel } from "./types";

/**
 * Returns tomorrow's date formatted as YYYY-MM-DD in clinic timezone.
 */
export function getTomorrowDateIso(baseDate: Date = new Date(), timezone?: string): string {
	return tomorrowDateKeyInTimeZone(timezone, baseDate);
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
