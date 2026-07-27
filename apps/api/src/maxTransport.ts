/**
 * Отправка сообщений в MAX.
 *
 * ЧТО БЫЛО. Канал `max` в channelRouter возвращал «Отправка в MAX не
 * реализована», хотя входящие из MAX разбираются (routes/max.ts), токен бота
 * хранится (dente_max_bot_configs.max_bot_token), а канал предлагается в
 * настройках. То есть клиника могла выбрать MAX и не получить ни одного
 * отправленного сообщения — при том, что в России это канал, до которого часть
 * пациентов доходит охотнее, чем до SMS.
 *
 * ОТКУДА ВЗЯТ ПРОТОКОЛ. Из официальной документации dev.max.ru/docs-api,
 * раздел POST /messages, а не из догадок:
 *   • адрес: POST https://platform-api2.max.ru/messages
 *     (домен platform-api.max.ru и старый botapi.max.ru отмечены устаревшими);
 *   • получатель — В СТРОКЕ ЗАПРОСА: ?user_id=… или ?chat_id=…, целые int64;
 *   • токен — только заголовком Authorization; передача в query больше не
 *     поддерживается;
 *   • тело: { text (до 4000 символов), format: markdown|html, notify, link,
 *     attachments };
 *   • ответ: { message: Message }, где Message = { sender, recipient, timestamp,
 *     body, link, stat, url };
 *   • коды: 200, 400, 401, 404, 405, 429, 503;
 *   • ограничения: 30 запросов в секунду на API и НЕ БОЛЕЕ ДВУХ сообщений в
 *     секунду в один диалог.
 *
 * ЧЕГО В ДОКУМЕНТАЦИИ НЕТ, И ЧТО ЗДЕСЬ НЕ ВЫДУМАНО. Страница объекта Message не
 * раскрывает поля MessageBody, поэтому имя поля с идентификатором сообщения
 * достоверно неизвестно. Идентификатор читается мягко: если в body есть строка
 * `mid` — берётся она, иначе возвращается null. Пустой идентификатор означает
 * лишь то, что квитанцию не к чему привязать; отправку это не ломает и ложное
 * значение в журнал не пишет.
 *
 * НЕ ПРОВЕРЕНО ЖИВЫМ API: бота MAX может зарегистрировать только верифицированное
 * юридическое лицо РФ, токена у разработки нет. Разбор ответов покрыт тестами на
 * образцах из документации.
 */

import type { DeliveryErrorClass } from "./services/communications/deliveryPolicy.js";

/** Домен из действующей документации. Старые адреса помечены устаревшими. */
const MAX_API_BASE = "https://platform-api2.max.ru";

/** Ограничение длины текста из документации POST /messages. */
export const MAX_TEXT_LIMIT = 4000;

export type MaxTransportResult =
	| {
			readonly ok: true;
			readonly providerMessageId: string | null;
			readonly errorCode: null;
			readonly errorClass: null;
			readonly errorMessage: null;
	  }
	| {
			readonly ok: false;
			readonly providerMessageId: null;
			readonly errorCode: number | null;
			readonly errorClass: DeliveryErrorClass;
			readonly errorMessage: string;
	  };

/**
 * Получатель. Разделение явное, потому что в запросе это разные параметры, а
 * перепутать их — значит отправить сообщение не тому.
 */
export type MaxRecipient = { readonly kind: "chat"; readonly id: string } | { readonly kind: "user"; readonly id: string };

export type SendMaxTextInput = {
	readonly botToken: string;
	readonly recipient: MaxRecipient;
	readonly text: string;
	readonly timeoutMs?: number;
};

/**
 * Разбор адреса получателя, как он хранится у нас.
 *
 * Входящие из MAX связываются с пациентом меткой `MAX:<chat_id>` в заметках
 * карточки (см. services/messengerIngestion.ts), поэтому в очередь попадает
 * именно идентификатор чата. Префикс `user:` поддержан для случая, когда
 * известен идентификатор пользователя, а не диалога.
 *
 * Идентификаторы MAX — целые int64, поэтому строка проверяется на цифры: буквы
 * здесь означают, что в поле лежит телефон или почта, то есть сообщение
 * отправлять некуда.
 */
