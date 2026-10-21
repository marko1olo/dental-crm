import type { Appointment } from "@dental/shared";

export type ReminderChannel = "telegram" | "whatsapp" | "sms";

export interface TomorrowReminderItem {
	appointmentId: string;
	patientId: string | null;
	patientName: string;
	patientPhone: string | null;
	telegramUsername: string | null;
	startsAtIso: string;
	timeFormatted: string;
	timeRangeFormatted?: string | undefined;
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
	targetDateLabel?: string | undefined;
	dispatchableCount?: number | undefined;
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
