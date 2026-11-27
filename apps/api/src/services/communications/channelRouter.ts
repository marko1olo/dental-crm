/**
 * Единая точка отправки: канал → транспорт.
 *
 * ЗАЧЕМ: четыре транспорта (telegram, whatsapp, sms, email) возвращают свои
 * формы результата и свои наборы классов ошибок. Диспетчеру нужен один вид
 * ответа, иначе логика повторов расползётся по каналам и в каждом будет своя.
 *
 * Здесь же честно закрыты каналы, для которых отправки нет: `vk` и `max` не
 * реализованы, `phone` и `in_person` в принципе не отправляются машиной — это
 * задача сотруднику, а не сообщение. Такие строки помечаются как
 * `not_configured`, а не «отправлено».
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	denteVkBotConfigs,
	denteWhatsappBotConfigs,
} from "../../db/schema.js";
import { VkApiClient } from "../bots/VkApiClient.js";
import {
	readSmtpCredentialsFromEnv,
	type SmtpCredentials,
	sendEmail,
} from "../../emailTransport.js";
import { parseMaxRecipient, sendMaxTextMessage } from "../../maxTransport.js";
import {
	readSmsCredentialsFromEnv,
	type SmsCredentials,
	sendSms,
} from "../../smsTransport.js";
import { sendTelegramTextMessage } from "../../telegramTransport.js";
import { decryptTelegramChatId } from "../../utils/telegramChatRef.js";
import {
	readWhatsappCredentials,
	sendWhatsappTextMessage,
	type WhatsappCredentials,
} from "../../whatsappTransport.js";
import { OmnichannelTokenVault } from "../bots/OmnichannelTokenVault.js";
import type {
	CommunicationChannelCode,
	CommunicationConsentScope,
	DeliveryErrorClass,
} from "./types.js";

export type { CommunicationChannelCode, CommunicationConsentScope };

/** Каналы, по которым сообщение действительно уходит машиной. */
export const MACHINE_DELIVERABLE_CHANNELS: readonly CommunicationChannelCode[] =
	["sms", "email", "whatsapp", "telegram", "max", "vk"];

export function isMachineDeliverableChannel(
	channel: string,
): channel is CommunicationChannelCode {
	return (MACHINE_DELIVERABLE_CHANNELS as readonly string[]).includes(channel);
}

export type ChannelSendResult =
	| {
			readonly ok: true;
			readonly providerMessageId: string | null;
			readonly segments: number | null;
	  }
	| {
			readonly ok: false;
			readonly errorClass: DeliveryErrorClass;
			readonly errorMessage: string;
	  };

export type ChannelCredentialSet = {
	readonly sms: SmsCredentials | null;
	readonly smtp: SmtpCredentials | null;
	readonly whatsapp: WhatsappCredentials | null;
	readonly telegramBotToken: string | null;
	/**
	 * Токен бота MAX. Берётся из колонки max_bot_token и только при включённой
	 * интеграции: token_secret_ref для этого не годится — туда соседние
	 * интеграции кладут маскированное значение.
	 */
	readonly maxBotToken: string | null;
	readonly vkGroupToken: string | null;
};

/**
 * Токен Telegram берётся оттуда же, откуда его берёт routes/telegram.ts:
 * общий бот — из DENTE_TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_TOKEN, собственный
 * бот клиники — из DENTE_TELEGRAM_OWN_BOT_TOKEN / DENTE_TELEGRAM_CLINIC_BOT_TOKEN.
 *
 * Поле `token_secret_ref` в базе для этого НЕ годится: в соседних интеграциях
 * туда кладут маскированное значение (routes/whatsapp.ts, routes/max.ts), и
 * старый services/notificationWorker.ts подставлял именно его как токен бота.
 */
function readTelegramBotToken(
	mode: string | null,
	env: NodeJS.ProcessEnv,
): string | null {
	const value = (name: string) => env[name]?.trim() || null;
	if (mode === "clinic_owned_bot") {
		return (
			value("DENTE_TELEGRAM_OWN_BOT_TOKEN") ??
			value("DENTE_TELEGRAM_CLINIC_BOT_TOKEN")
		);
	}
	if (mode === "disabled") return null;
	return value("DENTE_TELEGRAM_BOT_TOKEN") ?? value("TELEGRAM_BOT_TOKEN");
}

/**
 * Учётные данные всех каналов организации — один раз на пачку сообщений, а не
 * на каждое: иначе на сотне напоминаний будет сотня лишних запросов к базе.
 */
