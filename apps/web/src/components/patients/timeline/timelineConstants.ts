import type { CommunicationChannel, CommunicationStatus } from "@dental/shared";
import { formatShortDate, formatTime } from "../../../utils/dateTimeUtils";
import type { PatientCommunicationEntry, PatientCommunicationLogResponse, StatusTone } from "./timelineTypes";

export const COMMUNICATIONS_SECTION_TITLE = "Связь";

export const INBOUND_TITLES: Record<CommunicationChannel, string> = {
	phone: "Входящий звонок",
	sms: "Входящее SMS",
	whatsapp: "Сообщение в WhatsApp",
	telegram: "Сообщение в Telegram",
	vk: "Сообщение во ВКонтакте",
	max: "Сообщение в MAX",
	email: "Письмо от пациента",
	in_person: "Разговор в клинике",
};

export const OUTBOUND_TITLES: Record<CommunicationChannel, string> = {
	phone: "Исходящий звонок",
	sms: "Отправлено SMS",
	whatsapp: "Отправлено в WhatsApp",
	telegram: "Отправлено в Telegram",
	vk: "Отправлено во ВКонтакте",
	max: "Отправлено в MAX",
	email: "Отправлено письмо",
	in_person: "Разговор в клинике",
};

export function entryTitle(entry: PatientCommunicationEntry): string {
	return entry.direction === "inbound" ? INBOUND_TITLES[entry.channel] : OUTBOUND_TITLES[entry.channel];
}

export const STATUS_VIEW: Record<CommunicationStatus, { label: string; tone: StatusTone }> = {
	delivered: { label: "доставлено", tone: "success" },
	completed: { label: "выполнено", tone: "success" },
	sent: { label: "отправлено", tone: "success" },
	queued: { label: "в очереди на отправку", tone: "waiting" },
	scheduled: { label: "запланировано", tone: "waiting" },
	needs_call: { label: "нужно позвонить руками", tone: "waiting" },
	failed: { label: "не доставлено", tone: "failed" },
	skipped: { label: "не отправляли", tone: "skipped" },
};

export const TONE_CLASSES: Record<StatusTone, string> = {
	success: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
	waiting: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
	failed: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
	skipped: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--glass-border)]",
};

export function formatMoment(value: string | null): string | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return `${formatShortDate(value)} ${formatTime(value)}`;
}

export function formatDay(value: string | null): string | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return formatShortDate(value);
}

export function countFromServer(value: unknown): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function asLog(payload: unknown): PatientCommunicationLogResponse | null {
	if (!payload || typeof payload !== "object") return null;
	const candidate = payload as Partial<PatientCommunicationLogResponse>;
	if (!Array.isArray(candidate.entries)) return null;
	return candidate as PatientCommunicationLogResponse;
}
