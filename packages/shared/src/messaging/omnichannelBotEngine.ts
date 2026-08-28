/**
 * omnichannelBotEngine.ts — Omnichannel Dental Patient Bot & Messaging Engine.
 *
 * Implements:
 * 1. Multi-channel messaging routing across WhatsApp Business API (WABA / 360dialog) and Telegram Bot API.
 * 2. Transactional appointment triggers:
 *    - T-24h Reminder ($T-24$) with interactive confirmation / reschedule buttons.
 *    - T-2h Reminder ($T-2$) with clinic geolocation, Yandex/2GIS map links, parking directions.
 * 3. Inbound webhook parsing & state machine for patient replies (CONFIRMED, RESCHEDULE_REQUESTED, CANCELLED).
 * 4. Natural language Russian intent matching and automated patient auto-replies.
 */

import { z } from "zod";
import { formatKopecksRu, type Kopecks } from "../money.js";

// ─── Enums & Schemas ───

export const omnichannelChannelSchema = z.enum([
	"whatsapp",
	"telegram",
	"sms",
	"maxibot",
	"vk",
]);
export type OmnichannelChannel = z.infer<typeof omnichannelChannelSchema>;

export const omnichannelProviderSchema = z.enum([
	"waba_360dialog",
	"telegram_bot",
	"sms_gateway",
	"maxibot_bridge",
	"vk_bridge",
]);
export type OmnichannelProvider = z.infer<typeof omnichannelProviderSchema>;

export const omnichannelTriggerTypeSchema = z.enum([
	"reminder_24h",
	"reminder_2h",
	"appointment_confirmation",
	"appointment_reschedule",
	"appointment_cancelled",
	"post_visit_nps",
	"sbp_payment",
	"custom",
]);
export type OmnichannelTriggerType = z.infer<typeof omnichannelTriggerTypeSchema>;

export const omnichannelPatientActionSchema = z.enum([
	"CONFIRMED",
	"RESCHEDULE_REQUESTED",
	"CANCELLED",
	"NPS_FEEDBACK",
	"PAYMENT_CONFIRMED",
	"UNKNOWN",
]);
export type OmnichannelPatientAction = z.infer<typeof omnichannelPatientActionSchema>;

export const omnichannelAppointmentStatusSchema = z.enum([
	"planned",
	"confirmed",
	"reschedule_requested",
	"cancelled",
	"arrived",
	"in_treatment",
	"completed",
	"no_show",
]);
export type OmnichannelAppointmentStatus = z.infer<typeof omnichannelAppointmentStatusSchema>;

// ─── Context Schemas ───

export const clinicCoordinatesSchema = z.object({
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
});
export type ClinicCoordinates = z.infer<typeof clinicCoordinatesSchema>;

export const omnichannelAppointmentContextSchema = z.object({
	appointmentId: z.string().min(1),
	organizationId: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	patientFirstName: z.string().optional(),
	patientPhone: z.string().min(6),
	telegramChatId: z.union([z.string(), z.number()]).optional().nullable(),
	doctorFullName: z.string().min(1),
	doctorSpecialty: z.string().default("Врач стоматолог"),
	appointmentDateTime: z.string().min(1), // ISO date string or formatted date
	appointmentDateFormatted: z.string().optional(), // "29 августа 2026"
	appointmentTimeFormatted: z.string().optional(), // "14:30"
	clinicName: z.string().default("DENTE Clinic"),
	clinicAddress: z.string().default("г. Москва, ул. Арбат, д. 24, стр. 1"),
	clinicFloorOffice: z.string().optional(), // "2 этаж, каб. 4"
	clinicPhone: z.string().default("+7 (495) 123-45-67"),
	clinicCoordinates: clinicCoordinatesSchema.default({
		latitude: 55.751244,
		longitude: 37.618423,
	}),
	yandexMapsUrl: z.string().optional(),
	twoGisUrl: z.string().optional(),
	parkingDirections: z.string().optional(),
	rescheduleUrl: z.string().optional(),
	paymentAmountKopecks: z.number().int().optional(),
});
export type OmnichannelAppointmentContext = z.input<typeof omnichannelAppointmentContextSchema>;
export type OmnichannelAppointmentContextOutput = z.output<typeof omnichannelAppointmentContextSchema>;

