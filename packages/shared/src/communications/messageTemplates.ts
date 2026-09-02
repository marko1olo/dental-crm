import { z } from "zod";

/**
 * Supported communication channels for omnichannel messaging.
 */
export const messageTemplateChannels = [
	"max",
	"telegram",
	"whatsapp",
	"sms",
	"email",
] as const;
export type MessageTemplateChannel = (typeof messageTemplateChannels)[number];
export const messageTemplateChannelSchema = z.enum(messageTemplateChannels);

/**
 * Standard clinical message scenarios.
 */
export const messageTemplateScenarios = [
	"appointment_reminder_24h",
	"appointment_confirmation",
	"post_op_checkup_043",
	"ztl_ready_alert",
	"retention_recall_6m",
	"debt_notification",
	"general",
] as const;
export type MessageTemplateScenario = (typeof messageTemplateScenarios)[number];
export const messageTemplateScenarioSchema = z.enum(messageTemplateScenarios);

/**
 * Dynamic macro definition for template editor and variable interpolation.
 */
export interface DynamicMacroMetadata {
	readonly key: string;
	readonly label: string;
	readonly category: "patient" | "doctor" | "appointment" | "clinic" | "finance";
	readonly description: string;
	readonly example: string;
	readonly aliases?: readonly string[];
}

export const DYNAMIC_MESSAGE_MACROS: readonly DynamicMacroMetadata[] = [
	{
		key: "patient_name",
		label: "ФИО пациента",
		category: "patient",
		description: "Полное имя пациента (Фамилия Имя Отчество)",
		example: "Иванова Анна Сергеевна",
		aliases: ["patient", "patientFullName", "patient_full_name"],
	},
	{
		key: "patient_first_name",
		label: "Имя пациента",
		category: "patient",
		description: "Имя пациента для персонального обращения",
		example: "Анна",
		aliases: ["first_name", "firstName"],
	},
	{
		key: "doctor_name",
		label: "ФИО врача",
		category: "doctor",
		description: "ФИО лечащего врача",
		example: "Смирнов Алексей Викторович",
		aliases: ["doctor", "doctorFullName"],
	},
	{
		key: "doctor_role",
		label: "Специализация врача",
		category: "doctor",
		description: "Врачебная специальность / должность",
		example: "Стоматолог-терапевт",
		aliases: ["specialty", "doctor_specialty"],
	},
	{
		key: "appointment_date",
		label: "Дата приёма",
		category: "appointment",
		description: "Дата запланированного визита",
		example: "15 сентября",
		aliases: ["date"],
	},
	{
		key: "appointment_time",
		label: "Время приёма",
		category: "appointment",
		description: "Время начала приёма (ЧЧ:ММ)",
		example: "14:30",
		aliases: ["time"],
	},
	{
		key: "chair_number",
		label: "Кабинет / Кресло",
		category: "appointment",
		description: "Номер кабинета или стоматологической установки",
		example: "Кабинет №2, Кресло №1",
		aliases: ["cabinet", "room"],
	},
	{
		key: "clinic_name",
		label: "Название клиники",
		category: "clinic",
		description: "Официальное наименование клиники",
		example: "ДЕНТЕ Премиум",
		aliases: ["clinic"],
	},
	{
		key: "clinic_address",
		label: "Адрес клиники",
		category: "clinic",
		description: "Фактический адрес клиники для навигации",
		example: "г. Москва, ул. Арбат, д. 24",
		aliases: ["address"],
	},
	{
		key: "clinic_phone",
		label: "Телефон клиники",
		category: "clinic",
		description: "Номер контактного телефона регистратуры",
		example: "+7 (495) 123-45-67",
		aliases: ["phone"],
	},
	{
		key: "sbp_payment_link",
		label: "Ссылка СБП",
		category: "finance",
		description: "Прямая платёжная ссылка Системы Быстрых Платежей",
		example: "https://sbp.nspk.ru/pay?id=dente-8472",
		aliases: ["sbp_link", "payment_link"],
	},
	{
		key: "portal_link",
		label: "Личный кабинет / Подтверждение",
		category: "clinic",
		description: "Ссылка на пациентский веб-портал или подтверждение визита",
		example: "https://dente.clinic/portal/p-8492",
		aliases: ["link", "confirm_link", "confirmLink"],
	},
] as const;

/**
 * Map of normalized macro keys and their aliases.
 */
