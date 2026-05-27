export type TelegramTransportResult =
  | {
      ok: true;
      telegramMessageId: number | null;
      retryAfterSeconds: null;
      errorCode: null;
      errorClass: null;
    }
  | {
      ok: false;
      telegramMessageId: null;
      retryAfterSeconds: number | null;
      errorCode: number | null;
      errorClass: "rate_limited" | "auth" | "chat_blocked" | "bad_request" | "timeout" | "network" | "server" | "unknown";
    };

export type SendTelegramTextMessageInput = {
  botToken: string;
  chatId: string;
  text: string;
  replyMarkup?: Record<string, unknown> | null;
  timeoutMs?: number;
};

export type SendTelegramPhotoMessageInput = {
  botToken: string;
  chatId: string;
  photoUrl: string;
  caption: string;
  replyMarkup?: Record<string, unknown> | null;
  timeoutMs?: number;
};

type TelegramTransportErrorClass = Extract<TelegramTransportResult, { ok: false }>["errorClass"];

export type AnswerTelegramCallbackQueryInput = {
  botToken: string;
  callbackQueryId: string;
  text?: string | null;
  timeoutMs?: number;
};

function classifyTelegramError(status: number): TelegramTransportErrorClass {
  if (status === 429) return "rate_limited";
  if (status === 401) return "auth";
  if (status === 403) return "chat_blocked";
  if (status >= 400 && status < 500) return "bad_request";
  if (status >= 500) return "server";
  return "unknown";
}

function retryAfterSecondsFromPayload(payload: unknown): number | null {
  const retryAfter =
    payload && typeof payload === "object" && "parameters" in payload
      ? (payload as { parameters?: { retry_after?: unknown } }).parameters?.retry_after
      : null;
  return typeof retryAfter === "number" && Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : null;
}

function telegramMessageIdFromPayload(payload: unknown): number | null {
  const messageId =
    payload && typeof payload === "object" && "result" in payload
      ? (payload as { result?: { message_id?: unknown } }).result?.message_id
      : null;
  return typeof messageId === "number" && Number.isInteger(messageId) && messageId >= 0 ? messageId : null;
}

export async function sendTelegramTextMessage(input: SendTelegramTextMessageInput): Promise<TelegramTransportResult> {
  const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 12_000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    text: input.text,
    link_preview_options: { is_disabled: true },
    protect_content: true
  };
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;

  try {
    const response = await fetch(`https://api.telegram.org/bot${input.botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const payload = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      return {
        ok: false,
        telegramMessageId: null,
        retryAfterSeconds: retryAfterSecondsFromPayload(payload),
        errorCode: response.status,
        errorClass: classifyTelegramError(response.status)
      };
    }

    return {
      ok: true,
      telegramMessageId: telegramMessageIdFromPayload(payload),
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: null
    };
  } catch (error) {
    return {
      ok: false,
      telegramMessageId: null,
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTelegramPhotoMessage(input: SendTelegramPhotoMessageInput): Promise<TelegramTransportResult> {
  const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 12_000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    photo: input.photoUrl,
    caption: input.caption,
    protect_content: true
  };
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;

  try {
    const response = await fetch(`https://api.telegram.org/bot${input.botToken}/sendPhoto`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const payload = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      return {
        ok: false,
        telegramMessageId: null,
        retryAfterSeconds: retryAfterSecondsFromPayload(payload),
        errorCode: response.status,
        errorClass: classifyTelegramError(response.status)
      };
    }

    return {
      ok: true,
      telegramMessageId: telegramMessageIdFromPayload(payload),
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: null
    };
  } catch (error) {
    return {
      ok: false,
      telegramMessageId: null,
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network"
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function answerTelegramCallbackQuery(input: AnswerTelegramCallbackQueryInput): Promise<TelegramTransportResult> {
  const timeoutMs = Math.max(1000, Math.min(60_000, input.timeoutMs ?? 5000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body: Record<string, unknown> = {
    callback_query_id: input.callbackQueryId
  };
  if (input.text?.trim()) body.text = input.text.trim().slice(0, 200);

  try {
    const response = await fetch(`https://api.telegram.org/bot${input.botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const payload = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      return {
        ok: false,
        telegramMessageId: null,
        retryAfterSeconds: retryAfterSecondsFromPayload(payload),
        errorCode: response.status,
        errorClass: classifyTelegramError(response.status)
      };
    }

    return {
      ok: true,
      telegramMessageId: null,
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: null
    };
  } catch (error) {
    return {
      ok: false,
      telegramMessageId: null,
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: error instanceof DOMException && error.name === "AbortError" ? "timeout" : "network"
    };
  } finally {
    clearTimeout(timeout);
  }
}
