import {
	INTERCOM_PRESETS,
	type IntercomAckType,
	type IntercomPresetKey,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { recordIntercomAck } from "../../../db/staffChatQuery.js";
import {
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	users,
} from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import {
	answerTelegramCallbackQuery,
	sendTelegramTextMessage,
} from "../../../telegramTransport.js";
import { TelegramTokenCrypto } from "./tokenCrypto.js";
import type {
	DispatchIntercomParams,
	DispatchIntercomResult,
	HandleIntercomAckParams,
	HandleIntercomAckResult,
} from "./types.js";

/**
 * Подсистема оповещений и двустороннего Ack-loop для персонала клиники в Telegram (Layer 2).
 * Обеспечивает:
 * - Мгновенную доставку вызова интеркома (с кресла врача к ассистентам/администраторам)
 * - Инлайн-кнопки быстрого ответа (Иду, Через 5 мин, Занят)
 * - Синхронизацию статуса по WebSocket в веб-интерфейс клиники
 */
export class TelegramIntercomStaffNotifier {
	/**
	 * МГНОВЕННЫЙ ПУШ ИНТЕРКОМА В TELEGRAM ПЕРСОНАЛА
	 */
	static async dispatchIntercomPingToTelegramStaff(
		params: DispatchIntercomParams,
	): Promise<DispatchIntercomResult> {
		const errors: string[] = [];

		// 1. Получаем конфигурацию бота для организации через Token Crypto
		let botToken = params.botTokenOverride
			? TelegramTokenCrypto.resolveOperationalToken(params.botTokenOverride, params.organizationId)
			: process.env.DENTE_TELEGRAM_BOT_TOKEN;

		if (!botToken) {
			const [config] = await db
				.select({
					tokenSecretRef: denteTelegramBotConfigs.tokenSecretRef,
					mode: denteTelegramBotConfigs.mode,
				})
				.from(denteTelegramBotConfigs)
				.where(
					and(
						eq(denteTelegramBotConfigs.organizationId, params.organizationId),
						eq(denteTelegramBotConfigs.isActive, true),
					),
				)
				.limit(1);

			if (config?.tokenSecretRef) {
				botToken = TelegramTokenCrypto.resolveOperationalToken(
					config.tokenSecretRef,
					params.organizationId,
				);
			}
		}

		if (!botToken) {
			return { notifiedCount: 0, errors: ["Telegram бот не настроен для клиники."] };
		}

		// 2. Ищем всех активных сотрудников со связкой Telegram
		const staffLinks = await db
			.select({
				id: denteTelegramChatLinks.id,
				subjectId: denteTelegramChatLinks.subjectId,
				chatTransportRef: denteTelegramChatLinks.chatTransportRef,
			})
			.from(denteTelegramChatLinks)
			.where(
				and(
					eq(denteTelegramChatLinks.organizationId, params.organizationId),
					eq(denteTelegramChatLinks.subjectType, "staff"),
					eq(denteTelegramChatLinks.status, "active"),
				),
			);

		if (staffLinks.length === 0) {
			return { notifiedCount: 0, errors: [] };
		}

		// 3. Формируем текст интерком-уведомления
		const urgencyBadge =
			params.urgency === "critical"
				? "🚨 КРИТИЧЕСКИЙ ВЫЗОВ"
				: params.urgency === "urgent"
					? "⚡ СРОЧНО"
					: "🔔 ИНТЕРКОМ КЛИНИКИ";

		const presetKey = params.intercomPreset as IntercomPresetKey | undefined;
		const presetLabel = presetKey ? INTERCOM_PRESETS[presetKey]?.label : "Вызов персонала";

		const messageLines = [
			`${urgencyBadge}: ${presetLabel}`,
			`От: ${params.senderName}`,
			"",
			params.content,
			"",
			"Нажмите кнопку быстрого ответа (статус сразу появится в веб-чате клиники):",
		];
		const text = messageLines.join("\n");

		// 4. Формируем инлайн-кнопки двустороннего Ack-loop
		const replyMarkup = {
			inline_keyboard: [
				[
					{
						text: "🏃 Иду! (1 мин)",
						callback_data: `intercom_ack:${params.messageId}:on_my_way`,
					},
					{
						text: "⏱ Через 3-5 мин",
						callback_data: `intercom_ack:${params.messageId}:in_5_min`,
					},
				],
				[
					{
						text: "❌ Занят на приёме",
						callback_data: `intercom_ack:${params.messageId}:busy`,
					},
				],
			],
		};

		let notifiedCount = 0;

		for (const link of staffLinks) {
			if (!link.chatTransportRef) continue;

			const result = await sendTelegramTextMessage({
				botToken,
				chatId: link.chatTransportRef,
				text,
				replyMarkup,
				timeoutMs: 4000,
			});

			if (result.ok) {
				notifiedCount++;
			} else {
				errors.push(`Чат ${link.chatTransportRef}: ${result.errorClass}`);
			}
		}

		return { notifiedCount, errors };
	}

	/**
	 * ОБРАБОТКА ПОДТВЕРЖДЕНИЯ ИНТЕРКОМ-ВЫЗОВА ИЗ TELEGRAM
	 */
	static async handleIntercomAckCallback(
		params: HandleIntercomAckParams,
	): Promise<HandleIntercomAckResult> {
		if (!params.callbackData.startsWith("intercom_ack:")) {
			return {
				handled: false,
				ok: false,
				responseText: "Неизвестный callback",
			};
		}

		const parts = params.callbackData.split(":");
		if (parts.length < 3) {
			return {
				handled: true,
				ok: false,
				responseText: "Неверный формат подтверждения интеркома",
			};
		}

		const messageId = parts[1];
		const rawAckType = parts[2];
		const ackType: IntercomAckType =
			rawAckType === "on_my_way"
				? "on_my_way"
				: rawAckType === "coming_soon" || rawAckType === "in_5_min"
					? "coming_soon"
					: "busy_reassigned";

		if (!messageId) {
			return {
				handled: true,
				ok: false,
				responseText: "Отсутствует идентификатор сообщения",
			};
		}

		// 1. Находим сотрудника клиники по chatFingerprint
		const [chatLink] = await db
			.select({
				subjectId: denteTelegramChatLinks.subjectId,
			})
			.from(denteTelegramChatLinks)
			.where(
				and(
					eq(denteTelegramChatLinks.organizationId, params.organizationId),
					eq(denteTelegramChatLinks.chatFingerprint, params.chatFingerprint),
					eq(denteTelegramChatLinks.subjectType, "staff"),
					eq(denteTelegramChatLinks.status, "active"),
				),
			)
			.limit(1);

		let staffId = chatLink?.subjectId || "anonymous";
		let staffName = "Сотрудник";
		let staffRole = "staff";

		if (chatLink?.subjectId) {
			const [userRow] = await db
				.select({
					fullName: users.fullName,
					role: users.role,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, params.organizationId),
						eq(users.id, chatLink.subjectId),
					),
				)
				.limit(1);

			if (userRow) {
				staffName = userRow.fullName;
				staffRole = userRow.role;
			}
		}

		// 2. Записываем подтверждение в staff_chat_messages
		const updated = await recordIntercomAck({
			organizationId: params.organizationId,
			messageId,
			staffId,
			staffName,
			staffRole,
			ackType,
		});

		const ackLabel =
			ackType === "on_my_way"
				? "🏃 Иду! (1 мин)"
				: ackType === "coming_soon"
					? "⏱ Буду через 3-5 мин"
					: "❌ Занят на приёме";

		// 3. Отправляем событие по WebSocket в клинику для живого обновления интерфейса
		if (updated) {
			wsBroker.broadcastToOrganization(params.organizationId, {
				type: "INTERCOM_ACK",
				payload: {
					messageId,
					staffId,
					staffName,
					staffRole,
					ackType,
					timestamp: new Date().toISOString(),
				},
			});
		}

		// 4. Отвечаем на callback_query в Telegram
		if (params.callbackQueryId && params.botToken) {
			await answerTelegramCallbackQuery({
				botToken: params.botToken,
				callbackQueryId: params.callbackQueryId,
				text: `DENTE: Ответ «${ackLabel}» передан врачу!`,
			});
		}

		return {
			handled: true,
			ok: true,
			responseText: `✅ Ваш ответ принят: ${ackLabel}. Клиника уведомлена в режиме реального времени.`,
			ackType,
			updatedMessage: updated,
		};
	}
}
