import type { StaffRole } from "@dental/shared";
import { DEMO_COMMUNICATION_EVENTS, DEMO_COMMUNICATION_TASKS } from "./communicationsDemoData";
import type { CommunicationTask } from "./types";

export { DEMO_COMMUNICATION_EVENTS, DEMO_COMMUNICATION_TASKS };

export const DEFAULT_COMMUNICATION_CHANNEL_LABELS: Record<CommunicationTask["channel"], string> = {
	whatsapp: "WhatsApp", telegram: "Telegram", sms: "СМС",
	max: "MAX", phone: "Телефон", email: "Почта", vk: "ВКонтакте", in_person: "В клинике",
};

export const DEFAULT_COMMUNICATION_INTENT_LABELS: Record<CommunicationTask["intent"], string> = {
	appointment_confirmation: "Подтверждение", callback_requested: "Обратный звонок",
	payment_reminder: "Оплата", post_visit_instruction: "После приёма",
	recall: "Профосмотр", document_ready: "Документы", general: "Связь",
	imaging_review: "Снимок", lead_capture: "Обращение", transactional_reply: "Ответ",
};

export const DEFAULT_COMMUNICATION_PRIORITY_LABELS: Record<CommunicationTask["priority"], string> = {
	urgent: "Срочно", high: "Высокий", normal: "Обычный", low: "Низкий",
};

export const DEFAULT_COMMUNICATION_STATUS_LABELS: Record<CommunicationTask["status"], string> = {
	scheduled: "К выполнению", completed: "Выполнено", queued: "В очереди",
	sent: "Отправлено", delivered: "Доставлено", failed: "Ошибка",
	skipped: "Пропущено", needs_call: "Требует звонка",
};

export const DEFAULT_STAFF_ROLE_LABELS: Record<StaffRole, string> = {
	doctor: "Врач", assistant: "Ассистент", administrator: "Администратор",
	receptionist: "Администратор", owner: "Главврач", director: "Директор",
	nurse: "Медсестра", accountant: "Бухгалтер",
} as unknown as Record<StaffRole, string>;

export const COMMUNICATION_NOTE_INPUT_ID = "communication-closing-note";
export const COMMUNICATION_NOTE_DESCRIPTION_ID = "communication-closing-note-guidance";

export const COMMUNICATION_NOTE_QUICK_CHIPS = [
	"Недозвон", "Обещал оплатить", "Подумает", "Перезвонить позже", "Запрос документов",
];
