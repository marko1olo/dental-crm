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
import { namedDevelopmentModeActive } from "../accessGuard.js";
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
 *  - названный режим разработки (`development`/`test`): пропускается с
 *    предупреждением в лог, чтобы не ломать локальную отладку интеграций;
 *  - любой другой режим, включая НЕЗАДАННЫЙ: 503, запрос отклоняется
 *    (fail closed).
 *
 * ЧТО ЗДЕСЬ БЫЛО ДЫРОЙ И ПОЧЕМУ ЭТО НЕ ТЕОРИЯ.
 * Стояло `if (process.env.NODE_ENV === "production") { 503 }`, то есть запрет
 * включался ТОЛЬКО в явно названном production, а во всех прочих случаях
 * управление доходило до `return true` ниже. `apps/api/package.json` объявляет
 * `"start": "node dist/server.js"` и NODE_ENV не задаёт — ни один Dockerfile
 * тоже. У заказчика NODE_ENV ПУСТ. Значит на боевом сервере условие было ложным,
 * и ВСЕ вебхуки каналов (VK — routes/vk.ts, телефония Mango/Zadarma/UIS —
 * routes/telephony.ts в двух местах, MAX — routes/max.ts) принимали любой POST
 * от кого угодно без секрета, оставляя один warning в журнале. Через них
 * посторонний создаёт пациентов и лиды в чужой клинике, вбрасывает сообщения в
 * омниканальный ящик от имени пациента и показывает врачам всплывающие
 * уведомления о несуществующих звонках. Измерено зондом: при пустом NODE_ENV
 * запрос без секрета получал 200.
 *
 * СТАЛО: послабление действует, только если ЯВНО НАЗВАН режим разработки
 * (`development`/`test`) — `accessGuard.namedDevelopmentModeActive()`. Пустой,
 * незаданный или незнакомый NODE_ENV («staging», «prod», опечатка) больше не
 * послабление, а обычный режим, и секрет в нём обязателен. Направление отказа
 * перевёрнуто: ошибка в имени режима теперь ЗАКРЫВАЕТ вебхук, а не открывает.
 *
 * ТОМУ, КТО ЧЕРЕЗ ПОЛГОДА ЗАХОЧЕТ «ВЕРНУТЬ КАК БЫЛО».
 * Симптом, с которым сюда придут, выглядит так: «вебхук канала перестал
 * приниматься, отвечает 503 WebhookSecretNotConfigured, а раньше работал».
 * Раньше он работал не потому, что был настроен, а потому, что проверка была
 * выключена пустым окружением — это и есть починенная дыра. Правильные два
 * выхода: (1) задать секрет канала в окружении сервера (имя переменной названо
 * в теле ответа 503 и в `secretEnvNames` вызывающего) — это то, что нужно на
 * любом сервере, принимающем трафик; (2) для локальной отладки без секрета
 * выставить NODE_ENV=development или NODE_ENV=test. Чего делать НЕЛЬЗЯ: менять
 * предикат на `!== "production"` в любом виде и заводить здесь пятую копию
 * условия вместо вызова accessGuard — пустой NODE_ENV снова станет режимом
 * разработки на боевом сервере, и дыра вернётся ровно в том же виде.
 */
export function verifyWebhookSecret(
  request: FastifyRequest,
  reply: FastifyReply,
  options: WebhookAuthOptions
): boolean {
  const expected = configuredSecret(options.secretEnvNames);

  if (!expected) {
    if (!namedDevelopmentModeActive()) {
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