export async function resolveChannelCredentials(
	organizationId: string,
	env: NodeJS.ProcessEnv = process.env,
): Promise<ChannelCredentialSet> {
	const { whatsappConfig, telegramConfig, maxConfig, vkConfig } = await withTenantCtx(
		organizationId,
		async (tx) => {
			const [wa] = await tx
				.select()
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.organizationId, organizationId))
				.limit(1);

			const [tg] = await tx
				.select({ mode: denteTelegramBotConfigs.mode })
				.from(denteTelegramBotConfigs)
				.where(eq(denteTelegramBotConfigs.organizationId, organizationId))
				.limit(1);

			const [max] = await tx
				.select({
					token: denteMaxBotConfigs.maxBotToken,
					tokenSecretRef: denteMaxBotConfigs.tokenSecretRef,
					isActive: denteMaxBotConfigs.isActive,
				})
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, organizationId))
				.limit(1);

			const [vk] = await tx
				.select({
					groupToken: denteVkBotConfigs.groupToken,
					tokenSecretRef: denteVkBotConfigs.tokenSecretRef,
					isActive: denteVkBotConfigs.isActive,
					isEnabled: denteVkBotConfigs.isEnabled,
				})
				.from(denteVkBotConfigs)
				.where(eq(denteVkBotConfigs.organizationId, organizationId))
				.limit(1);

			return { whatsappConfig: wa, telegramConfig: tg, maxConfig: max, vkConfig: vk };
		},
	);

	return {
		sms: readSmsCredentialsFromEnv(env),
		smtp: readSmtpCredentialsFromEnv(env),
		// Неактивная интеграция — это «не настроено», а не «настроено и молчит».
		whatsapp: whatsappConfig?.isActive
			? readWhatsappCredentials(whatsappConfig)
			: null,
		telegramBotToken: readTelegramBotToken(telegramConfig?.mode ?? null, env),
		// Выключенная интеграция — это «не настроено», а не «настроено и молчит».
		maxBotToken:
			maxConfig?.isActive && (maxConfig.token || maxConfig.tokenSecretRef)
				? OmnichannelTokenVault.resolveToken(
						maxConfig.token || maxConfig.tokenSecretRef,
						organizationId,
					)
				: null,
		vkGroupToken:
			vkConfig?.isActive &&
			vkConfig.isEnabled !== false &&
			(vkConfig.groupToken || vkConfig.tokenSecretRef)
				? OmnichannelTokenVault.resolveToken(
						vkConfig.groupToken || vkConfig.tokenSecretRef,
						organizationId,
					)
				: null,
	};
}

/**
 * Идентификатор чата Telegram по пациенту. Хранится зашифрованным, поэтому без
 * ключа шифрования отправка невозможна — и это должно быть видно как
 * `not_configured`, а не как молчаливый пропуск.
 */
export async function resolveTelegramChatId(
	organizationId: string,
	patientId: string,
): Promise<string | null> {
	const [link] = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({ chatTransportRef: denteTelegramChatLinks.chatTransportRef })
			.from(denteTelegramChatLinks)
			.where(
				and(
					eq(denteTelegramChatLinks.organizationId, organizationId),
					eq(denteTelegramChatLinks.subjectId, patientId),
					eq(denteTelegramChatLinks.status, "active"),
				),
			)
			.limit(1),
	);

	return decryptTelegramChatId(link?.chatTransportRef ?? null);
}

export type ChannelSendRequest = {
	readonly channel: CommunicationChannelCode;
	/** Номер, адрес почты или идентификатор чата — уже приведённый к формату канала. */
	readonly recipientAddress: string;
	readonly subject: string | null;
	readonly body: string;
	readonly idempotencyKey: string | null;
	readonly intent?: string | null;
	readonly templateName?: string | null;
	readonly languageCode?: string | null;
	readonly templateParameters?: readonly string[] | null;
};

function notConfigured(message: string): ChannelSendResult {
	return { ok: false, errorClass: "not_configured", errorMessage: message };
}

