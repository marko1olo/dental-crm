import { and, eq } from "drizzle-orm";
import { withTenantReadCtx } from "../../../db/rls.js";
import { denteMaxBotConfigs, denteVkBotConfigs } from "../../../db/schema.js";
import { parseMaxRecipient, sendMaxTextMessage } from "../../../maxTransport.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { OmnichannelTokenVault } from "../OmnichannelTokenVault.js";
import { VkApiClient } from "../VkApiClient.js";
import type { BotChannel, BotReply } from "../types.js";

const logger = createApiLogger("botReplySender");

export interface BotOutboundSendOutcome {
	readonly attempted: boolean;
	readonly ok: boolean;
	readonly error?: string | undefined;
}

/**
 * Доставка ответа омниканального бота наружу (VK API / MAX API) строго ВНЕ PG TX.
 */
export async function sendBotReplyToChannel(params: {
	channel: BotChannel;
	organizationId: string;
	recipientId: string;
	reply: BotReply;
}): Promise<BotOutboundSendOutcome> {
	const { channel, organizationId, recipientId, reply } = params;
	const cleanText = reply.text
		.replace(/<\/?(?:b|i|u|code|pre|strong|em)>/gi, "")
		.trim();
	const cleanRecipient = recipientId.trim();

	if (!cleanText || !cleanRecipient) {
		return { attempted: false, ok: false, error: "Пустой текст или получатель" };
	}

	if (channel === "vk") {
		const cfg = await withTenantReadCtx(organizationId, async (tx) => {
			const [row] = await tx
				.select({
					groupToken: denteVkBotConfigs.groupToken,
					tokenSecretRef: denteVkBotConfigs.tokenSecretRef,
					isActive: denteVkBotConfigs.isActive,
					isEnabled: denteVkBotConfigs.isEnabled,
				})
				.from(denteVkBotConfigs)
				.where(
					and(
						eq(denteVkBotConfigs.organizationId, organizationId),
						eq(denteVkBotConfigs.isActive, true),
					),
				)
				.limit(1);
			return row ?? null;
		});

		const rawToken = cfg?.groupToken || cfg?.tokenSecretRef || null;
		const token = rawToken
			? OmnichannelTokenVault.resolveOperationalToken(rawToken, organizationId)
			: null;
		if (!token || cfg?.isEnabled === false) {
			return {
				attempted: true,
				ok: false,
				error: "Токен сообщества ВКонтакте не настроен",
			};
		}

		try {
			await VkApiClient.sendMessage(token, cleanRecipient, cleanText);
			return { attempted: true, ok: true };
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			logger.warn(
				{ err: safeLogError(err), organizationId, channel },
				"VK bot reply send failed",
			);
			return { attempted: true, ok: false, error: msg };
		}
	}

	if (channel === "max") {
		const cfg = await withTenantReadCtx(organizationId, async (tx) => {
			const [row] = await tx
				.select({
					maxBotToken: denteMaxBotConfigs.maxBotToken,
					tokenSecretRef: denteMaxBotConfigs.tokenSecretRef,
					isActive: denteMaxBotConfigs.isActive,
					isEnabled: denteMaxBotConfigs.isEnabled,
				})
				.from(denteMaxBotConfigs)
				.where(
					and(
						eq(denteMaxBotConfigs.organizationId, organizationId),
						eq(denteMaxBotConfigs.isActive, true),
					),
				)
				.limit(1);
			return row ?? null;
		});

		const rawToken = cfg?.maxBotToken || cfg?.tokenSecretRef || null;
		const botToken = rawToken
			? OmnichannelTokenVault.resolveOperationalToken(rawToken, organizationId)
			: null;
		if (!botToken || cfg?.isEnabled === false) {
			return {
				attempted: true,
				ok: false,
				error: "Токен бота MAX не настроен",
			};
		}

		const recipient =
			parseMaxRecipient(cleanRecipient) ??
			(/^-?\d{1,19}$/.test(cleanRecipient)
				? ({ kind: "user", id: cleanRecipient } as const)
				: null);
		if (!recipient) {
			return {
				attempted: true,
				ok: false,
				error: "Некорректный идентификатор получателя MAX",
			};
		}

		const res = await sendMaxTextMessage({
			botToken,
			recipient,
			text: cleanText,
		});
		if (!res.ok) {
			logger.warn(
				{ organizationId, channel, errorMessage: res.errorMessage },
				"MAX bot reply send failed",
			);
			return { attempted: true, ok: false, error: res.errorMessage };
		}
		return { attempted: true, ok: true };
	}

	return { attempted: false, ok: true };
}
