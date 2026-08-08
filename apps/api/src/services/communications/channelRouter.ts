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
import {
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	denteWhatsappBotConfigs,
} from "../../db/schema.js";
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
import type {
	CommunicationChannelCode,
	CommunicationConsentScope,
	DeliveryErrorClass,
} from "./types.js";

export type { CommunicationChannelCode, CommunicationConsentScope };

/** Каналы, по которым сообщение действительно уходит машиной. */
export const MACHINE_DELIVERABLE_CHANNELS: readonly CommunicationChannelCode[] =
	["sms", "email", "whatsapp", "telegram"];

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
	const [whatsappConfig] = await db
		.select()
		.from(denteWhatsappBotConfigs)
		.where(eq(denteWhatsappBotConfigs.organizationId, organizationId))
		.limit(1);

	const [telegramConfig] = await db
		.select({ mode: denteTelegramBotConfigs.mode })
		.from(denteTelegramBotConfigs)
		.where(eq(denteTelegramBotConfigs.organizationId, organizationId))
		.limit(1);

	const [maxConfig] = await db
		.select({
			token: denteMaxBotConfigs.maxBotToken,
			isActive: denteMaxBotConfigs.isActive,
		})
		.from(denteMaxBotConfigs)
		.where(eq(denteMaxBotConfigs.organizationId, organizationId))
		.limit(1);

	return {
		sms: readSmsCredentialsFromEnv(env),
		smtp: readSmtpCredentialsFromEnv(env),
		// Неактивная интеграция — это «не настроено», а не «настроено и молчит».
		whatsapp: whatsappConfig?.isActive
			? readWhatsappCredentials(whatsappConfig)
			: null,
		telegramBotToken: readTelegramBotToken(telegramConfig?.mode ?? null, env),
		// Выключенная интеграция — это «не настроено», а не «настроено и молчит».
		maxBotToken: maxConfig?.isActive ? maxConfig.token?.trim() || null : null,
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
	const [link] = await db
		.select({ chatTransportRef: denteTelegramChatLinks.chatTransportRef })
		.from(denteTelegramChatLinks)
		.where(
			and(
				eq(denteTelegramChatLinks.organizationId, organizationId),
				eq(denteTelegramChatLinks.subjectId, patientId),
				eq(denteTelegramChatLinks.status, "active"),
			),
		)
		.limit(1);

	return decryptTelegramChatId(link?.chatTransportRef ?? null);
}

export type ChannelSendRequest = {
	readonly channel: CommunicationChannelCode;
	/** Номер, адрес почты или идентификатор чата — уже приведённый к формату канала. */
	readonly recipientAddress: string;
	readonly subject: string | null;
	readonly body: string;
	readonly idempotencyKey: string | null;
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
			const result = await sendWhatsappTextMessage({
				...credentials.whatsapp,
				toPhoneE164: request.recipientAddress,
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
						errorMessage: `Telegram ответил ${result.errorCode ?? "без кода"} (${result.errorClass}).`,
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

		case "vk":
			/*
			 * ДОЛГ, А НЕ ЗАГЛУШКА-ОБМАНКА. В проекте нет ни одного обращения к API
			 * VK, нет колонки под токен сообщества и нет разбора входящих оттуда:
			 * реализовать отправку означало бы выдумать и контракт, и место
			 * хранения ключа. Канал честно сообщает, что не настроен, и сообщение
			 * не теряется — оно видно в журнале с этой причиной.
			 */
			return notConfigured(
				"Отправка во ВКонтакте не подключена: нет ни ключа сообщества, ни разбора входящих. Выберите другой канал.",
			);

		case "phone":
		case "in_person":
			return notConfigured(
				"Этот канал не отправляется автоматически — это задача сотруднику, а не сообщение в очереди.",
			);

		default:
			return notConfigured("Неизвестный канал.");
	}
}
