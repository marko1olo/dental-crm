/**
 * webhookAuth.ts — общая проверка подлинности входящих вебхуков.
 *
 * ПРОБЛЕМА
 * Вебхуки VK, телефонии (Mango/Zadarma/UIS), WhatsApp и MAX принимали любой
 * POST без какой-либо проверки. Отправив запрос на публичный URL с UUID
 * организации, посторонний мог:
 *   - создавать пациентов и лиды в чужой клинике;
 *   - вбрасывать сообщения в омниканальный ящик от имени пациента;
 *   - показывать врачам всплывающие уведомления о несуществующих входящих звонках.
 * Реализация Telegram-вебхука в routes/telegram.ts делала это правильно —
 * здесь тот же подход, вынесенный для повторного использования.
 *
 * МОДЕЛЬ
 * Для каждого канала задаётся общий секрет в переменной окружения. Провайдер
 * присылает его в заголовке (или в query-параметре, если провайдер не умеет
 * заголовки). Сравнение — постоянного времени.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

export const WEBHOOK_SECRET_HEADER = "x-dente-webhook-secret";

export interface WebhookAuthOptions {
  /** Имя канала для сообщений об ошибке, например "vk". */
  channel: string;
  /** Переменные окружения с ожидаемым секретом, в порядке приоритета. */
  secretEnvNames: readonly string[];
  /** Дополнительные заголовки, где провайдер может прислать секрет. */
  extraHeaderNames?: readonly string[];
}

function headerValue(request: FastifyRequest, name: string): string | null {
  const raw = request.headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function queryValue(request: FastifyRequest, name: string): string | null {
  const query = request.query as Record<string, unknown> | undefined;
  const value = query?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function configuredSecret(envNames: readonly string[]): string | null {
  for (const name of envNames) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Проверяет секрет вебхука. Возвращает true, если запрос можно обрабатывать.
 * При неудаче сам отправляет ответ (401/503) — вызывающему достаточно выйти.
 *
 * Поведение при ненастроенном секрете:
 *  - production: 503, запрос отклоняется (fail closed);
 *  - development: пропускается с предупреждением в лог, чтобы не ломать
 *    локальную отладку интеграций.
 */
export function verifyWebhookSecret(
  request: FastifyRequest,
  reply: FastifyReply,
  options: WebhookAuthOptions
): boolean {
  const expected = configuredSecret(options.secretEnvNames);

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      reply.code(503).send({
        error: "WebhookSecretNotConfigured",
        message: `Вебхук ${options.channel} не настроен: задайте ${options.secretEnvNames[0]} в окружении сервера.`,
      });
      return false;
    }
    request.log.warn(
      `[webhook:${options.channel}] Секрет не задан (${options.secretEnvNames.join(" / ")}). ` +
        "Запрос принят только потому, что сервер работает в режиме разработки."
    );
    return true;
  }

  const candidates = [
    headerValue(request, WEBHOOK_SECRET_HEADER),
    ...(options.extraHeaderNames ?? []).map((name) => headerValue(request, name)),
    queryValue(request, "secret"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (timingSafeSecretEqual(candidate, expected)) return true;
  }

  request.log.warn(
    { ip: request.ip, url: request.url },
    `[webhook:${options.channel}] Отклонён запрос с неверным секретом.`
  );
  reply.code(401).send({
    error: "WebhookSecretMismatch",
    message: "Неверный секрет вебхука.",
  });
  return false;
}
