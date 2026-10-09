/**
 * intentClassifier.ts — Layer 1: Inbound Webhook Parser & Natural Language Intent Classifier.
 *
 * Implements:
 * 1. Webhook parsing for Telegram Bot API & WhatsApp WABA / 360dialog.
 * 2. Natural language Russian intent matching for appointment actions (confirm, reschedule, cancel).
 * 3. Clinical symptom triage (acute pain, broken tooth, swelling, fever) with emergency instructions.
 * 4. FAQ and price question classification, lab status queries, and live operator handover triggers.
 */

import type {
	BotIntentType,
	OmnichannelChannel,
	OmnichannelProvider,
	ParsedOmnichannelWebhookResult,
} from "./types.js";

// ─── Regular Expressions for Russian Natural Language Matching ───

export const CANCEL_INTENT_REGEX =
	/(?:^|\s)(?:отменит[еь]|отмена|не\s+(?:приду|смогу|буду|получится)|заболел[ао]?|отказ)(?:$|\s|[!.,])/i;

export const RESCHEDULE_INTENT_REGEX =
	/(?:^|\s)(?:перенест[ие]|перенос|не\s+успеваю|другой\s+день|другое\s+время|позже|сдвинуть|поменять\s+время|2)(?:$|\s|[!.,])/i;

export const CONFIRM_INTENT_REGEX =
	/(?:^|\s)(?:да|подтвержда[юем]|буд[уем]|приду|подтвердить|точно\s+буду|ок|ok|yes|конечно|1)(?:$|\s|[!.,])/i;

export const EMERGENCY_PAIN_INTENT_REGEX =
	/(?:острая\s+боль|сильно\s+болит|невыносимо\s+болит|флюс|опухла?\s+щека|нагноен|кровит|кровотечен|сломал(?:ся)?\s+зуб|выбил(?:и)?\s+зуб|пульпит|температур|отек)/i;

export const BOOKING_INTENT_REGEX =
	/(?:записат[ься]|хочу\s+(?:на\s+прием|к\s+врачу|запись)|есть\s+ли\s+мест[оа]|свободн[ыеое]\s+окн[оа]|нужен\s+стоматолог|консультаци[яю])/i;

export const PRICE_FAQ_INTENT_REGEX =
	/(?:скольк[оа]\s+стоит|какая\s+цена|стоимост[ь]|прайс|прейскурант|расценк[и])/i;

export const LAB_STATUS_INTENT_REGEX =
	/(?:готов[аыо]?\s+(?:коронк[аи]|протез|капп[аы]|слеп[ок|ки]|винир)|статус\s+лаборатори|когда\s+будет\s+готов[оа])/i;

export const OPERATOR_HANDOVER_INTENT_REGEX =
	/(?:позови(?:те)?\s+оператора|живо[йг]о?\s+человек|соедини(?:те)?\s+с\s+администратор|переключи(?:те)?|связаться\s+с\s+человеком|не\s+бот)/i;

/**
 * Classifies patient's Russian text message using regex pattern matching.
 * Preserves 100% backward-compatible signature and behavior.
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

/**
 * Detailed intent and clinical triage classifier.
 */
