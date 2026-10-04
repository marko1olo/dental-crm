import {
	INTERCOM_PRESETS,
	type IntercomAckType,
	type IntercomPresetKey,
	type StaffChatMessage,
	type TelegramBotPresetId,
	type TelegramBotPresetMetadata,
} from "@dental/shared";
import { TelegramBotPresetsEngine } from "./TelegramBotPresets.js";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { recordIntercomAck } from "../../db/staffChatQuery.js";
import {
	appointments,
	chairs,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	staffChatMessages,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";
import {
	answerTelegramCallbackQuery,
	sendTelegramTextMessage,
	type TelegramTransportResult,
} from "../../telegramTransport.js";
import { TelegramTokenVault } from "./TelegramTokenVault.js";
import {
	TelegramBotBillingService,
	TELEGRAM_BOT_SAAS_TIERS,
	type TelegramBotSaasTierId,
} from "./TelegramBotBillingService.js";

export type TelegramBotMeResult = {
	ok: boolean;
	id?: number;
	username?: string;
	firstName?: string;
	canJoinGroups?: boolean;
	canReadAllGroupMessages?: boolean;
	supportsInlineQueries?: boolean;
	error?: string;
};

export type TelegramWebhookInfoResult = {
	ok: boolean;
	url?: string;
	hasCustomCertificate?: boolean;
	pendingUpdateCount?: number;
	lastErrorDate?: number;
	lastErrorMessage?: string;
	maxConnections?: number;
	error?: string;
};

export type TelegramBotCommandItem = {
	command: string;
	description: string;
};

export const DEFAULT_PATIENT_BOT_COMMANDS: TelegramBotCommandItem[] = [
	{ command: "start", description: "Главное меню и привязка к клинике" },
	{ command: "schedule", description: "Мои записи и статус визита" },
	{ command: "care", description: "Памятки после стоматологического лечения" },
	{ command: "documents", description: "Справка в ФНС и портал документов" },
	{ command: "contact", description: "Связаться с администратором клиники" },
	{ command: "help", description: "Справка и безопасные действия" },
];

export const DEFAULT_STAFF_BOT_COMMANDS: TelegramBotCommandItem[] = [
	{ command: "start", description: "Рабочий профиль сотрудника" },
	{ command: "schedule", description: "Мое расписание приёмов на сегодня" },
	{ command: "tomorrow", description: "Расписание приёмов на завтра" },
	{ command: "intercom", description: "Каналы экстренной связи клиники" },
	{ command: "help", description: "Справка по рабочим командам" },
];

/**
 * Сервис хостинга и управления Telegram-ботами для стоматологических клиник (DENTE SaaS).
 * Обеспечивает:
 * - Управление токенами и мульти-клиническую изоляцию
 * - Webhook регистрацию и Long Polling fallback
 * - Мгновенную трансляцию интерком-вызовов персонала в Telegram с 1-tap подтверждением
 * - Формирование безопасного расписания для врачей и пациентов
 */
export class TelegramBotHostingService {
	/**
	 * Валидация токена бота через Telegram Bot API (getMe).
	 */
	static async verifyBotToken(
		botToken: string,
		timeoutMs = 7000,
	): Promise<TelegramBotMeResult> {
		const trimmed = botToken.trim();
		if (!trimmed || !trimmed.includes(":")) {
			return { ok: false, error: "Некорректный формат токена бота." };
		}

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(
				`https://api.telegram.org/bot${encodeURIComponent(trimmed)}/getMe`,
				{
					method: "GET",
					signal: controller.signal,
				},
			);
			clearTimeout(timeout);

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { description?: string };
				return {
					ok: false,
					error: errorData.description || `Telegram Bot API вернул статус ${response.status}.`,
				};
			}

			const data = (await response.json()) as {
				ok: boolean;
				result?: {
					id: number;
					username: string;
					first_name: string;
					can_join_groups?: boolean;
					can_read_all_group_messages?: boolean;
					supports_inline_queries?: boolean;
				};
				description?: string;
			};

			if (!data.ok || !data.result) {
				return {
					ok: false,
					error: data.description || "Telegram Bot API отклонил токен.",
				};
			}

			const res: TelegramBotMeResult = {
				ok: true,
				id: data.result.id,
				username: data.result.username,
				firstName: data.result.first_name,
			};
			if (data.result.can_join_groups !== undefined) res.canJoinGroups = data.result.can_join_groups;
			if (data.result.can_read_all_group_messages !== undefined) res.canReadAllGroupMessages = data.result.can_read_all_group_messages;
			if (data.result.supports_inline_queries !== undefined) res.supportsInlineQueries = data.result.supports_inline_queries;
			return res;
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Ошибка сети при проверке токена.";
			return { ok: false, error: message };
		}
	}

	/**
	 * Регистрация Webhook в Telegram Bot API (setWebhook).
	 */
	static async setupWebhook(params: {
		botToken: string;
		webhookUrl: string;
		secretToken?: string | null;
		maxConnections?: number;
		timeoutMs?: number;
	}): Promise<{ ok: boolean; description?: string }> {
		const trimmedToken = params.botToken.trim();
		const trimmedUrl = params.webhookUrl.trim();
		if (!trimmedToken || !trimmedUrl) {
			return { ok: false, description: "Отсутствует токен бота или URL вебхука." };
		}

		try {
			const controller = new AbortController();
			const timeout = setTimeout(
				() => controller.abort(),
				params.timeoutMs || 8000,
			);

			const bodyPayload: Record<string, unknown> = {
				url: trimmedUrl,
				max_connections: params.maxConnections || 40,
				allowed_updates: ["message", "callback_query"],
				drop_pending_updates: false,
			};

			if (params.secretToken) {
				bodyPayload.secret_token = params.secretToken;
			}

			const response = await fetch(
				`https://api.telegram.org/bot${encodeURIComponent(trimmedToken)}/setWebhook`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(bodyPayload),
					signal: controller.signal,
				},
			);
			clearTimeout(timeout);

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { description?: string };
				return {
					ok: false,
					description: errorData.description || `HTTP ${response.status}`,
				};
			}

			const data = (await response.json()) as {
				ok: boolean;
				description?: string;
			};
			const res: { ok: boolean; description?: string } = {
				ok: data.ok,
			};
			if (data.description !== undefined) {
				res.description = data.description;
			}
			return res;
		} catch (err: unknown) {
			const description =
				err instanceof Error ? err.message : "Ошибка вызова setWebhook";
			return { ok: false, description };
		}
	}

	/**
	 * Получение текущего состояния Webhook (getWebhookInfo).
	 */
	static async getWebhookInfo(
		botToken: string,
		timeoutMs = 7000,
	): Promise<TelegramWebhookInfoResult> {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(
				`https://api.telegram.org/bot${encodeURIComponent(botToken.trim())}/getWebhookInfo`,
				{
					method: "GET",
					signal: controller.signal,
				},
			);
			clearTimeout(timeout);

			if (!response.ok) {
				return {
					ok: false,
					error: `HTTP ${response.status}`,
				};
			}

			const data = (await response.json()) as {
				ok: boolean;
				result?: {
					url: string;
					has_custom_certificate: boolean;
					pending_update_count: number;
					last_error_date?: number;
					last_error_message?: string;
					max_connections?: number;
				};
				description?: string;
			};

			if (!data.ok || !data.result) {
				return {
					ok: false,
					error: data.description || "Не удалось получить статус вебхука.",
				};
			}

			const res: TelegramWebhookInfoResult = {
				ok: true,
				url: data.result.url,
				hasCustomCertificate: data.result.has_custom_certificate,
				pendingUpdateCount: data.result.pending_update_count,
			};
			if (data.result.last_error_date !== undefined) res.lastErrorDate = data.result.last_error_date;
			if (data.result.last_error_message !== undefined) res.lastErrorMessage = data.result.last_error_message;
			if (data.result.max_connections !== undefined) res.maxConnections = data.result.max_connections;
			return res;
		} catch (err: unknown) {
			return {
				ok: false,
				error:
					err instanceof Error ? err.message : "Сбой при получении getWebhookInfo",
			};
		}
	}

	/**
	 * Настройка стандартного меню команд в интерфейсе Telegram (setMyCommands).
	 */
	static async setBotCommands(
		botToken: string,
		commands: TelegramBotCommandItem[] = DEFAULT_PATIENT_BOT_COMMANDS,
		timeoutMs = 7000,
	): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(
				`https://api.telegram.org/bot${encodeURIComponent(botToken.trim())}/setMyCommands`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ commands }),
					signal: controller.signal,
				},
			);
			clearTimeout(timeout);

			if (!response.ok) {
				return false;
			}

			const data = (await response.json()) as { ok: boolean };
			return Boolean(data.ok);
		} catch {
			return false;
		}
	}

	/**
	 * Настройка описания бота в Telegram (setMyDescription).
	 */
	static async setBotDescription(
		botToken: string,
		description: string,
		timeoutMs = 7000,
	): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(
				`https://api.telegram.org/bot${encodeURIComponent(botToken.trim())}/setMyDescription`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ description: description.slice(0, 512) }),
					signal: controller.signal,
				},
			);
			clearTimeout(timeout);

			if (!response.ok) {
				return false;
			}

			const data = (await response.json()) as { ok: boolean };
			return Boolean(data.ok);
		} catch {
			return false;
		}
	}

	/**
	 * Настройка краткого описания бота в Telegram (setMyShortDescription).
	 */
	static async setBotShortDescription(
		botToken: string,
		shortDescription: string,
		timeoutMs = 7000,
	): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(
				`https://api.telegram.org/bot${encodeURIComponent(botToken.trim())}/setMyShortDescription`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ short_description: shortDescription.slice(0, 120) }),
					signal: controller.signal,
				},
			);
			clearTimeout(timeout);

			if (!response.ok) {
				return false;
			}

			const data = (await response.json()) as { ok: boolean };
			return Boolean(data.ok);
		} catch {
			return false;
		}
	}

	/**
	 * ДВИЖОК ОНБОРДИНГА И ПРИМЕНЕНИЯ ПРЕСЕТА КЛИНИКИ:
	 * 1. Валидирует токен через getMe
	 * 2. Устанавливает команды пресета (setMyCommands)
	 * 3. Устанавливает описание пресета (setMyDescription)
	 * 4. Устанавливает краткое описание пресета (setMyShortDescription)
	 * 5. Настраивает вебхук при наличии webhookUrl
	 */
	static async applyPresetToBot(params: {
		organizationId: string;
		presetId: TelegramBotPresetId;
		botToken: string;
		webhookUrl?: string | null;
		secretToken?: string | null;
	}): Promise<{
		ok: boolean;
		botUsername?: string | undefined;
		preset: TelegramBotPresetMetadata;
		commandsConfigured: boolean;
		descriptionConfigured: boolean;
		shortDescriptionConfigured: boolean;
		webhookConfigured: boolean;
		error?: string | undefined;
	}> {
		const preset = TelegramBotPresetsEngine.getPreset(params.presetId);
		const verifyResult = await this.verifyBotToken(params.botToken);
		if (!verifyResult.ok) {
			return {
				ok: false,
				preset,
				commandsConfigured: false,
				descriptionConfigured: false,
				shortDescriptionConfigured: false,
				webhookConfigured: false,
				error: verifyResult.error || "Не удалось верифицировать токен бота в Telegram Bot API.",
			};
		}

		// Применяем команды и описания
		const commandsConfigured = await this.setBotCommands(params.botToken, preset.commands);
		const descriptionConfigured = await this.setBotDescription(params.botToken, preset.description);
		const shortDescriptionConfigured = await this.setBotShortDescription(params.botToken, preset.shortDescription);

		let webhookConfigured = false;
		if (params.webhookUrl?.trim()) {
			const webhookResult = await this.setupWebhook({
				botToken: params.botToken,
				webhookUrl: params.webhookUrl.trim(),
				secretToken: params.secretToken?.trim() || null,
			});
			webhookConfigured = webhookResult.ok;
		}

		return {
			ok: true,
			botUsername: verifyResult.username,
			preset,
			commandsConfigured,
			descriptionConfigured,
			shortDescriptionConfigured,
			webhookConfigured,
		};
	}

	/**
	 * МГНОВЕННЫЙ ПУШ ИНТЕРКОМА В TELEGRAM ПЕРСОНАЛА:
	 * При получении срочного вызова ассистента или оповещения с кресла врача
	 * сервис находит всех привязанных сотрудников клиники и отправляет им
	 * сообщение с 3 кнопками быстрого ответа:
	 * [🏃 Иду! (1 мин)] | [⏱ Через 3-5 мин] | [❌ Занят]
	 */
	static async dispatchIntercomPingToTelegramStaff(params: {
		organizationId: string;
		messageId: string;
		senderName: string;
		content: string;
		urgency: string;
		intercomPreset?: string | null;
		targetAudience?: string | null;
		botTokenOverride?: string | null;
	}): Promise<{ notifiedCount: number; errors: string[] }> {
		const errors: string[] = [];

		// 1. Получаем конфигурацию бота для организации через Token Vault
		let botToken = params.botTokenOverride
			? TelegramTokenVault.resolveOperationalToken(params.botTokenOverride, params.organizationId)
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
				botToken = TelegramTokenVault.resolveOperationalToken(
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

			// chatTransportRef содержит открытый или расшифрованный chatId
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
	 * ОБРАБОТКА ПОДТВЕРЖДЕНИЯ ИНТЕРКОМ-ВЫЗОВА ИЗ TELEGRAM:
	 * Сотрудник клиники нажимает в Telegram кнопку [🏃 Иду! (1 мин)] или [⏱ Через 3-5 мин].
	 * Сервис фиксирует подтверждение в базе данных, шлет WebSocket в клинику и возвращает ответ.
	 */
	static async handleIntercomAckCallback(params: {
		organizationId: string;
		callbackData: string;
		chatFingerprint: string;
		botToken?: string | null;
		callbackQueryId?: string | null;
	}): Promise<{
		handled: boolean;
		ok: boolean;
		responseText: string;
		ackType?: IntercomAckType;
		updatedMessage?: StaffChatMessage | null;
	}> {
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

	/**
	 * ФОРМИРОВАНИЕ РАСПИСАНИЯ ВРАЧА НА СЕГОДНЯ / ЗАВТРА (БЕЗ ПДн):
	 * Врач в Telegram отправляет команду `/schedule` или `/tomorrow`.
	 * Бот выводит плотный структурированный список приемов: время, кабинет/кресло, статус.
	 */
	static async buildStaffScheduleReply(params: {
		organizationId: string;
		staffUserId: string;
		dayOffset?: number; // 0 = сегодня, 1 = завтра
	}): Promise<{ text: string; appointmentCount: number }> {
		const targetDate = new Date();
		targetDate.setDate(targetDate.getDate() + (params.dayOffset || 0));

		const startOfDay = new Date(targetDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(targetDate);
		endOfDay.setHours(23, 59, 59, 999);

		const dateTitle =
			params.dayOffset === 1
				? "завтра"
				: targetDate.toLocaleDateString("ru-RU", {
						day: "numeric",
						month: "long",
						weekday: "short",
					});

		// Выбираем приёмы врача из PostgreSQL
		const appts = await db
			.select({
				id: appointments.id,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				chairId: appointments.chairId,
				reason: appointments.reason,
			})
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, params.organizationId),
					eq(appointments.doctorUserId, params.staffUserId),
					sql`${appointments.startsAt} >= ${startOfDay} AND ${appointments.startsAt} <= ${endOfDay}`,
				),
			)
			.orderBy(sql`${appointments.startsAt} ASC`);

		if (appts.length === 0) {
			return {
				text: `DENTE: Расписание на ${dateTitle} свободно. Запланированных приёмов нет.`,
				appointmentCount: 0,
			};
		}

		// Загружаем названия кресел
		const chairRows = await db
			.select({ id: chairs.id, name: chairs.name })
			.from(chairs)
			.where(eq(chairs.organizationId, params.organizationId));
		const chairMap = new Map(chairRows.map((c) => [c.id, c.name]));

		const statusIcons: Record<string, string> = {
			confirmed: "✅ Подтверждён",
			planned: "⏳ Запланирован",
			in_progress: "🩺 На приёме",
			completed: "🏁 Завершён",
			cancelled: "❌ Отменён",
			no_show: "⚠️ Не явился",
		};

		const lines: string[] = [
			`📅 Расписание приёмов на ${dateTitle}:`,
			`Всего визитов: ${appts.length}`,
			"━━━━━━━━━━━━━━━━━━",
		];

		for (const apt of appts) {
			const timeStr = new Date(apt.startsAt).toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});
			const endTimeStr = new Date(apt.endsAt).toLocaleTimeString("ru-RU", {
				hour: "2-digit",
				minute: "2-digit",
			});
			const chairName = (apt.chairId && chairMap.get(apt.chairId)) || "Кабинет";
			const statusLabel = statusIcons[apt.status] || apt.status;

			lines.push(`⏰ ${timeStr}–${endTimeStr} · ${chairName}`);
			lines.push(`   Статус: ${statusLabel}`);
			lines.push("");
		}

		lines.push(
			"🔒 Внимание: в соответствии со ст. 13 323-ФЗ ФИО пациентов и диагнозы доступны только в защищённой CRM.",
		);

		return {
			text: lines.join("\n"),
			appointmentCount: appts.length,
		};
	}

	/**
	 * КАТАЛОГ КЛИНИЧЕСКИХ ПАМЯТОК ПОСЛЕ ЛЕЧЕНИЯ ДЛЯ ПАЦИЕНТОВ:
	 * Доступен в Telegram в 1 клик через `/care` или меню.
	 */
	static getClinicalCareInstruction(topic: string): {
		title: string;
		text: string;
	} {
		const instructions: Record<string, { title: string; text: string }> = {
			extraction: {
				title: "Памятка после удаления зуба / хирургии",
				text: [
					"📋 РЕКОМЕНДАЦИИ ПОСЛЕ УДАЛЕНИЯ ЗУБА:",
					"1. Марлевый тампон прикусить и держать 15–20 минут, затем аккуратно сплюнуть.",
					"2. Первые 2 часа не принимать пищу и горячее питье.",
					"3. КАТЕГОРИЧЕСКИ НЕ ПОЛОСКАТЬ рот в первые 24 часа! Важно сохранить кровяной сгусток в лунке.",
					"4. Прикладывать холод к щеке на 10–15 минут с перерывами в 20 минут в первые 3 часа.",
					"5. Исключить горячую ванну, баню, спорт и алкоголь на 3–4 дня.",
					"6. Не пить напитки через трубочку (соломинку).",
					"7. При боли принять назначенное врачом обезболивающее.",
					"⚠️ Если кровотечение не останавливается или поднялась температура выше 38°C — немедленно свяжитесь с клиникой!",
				].join("\n"),
			},
			implantation: {
				title: "Памятка после имплантации и синус-лифтинга",
				text: [
					"📋 РЕКОМЕНДАЦИИ ПОСЛЕ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ:",
					"1. Холод к щеке по 15 минут в течение первых суток.",
					"2. Мягкая, теплая (не горячая!) пища в течение первых 5–7 дней.",
					"3. Жевать строго на противоположной стороне.",
					"4. Прием назначенных антибиотиков и антигистаминных строго по графику.",
					"5. Ротовые ванночки с антисептиком (набрать раствор в рот, подержать 1 минуту, сплюнуть — НЕ булькать).",
					"6. При синус-лифтинге: категорически запрещено сильно сморкаться, надувать щеки и летать на самолете 14 дней.",
					"7. Спать на высокой подушке на спине или противоположной стороне.",
				].join("\n"),
			},
			hygiene: {
				title: "Памятка после профессиональной гигиены полости рта",
				text: [
					"📋 РЕКОМЕНДАЦИИ ПОСЛЕ ПРОФГИГИЕНЫ И AIR-FLOW:",
					"1. Замените зубную щетку на новую прямо сегодня (гигиенический стандарт).",
					"2. Соблюдайте «белую диету» 48 часов: исключите кофе, крепкий чай, ягоды, свеклу, красное вино и красящие соусы.",
					"3. Воздержитесь от курения минимум на 12–24 часа.",
					"4. При чувствительности используйте пасту для чувствительных зубов (Sensodyne / Biorepair).",
				].join("\n"),
			},
			filling: {
				title: "Памятка после лечения кариеса и пломбирования",
				text: [
					"📋 РЕКОМЕНДАЦИИ ПОСЛЕ ЛЕЧЕНИЯ ЗУБА:",
					"1. Анестезия действует 2–4 часа: будьте осторожны, не прикусите губу, щеку или язык.",
					"2. Воздержитесь от жевания твердой пищи до полного отхождения онемения.",
					"3. Современные световые пломбы застывают сразу, но первый прием пищи лучше отложить на 1.5–2 часа.",
					"4. Если после отхождения анестезии вы чувствуете, что пломба мешает смыканию челюстей — позвоните в клинику для 2-минутной пришлифовки.",
				].join("\n"),
			},
			endo: {
				title: "Памятка после лечения корневых каналов (эндодонтии)",
				text: [
					"📋 РЕКОМЕНДАЦИИ ПОСЛЕ ЛЕЧЕНИЯ КАНАЛОВ:",
					"1. В течение 3–5 дней возможна умеренная болезненность при накусывании на зуб — это нормальная физиологическая реакция связки зуба на обработку каналов.",
					"2. При необходимости примите противовоспалительный препарат (Нимесил / Ибупрофен).",
					"3. Не нагружайте зуб твердой пищей (орехи, сухари) до окончательного восстановления зуба коронкой или накладкой.",
					"⚠️ При нарастании отека десны немедленно свяжитесь с клиникой.",
				].join("\n"),
			},
		};

		return (
			instructions[topic] || {
				title: "Памятка клиники DENTE",
				text:
					"Пожалуйста, соблюдайте рекомендации вашего лечащего врача. При возникновении вопросов свяжитесь с клиникой кнопкой ниже.",
			}
		);
	}
}
