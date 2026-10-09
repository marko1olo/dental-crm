/**
 * botDialogManager.ts — Layer 2: Finite State Machine (FSM) Dialog Manager.
 *
 * Implements:
 * 1. Conversational state management across Telegram, WhatsApp, SMS, MAX, VK.
 * 2. Session lifecycle, history logging, and timeout expiration (30-minute window).
 * 3. Guided branching: specialty selection -> slot matching -> appointment confirmation.
 * 4. Emergency pain triage and operator escalation hooks.
 */

import {
	type BotDialogContext,
	type BotDialogState,
	type BotIntentType,
	type BotKeyboardButton,
	type BotReplyMessage,
	type DoctorAvailableSlot,
	type IncomingBotMessage,
	type OmnichannelChannel,
} from "./types.js";
import { classifyDetailedIntent } from "./intentClassifier.js";
import { findAvailableSlots } from "./appointmentSlotMatcher.js";
import { OperatorHandoverService } from "./operatorHandoverService.js";

const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class BotDialogManager {
	private readonly sessions = new Map<string, BotDialogContext>();
	private readonly sessionTtlMs: number;

	constructor(sessionTtlMs = DEFAULT_SESSION_TTL_MS) {
		this.sessionTtlMs = sessionTtlMs;
	}

	/**
	 * Builds a deterministic session key based on channel, organization, and patient identifier.
	 */
	static buildSessionKey(channel: OmnichannelChannel, organizationId: string, senderId: string): string {
		return `${channel}:${organizationId}:${senderId}`;
	}

	/**
	 * Retrieves an active dialog context or initializes a fresh one.
	 */
	getOrCreateContext(
		channel: OmnichannelChannel,
		organizationId: string,
		senderId: string,
		senderName?: string,
	): BotDialogContext {
		const key = BotDialogManager.buildSessionKey(channel, organizationId, senderId);
		const now = Date.now();
		const existing = this.sessions.get(key);

		if (existing && existing.sessionExpiresAt > now) {
			existing.sessionExpiresAt = now + this.sessionTtlMs;
			existing.updatedAt = now;
			if (senderName && !existing.patientName) {
				existing.patientName = senderName;
			}
			return existing;
		}

		const newContext: BotDialogContext = {
			dialogId: `dlg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
			organizationId,
			patientPhone: senderId,
			patientName: senderName,
			channel,
			currentState: "idle",
			history: [],
			handoverActive: false,
			createdAt: now,
			updatedAt: now,
			sessionExpiresAt: now + this.sessionTtlMs,
		};

		this.sessions.set(key, newContext);
		return newContext;
	}

	/**
	 * Processes an incoming patient message and generates the appropriate reply.
	 */
	handleMessage(
		incoming: IncomingBotMessage,
		availableSlots: DoctorAvailableSlot[] = [],
	): BotReplyMessage {
		const orgId = incoming.organizationId || "default_org";
		const context = this.getOrCreateContext(
			incoming.channel,
			orgId,
			incoming.senderId,
			incoming.senderName,
		);

		const now = Date.now();
		const text = incoming.text.trim();
		const payload = incoming.payload || "";

		// Save incoming message in history
		context.history.push({
			role: "patient",
			text: text || payload,
			timestamp: now,
		});

		// 1. If human operator is actively managing this dialog, suppress bot auto-replies
		if (context.handoverActive) {
			return {
				text: "",
				handoverToOperator: true,
			};
		}

		// 2. Handle button clicks / callbacks
		if (payload.startsWith("btn_") || payload.startsWith("appt:") || payload.startsWith("book:")) {
			return this.handleButtonCallback(context, payload, availableSlots);
		}

		// 3. Classify message intent
		const { intent, urgency, triageAdvice } = classifyDetailedIntent(text);
		context.lastIntent = intent;

		// 4. Emergency Acute Pain Triage (CITO)
		if (intent === "emergency_pain" || urgency === "emergency") {
			const handover = OperatorHandoverService.createHandoverRequest(
				context,
				"pain_emergency",
				text,
			);

			const replyText =
				(triageAdvice ? `${triageAdvice}\n\n` : "") +
				handover.botAutoReply;

			const buttons: BotKeyboardButton[][] = [
				[
					{ text: "📞 Позвонить в клинику", callbackData: "handover:call_clinic" },
					{ text: "📍 Маршрут до клиники", callbackData: "nav:route" },
				],
			];

			context.history.push({
				role: "bot",
				text: replyText,
				timestamp: Date.now(),
				intent: "emergency_pain",
			});

			return {
				text: replyText,
				buttons,
				handoverToOperator: true,
				actionExecuted: "CITO_EMERGENCY_TRIGGERED",
			};
		}

		// 5. Explicit Operator Request
		if (intent === "operator_handover") {
			const handover = OperatorHandoverService.createHandoverRequest(
				context,
				"explicit_request",
				text,
			);

			context.history.push({
				role: "bot",
				text: handover.botAutoReply,
				timestamp: Date.now(),
				intent: "operator_handover",
			});

			return {
				text: handover.botAutoReply,
				handoverToOperator: true,
				actionExecuted: "OPERATOR_ESCALATION",
			};
		}

		// 6. Branch by current FSM State
		switch (context.currentState) {
			case "awaiting_specialty":
				return this.handleSpecialtySelection(context, text, availableSlots);

			case "awaiting_slot":
				return this.handleSlotSelection(context, text, availableSlots);

			case "idle":
			default:
				return this.handleIdleIntent(context, intent, text, availableSlots);
		}
	}

	private handleIdleIntent(
		context: BotDialogContext,
		intent: BotIntentType,
		text: string,
		availableSlots: DoctorAvailableSlot[],
	): BotReplyMessage {
		if (intent === "booking") {
			context.currentState = "awaiting_specialty";
			const replyText =
				"Здравствуйте! С удовольствием поможем вам записаться на прием.\n" +
				"К какому специалисту или с каким вопросом вы хотите обратиться?";

			const buttons: BotKeyboardButton[][] = [
				[
					{ text: "🦷 Терапия / Лечение кариеса", callbackData: "spec:therapy" },
					{ text: "✨ Профгигиена полости рта", callbackData: "spec:hygiene" },
				],
				[
					{ text: "👑 Ортопедия / Коронки / Виниры", callbackData: "spec:orthopedics" },
					{ text: "🔩 Хирургия / Имплантация", callbackData: "spec:surgery" },
				],
				[
					{ text: "📐 Ортодонтия / Брекеты / Элайнеры", callbackData: "spec:orthodontics" },
					{ text: "📞 Позвать администратора", callbackData: "handover:request" },
				],
			];

			this.recordBotReply(context, replyText, intent);
			return {
				text: replyText,
				buttons,
				nextStep: "awaiting_specialty",
			};
		}

		if (intent === "price_faq") {
			const replyText =
				"В клинике DENTE действует прозрачная система ценообразования:\n" +
				"• Первичная консультация и осмотр врача — 0 ₽ (входит в план лечения)\n" +
				"• Комплексная профгигиена (AirFlow + УЗ) — от 4 500 ₽\n" +
				"• Лечение кариеса с фотополимерной пломбой — от 3 800 ₽\n" +
				"• Имплантация зуба (система под ключ) — от 35 000 ₽\n\n" +
				"Хотите записаться на консультацию для точного расчета сметы?";

			const buttons: BotKeyboardButton[][] = [
				[
					{ text: "📅 Записаться на прием", callbackData: "intent:booking" },
					{ text: "📞 Задать вопрос администратору", callbackData: "handover:request" },
				],
			];

			this.recordBotReply(context, replyText, intent);
			return { text: replyText, buttons };
		}

		if (intent === "lab_status") {
			const replyText =
				"Информация о готовности ортопедических конструкций и лабораторных работ:\n" +
				"Как только ваша коронка или протез поступают из лаборатории, мы сразу направляем вам SMS и уведомление. " +
				"Для проверки точного статуса по вашей медкарте соединяю вас с администратором.";

			const handover = OperatorHandoverService.createHandoverRequest(
				context,
				"complex_medical_question",
				text,
			);

			this.recordBotReply(context, replyText, intent);
			return {
				text: replyText,
				handoverToOperator: true,
			};
		}

		if (intent === "confirm") {
			const replyText = "✅ Спасибо! Ваш визит подтвержден. Будем рады видеть вас в клинике DENTE!";
			this.recordBotReply(context, replyText, intent);
			return { text: replyText };
		}

		if (intent === "cancel") {
			const replyText = "❌ Ваша запись отменена. Если вам снова потребуется помощь стоматолога, мы всегда на связи.";
			this.recordBotReply(context, replyText, intent);
			return { text: replyText };
		}

		if (intent === "reschedule") {
			context.currentState = "awaiting_specialty";
			const replyText =
				"🔄 Поняли вас, давайте подберем другое удобное время.\n" +
				"Уточните, пожалуйста, к какому врачу вы записаны, или выберите направление:";

			const buttons: BotKeyboardButton[][] = [
				[
					{ text: "📅 Посмотреть свободные окна", callbackData: "slot:nearest" },
					{ text: "📞 Позвать администратора", callbackData: "handover:request" },
				],
			];

			this.recordBotReply(context, replyText, intent);
			return { text: replyText, buttons };
		}

		// Fallback for general greetings or unrecognized questions
		const replyText =
			"Здравствуйте! Вас приветствует виртуальный помощник стоматологии DENTE.\n" +
			"Чем я могу вам помочь сегодня?";

		const buttons: BotKeyboardButton[][] = [
			[
				{ text: "📅 Записаться на прием", callbackData: "intent:booking" },
				{ text: "💰 Узнать цены на услуги", callbackData: "intent:price_faq" },
			],
			[
				{ text: "🚨 Острая боль / Экстренно", callbackData: "intent:emergency" },
				{ text: "📞 Связаться с администратором", callbackData: "handover:request" },
			],
		];

		this.recordBotReply(context, replyText, "unknown");
		return { text: replyText, buttons };
	}

	private handleSpecialtySelection(
		context: BotDialogContext,
		specialtyInput: string,
		availableSlots: DoctorAvailableSlot[],
	): BotReplyMessage {
		context.selectedSpecialty = specialtyInput;
		const matchResult = findAvailableSlots(availableSlots, {
			specialty: specialtyInput,
			limit: 4,
		});

		context.currentState = "awaiting_slot";
		this.recordBotReply(context, matchResult.messageText, "booking");

		return {
			text: matchResult.messageText,
			buttons: matchResult.suggestedButtons,
			nextStep: "awaiting_slot",
		};
	}

	private handleSlotSelection(
		context: BotDialogContext,
		slotIdOrText: string,
		availableSlots: DoctorAvailableSlot[],
	): BotReplyMessage {
		const matchedSlot = availableSlots.find(
			(s) => s.slotId === slotIdOrText || s.timeFormatted === slotIdOrText,
		);

		if (matchedSlot) {
			context.selectedSlotTime = `${matchedSlot.dateFormatted} в ${matchedSlot.timeFormatted}`;
			context.selectedDoctorName = matchedSlot.doctorName;
			context.currentState = "awaiting_confirmation";

			const replyText =
				`Отлично! Вы выбрали запись:\n` +
				`👨‍⚕️ Врач: ${matchedSlot.doctorName} (${matchedSlot.specialty})\n` +
				`🕒 Время: ${matchedSlot.dateFormatted} в ${matchedSlot.timeFormatted}\n\n` +
				`Подтвердить бронирование?`;

			const buttons: BotKeyboardButton[][] = [
				[
					{ text: "✅ Подтвердить запись", callbackData: `book:confirm:${matchedSlot.slotId}` },
					{ text: "🔄 Выбрать другое время", callbackData: "slot:nearest" },
				],
			];

			this.recordBotReply(context, replyText, "booking");
			return {
				text: replyText,
				buttons,
				nextStep: "awaiting_confirmation",
			};
		}

		// Fallback if not found
		const replyText =
			"Не удалось найти выбранный слот. Пожалуйста, выберите одно из предложенных окон или свяжитесь с клиникой:";

		const buttons: BotKeyboardButton[][] = [
			[
				{ text: "📅 Ближайшие свободные окна", callbackData: "slot:nearest" },
				{ text: "📞 Связаться с администратором", callbackData: "handover:request" },
			],
		];

		this.recordBotReply(context, replyText, "booking");
		return { text: replyText, buttons };
	}

	private handleButtonCallback(
		context: BotDialogContext,
		payload: string,
		availableSlots: DoctorAvailableSlot[],
	): BotReplyMessage {
		if (payload.includes("handover") || payload === "handover:request") {
			const handover = OperatorHandoverService.createHandoverRequest(
				context,
				"explicit_request",
				"Нажата кнопка вызова администратора",
			);
			return {
				text: handover.botAutoReply,
				handoverToOperator: true,
			};
		}

		if (payload.startsWith("spec:")) {
			const specKey = payload.replace("spec:", "");
			const specName =
				specKey === "therapy"
					? "терапевт"
					: specKey === "hygiene"
					? "гигиенист"
					: specKey === "orthopedics"
					? "ортопед"
					: specKey === "surgery"
					? "хирург"
					: specKey === "orthodontics"
					? "ортодонт"
					: specKey;

			return this.handleSpecialtySelection(context, specName, availableSlots);
		}

		if (payload.startsWith("book:slot:")) {
			const slotId = payload.replace("book:slot:", "");
			return this.handleSlotSelection(context, slotId, availableSlots);
		}

		if (payload.startsWith("book:confirm:")) {
			context.currentState = "completed";
			const replyText =
				`🎉 Запись успешно подтверждена!\n` +
				(context.selectedDoctorName ? `Врач: ${context.selectedDoctorName}\n` : "") +
				(context.selectedSlotTime ? `Время: ${context.selectedSlotTime}\n\n` : "") +
				`Ждем вас в клинике DENTE! Накануне визита мы пришлем вам напоминание.`;

			this.recordBotReply(context, replyText, "booking");
			return {
				text: replyText,
				actionExecuted: "APPOINTMENT_BOOKED",
			};
		}

		if (payload === "slot:nearest") {
			const matchResult = findAvailableSlots(availableSlots, { limit: 4 });
			context.currentState = "awaiting_slot";
			this.recordBotReply(context, matchResult.messageText, "booking");
			return {
				text: matchResult.messageText,
				buttons: matchResult.suggestedButtons,
			};
		}

		return this.handleIdleIntent(context, "unknown", payload, availableSlots);
	}

	private recordBotReply(context: BotDialogContext, text: string, intent: BotIntentType) {
		context.history.push({
			role: "bot",
			text,
			timestamp: Date.now(),
			intent,
		});
		context.updatedAt = Date.now();
	}

	/**
	 * Evicts expired sessions to prevent memory leaks.
	 */
	expireOldSessions(now = Date.now()): number {
		let evicted = 0;
		for (const [key, ctx] of this.sessions.entries()) {
			if (ctx.sessionExpiresAt <= now) {
				this.sessions.delete(key);
				evicted++;
			}
		}
		return evicted;
	}

	getContext(dialogId: string): BotDialogContext | undefined {
		for (const ctx of this.sessions.values()) {
			if (ctx.dialogId === dialogId) return ctx;
		}
		return undefined;
	}

	resetContext(dialogId: string): boolean {
		for (const [key, ctx] of this.sessions.entries()) {
			if (ctx.dialogId === dialogId) {
				this.sessions.delete(key);
				return true;
			}
		}
		return false;
	}
}
