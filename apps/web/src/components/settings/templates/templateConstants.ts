import type { MessageTemplateChannel, MessageTemplateScenario } from "@dental/shared";

export const SCENARIO_LABELS: Record<string, string> = {
	appointment_reminder_24h: "Напоминание (24ч)",
	appointment_confirmation: "Подтверждение записи",
	post_op_checkup_043: "Контроль после приёма",
	birthday_greeting: "Поздравление с днём рождения",
	warranty_passport: "Гарантийный паспорт и памятка",
	ztl_ready_alert: "Готовность лаборатории",
	retention_recall_6m: "Профосмотр (6 мес)",
	debt_notification: "Оплата счёта (СБП)",
	general: "Общие сообщения",
};

export interface ClinicalPresetTemplate {
	id: string;
	title: string;
	label: string;
	scenario: MessageTemplateScenario | string;
	text: string;
}

export const CLINICAL_QUICK_PRESETS: ClinicalPresetTemplate[] = [
	{
		id: "reminder",
		label: "Напоминание о приёме",
		title: "Напоминание о приёме за 24ч",
		scenario: "appointment_reminder_24h",
		text: "Здравствуйте, {patient_name}!\n\nНапоминаем о вашей записи на приём завтра, {appointment_date} в {appointment_time}.\nВрач: {doctor_name} ({doctor_role})\nКлиника: {clinic_name}, {clinic_address}\n\nПожалуйста, подтвердите визит по ссылке: {portal_link} или ответьте на это сообщение.\nТелефон клиники: {clinic_phone}",
	},
	{
		id: "confirmation",
		label: "Подтверждение визита",
		title: "Подтверждение записи на приём",
		scenario: "appointment_confirmation",
		text: "Здравствуйте, {patient_name}!\n\nВы успешно записаны на приём в клинику «{clinic_name}».\nДата и время: {appointment_date} в {appointment_time}\nВрач: {doctor_name} ({doctor_role})\nАдрес клиники: {clinic_address}\n\nЛичный кабинет: {portal_link}\nТелефон для связи: {clinic_phone}",
	},
	{
		id: "birthday",
		label: "С днём рождения",
		title: "Поздравление с днём рождения",
		scenario: "general",
		text: "Уважаемый(ая) {patient_first_name}!\n\nКоманда стоматологической клиники «{clinic_name}» от всей души поздравляет вас с днём рождения! 🎂\n\nЖелаем вам крепкого здоровья, радости и сияющей улыбки! В честь вашего праздника дарим персональную скидку на профессиональную гигиену.\n\nЗаписаться на удобное время: {portal_link}\nТелефон регистратуры: {clinic_phone}",
	},
	{
		id: "warranty",
		label: "Гарантийный паспорт",
		title: "Гарантийный паспорт и памятка",
		scenario: "post_op_checkup_043",
		text: "Здравствуйте, {patient_name}!\n\nБлагодарим за визит в клинику «{clinic_name}». На выполненное лечение оформлена официальная клиническая гарантия.\n\nЭлектронный гарантийный паспорт и рекомендации врача: {portal_link}\n\nПри возникновении вопросов врач {doctor_name} всегда на связи: {clinic_phone}.",
	},
];

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

