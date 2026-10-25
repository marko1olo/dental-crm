/**
 * omnichannelChatTemplates.ts — Professional Clinical Templates for Omnichannel Chat
 * Strict Mandate 8b (<=120 lines), Mandate 8d (Zero emojis), Mandate 8e (Doctor & staff autonomy).
 */

import type { OmnichannelTemplate } from "./types";

export const OMNICHANNEL_TEMPLATES: OmnichannelTemplate[] = [
	{
		id: "reminder_tomorrow",
		title: "Приём завтра в 14:00",
		category: "reminder",
		text: "Здравствуйте, {name}! Напоминаем о записи на приём завтра в 14:00 к доктору {doctor}. Пожалуйста, подтвердите визит ответным сообщением ДА.",
		channel: "all",
	},
	{
		id: "post_op_surgery",
		title: "Памятка: после удаления / имплантации",
		category: "post_op",
		text: "Здравствуйте, {name}! Памятка после удаления / имплантации:\n1. Не принимать пищу 2 часа.\n2. Не полоскать полость рта в первые сутки (сохраняйте кровяной сгусток!).\n3. Исключить горячее, баню и нагрузки на 3 дня.\nПри любых вопросах звоните нам в клинику.",
		channel: "all",
	},
	{
		id: "clinic_parking",
		title: "Схема проезда и парковки",
		category: "navigation",
		text: "Здравствуйте, {name}! Схема проезда в клинику ДЕНТЕ: ул. Арбат, 24. Для пациентов открыта бесплатная гостевая парковка со стороны главного входа (шлагбаум открывается по звонку на ресепшн). Ждём вас!",
		channel: "all",
	},
	{
		id: "hygiene_memo",
		title: "Памятка: Профгигиена / Air-Flow",
		category: "clinical",
		text: "Здравствуйте, {name}! Напоминание перед профгигиеной: пожалуйста, воздержитесь от кофе, крепкого чая и красящих продуктов за 2 часа до и после процедуры.",
		channel: "all",
	},
	{
		id: "payment_receipt",
		title: "Чек и оплата СБП",
		category: "payment",
		text: "Здравствуйте, {name}! Ваш кассовый чек за стоматологические услуги сформирован. Оплата через СБП без комиссии. Благодарим за доверие к клинике ДЕНТЕ!",
		channel: "all",
	},
	{
		id: "slot_offer",
		title: "Свободное окно в расписании",
		category: "general",
		text: "Здравствуйте, {name}! В расписании клиники появилось удобное окно для осмотра и консультации. Желаете записаться?",
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