// ─── Message Payload Types ───

export interface TelegramInlineButton {
	text: string;
	callback_data?: string | undefined;
	url?: string | undefined;
}

export interface TelegramSendMessagePayload {
	chat_id: string | number;
	text: string;
	parse_mode: "HTML" | "MarkdownV2" | "Markdown";
	reply_markup?: {
		inline_keyboard: TelegramInlineButton[][];
	} | undefined;
}

export interface TelegramSendLocationPayload {
	chat_id: string | number;
	latitude: number;
	longitude: number;
	title?: string | undefined;
	address?: string | undefined;
	reply_markup?: {
		inline_keyboard: TelegramInlineButton[][];
	} | undefined;
}

export interface WhatsappWabaButtonPayload {
	messaging_product: "whatsapp";
	recipient_type: "individual";
	to: string;
	type: "interactive";
	interactive: {
		type: "button";
		header?: { type: "text"; text: string } | undefined;
		body: { text: string };
		footer?: { text: string } | undefined;
		action: {
			buttons: Array<{
				type: "reply";
				reply: { id: string; title: string };
			}>;
		};
	};
}

export interface SmsDispatchPayload {
	to: string;
	text: string;
}

export interface OmnichannelDispatchPackage {
	triggerType: OmnichannelTriggerType;
	channel: OmnichannelChannel;
	provider: OmnichannelProvider;
	recipientId: string;
	appointmentId: string;
	plainText: string;
	telegramPayload?: TelegramSendMessagePayload | TelegramSendLocationPayload | undefined;
	whatsappPayload?: WhatsappWabaButtonPayload | undefined;
	smsPayload?: SmsDispatchPayload | undefined;
	scheduledAt?: string | undefined;
}

// ─── Pure Helper Functions ───

/**
 * Extracts patient's first name from full Russian name or returns fallback.
 */
export function extractFirstNameRu(fullName: string): string {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length >= 2) {
		// e.g. "Смирнова Елена Александровна" -> parts[1] = "Елена"
		return parts[1] ?? fullName;
	}
	return parts[0] || fullName;
}

/**
 * Builds standard maps URL links for clinic coordinates if not explicitly provided.
 */
export function buildClinicMapLinks(coordinates?: ClinicCoordinates): {
	yandexMapsUrl: string;
	twoGisUrl: string;
} {
	if (!coordinates) {
		return {
			yandexMapsUrl: "https://yandex.ru/maps",
			twoGisUrl: "https://2gis.ru",
		};
	}
	const { latitude, longitude } = coordinates;
	return {
		yandexMapsUrl: `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=17&l=map`,
		twoGisUrl: `https://2gis.ru/geo/${longitude},${latitude}`,
	};
}

/**
 * Formats a Date into Russian date string (e.g. "29 августа 2026 г.") and time ("14:30").
 */
export function formatAppointmentDateTimeRu(dateInput: Date | string): {
	dateFormatted: string;
	timeFormatted: string;
} {
	const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
	if (Number.isNaN(date.getTime())) {
		return { dateFormatted: "указанную дату", timeFormatted: "указанное время" };
	}

	const months = [
		"января",
		"февраля",
		"марта",
		"апреля",
		"мая",
		"июня",
		"июля",
		"августа",
		"сентября",
		"октября",
		"ноября",
		"декабря",
	];

	const day = date.getDate();
	const month = months[date.getMonth()];
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");

	return {
		dateFormatted: `${day} ${month} ${year} г.`,
		timeFormatted: `${hours}:${minutes}`,
	};
}

// ─── T-24 Reminder Engine ───

/**
 * Builds T-24h Reminder Dispatch Package for WhatsApp, Telegram, or SMS.
 */
