import type { MessageTemplateChannel, MessageTemplateScenario } from "@dental/shared";

export const SCENARIO_LABELS: Record<MessageTemplateScenario, string> = {
	appointment_reminder_24h: "Напоминание (24ч)",
	appointment_confirmation: "Подтверждение записи",
	post_op_checkup_043: "Контроль после приёма",
	ztl_ready_alert: "Готовность ЗТЛ",
	retention_recall_6m: "Профосмотр (6 мес)",
	debt_notification: "Задолженность (СБП)",
	general: "Общие сообщения",
};

export const CHANNEL_BADGES: Record<
	MessageTemplateChannel,
	{ label: string; badgeClass: string; headerClass: string; bubbleClass: string }
> = {
	telegram: { label: "Telegram", badgeClass: "badge-channel-tg", headerClass: "phone-header-tg", bubbleClass: "phone-bubble-tg" },
	whatsapp: { label: "WhatsApp", badgeClass: "badge-channel-wa", headerClass: "phone-header-wa", bubbleClass: "phone-bubble-wa" },
	max: { label: "MAX", badgeClass: "badge-channel-max", headerClass: "phone-header-max", bubbleClass: "phone-bubble-max" },
	sms: { label: "SMS", badgeClass: "badge-channel-sms", headerClass: "phone-header-sms", bubbleClass: "phone-bubble-sms" },
	email: { label: "Email", badgeClass: "badge-channel-email", headerClass: "phone-header-email", bubbleClass: "phone-bubble-email" },
};