const MACRO_ALIASES_MAP: Readonly<Record<string, string>> = {
	patient: "patient_name",
	patientfullname: "patient_name",
	patient_full_name: "patient_name",
	first_name: "patient_first_name",
	firstname: "patient_first_name",
	doctor: "doctor_name",
	doctorfullname: "doctor_name",
	specialty: "doctor_role",
	doctor_specialty: "doctor_role",
	date: "appointment_date",
	time: "appointment_time",
	cabinet: "chair_number",
	room: "chair_number",
	clinic: "clinic_name",
	address: "clinic_address",
	phone: "clinic_phone",
	sbp_link: "sbp_payment_link",
	payment_link: "sbp_payment_link",
	link: "portal_link",
	confirm_link: "portal_link",
	confirmlink: "portal_link",
};

/**
 * Returns canonical key for any macro or alias.
 */
export function normalizeMacroKey(rawKey: string): string {
	const cleaned = rawKey.trim().replace(/^\{+|\}+$/g, "");
	const lower = cleaned.toLowerCase();
	return MACRO_ALIASES_MAP[lower] ?? cleaned;
}

/**
 * Returns example dictionary with standard fallback mock values for preview.
 */
export function getDefaultMacroPreviewValues(): Record<string, string> {
	const values: Record<string, string> = {};
	for (const macro of DYNAMIC_MESSAGE_MACROS) {
		values[macro.key] = macro.example;
		if (macro.aliases) {
			for (const alias of macro.aliases) {
				values[alias] = macro.example;
			}
		}
	}
	return values;
}

/**
 * Regex matching both `{macro_name}` and `{{macro_name}}` without capturing literal braces.
 */
export const MACRO_PATTERN = /\{\{([A-Za-z0-9_]+)\}\}|\{([A-Za-z0-9_]+)\}/g;

/**
 * Extracts list of canonical macro keys used in a template text.
 */
export function extractTemplateMacroKeys(templateText: string): string[] {
	const found = new Set<string>();
	for (const match of templateText.matchAll(MACRO_PATTERN)) {
		const rawKey = match[1] ?? match[2];
		if (rawKey) {
			found.add(normalizeMacroKey(rawKey));
		}
	}
	return Array.from(found);
}

/**
 * Escapes HTML/XML entities in strings to prevent XSS / HTML injection in channels
 * that interpret markup (email HTML bodies, Telegram HTML parse_mode).
 * Strips dangerous ASCII control characters and escapes &, <, >, ", '.
 */