export function buildAppointmentReminder24h(
	contextInput: OmnichannelAppointmentContext,
	channel: OmnichannelChannel = "whatsapp",
): OmnichannelDispatchPackage {
	const context = omnichannelAppointmentContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || extractFirstNameRu(context.patientFullName);
	const { dateFormatted, timeFormatted } = context.appointmentDateFormatted && context.appointmentTimeFormatted
		? { dateFormatted: context.appointmentDateFormatted, timeFormatted: context.appointmentTimeFormatted }
		: formatAppointmentDateTimeRu(context.appointmentDateTime);

	const bodyText =
		`Здравствуйте, ${firstName}!\n` +
		`Напоминаем о вашей записи в клинику ${context.clinicName} на завтра, ${dateFormatted} в ${timeFormatted} ` +
		`к доктору ${context.doctorFullName} (${context.doctorSpecialty}).\n\n` +
		`Пожалуйста, подтвердите визит или выберите удобное действие:`;

	const appointmentId = context.appointmentId;

	// WhatsApp WABA / 360dialog interactive payload (Buttons)
	const whatsappPayload: WhatsappWabaButtonPayload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: context.patientPhone,
		type: "interactive",
		interactive: {
			type: "button",
			header: {
				type: "text",
				text: `Стоматология ${context.clinicName}`,
			},
			body: {
				text: bodyText,
			},
			footer: {
				text: "Нажмите кнопку для ответа",
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: {
							id: `btn_confirm_${appointmentId}`,
							title: "Подтверждаю визит",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_reschedule_${appointmentId}`,
							title: "Перенести прием",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_cancel_${appointmentId}`,
							title: "Отменить запись",
						},
					},
				],
			},
		},
	};

	// Telegram Bot API Inline Keyboard Payload
	const telegramPayload: TelegramSendMessagePayload = {
		chat_id: context.telegramChatId || context.patientPhone,
		text:
			`🦷 <b>Напоминание о визите к стоматологу</b>\n\n` +
			`Здравствуйте, <b>${firstName}</b>!\n` +
			`Ждем вас завтра, <b>${dateFormatted} в ${timeFormatted}</b>\n` +
			`👨‍⚕️ <b>Врач:</b> ${context.doctorFullName} (${context.doctorSpecialty})\n` +
			`🏥 <b>Клиника:</b> ${context.clinicName}\n` +
			`📍 <b>Адрес:</b> ${context.clinicAddress}\n\n` +
			`Пожалуйста, подтвердите ваш визит:`,
		parse_mode: "HTML",
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "✅ Подтверждаю визит",
						callback_data: `appt:confirm:${appointmentId}`,
					},
					{
						text: "🔄 Перенести прием",
						callback_data: `appt:reschedule:${appointmentId}`,
					},
				],
				[
					{
						text: "❌ Отменить запись",
						callback_data: `appt:cancel:${appointmentId}`,
					},
				],
			],
		},
	};

	// SMS Fallback
	const smsText = `${context.clinicName}: Напоминаем о визите завтра в ${timeFormatted} к врачу ${context.doctorFullName}. Подтвердить: ответ 1, Перенести: ответ 2, Тел: ${context.clinicPhone}`;
	const smsPayload: SmsDispatchPayload = {
		to: context.patientPhone,
		text: smsText,
	};

	const provider: OmnichannelProvider =
		channel === "telegram"
			? "telegram_bot"
			: channel === "sms"
			? "sms_gateway"
			: "waba_360dialog";

	return {
		triggerType: "reminder_24h",
		channel,
		provider,
		recipientId: channel === "telegram" && context.telegramChatId ? String(context.telegramChatId) : context.patientPhone,
		appointmentId,
		plainText: bodyText,
		whatsappPayload: channel === "whatsapp" ? whatsappPayload : undefined,
		telegramPayload: channel === "telegram" ? telegramPayload : undefined,
		smsPayload: channel === "sms" ? smsPayload : undefined,
	};
}

// ─── T-2h Reminder Engine ───

/**
 * Builds T-2h Reminder Dispatch Package with clinic location, maps, and parking notes.
 */