export function classifyDetailedIntent(text: string): {
	intent: BotIntentType;
	confidence: number;
	urgency: "emergency" | "urgent" | "routine";
	triageAdvice?: string | undefined;
} {
	const trimmed = text.trim();

	// 1. Clinical Emergency / Pain
	if (EMERGENCY_PAIN_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "emergency_pain",
			confidence: 0.95,
			urgency: "emergency",
			triageAdvice:
				"🚨 Внимание: при острой боли не согревайте щеку и область воспаления компрессами! " +
				"Не прикладывайте таблетки аспирина к десне. Примите обезболивающее (Ибупрофен/Парацетамол) " +
				"и срочно приезжайте в клинику — дежурный врач примет вас вне очереди (CITO).",
		};
	}

	// 2. Live Operator Request
	if (OPERATOR_HANDOVER_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "operator_handover",
			confidence: 0.95,
			urgency: "urgent",
		};
	}

	// 3. Cancellation
	if (CANCEL_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "cancel",
			confidence: 0.9,
			urgency: "routine",
		};
	}

	// 4. Reschedule
	if (RESCHEDULE_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "reschedule",
			confidence: 0.9,
			urgency: "routine",
		};
	}

	// 5. Confirmation
	if (CONFIRM_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "confirm",
			confidence: 0.9,
			urgency: "routine",
		};
	}

	// 6. Booking Request
	if (BOOKING_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "booking",
			confidence: 0.85,
			urgency: "routine",
		};
	}

	// 7. Price / FAQ
	if (PRICE_FAQ_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "price_faq",
			confidence: 0.85,
			urgency: "routine",
		};
	}

	// 8. Dental Lab Status
	if (LAB_STATUS_INTENT_REGEX.test(trimmed)) {
		return {
			intent: "lab_status",
			confidence: 0.85,
			urgency: "routine",
		};
	}

	return {
		intent: "unknown",
		confidence: 0.3,
		urgency: "routine",
	};
}

/**
 * Parses inbound webhook payloads from WhatsApp WABA / 360dialog or Telegram Bot API.
 */
export function parseOmnichannelInboundWebhook(
	rawPayload: Record<string, unknown>,
	_providerHint?: OmnichannelProvider,
): ParsedOmnichannelWebhookResult {
	// 1. Detect Telegram Update
	if (
		"callback_query" in rawPayload ||
		("message" in rawPayload &&
			typeof (rawPayload.message as Record<string, unknown>)?.chat === "object")
	) {
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

export function parseTelegramWebhook(payload: Record<string, unknown>): ParsedOmnichannelWebhookResult {
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
			if (actionStr === "bday_book" || actionStr === "hygiene_book") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "CONFIRMED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: "confirmed",
					autoReplyText: "🎉 Спасибо за отклик! Администратор клиники уже подбирает для вас удобное время визита.",
				};
			}
			if (actionStr === "bday_call") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "CONFIRMED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: null,
					autoReplyText: "📞 Наш администратор перезвонит вам в течение 10 минут.",
				};
			}
			if (actionStr === "hygiene_snooze") {
				return {
					channel: "telegram",
					senderId,
					appointmentId: entityId,
					action: "RESCHEDULE_REQUESTED",
					confidence: "explicit_button",
					rawMessageText: data,
					nextAppointmentStatus: "reschedule_requested",
					autoReplyText: "⏳ Хорошо! Мы напомним вам о профгигиене через 2 недели.",
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

export function parseWhatsappWebhook(payload: Record<string, unknown>): ParsedOmnichannelWebhookResult {
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

		if (buttonId.startsWith("btn_bday_book_") || buttonId.startsWith("btn_hygiene_book_")) {
			const apptId = buttonId.replace(/btn_(bday|hygiene)_book_/, "");
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: apptId,
				action: "CONFIRMED",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: "confirmed",
				autoReplyText: "🎉 Спасибо за отклик! Администратор клиники уже подбирает для вас удобное время визита.",
			};
		}

		if (buttonId.startsWith("btn_bday_bonus_")) {
			const apptId = buttonId.replace("btn_bday_bonus_", "");
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: apptId,
				action: "CONFIRMED",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: null,
				autoReplyText: "🎁 Ваш праздничный бонус начислен и готов к списанию на ресепшн или при онлайн-оплате!",
			};
		}

		if (buttonId.startsWith("btn_hygiene_snooze_")) {
			const apptId = buttonId.replace("btn_hygiene_snooze_", "");
			return {
				channel: "whatsapp",
				senderId: senderPhone,
				appointmentId: apptId,
				action: "RESCHEDULE_REQUESTED",
				confidence: "explicit_button",
				rawMessageText: buttonId,
				nextAppointmentStatus: "reschedule_requested",
				autoReplyText: "⏳ Принято! Напомним вам о профгигиене через 2 недели.",
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