export function escapeHtml(value: unknown): string {
	if (value === null || value === undefined) return "";
	return String(value)
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export const escapeTemplateMacroHtml = escapeHtml;

export interface InterpolateTemplateOptions {
	readonly allowPreviewFallback?: boolean;
	readonly strict?: boolean;
	readonly channel?: MessageTemplateChannel | string;
	readonly sanitize?: boolean;
}

/**
 * Interpolates macros in template text with provided values dictionary.
 * Supports both {tag} and {{tag}}, and falls back to default examples if allowPreviewFallback=true.
 * Contextually sanitizes macro values for HTML-aware channels (email, telegram) to prevent XSS.
 */
export function interpolateTemplateText(
	templateText: string,
	values: Record<string, string | number | null | undefined>,
	options: InterpolateTemplateOptions = {},
): {
	text: string;
	usedMacros: string[];
	missingMacros: string[];
} {
	const usedMacros = new Set<string>();
	const missingMacros = new Set<string>();
	const fallbackMap = options.allowPreviewFallback
		? getDefaultMacroPreviewValues()
		: {};

	const shouldSanitize =
		options.sanitize === true ||
		(options.sanitize !== false &&
			(options.channel === "email" || options.channel === "telegram"));

	const formatValue = (v: string): string => {
		return shouldSanitize ? escapeHtml(v) : v;
	};

	const text = templateText.replace(MACRO_PATTERN, (fullMatch, doubleKey, singleKey) => {
		const rawKey = doubleKey ?? singleKey;
		if (!rawKey) return fullMatch;

		const canonicalKey = normalizeMacroKey(rawKey);
		const val =
			values[rawKey] ??
			values[canonicalKey] ??
			values[rawKey.toLowerCase()] ??
			values[canonicalKey.toLowerCase()];

		if (val !== undefined && val !== null && String(val).trim().length > 0) {
			usedMacros.add(canonicalKey);
			return formatValue(String(val));
		}

		if (options.allowPreviewFallback && fallbackMap[canonicalKey]) {
			usedMacros.add(canonicalKey);
			return formatValue(fallbackMap[canonicalKey]);
		}

		missingMacros.add(canonicalKey);
		return fullMatch;
	});

	return {
		text,
		usedMacros: Array.from(usedMacros),
		missingMacros: Array.from(missingMacros),
	};
}

/**
 * Canonical default templates for each scenario and channel.
 */
export interface DefaultTemplateSeed {
	title: string;
	channel: MessageTemplateChannel;
	intent: MessageTemplateScenario;
	templateText: string;
	variables: string[];
}

export const DEFAULT_MESSAGE_TEMPLATES: readonly DefaultTemplateSeed[] = [
	{
		title: "Напоминание о приёме за 24ч (Telegram)",
		channel: "telegram",
		intent: "appointment_reminder_24h",
		templateText:
			"Здравствуйте, {patient_name}! 🦷\n\nНапоминаем о вашей записи на приём завтра, {appointment_date} в {appointment_time}.\nВрач: {doctor_name} ({doctor_role})\nКабинет: {chair_number}\nКлиника: {clinic_name}, {clinic_address}\n\nПожалуйста, подтвердите визит по ссылке: {portal_link} или ответьте на это сообщение.\nТелефон клиники: {clinic_phone}",
		variables: [
			"patient_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"doctor_role",
			"chair_number",
			"clinic_name",
			"clinic_address",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Напоминание о приёме за 24ч (WhatsApp)",
		channel: "whatsapp",
		intent: "appointment_reminder_24h",
		templateText:
			"Здравствуйте, *{patient_name}*! 🦷\n\nНапоминаем о вашем визите: *{appointment_date} в {appointment_time}*.\nВрач: {doctor_name} ({doctor_role})\nАдрес: {clinic_name}, {clinic_address}\n\nПодтвердите ваш визит: {portal_link}\nТелефон: {clinic_phone}",
		variables: [
			"patient_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"doctor_role",
			"clinic_name",
			"clinic_address",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Напоминание о приёме за 24ч (MAX)",
		channel: "max",
		intent: "appointment_reminder_24h",
		templateText:
			"Здравствуйте, {patient_name}! 🦷 Напоминаем о записи на приём: {appointment_date} в {appointment_time} к врачу {doctor_name}. Клиника «{clinic_name}» ({clinic_address}). Подтвердить запись: {portal_link}. Телефон: {clinic_phone}",
		variables: [
			"patient_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"clinic_name",
			"clinic_address",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Напоминание о приёме за 24ч (SMS)",
		channel: "sms",
		intent: "appointment_reminder_24h",
		templateText:
			"{clinic_name}: {patient_first_name}, ждём вас {appointment_date} в {appointment_time} к врачу {doctor_name}. Подтвердите: {portal_link} Тел: {clinic_phone}",
		variables: [
			"clinic_name",
			"patient_first_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Подтверждение созданной записи (Telegram)",
		channel: "telegram",
		intent: "appointment_confirmation",
		templateText:
			"Здравствуйте, {patient_name}! ✅\n\nВы успешно записаны на приём в клинику «{clinic_name}».\n📅 Дата: {appointment_date}\n⏰ Время: {appointment_time}\n👨‍⚕️ Врач: {doctor_name} ({doctor_role})\n📍 Адрес: {clinic_address}, {chair_number}\n\nДетали визита доступны в личном кабинете: {portal_link}\nКонтактный телефон: {clinic_phone}",
		variables: [
			"patient_name",
			"clinic_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"doctor_role",
			"clinic_address",
			"chair_number",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Подтверждение созданной записи (WhatsApp)",
		channel: "whatsapp",
		intent: "appointment_confirmation",
		templateText:
			"Здравствуйте, *{patient_name}*! ✅\n\nВы успешно записаны на приём в клинику *{clinic_name}*.\nДата и время: *{appointment_date} в {appointment_time}*\nВрач: {doctor_name}\nАдрес: {clinic_address}\n\nЛичный кабинет: {portal_link}\nТелефон: {clinic_phone}",
		variables: [
			"patient_name",
			"clinic_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"clinic_address",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Подтверждение созданной записи (SMS)",
		channel: "sms",
		intent: "appointment_confirmation",
		templateText:
			"{clinic_name}: Вы записаны на {appointment_date} в {appointment_time} к врачу {doctor_name}. Адрес: {clinic_address}. Тел: {clinic_phone}",
		variables: [
			"clinic_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"clinic_address",
			"clinic_phone",
		],
	},
	{
		title: "Послеоперационный опрос 043/у (Telegram)",
		channel: "telegram",
		intent: "post_op_checkup_043",
		templateText:
			"Здравствуйте, {patient_first_name}! 🩺\n\nВрач {doctor_name} и команда клиники «{clinic_name}» заботятся о вашем самочувствии после недавнего визита.\n\nПожалуйста, ответьте на пару вопросов о вашем состоянии в короткой анкете 043/у: {portal_link}\n\nЕсли вас беспокоит боль, отёк или дискомфорт — сразу свяжитесь с нами: {clinic_phone}.",
		variables: [
			"patient_first_name",
			"doctor_name",
			"clinic_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Послеоперационный опрос 043/у (WhatsApp)",
		channel: "whatsapp",
		intent: "post_op_checkup_043",
		templateText:
			"Здравствуйте, *{patient_first_name}*! 🩺\n\nКак ваше самочувствие после визита к врачу {doctor_name}?\nПожалуйста, заполните короткий опрос о вашем состоянии: {portal_link}\n\nПри возникновении боли или вопросов звоните нам: {clinic_phone}.\nС заботой, клиника *{clinic_name}*.",
		variables: [
			"patient_first_name",
			"doctor_name",
			"portal_link",
			"clinic_phone",
			"clinic_name",
		],
	},
	{
		title: "Готовность работы из ЗТЛ (Telegram)",
		channel: "telegram",
		intent: "ztl_ready_alert",
		templateText:
			"Здравствуйте, {patient_name}! 🦷✨\n\nВаша ортопедическая конструкция готова и поступила в клинику «{clinic_name}» из зуботехнической лаборатории.\n\nПриглашаем вас на примерку и фиксацию к врачу {doctor_name}.\nЗапишитесь на удобное время онлайн: {portal_link} или по телефону {clinic_phone}.",
		variables: [
			"patient_name",
			"clinic_name",
			"doctor_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Готовность работы из ЗТЛ (WhatsApp)",
		channel: "whatsapp",
		intent: "ztl_ready_alert",
		templateText:
			"Здравствуйте, *{patient_name}*! 🦷✨\n\nВаша ортопедическая работа готова и доставлена в клинику *{clinic_name}*.\nЖдём вас на установку к врачу {doctor_name}.\nЗапись на приём: {portal_link} или тел. {clinic_phone}",
		variables: [
			"patient_name",
			"clinic_name",
			"doctor_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Готовность работы из ЗТЛ (SMS)",
		channel: "sms",
		intent: "ztl_ready_alert",
		templateText:
			"{clinic_name}: Ваша работа из лаборатории готова. Запишитесь на установку к врачу {doctor_name}: {portal_link} Тел: {clinic_phone}",
		variables: [
			"clinic_name",
			"doctor_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Профосмотр и гигиена 6 мес. (Telegram)",
		channel: "telegram",
		intent: "retention_recall_6m",
		templateText:
			"Здравствуйте, {patient_first_name}! 🪥✨\n\nПрошло 6 месяцев с вашего последнего профилактического визита к врачу {doctor_name} в клинику «{clinic_name}».\n\nРегулярная профессиональная гигиена и осмотр сохраняют здоровье зубов и гарантию на лечение.\n\nЗапишитесь онлайн со скидкой: {portal_link}\nТелефон для записи: {clinic_phone}",
		variables: [
			"patient_first_name",
			"doctor_name",
			"clinic_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Профосмотр и гигиена 6 мес. (WhatsApp)",
		channel: "whatsapp",
		intent: "retention_recall_6m",
		templateText:
			"Здравствуйте, *{patient_first_name}*! 🪥✨\n\nПрошло 6 месяцев с последнего осмотра в клинике *{clinic_name}*. Пора пройти плановый осмотр и профгигиену у врача {doctor_name}.\n\nЗаписаться на удобное время: {portal_link}\nТелефон: {clinic_phone}",
		variables: [
			"patient_first_name",
			"clinic_name",
			"doctor_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Профосмотр и гигиена 6 мес. (SMS)",
		channel: "sms",
		intent: "retention_recall_6m",
		templateText:
			"{clinic_name}: {patient_first_name}, прошло 6 мес. Пора на плановый осмотр к врачу {doctor_name}. Запись: {portal_link} Тел: {clinic_phone}",
		variables: [
			"clinic_name",
			"patient_first_name",
			"doctor_name",
			"portal_link",
			"clinic_phone",
		],
	},
	{
		title: "Уведомление о задолженности со ссылкой на СБП (Telegram)",
		channel: "telegram",
		intent: "debt_notification",
		templateText:
			"Здравствуйте, {patient_name}! 💳\n\nНапоминаем о наличии остатка за оказанные стоматологические услуги в клинике «{clinic_name}».\n\nВы можете быстро и безопасно оплатить счёт без комиссии через Систему Быстрых Платежей (СБП):\n👉 {sbp_payment_link}\n\nПо вопросам расчётов обращайтесь по телефону: {clinic_phone}.\nС уважением, {clinic_name}",
		variables: [
			"patient_name",
			"clinic_name",
			"sbp_payment_link",
			"clinic_phone",
		],
	},
	{
		title: "Уведомление о задолженности со ссылкой на СБП (WhatsApp)",
		channel: "whatsapp",
		intent: "debt_notification",
		templateText:
			"Здравствуйте, *{patient_name}*! 💳\n\nНапоминаем о наличии задолженности за лечение в клинике *{clinic_name}*.\n\nОплатить без комиссии через СБП: {sbp_payment_link}\n\nТелефон для справок: {clinic_phone}",
		variables: [
			"patient_name",
			"clinic_name",
			"sbp_payment_link",
			"clinic_phone",
		],
	},
	{
		title: "Уведомление о задолженности со ссылкой на СБП (SMS)",
		channel: "sms",
		intent: "debt_notification",
		templateText:
			"{clinic_name}: Уведомление о задолженности. Оплата без комиссии по СБП: {sbp_payment_link} Справки по тел: {clinic_phone}",
		variables: [
			"clinic_name",
			"sbp_payment_link",
			"clinic_phone",
		],
	},
	{
		title: "Подтверждение записи на приём (Email)",
		channel: "email",
		intent: "appointment_confirmation",
		templateText:
			"Уважаемый(ая) {patient_name}!\n\nПодтверждаем вашу запись на стоматологический приём в клинику «{clinic_name}».\n\nДата приёма: {appointment_date}\nВремя приёма: {appointment_time}\nЛечащий врач: {doctor_name} ({doctor_role})\nКабинет/установка: {chair_number}\nАдрес клиники: {clinic_address}\n\nУправлять записью и просматривать план лечения вы можете в личном кабинете: {portal_link}\n\nТелефон регистратуры: {clinic_phone}\n\nС уважением,\nКоманда стоматологической клиники «{clinic_name}»",
		variables: [
			"patient_name",
			"clinic_name",
			"appointment_date",
			"appointment_time",
			"doctor_name",
			"doctor_role",
			"chair_number",
			"clinic_address",
			"portal_link",
			"clinic_phone",
		],
	},
] as const;

/**
 * Zod Schemas for API Input/Output Validation
 */
export const messageTemplateSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	title: z.string().min(1, "Название обязательно"),
	channel: messageTemplateChannelSchema,
	intent: z.string().min(1, "Сценарий обязателен"),
	templateText: z.string().min(1, "Текст шаблона обязателен"),
	variables: z.array(z.string()).optional().nullable(),
	isActive: z.boolean().default(true),
	createdAt: z.union([z.string(), z.date()]).optional(),
});
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

export const createMessageTemplateSchema = z.object({
	title: z.string().min(1, "Название обязательно"),
	channel: messageTemplateChannelSchema.default("telegram"),
	intent: z.string().min(1, "Сценарий обязателен").default("appointment_reminder_24h"),
	templateText: z.string().min(1, "Текст шаблона обязателен"),
	variables: z.array(z.string()).optional(),
	isActive: z.boolean().optional().default(true),
});
export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateSchema>;

export const updateMessageTemplateSchema = createMessageTemplateSchema.partial();
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateSchema>;

export const renderMessageTemplateInputSchema = z.object({
	templateId: z.string().uuid().optional(),
	templateText: z.string().optional(),
	channel: messageTemplateChannelSchema.optional().default("telegram"),
	intent: z.string().optional(),
	patientId: z.string().uuid().optional(),
	appointmentId: z.string().uuid().optional(),
	variables: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
	allowPreviewFallback: z.boolean().optional().default(true),
});
export type RenderMessageTemplateInput = z.infer<typeof renderMessageTemplateInputSchema>;

export const renderMessageTemplateResultSchema = z.object({
	ok: z.boolean(),
	renderedText: z.string(),
	channel: messageTemplateChannelSchema,
	usedMacros: z.array(z.string()),
	missingMacros: z.array(z.string()),
	characterCount: z.number(),
	smsSegments: z.number().optional(),
	smsEncoding: z.enum(["gsm7", "ucs2"]).optional(),
	problems: z.array(z.string()),
});
export type RenderMessageTemplateResult = z.infer<typeof renderMessageTemplateResultSchema>;
