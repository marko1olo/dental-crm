import {
	DEFAULT_PATIENT_BOT_COMMANDS,
	type SetupWebhookParams,
	type SetupWebhookResult,
	type TelegramBotCommandItem,
	type TelegramBotMeResult,
	type TelegramWebhookInfoResult,
} from "./types.js";

/**
 * Управление жизненным циклом Webhook и конфигурацией команд Telegram Bot API (Layer 1).
 * Все запросы выполняются с защитой по таймауту через AbortController.
 */
export class TelegramWebhookLifecycle {
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
	static async setupWebhook(
		params: SetupWebhookParams,
	): Promise<SetupWebhookResult> {
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
	 * Удаление Webhook в Telegram Bot API (deleteWebhook).
	 */
	static async deleteWebhook(params: {
		botToken: string;
		dropPendingUpdates?: boolean;
		timeoutMs?: number;
	}): Promise<{ ok: boolean; description?: string }> {
		const trimmedToken = params.botToken.trim();
		if (!trimmedToken) {
			return { ok: false, description: "Отсутствует токен бота." };
		}

		try {
			const controller = new AbortController();
			const timeout = setTimeout(
				() => controller.abort(),
				params.timeoutMs || 8000,
			);

			const bodyPayload: Record<string, unknown> = {
				drop_pending_updates: params.dropPendingUpdates ?? false,
			};

			const response = await fetch(
				`https://api.telegram.org/bot${encodeURIComponent(trimmedToken)}/deleteWebhook`,
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

			const data = (await response.json()) as { ok: boolean; description?: string };
			return {
				ok: data.ok,
				description: data.description,
			};
		} catch (err: unknown) {
			const description =
				err instanceof Error ? err.message : "Ошибка вызова deleteWebhook";
			return { ok: false, description };
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
}
