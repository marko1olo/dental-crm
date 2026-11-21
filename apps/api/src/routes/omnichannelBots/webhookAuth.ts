import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { denteVkBotConfigs, denteWhatsappBotConfigs } from "../../db/schema.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

/**
 * Получение кода подтверждения Callback API для сообщества ВКонтакте.
 */
export async function getVkConfirmationCode(organizationId: string): Promise<string> {
	const [cfg] = await db
		.select({ confirmationCode: denteVkBotConfigs.confirmationCode })
		.from(denteVkBotConfigs)
		.where(eq(denteVkBotConfigs.organizationId, organizationId))
		.limit(1);

	return cfg?.confirmationCode || process.env.VK_CONFIRMATION_TOKEN || "ok";
}

/**
 * Обработка GET-рукопожатий вебхуков:
 * - WhatsApp Hub Challenge (Meta Cloud API)
 * - VK Callback API confirmation code fallback
 */
export async function handleWebhookGetHandshake(
	channel: string,
	organizationId: string,
	query: Record<string, string>,
): Promise<{ handled: boolean; statusCode: number; payload: string }> {
	// WhatsApp Webhook Challenge
	if (channel === "whatsapp" && query["hub.mode"] === "subscribe") {
		const [waConfig] = await db
			.select({ webhookVerifyToken: denteWhatsappBotConfigs.webhookVerifyToken })
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, organizationId))
			.limit(1);

		const expectedToken =
			waConfig?.webhookVerifyToken ||
			process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
			null;
		const incomingToken = query["hub.verify_token"] || null;

		if (expectedToken && timingSafeSecretEqual(incomingToken, expectedToken)) {
			const challenge = query["hub.challenge"];
			if (challenge) {
				return { handled: true, statusCode: 200, payload: challenge };
			}
		}

		return {
			handled: true,
			statusCode: 403,
			payload: "Forbidden: invalid hub.verify_token",
		};
	}

	// VK Callback API GET fallback
	if (channel === "vk" && query.type === "confirmation") {
		const code = await getVkConfirmationCode(organizationId);
		return { handled: true, statusCode: 200, payload: code };
	}

	return { handled: false, statusCode: 200, payload: "OK" };
}
