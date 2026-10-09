/**
 * operatorHandoverService.ts — Layer 2: Live Operator Handover & Escalation Service.
 *
 * Implements:
 * 1. Seamless escalation of patient chats from bot to human clinic administrator.
 * 2. Urgency classification (emergency CITO pain -> critical, explicit request -> high, fallback -> normal).
 * 3. Notification generation for CRM operator cockpit / staff alerts.
 * 4. Operator takeover and bot release lifecycle.
 */

import type {
	BotDialogContext,
	OperatorHandoverRequest,
	OperatorHandoverResult,
} from "./types.js";

export class OperatorHandoverService {
	/**
	 * Creates an escalation handover request when patient needs human intervention.
	 */
	static createHandoverRequest(
		context: BotDialogContext,
		reason: OperatorHandoverRequest["reason"],
		lastMessageText: string,
	): OperatorHandoverResult {
		const urgency: OperatorHandoverRequest["urgency"] =
			reason === "pain_emergency"
				? "critical"
				: reason === "explicit_request" || reason === "complex_medical_question"
				? "high"
				: "normal";

		const handoverId = `ho_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

		// History snippet (last 3 entries)
		const recentHistory = context.history
			.slice(-3)
			.map((h) => `${h.role === "patient" ? "Пациент" : "Бот"}: ${h.text}`)
			.join("\n");

		const urgencyLabel =
			urgency === "critical"
				? "🚨 ЭКСТРЕННО (ОСТРАЯ БОЛЬ / CITO)"
				: urgency === "high"
				? "⚠️ ВЫСОКИЙ ПРИОРИТЕТ"
				: "ℹ️ Стандартное обращение";

		const title = `${urgencyLabel}: Обращение в ${context.channel.toUpperCase()}`;
		const body =
			`Пациент: ${context.patientName || "Не указано"} (${context.patientPhone})\n` +
			`Причина: ${this.formatReasonRu(reason)}\n` +
			`Последнее сообщение: «${lastMessageText}»\n` +
			(recentHistory ? `История:\n${recentHistory}` : "");

		const autoReply =
			urgency === "critical"
				? "🚨 Передали ваш запрос дежурному администратору с высшим приоритетом! Администратор подключается к чату и сейчас ответит вам."
				: "Переключаю вас на администратора клиники. Специалист ответит вам в течение нескольких минут. Пожалуйста, оставайтесь на связи!";

		// Mutate context handover state
		context.handoverActive = true;
		context.currentState = "handover_operator";
		context.updatedAt = Date.now();

		return {
			handoverId,
			dialogId: context.dialogId,
			status: "escalated",
			notificationPayload: {
				title,
				body,
				channel: context.channel,
				phone: context.patientPhone,
				urgency,
			},
			botAutoReply: autoReply,
		};
	}

	/**
	 * Called when a human clinic operator takes over the chat.
	 */
	static takeoverByOperator(
		context: BotDialogContext,
		operatorId: string,
		operatorName = "Администратор",
	): { success: boolean; message: string } {
		context.handoverActive = true;
		context.operatorId = operatorId;
		context.currentState = "handover_operator";
		context.updatedAt = Date.now();

		context.history.push({
			role: "operator",
			text: `[Чат перехвачен оператором ${operatorName}]`,
			timestamp: Date.now(),
		});

		return {
			success: true,
			message: `Оператор ${operatorName} подключился к диалогу. Бот временно отключен.`,
		};
	}

	/**
	 * Called when operator releases the chat back to automated bot handling.
	 */
	static releaseToBot(
		context: BotDialogContext,
	): { success: boolean; message: string } {
		context.handoverActive = false;
		context.operatorId = undefined;
		context.currentState = "idle";
		context.updatedAt = Date.now();

		context.history.push({
			role: "operator",
			text: "[Диалог возвращен под управление бота]",
			timestamp: Date.now(),
		});

		return {
			success: true,
			message: "Диалог переведен обратно в режим авто-бота.",
		};
	}

	/**
	 * Checks if dialogue is currently handled by a human operator.
	 */
	static isHandoverActive(context: BotDialogContext): boolean {
		return context.handoverActive;
	}

	private static formatReasonRu(reason: OperatorHandoverRequest["reason"]): string {
		switch (reason) {
			case "pain_emergency":
				return "Острая боль / подозрение на неотложное состояние";
			case "explicit_request":
				return "Пациент запросил связь с живым администратором";
			case "complex_medical_question":
				return "Сложный клинический вопрос или согласование плана лечения";
			case "unrecognized_intent":
			default:
				return "Бот не смог распознать запрос пациента";
		}
	}
}
