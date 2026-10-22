/**
 * omnichannelChatTemplates.ts — Professional Clinical Templates for Omnichannel Chat
 * 
 * Free of emoji noise, using polite, concise Russian clinical language.
 */

import type { OmnichannelTemplate } from "./types";

export const OMNICHANNEL_TEMPLATES: OmnichannelTemplate[] = [
	{
		id: "reminder_tomorrow",
		title: "Приём завтра в 14:00",
		category: "reminder",
		text: "Здравствуйте, {name}! Напоминаем о записи на приём завтра в 14:00. Пожалуйста, подтвердите визит ответным сообщением.",
		channel: "all",
	},
	{
		id: "reminder_custom_time",
		title: "Напоминание о записи",
		category: "reminder",
		text: "Здравствуйте, {name}! Напоминаем о записи на приём {date} в {time} к доктору {doctor}. Клиника ДЕНТЕ ждёт вас.",
		channel: "all",
	},
	{
		id: "post_op_care",
		title: "Памятка после лечения",
		category: "post_op",
		text: "Здравствуйте, {name}! Рекомендации после стоматологического приёма: воздержитесь от приёма горячей пищи в течение 2 часов. При сохранении дискомфорта сразу свяжитесь с клиникой.",
		channel: "all",
	},
	{
		id: "payment_receipt",
		title: "Чек и оплата",
		category: "payment",
		text: "Здравствуйте, {name}! Ваш кассовый чек и выписка за стоматологические услуги сформированы. Благодарим за доверие к клинике ДЕНТЕ!",
		channel: "all",
	},
	{
		id: "slot_offer",
		title: "Свободное окно",
		category: "general",
		text: "Здравствуйте, {name}! В расписании клиники появилось свободное окно для осмотра. Желаете записаться на удобное время?",
		channel: "all",
	},
];

export function applyTemplateVariables(
	templateText: string,
	variables: {
		name?: string;
		time?: string;
		date?: string;
		doctor?: string;
	},
): string {
	const name = variables.name || "пациент";
	const time = variables.time || "14:00";
	const date = variables.date || "завтра";
	const doctor = variables.doctor || "лечащему врачу";

	return templateText
		.replace(/\{name\}/g, name)
		.replace(/\{time\}/g, time)
		.replace(/\{date\}/g, date)
		.replace(/\{doctor\}/g, doctor);
}
