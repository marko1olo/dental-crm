/**
 * whatsappTransport.ts — фактическая отправка сообщений в WhatsApp Cloud API.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * Обработчик POST /api/whatsapp/send записывал строку в communication_events,
 * рассылал событие по WebSocket и печатал в консоль
 *
 *     console.log(`[WhatsApp Outbox] Sent to ${phone}: ${message}`)
 *
 * после чего возвращал `{ ok: true }`. Никакого обращения к API Meta в проекте
 * не было — только ссылка на документацию в комментарии. Администратор видел
 * «отправлено», в истории коммуникаций появлялась запись со статусом sent, а
 * пациент не получал ничего. Для напоминания о приёме это хуже, чем явная
 * ошибка: клиника уверена, что предупредила человека.
 *
 * Модуль повторяет устройство telegramTransport.ts: тайм-аут, разбор ответа,
 * классификация ошибки, никаких исключений наружу — вызывающий получает
 * размеченный результат.
 *
 * Документация: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

const GRAPH_API_VERSION = "v21.0";

export type WhatsappTransportResult =
	| {
			ok: true;
			providerMessageId: string | null;
			errorCode: null;
			errorClass: null;
			errorMessage: null;
	  }
	| {
			ok: false;
			providerMessageId: null;
			errorCode: number | null;
			errorClass:
				| "not_configured"
				| "rate_limited"
				| "auth"
				| "recipient_unavailable"
				| "bad_request"
				| "timeout"
				| "network"
				| "server"
				| "unknown";
			errorMessage: string;
	  };

export interface WhatsappCredentials {
	phoneNumberId: string;
	accessToken: string;
}

export interface SendWhatsappTextInput extends WhatsappCredentials {
	/** Номер получателя в международном формате, только цифры. */
	toPhoneE164: string;
	text: string;
	timeoutMs?: number;
}

function classifyWhatsappError(
	status: number,
): Extract<WhatsappTransportResult, { ok: false }>["errorClass"] {
	if (status === 429) return "rate_limited";
	if (status === 401 || status === 403) return "auth";
	// 131026 «Message undeliverable» приходит с кодом 400; отдельная ветка ниже.
	if (status >= 400 && status < 500) return "bad_request";
	if (status >= 500) return "server";
	return "unknown";
}

/**
 * Проверяет, что учётные данные заполнены. Пустая строка в базе — это «не
 * настроено», а не «настроено пустым значением».
 */
export function readWhatsappCredentials(config: {
	phoneNumberId?: string | null;
	accessToken?: string | null;
}): WhatsappCredentials | null {
	const phoneNumberId = config.phoneNumberId?.trim();
	const accessToken = config.accessToken?.trim();
	if (!phoneNumberId || !accessToken) return null;
	return { phoneNumberId, accessToken };
}

/** «+7 (916) 123-45-67» → «79161234567». Cloud API принимает только цифры. */
export function normalizeWhatsappRecipient(raw: string | null | undefined): string | null {
	const digits = (raw ?? "").replace(/\D/g, "");
	if (digits.length < 10) return null;
	// Российские номера в базе часто хранятся с ведущей 8.
	if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
	return digits;
}

export async function sendWhatsappTextMessage(
	input: SendWhatsappTextInput,
): Promise<WhatsappTransportResult> {
	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 12_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(
			`https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(input.phoneNumberId)}/messages`,
			{
				method: "POST",
				headers: {
					authorization: `Bearer ${input.accessToken}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					messaging_product: "whatsapp",
					recipient_type: "individual",
					to: input.toPhoneE164,
					type: "text",
					text: { preview_url: false, body: input.text },
				}),
				signal: controller.signal,
			},
		);

		const payload = (await response.json().catch(() => ({}))) as {
			messages?: { id?: unknown }[];
			error?: { message?: unknown; code?: unknown };
		};

		if (!response.ok) {
			const providerCode =
				typeof payload.error?.code === "number" ? payload.error.code : null;
			// 131026 / 131047 — номер не в WhatsApp либо окно 24 часов закрыто.
			const errorClass =
				providerCode === 131026 || providerCode === 131047
					? ("recipient_unavailable" as const)
					: classifyWhatsappError(response.status);
			return {
				ok: false,
				providerMessageId: null,
				errorCode: providerCode ?? response.status,
				errorClass,
				errorMessage:
					typeof payload.error?.message === "string"
						? payload.error.message
						: `WhatsApp Cloud API ответил ${response.status}`,
			};
		}

		const messageId = payload.messages?.[0]?.id;
		return {
			ok: true,
			providerMessageId: typeof messageId === "string" ? messageId : null,
			errorCode: null,
			errorClass: null,
			errorMessage: null,
		};
	} catch (error) {
		const aborted = error instanceof Error && error.name === "AbortError";
		return {
			ok: false,
			providerMessageId: null,
			errorCode: null,
			errorClass: aborted ? "timeout" : "network",
			errorMessage: aborted
				? `WhatsApp Cloud API не ответил за ${timeoutMs} мс`
				: `Сеть недоступна: ${error instanceof Error ? error.message : String(error)}`,
		};
	} finally {
		clearTimeout(timeout);
	}
}
