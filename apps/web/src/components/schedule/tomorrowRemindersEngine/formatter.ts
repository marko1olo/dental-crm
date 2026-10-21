import type { TomorrowRemindersSummary } from "./types";

/**
 * Formats all reminders into a single combined clipboard text buffer for the registrar.
 */
export function formatAllRemindersClipboardBuffer(summary: TomorrowRemindersSummary): string {
	if (summary.reminders.length === 0) {
		return `Нет записей на ${summary.targetDateFormatted}`;
	}

	const header = `НАПОМИНАНИЯ НА ${summary.targetDateFormatted.toUpperCase()} (${summary.totalAppointmentsCount} пациентов):\n\n`;
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