export async function sendThroughChannel(
	request: ChannelSendRequest,
	credentials: ChannelCredentialSet,
): Promise<ChannelSendResult> {
	switch (request.channel) {
		case "sms": {
			if (!credentials.sms)
				return notConfigured(
					"SMS-шлюз не настроен: нет ключей доступа в окружении сервера.",
				);
			const result = await sendSms({
				credentials: credentials.sms,
				toMsisdn: request.recipientAddress,
				text: request.body,
				idempotencyKey: request.idempotencyKey,
			});
			return result.ok
				? {
						ok: true,
						providerMessageId: result.providerMessageId,
						segments: result.segments,
					}
				: {
						ok: false,
						errorClass: result.errorClass,
						errorMessage: result.errorMessage,
					};
		}

		case "email": {
			if (!credentials.smtp)
				return notConfigured(
					"Почтовый сервер не настроен: нет параметров SMTP в окружении.",
				);
			const result = await sendEmail({
				credentials: credentials.smtp,
				to: request.recipientAddress,
				subject: request.subject?.trim() || "Сообщение из клиники",
				text: request.body,
			});
			return result.ok
				? {
						ok: true,
						providerMessageId: result.providerMessageId,
						segments: null,
					}
				: {
						ok: false,
						errorClass: result.errorClass,
						errorMessage: result.errorMessage,
					};
		}

		case "whatsapp": {
			if (!credentials.whatsapp)
				return notConfigured(
					"WhatsApp не настроен: нет Phone Number ID и токена доступа.",
				);

			let templateConfig = request.templateName
				? {
						name: request.templateName,
						language: request.languageCode?.trim() || "ru",
						...(request.templateParameters
							? { parameters: [...request.templateParameters] }
							: {}),
					}
				: undefined;

			// Автоматический маппинг интентов на официальные шаблоны Meta WABA
			if (!templateConfig && request.intent) {
				const intentToTemplate: Record<string, string> = {
					appointment_confirmation: "appointment_confirmation",
					appointment_reminder: "appointment_reminder",
					post_visit_instruction: "post_op_instructions",
					payment_reminder: "invoice_payment_link",
					recall: "recall_reminder",
				};
				const mappedName = intentToTemplate[request.intent];
				if (mappedName) {
					templateConfig = {
						name: mappedName,
						language: request.languageCode?.trim() || "ru",
						...(request.templateParameters
							? { parameters: [...request.templateParameters] }
							: {}),
					};
				}
			}

			const result = await sendWhatsappTextMessage({
				...credentials.whatsapp,
				toPhoneE164: request.recipientAddress,
				text: request.body,
				...(templateConfig ? { template: templateConfig } : {}),
			});
			return result.ok
				? {
						ok: true,
						providerMessageId: result.providerMessageId,
						segments: null,
					}
				: {
						ok: false,
						errorClass: result.errorClass,
						errorMessage: result.errorMessage,
					};
		}

		case "telegram": {
			if (!credentials.telegramBotToken)
				return notConfigured(
					"Telegram-бот не настроен: нет токена в окружении сервера.",
				);
			const result = await sendTelegramTextMessage({
				botToken: credentials.telegramBotToken,
				chatId: request.recipientAddress,
				text: request.body,
			});
			return result.ok
				? {
						ok: true,
						providerMessageId:
							result.telegramMessageId === null
								? null
								: String(result.telegramMessageId),
						segments: null,
					}
				: {
						ok: false,
						errorClass: result.errorClass,
						errorMessage:
							result.details ??
							`Telegram ответил ${result.errorCode ?? "без кода"} (${result.errorClass}).`,
					};
		}

		case "max": {
			if (!credentials.maxBotToken) {
				return notConfigured(
					"Бот MAX не подключён: в настройках клиники нет токена или интеграция выключена.",
				);
			}

			// Адрес приходит из метки MAX:<chat_id>, оставленной разбором входящих.
			// Телефон или почта в этом поле означают, что связи с чатом нет.
			const recipient = parseMaxRecipient(request.recipientAddress);
			if (!recipient) {
				return notConfigured(
					"У пациента нет переписки в MAX: отправить первым может только бот, которому пациент уже написал.",
				);
			}

			const result = await sendMaxTextMessage({
				botToken: credentials.maxBotToken,
				recipient,
				text: request.body,
			});

			return result.ok
				? {
						ok: true,
						providerMessageId: result.providerMessageId,
						segments: null,
					}
				: {
						ok: false,
						errorClass: result.errorClass,
						errorMessage: result.errorMessage,
					};
		}

		case "vk": {
			if (!credentials.vkGroupToken) {
				return notConfigured(
					"Отправка во ВКонтакте не настроена: укажите токен доступа сообщества в настройках интеграции ВКонтакте.",
				);
			}
			const cleanVkId = request.recipientAddress
				.trim()
				.replace(/^vk:/i, "")
				.replace(/^id/i, "")
				.trim();
			if (!/^\d{1,19}$/.test(cleanVkId)) {
				return notConfigured(
					"У пациента не указан числовой идентификатор диалога ВКонтакте.",
				);
			}
			try {
				const vkRes = await VkApiClient.sendMessage(
					credentials.vkGroupToken,
					cleanVkId,
					request.body,
				);
				return {
					ok: true,
					providerMessageId: String(vkRes.messageId),
					segments: null,
				};
			} catch (vkErr) {
				const errMsg = vkErr instanceof Error ? vkErr.message : String(vkErr);
				return {
					ok: false,
					errorClass: "network",
					errorMessage: errMsg,
				};
			}
		}

		case "phone":
		case "in_person":
			return notConfigured(
				"Этот канал не отправляется автоматически — это задача сотруднику, а не сообщение в очереди.",
			);

		default:
			return notConfigured("Неизвестный канал.");
	}
}