export function parseMaxRecipient(rawAddress: string | null | undefined): MaxRecipient | null {
	const value = (rawAddress ?? "").trim();
	if (!value) return null;

	const withoutPrefix = value.startsWith("user:") ? value.slice(5).trim() : value.startsWith("chat:") ? value.slice(5).trim() : value;
	if (!/^-?\d{1,19}$/.test(withoutPrefix)) return null;

	return value.startsWith("user:") ? { kind: "user", id: withoutPrefix } : { kind: "chat", id: withoutPrefix };
}

/**
 * Классификация по коду ответа. Разделение важно для повторов: 429 повторять
 * нужно, 401 — бессмысленно, ключ повторами не починится.
 */
function classifyMaxStatus(status: number): DeliveryErrorClass {
	if (status === 401 || status === 403) return "auth";
	if (status === 429) return "rate_limited";
	if (status === 404) return "recipient_unavailable";
	if (status === 400 || status === 405) return "bad_request";
	if (status >= 500) return "network";
	return "message_rejected";
}

/** Текст ошибки от сервера, не выдавая за него собственные догадки. */
function readErrorMessage(payload: unknown, status: number): string {
	if (payload && typeof payload === "object") {
		const record = payload as Record<string, unknown>;
		if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
		if (typeof record.code === "string" && record.code.trim()) return `MAX вернул код «${record.code.trim()}»`;
	}
	return `MAX ответил ${status}`;
}

/**
 * Идентификатор отправленного сообщения. Структура MessageBody в документации не
 * раскрыта, поэтому берётся мягко: есть строковый `mid` — используем, нет —
 * null. Придумывать имя поля нельзя: квитанция привязалась бы к пустоте.
 */
function readMessageId(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") return null;
	const message = (payload as Record<string, unknown>).message;
	if (!message || typeof message !== "object") return null;
	const body = (message as Record<string, unknown>).body;
	if (!body || typeof body !== "object") return null;
	const mid = (body as Record<string, unknown>).mid;
	return typeof mid === "string" && mid.trim() ? mid.trim() : null;
}

export async function sendMaxTextMessage(input: SendMaxTextInput): Promise<MaxTransportResult> {
	const text = input.text.trim();
	if (!text) {
		return {
			ok: false,
			providerMessageId: null,
			errorCode: null,
			errorClass: "bad_request",
			errorMessage: "Пустое сообщение не отправляется."
		};
	}
	if (text.length > MAX_TEXT_LIMIT) {
		// Проверяем до запроса: узнать о превышении от сервера дороже и медленнее.
		return {
			ok: false,
			providerMessageId: null,
			errorCode: null,
			errorClass: "bad_request",
			errorMessage: `Текст длиннее ${MAX_TEXT_LIMIT} символов — MAX такое сообщение не примет.`
		};
	}

	const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 12_000));
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	const query = new URLSearchParams();
	query.set(input.recipient.kind === "user" ? "user_id" : "chat_id", input.recipient.id);

	try {
		const response = await fetch(`${MAX_API_BASE}/messages?${query.toString()}`, {
			method: "POST",
			headers: {
				// Именно так, без «Bearer»: документация требует голый токен.
				authorization: input.botToken,
				"content-type": "application/json"
			},
			body: JSON.stringify({ text, notify: true }),
			signal: controller.signal
		});

		const payload: unknown = await response.json().catch(() => null);

		if (!response.ok) {
			return {
				ok: false,
				providerMessageId: null,
				errorCode: response.status,
				errorClass: classifyMaxStatus(response.status),
				errorMessage: readErrorMessage(payload, response.status)
			};
		}

		return {
			ok: true,
			providerMessageId: readMessageId(payload),
			errorCode: null,
			errorClass: null,
			errorMessage: null
		};
	} catch (error) {
		const aborted = error instanceof Error && error.name === "AbortError";
		return {
			ok: false,
			providerMessageId: null,
			errorCode: null,
			errorClass: aborted ? "timeout" : "network",
			errorMessage: aborted
				? `MAX не ответил за ${timeoutMs} мс`
				: `Сеть недоступна: ${error instanceof Error ? error.message : String(error)}`
		};
	} finally {
		clearTimeout(timeout);
	}
}