export function buildAppointmentReminder2h(
	contextInput: OmnichannelAppointmentContext,
	channel: OmnichannelChannel = "whatsapp",
): OmnichannelDispatchPackage {
	const context = omnichannelAppointmentContextSchema.parse(contextInput);
	const firstName = context.patientFirstName || extractFirstNameRu(context.patientFullName);
	const { timeFormatted } = context.appointmentTimeFormatted
		? { timeFormatted: context.appointmentTimeFormatted }
		: formatAppointmentDateTimeRu(context.appointmentDateTime);

	const defaultMaps = buildClinicMapLinks(context.clinicCoordinates);
	const yandexUrl = context.yandexMapsUrl || defaultMaps.yandexMapsUrl;
	const twoGisUrl = context.twoGisUrl || defaultMaps.twoGisUrl;
	const floorInfo = context.clinicFloorOffice ? `, ${context.clinicFloorOffice}` : "";
	const parkingInfo = context.parkingDirections || "У клиники доступна парковка для пациентов.";

	const bodyText =
		`Здравствуйте, ${firstName}!\n` +
		`Ждем вас сегодня в ${timeFormatted} в клинике ${context.clinicName}.\n\n` +
		`📍 Адрес: ${context.clinicAddress}${floorInfo}\n` +
		`🚗 Схема проезда и парковка: ${parkingInfo}\n` +
		`🗺️ Яндекс.Карты: ${yandexUrl}\n` +
		`🗺️ 2ГИС: ${twoGisUrl}\n` +
		`📞 Телефон для связи: ${context.clinicPhone}\n\n` +
		`Если вы опаздываете или не можете найти вход, пожалуйста, позвоните нам. До скорой встречи!`;

	const appointmentId = context.appointmentId;

	// WhatsApp Payload
	const whatsappPayload: WhatsappWabaButtonPayload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: context.patientPhone,
		type: "interactive",
		interactive: {
			type: "button",
			header: {
				type: "text",
				text: `📍 Как добраться в ${context.clinicName}`,
			},
			body: {
				text: bodyText,
			},
			footer: {
				text: "Ждем вас на приеме",
			},
			action: {
				buttons: [
					{
						type: "reply",
						reply: {
							id: `btn_navigate_${appointmentId}`,
							title: "Я уже в пути",
						},
					},
					{
						type: "reply",
						reply: {
							id: `btn_late_${appointmentId}`,
							title: "Опаздываю на 10 мин",
						},
					},
				],
			},
		},
	};

	// Telegram Payload with Map Buttons
	const telegramPayload: TelegramSendMessagePayload = {
		chat_id: context.telegramChatId || context.patientPhone,
		text:
			`📍 <b>Скоро прием в клинике ${context.clinicName}</b>\n\n` +
			`Здравствуйте, <b>${firstName}</b>! Ждем вас сегодня в <b>${timeFormatted}</b>.\n\n` +
			`🏥 <b>Адрес:</b> ${context.clinicAddress}${floorInfo}\n` +
			`🚗 <b>Парковка:</b> ${parkingInfo}\n` +
			`📞 <b>Телефон клиники:</b> ${context.clinicPhone}\n\n` +
			`<i>Если вы задерживаетесь, пожалуйста, предупредите нас кнопкой ниже.</i>`,
		parse_mode: "HTML",
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "🗺️ Открыть Яндекс.Карты", url: yandexUrl },
					{ text: "🗺️ Открыть 2ГИС", url: twoGisUrl },
				],
				[
					{ text: "🚗 Я уже в пути", callback_data: `appt:on_the_way:${appointmentId}` },
					{ text: "⏳ Опаздываю на 10 минут", callback_data: `appt:late_10m:${appointmentId}` },
				],
			],
		},
	};

	const smsPayload: SmsDispatchPayload = {
		to: context.patientPhone,
		text: `${context.clinicName}: Ждем вас сегодня в ${timeFormatted}. Адрес: ${context.clinicAddress}. Карты: ${yandexUrl}. Тел: ${context.clinicPhone}`,
	};

	const provider: OmnichannelProvider =
		channel === "telegram"
			? "telegram_bot"
			: channel === "sms"
			? "sms_gateway"
			: "waba_360dialog";

	return {
		triggerType: "reminder_2h",
		channel,
		provider,
		recipientId: channel === "telegram" && context.telegramChatId ? String(context.telegramChatId) : context.patientPhone,
		appointmentId,
		plainText: bodyText,
		whatsappPayload: channel === "whatsapp" ? whatsappPayload : undefined,
		telegramPayload: channel === "telegram" ? telegramPayload : undefined,
		smsPayload: channel === "sms" ? smsPayload : undefined,
	};
}

