import { eq } from "drizzle-orm";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { denteTelegramBotConfigs } from "../../db/schema.js";
import { omnichannelBotEngine } from "../../services/bots/OmnichannelBotEngine.js";
import type { BotInboundMessage } from "../../services/bots/types.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import type { TelegramWebhookBody } from "./types.js";

export interface TelegramWebhookResult {
	ok: boolean;
	statusCode?: number | undefined;
	error?: string | undefined;
	message?: string | undefined;
}

/**
 * Обработка входящих событий Telegram Bot API (сообщения, inline-кнопки callback_query).
 * Защищена обязательной проверкой заголовка X-Telegram-Bot-Api-Secret-Token.
 */
export async function handleTelegramWebhook(
	body: Record<string, unknown> | Array<Record<string, unknown>>,
	organizationId: string,
	secretToken?: string | null,
): Promise<TelegramWebhookResult> {
	let tgConfig: { webhookSecretRef: string | null; mode: string } | undefined;
	try {
		const [found] = await db
			.select({
				webhookSecretRef: denteTelegramBotConfigs.webhookSecretRef,
				mode: denteTelegramBotConfigs.mode,
			})
			.from(denteTelegramBotConfigs)
			.where(eq(denteTelegramBotConfigs.organizationId, organizationId))
			.limit(1);
		tgConfig = found;
	} catch {
		// При сбое соединения с БД или в изолированных юнит-тестах fallback на env
	}

	const expectedSecret =
		tgConfig?.webhookSecretRef ||
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET ||
		process.env.TELEGRAM_WEBHOOK_SECRET ||
		null;

	if (!expectedSecret && !namedDevelopmentModeActive()) {
		return {
			ok: false,
			statusCode: 503,
			error: "TelegramWebhookSecretRequired",
			message: "Telegram webhook secret is required in production environment.",
		};
	}

	if (expectedSecret && !timingSafeSecretEqual(secretToken ?? null, expectedSecret)) {
		return {
			ok: false,
			statusCode: 401,
			error: "TelegramWebhookSecretMismatch",
			message: "Unauthorized: Telegram webhook secret token mismatch.",
		};
	}

	if (tgConfig?.mode === "disabled") {
		return {
			ok: true,
			message: "Telegram bot is disabled for this organization.",
		};
	}

	const updates: TelegramWebhookBody[] = Array.isArray(body)
		? (body as TelegramWebhookBody[])
		: Array.isArray((body as Record<string, unknown>).updates)
			? (((body as Record<string, unknown>).updates as unknown) as TelegramWebhookBody[])
			: [body as TelegramWebhookBody];

	for (const tgBody of updates) {
		let inbound: BotInboundMessage | null = null;
		if (tgBody.message) {
			const from = tgBody.message.from;
			inbound = {
				channel: "telegram",
				organizationId,
				botConfigId: "default",
				senderId: String(from?.id || ""),
				senderName: [from?.first_name, from?.last_name].filter(Boolean).join(" ") || null,
				messageId: String(tgBody.message.message_id),
				text: tgBody.message.text || "",
				timestamp: Date.now(),
				rawEvent: tgBody as Record<string, unknown>,
			};
		} else if (tgBody.callback_query) {
			const from = tgBody.callback_query.from;
			inbound = {
				channel: "telegram",
				organizationId,
				botConfigId: "default",
				senderId: String(from?.id || ""),
				senderName: from?.first_name || null,
				messageId: String(tgBody.callback_query.message?.message_id || ""),
				text: "",
				payload: tgBody.callback_query.data || null,
				timestamp: Date.now(),
				rawEvent: tgBody as Record<string, unknown>,
			};
		}

		if (inbound) {
			await omnichannelBotEngine.dispatchInboundMessage(inbound);
		}
	}

	return { ok: true };
}
