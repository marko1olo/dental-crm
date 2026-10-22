/**
 * Telephony Call Outcome Presets & Metadata
 */

export type CallOutcome =
	| "booked"
	| "consultation_booked"
	| "callback_15m"
	| "consultation"
	| "spam"
	| "accepted"
	| "rejected"
	| "dismissed"
	| "missed"
	| "whatsapp_sent"
	| "sms_sent"
	| "transferred";

export interface CallOutcomeMeta {
	readonly id: CallOutcome;
	readonly label: string;
	readonly shortLabel: string;
	readonly iconName: string;
	readonly color: string;
	readonly badgeBg: string;
	readonly badgeBorder: string;
	readonly descriptionRu: string;
}

export const CALL_OUTCOME_PRESETS: Record<
	"booked" | "callback_15m" | "consultation" | "spam",
	CallOutcomeMeta
> = {
	booked: {
		id: "booked",
		label: "Записан на прием",
		shortLabel: "Записан",
		iconName: "CalendarCheck",
		color: "#0d9488",
		badgeBg: "rgba(13, 148, 136, 0.12)",
		badgeBorder: "rgba(13, 148, 136, 0.35)",
		descriptionRu: "Пациент записан на прием в клинику",
	},
	callback_15m: {
		id: "callback_15m",
		label: "Перезвонить через 15 мин",
		shortLabel: "Перезвонить 15м",
		iconName: "PhoneCall",
		color: "#d97706",
		badgeBg: "rgba(245, 158, 11, 0.12)",
		badgeBorder: "rgba(245, 158, 11, 0.35)",
		descriptionRu: "Требуется обратный звонок через 15 минут",
	},
	consultation: {
		id: "consultation",
		label: "Консультация",
		shortLabel: "Консультация",
		iconName: "Info",
		color: "#0284c7",
		badgeBg: "rgba(2, 132, 199, 0.12)",
		badgeBorder: "rgba(2, 132, 199, 0.35)",
		descriptionRu: "Проведена устная телефонная консультация",
	},
	spam: {
		id: "spam",
		label: "Спам / Ошиблись",
		shortLabel: "Спам / Ошибка",
		iconName: "XCircle",
		color: "#e11d48",
		badgeBg: "rgba(225, 29, 72, 0.12)",
		badgeBorder: "rgba(225, 29, 72, 0.35)",
		descriptionRu: "Спам-звонок, рекламный робот или ошибочный номер",
	},
};