// ─── Inbound Webhook Parser & Patient Intent Classifier ───

export interface ParsedOmnichannelWebhookResult {
	channel: OmnichannelChannel;
	senderId: string;
	appointmentId: string | null;
	action: OmnichannelPatientAction;
	confidence: "explicit_button" | "keyword_match" | "unrecognized";
	rawMessageText: string;
	nextAppointmentStatus: OmnichannelAppointmentStatus | null;
	autoReplyText: string;
	extractedScore?: number | undefined;
}

/**
 * Natural language Russian regular expressions for intent classification.
 */
const CANCEL_INTENT_REGEX =
	/(?:^|\s)(?:отменит[еь]|отмена|не\s+(?:приду|смогу|буду|получится)|заболел[ао]?|отказ)(?:$|\s|[!.,])/i;

const RESCHEDULE_INTENT_REGEX =
	/(?:^|\s)(?:перенест[ие]|перенос|не\s+успеваю|другой\s+день|другое\s+время|позже|сдвинуть|поменять\s+время|2)(?:$|\s|[!.,])/i;

const CONFIRM_INTENT_REGEX =
	/(?:^|\s)(?:да|подтвержда[юем]|буд[уем]|приду|подтвердить|точно\s+буду|ок|ok|yes|конечно|1)(?:$|\s|[!.,])/i;

/**
 * Parses inbound webhook payloads from WhatsApp WABA / 360dialog or Telegram Bot API.
 */
export function parseOmnichannelInboundWebhook(
	rawPayload: Record<string, unknown>,
	providerHint?: OmnichannelProvider,
): ParsedOmnichannelWebhookResult {
	// 1. Detect Telegram Update
	if ("callback_query" in rawPayload || ("message" in rawPayload && typeof (rawPayload.message as Record<string, unknown>)?.chat === "object")) {
		return parseTelegramWebhook(rawPayload);
	}

	// 2. Detect WhatsApp 360dialog / WABA Webhook
	if ("entry" in rawPayload || "messages" in rawPayload || "statuses" in rawPayload) {
		return parseWhatsappWebhook(rawPayload);
	}

	// 3. Fallback generic text payload
	const text = String(rawPayload.text || rawPayload.body || "").trim();
	const senderId = String(rawPayload.from || rawPayload.sender || rawPayload.phone || "");
	const appointmentId = rawPayload.appointmentId ? String(rawPayload.appointmentId) : null;

	return classifyTextIntent(text, senderId, appointmentId, "whatsapp");
}

function parseTelegramWebhook(payload: Record<string, unknown>): ParsedOmnichannelWebhookResult {
	// Callback Query (Button Press)
	if (payload.callback_query && typeof payload.callback_query === "object") {
		const cb = payload.callback_query as Record<string, unknown>;
		const data = String(cb.data || "");
		const from = (cb.from as Record<string, unknown>) || {};
		const senderId = String(from.id || "");

		// Format: appt:confirm:<appointmentId>, appt:reschedule:<id>, appt:cancel:<id>, nps:rate:<visitId>:<score>
		const parts = data.split(":");
		const domain = parts[0];
		const actionStr = parts[1];
		const entityId = parts[2] || null;

		if (domain === "appt") {
			if (actionStr === "confirm") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "CONFIRMED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: "confirmed",
					autoReplyText: "✅ Спасибо! Ваш визит подтвержден. Будем рады видеть вас в клинике DENTE!",
				};
			}
			if (actionStr === "reschedule") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "RESCHEDULE_REQUESTED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: "reschedule_requested",
					autoReplyText: "🔄 Запрос на перенос принят. Администратор клиники свяжется с вами в течение 10–15 минут для подбора удобного времени.",
				};
			}
			if (actionStr === "cancel") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "CANCELLED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: "cancelled",
					autoReplyText: "❌ Ваша запись отменена. Если вам снова потребуется помощь стоматолога, мы всегда на связи.",
				};
			}
			if (actionStr === "on_the_way") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "CONFIRMED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: "confirmed",
					autoReplyText: "🚗 Отлично! Врач готов к приему. Ждем вас!",
				};
			}
			if (actionStr === "late_10m") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "CONFIRMED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: "confirmed",
					autoReplyText: "⏳ Спасибо, что предупредили! Передали информацию доктору. Ждем вас.",
				};
			}
		}

		if (domain === "nps" && actionStr === "rate") {
			const score = parseInt(parts[3] || "10", 10);
			return {
				channel: "telegram",
				senderId,
				appointmentId: entityId,
				action: "NPS_FEEDBACK",
				confidence: "explicit_button",
				rawMessageText: data,
				nextAppointmentStatus: null,
				extractedScore: score,
				autoReplyText: score >= 9
					? "🌟 Огромное спасибо за высокую оценку! Мы очень ценим ваше доверие."
					: score >= 7
					? "👍 Спасибо за обратную связь! Будем стремиться сделать ваш следующий визит идеальным."
					: "🙏 Спасибо за честную оценку. Руководство клиники уже уведомлено и свяжется с вами для разбора ситуации.",
			};
		}
	}

	// Telegram Plain Message
	if (payload.message && typeof payload.message === "object") {
		const msg = payload.message as Record<string, unknown>;
		const text = String(msg.text || "").trim();
		const from = (msg.from as Record<string, unknown>) || {};
		const senderId = String(from.id || "");
		return classifyTextIntent(text, senderId, null, "telegram");
	}

	return {
		channel: "telegram",
		senderId: "unknown",
		appointmentId: null,
		action: "UNKNOWN",
		confidence: "unrecognized",
		rawMessageText: "",
		nextAppointmentStatus: null,
		autoReplyText: "Здравствуйте! Ваше сообщение получено. Администратор клиники ответит вам в ближайшее время.",
	};
}

function parseWhatsappWebhook(payload: Record<string, unknown>): ParsedOmnichannelWebhookResult {
	let messageObj: Record<string, unknown> | null = null;
	let senderPhone = "";

	// WABA Cloud API format: entry[0].changes[0].value.messages[0]
	if (Array.isArray(payload.entry)) {
		const firstEntry = payload.entry[0] as Record<string, unknown>;
		if (Array.isArray(firstEntry?.changes)) {
			const firstChange = firstEntry.changes[0] as Record<string, unknown>;
			const value = (firstChange?.value as Record<string, unknown>) || {};
			if (Array.isArray(value.messages) && value.messages[0]) {
				messageObj = value.messages[0] as Record<string, unknown>;
			}
		}
	} else if (Array.isArray(payload.messages) && payload.messages[0]) {
		messageObj = payload.messages[0] as Record<string, unknown>;
	}

	if (!messageObj) {
		return {
			channel: "whatsapp",
			senderId: "unknown",
			appointmentId: null,
			action: "UNKNOWN",
			confidence: "unrecognized",
			rawMessageText: "",
			nextAppointmentStatus: null,
			autoReplyText: "Здравствуйте! Ваше сообщение получено. Администратор клиники свяжется с вами.",
		};
	}

	senderPhone = String(messageObj.from || "");

	// Check Interactive Button / List Reply
	if (messageObj.type === "interactive" && typeof messageObj.interactive === "object") {
		const interactive = messageObj.interactive as Record<string, unknown>;
		const buttonReply = interactive.button_reply as Record<string, unknown> | undefined;
		const listReply = interactive.list_reply as Record<string, unknown> | undefined;
		const buttonId = String(buttonReply?.id || listReply?.id || "");

		if (buttonId.startsWith("btn_confirm_")) {
			const apptId = buttonId.replace("btn_confirm_", "");
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: apptId,
				action: "CONFIRMED",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: "confirmed",
				autoReplyText: "✅ Спасибо! Ваш визит подтвержден. Будем рады видеть вас в клинике DENTE!",
			};
		}

		if (buttonId.startsWith("btn_reschedule_")) {
			const apptId = buttonId.replace("btn_reschedule_", "");
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: apptId,
				action: "RESCHEDULE_REQUESTED",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: "reschedule_requested",
				autoReplyText: "🔄 Запрос на перенос принят. Администратор клиники свяжется с вами в течение 10–15 минут для подбора удобного времени.",
			};
		}

		if (buttonId.startsWith("btn_cancel_")) {
			const apptId = buttonId.replace("btn_cancel_", "");
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: apptId,
				action: "CANCELLED",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: "cancelled",
				autoReplyText: "❌ Ваша запись отменена. Если вам снова потребуется стоматологическая помощь, мы всегда на связи.",
			};
		}

		if (buttonId.startsWith("btn_navigate_") || buttonId.startsWith("btn_late_")) {
			const apptId = buttonId.replace(/btn_(navigate|late)_/, "");
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: apptId,
				action: "CONFIRMED",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: "confirmed",
				autoReplyText: "🚗 Спасибо! Доктор ждет вас в клинике.",
			};
		}

		if (buttonId.startsWith("nps_")) {
			const parts = buttonId.split("_");
			const score = parseInt(parts[parts.length - 1] || "10", 10);
			const visitId = parts[1] || "";
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: visitId,
				action: "NPS_FEEDBACK",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: null,
				extractedScore: score,
				autoReplyText: score >= 9
					? "🌟 Огромное спасибо за высокую оценку! Будем рады видеть вас снова."
					: "🙏 Спасибо за обратную связь! Мы свяжемся с вами для уточнения деталей.",
			};
		}
	}

	// Plain Text Message
	if (messageObj.type === "text" && typeof messageObj.text === "object") {
		const textObj = messageObj.text as Record<string, unknown>;
		const body = String(textObj.body || "").trim();
		return classifyTextIntent(body, senderPhone, null, "whatsapp");
	}

	return {
		channel: "whatsapp",
		senderId: senderPhone,
		appointmentId: null,
		action: "UNKNOWN",
		confidence: "unrecognized",
		rawMessageText: "",
		nextAppointmentStatus: null,
		autoReplyText: "Здравствуйте! Ваше сообщение получено. Администратор клиники ответит вам в ближайшее время.",
	};
}

/**
 * Classifies patient's Russian text message using regex pattern matching.
 */
export function classifyTextIntent(
	text: string,
	senderId: string,
	appointmentId: string | null,
	channel: OmnichannelChannel = "whatsapp",
): ParsedOmnichannelWebhookResult {
	const trimmed = text.trim();

	// 1. Check Cancel first (e.g. "не приду", "отмените")
	if (CANCEL_INTENT_REGEX.test(trimmed)) {
		return {
			channel,
			senderId,
			appointmentId,
			action: "CANCELLED",
			confidence: "keyword_match",
			rawMessageText: text,
			nextAppointmentStatus: "cancelled",
			autoReplyText: "❌ Ваша запись отменена. Если вам снова потребуется стоматологическая помощь, мы всегда на связи.",
		};
	}

	// 2. Check Reschedule second (e.g. "перенесите", "не успеваю")
	if (RESCHEDULE_INTENT_REGEX.test(trimmed)) {
		return {
			channel,
			senderId,
			appointmentId,
			action: "RESCHEDULE_REQUESTED",
			confidence: "keyword_match",
			rawMessageText: text,
			nextAppointmentStatus: "reschedule_requested",
			autoReplyText: "🔄 Запрос на перенос записи принят. Администратор свяжется с вами в течение 10–15 минут для подбора времени.",
		};
	}

	// 3. Check Confirm third (e.g. "да", "буду", "подтверждаю")
	if (CONFIRM_INTENT_REGEX.test(trimmed)) {
		return {
			channel,
			senderId,
			appointmentId,
			action: "CONFIRMED",
			confidence: "keyword_match",
			rawMessageText: text,
			nextAppointmentStatus: "confirmed",
			autoReplyText: "✅ Спасибо! Ваш визит подтвержден. Будем рады видеть вас в клинике DENTE!",
		};
	}

	return {
		channel,
		senderId,
		appointmentId,
		action: "UNKNOWN",
		confidence: "unrecognized",
		rawMessageText: text,
		nextAppointmentStatus: null,
		autoReplyText: "Здравствуйте! Ваше сообщение получено. Администратор клиники свяжется с вами в ближайшее время.",
	};
}
