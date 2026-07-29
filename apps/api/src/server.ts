import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { pathToFileURL } from "node:url";
import { ZodError } from "zod";
import { registerAiRoutes } from "./routes/ai.js";
import { registerBillingRoutes } from "./routes/billing.js";
import { registerClinicalRoutes } from "./routes/clinical.js";
import { registerCommunicationRoutes } from "./routes/communications.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerDocumentRoutes } from "./routes/documents.js";
import { registerImagingRoutes } from "./routes/imaging.js";
import { registerIngestionRoutes } from "./routes/ingestion.js";
import { registerImportRoutes } from "./routes/imports.js";
import { registerMigrationRoutes } from "./routes/migration.js";
import { registerMigrationRunRoutes } from "./routes/migrationRuns.js";
import { startMigrationWorker, stopMigrationWorker } from "./migration/worker.js";
// Модули ниже были написаны, но ни разу не зарегистрированы: их маршруты
// отвечали 404, то есть функциональность существовала только в исходниках.
import { registerFilesRoutes } from "./routes/files.js";
import { registerFamilyFinanceRoutes } from "./routes/finance_family.js";
import { registerImagingPlanningRoutes } from "./routes/imaging_planning.js";
import { registerInsuranceRoutes } from "./routes/insurance.js";
import { registerLabRoutes } from "./routes/lab.js";
import { registerLeadsRoutes } from "./routes/leads.js";
import { registerMaxRoutes } from "./routes/max.js";
import { registerSterilizationRoutes } from "./routes/sterilization.js";
import { registerVkRoutes } from "./routes/vk.js";
import { registerWaitlistRoutes } from "./routes/waitlist.js";
import { registerWhatsappRoutes } from "./routes/whatsapp.js";
import { registerOdontogramRoutes } from "./routes/odontogram.js";
import { registerPatientRoutes } from "./routes/patients.js";
import registerToothHistoryRoutes from "./routes/toothHistory.js";
import { registerPricelistRoutes } from "./routes/pricelist.js";
import { registerScheduleRoutes } from "./routes/schedule.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerSpeechRoutes } from "./routes/speech.js";
import { registerSmartImportRoutes } from "./routes/smartImports.js";
import { registerSystemRoutes } from "./routes/system.js";
import { registerWebsocketRoutes } from "./routes/websocket.js";
import { registerTelegramRoutes, registerTelegramWebhookRoutes, startDenteTelegramOutboxDueWorker } from "./routes/telegram.js";
import { registerVisitRoutes } from "./routes/visits.js";
import { registerDicomwebRoutes } from "./routes/dicomweb.js";
import { registerXrayRoutes } from "./routes/xray.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { workspaceProfileRoutes } from "./routes/workspaceProfile.js";
// Вторая партия незарегистрированных модулей. Фронтенд обращается к ним
// (только к /api/inventory — 25 мест), но Fastify отвечал 404.
import registerDiaryRoutes from "./routes/diary.js";
import { registerCommunicationOutboxRoutes } from "./routes/communicationsOutbox.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerCommunicationReceiptRoutes } from "./routes/communicationReceipts.js";
import { registerPublicAppointmentActionRoutes } from "./routes/publicAppointmentActions.js";
import { registerDayConfirmationRoutes } from "./routes/dayConfirmations.js";
import { registerPatientDuplicateRoutes } from "./routes/patientDuplicates.js";
import { registerPatientRecallRoutes } from "./routes/patientRecall.js";
import { registerWaitlistMatchRoutes } from "./routes/waitlistMatches.js";
import { startCommunicationDispatchWorker } from "./services/communications/dispatchWorker.js";
import registerEgiszRoutes from "./routes/egisz.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { portalRoutes } from "./routes/portal.js";
import { registerPublicBookingRoutes } from "./routes/publicBooking.js";
import registerTemplateRoutes from "./routes/templates.js";
import { telephonyRoutes } from "./routes/telephony.js";
import { loadAdditionalServerEnv } from "./env/loadServerEnv.js";
import { repairMojibakeText } from "./text/repairMojibake.js";
import net from "node:net";
import { ensureSshTunnel } from "./speech/tunnel.js";
import { getProxyAgent } from "./speech/keyPool.js";
import { startWatchdog } from "./watchdog.js";
import { registerRateLimiting } from "./security/rateLimit.js";
import { startBackupDaemon, stopBackupDaemon } from "./services/backupWorker.js";
import { authTokenSecret } from "./security/authSecret.js";
import { getRequestIdentity } from "./security/identity.js";
import { registerRouteNotFoundHandler } from "./utils/routeNotFound.js";

loadAdditionalServerEnv();
startWatchdog();

/**
 * Проверка конфигурации безопасности на старте (fail fast).
 * Раньше сервер спокойно поднимался без AUTH_TOKEN_SECRET и подписывал токены
 * публичной строкой из репозитория. Теперь в production он не стартует вовсе,
 * а в dev печатает предупреждения о небезопасных послаблениях.
 */
function assertSecurityConfiguration(): void {
  // Бросит исключение в production, если AUTH_TOKEN_SECRET не задан или слабый.
  authTokenSecret();

  const isProduction = process.env.NODE_ENV === "production";
  const unsafeFlags = [
    "DENTE_CLINICAL_ALLOW_UNGUARDED_READS",
    "DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS",
    "DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
    "DENTE_DEV_ALLOW_HEADER_ORG",
    "DENTE_ALLOW_DEMO_LOGIN",
    "DENTE_ALLOW_DEMO_FIXTURES"
  ].filter((name) => process.env[name] === "1");

  if (isProduction) {
    if (unsafeFlags.length > 0) {
      throw new Error(
        `Небезопасные флаги разработки включены в production: ${unsafeFlags.join(", ")}. Отключите их перед запуском.`
      );
    }
    return;
  }

  // Вне production часть послаблений включена по умолчанию (демо-вход), а часть
  // требует явного флага. Раньше это сообщение перечисляло послабления списком
  // «как будто все включены» — теперь печатается фактическое состояние, иначе
  // предупреждение вводит в заблуждение.
  //
  // ЧТО БЫЛО НЕВЕРНО. В списке безусловно стояло «код портала по умолчанию
  // 0000». Это перестало быть правдой: configuredPortalOtpCode() больше не
  // возвращает общий статический код, портал выдаёт одноразовый код на каждый
  // запрос, хранит только его хэш и отвечает 401 на «0000» — проверено живым
  // запросом к /api/portal/auth/verify-otp. Оператор читает эту строку при
  // загрузке, чтобы понять свой риск, и получал список, не совпадающий с
  // поведением сервера. Настоящее послабление осталось одно: при NODE_ENV !=
  // "production" и ненастроенной отправке SMS одноразовый код уходит в лог
  // сервера (routes/portal.ts:270, developerLogFallback) — но никогда в тело
  // ответа.
  const активные = [
    process.env.DENTE_ALLOW_DEMO_LOGIN !== "0" ? "демо-вход" : null,
    "код входа в портал пишется в лог сервера, пока у клиники не настроена отправка SMS",
    process.env.DENTE_DEV_ALLOW_HEADER_ORG === "1" ? "заголовок x-organization-id" : null,
    process.env.DENTE_ALLOW_DEMO_FIXTURES === "1" ? "демо-фикстуры ЕГИСЗ" : null
  ].filter(Boolean);
  console.warn(
    `[security] Режим разработки. Активные послабления: ${активные.join(", ")}. ` +
      "В production все они выключены автоматически."
  );
}

assertSecurityConfiguration();

async function checkProxyPortDirectly(proxyUrlString: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const cleanUrl = proxyUrlString.replace(/^socks5h?:\/\//i, "socks5://");
      const url = new URL(cleanUrl.includes("://") ? cleanUrl : `socks5://${cleanUrl}`);
      const port = parseInt(url.port || "1080");
      const host = url.hostname || "127.0.0.1";
      const socket = net.connect(port, host, () => {
        socket.end();
        resolve(true);
      });
      socket.setTimeout(1500);
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

export async function setupProxyAndTunnels() {
  // 1. Проверяем наличие SSH-ключа. Если есть, пробуем поднять туннель на порту 1080
  const hasTunnel = await ensureSshTunnel().catch((err) => {
    console.warn("[Proxy Boot] SSH SOCKS5 tunnel autostart failed:", err);
    return false;
  });

  if (hasTunnel) {
    process.env.HTTPS_PROXY = "socks5://127.0.0.1:1080";
    process.env.HTTP_PROXY = "socks5://127.0.0.1:1080";
    process.env.PROXY_URL = "socks5://127.0.0.1:1080";
  } else {
    // 2. Если туннеля нет, проверяем настроенный прокси из .env
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY_URL;
    if (proxyUrl) {
      const isOnline = await checkProxyPortDirectly(proxyUrl);
      if (!isOnline) {
        console.warn(`[Proxy Boot] Configured proxy ${proxyUrl} is offline. Disabling proxy env variables to force clean direct connections.`);
        delete process.env.HTTPS_PROXY;
        delete process.env.HTTP_PROXY;
        delete process.env.PROXY_URL;
      }
    }
  }

  // Register global agent for direct undici fetches
  (globalThis as any)._dentalProxyAgent = getProxyAgent() || undefined;
}

type HttpErrorLike = {
  statusCode?: unknown;
  status?: unknown;
  code?: unknown;
  message?: unknown;
};

const apiTechnicalErrorPattern =
  /\b(TypeError|SyntaxError|ReferenceError|DOMException|Failed to fetch|NetworkError|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|ERR_[A-Z0-9_]+|stack|undefined|null|NaN|DENTAL_[A-Z0-9_]+|DENTE_[A-Z0-9_]+)\b|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;
const publicValidationErrorMessage = "Форма отправлена с неверными или неполными полями.";

function isZodValidationError(error: unknown): boolean {
  if (error instanceof ZodError) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { issues?: unknown; name?: unknown };
  return candidate.name === "ZodError" && Array.isArray(candidate.issues);
}

function apiErrorStatusCode(error: unknown): number {
  const candidate = error as HttpErrorLike;
  const statusCode = candidate?.statusCode ?? candidate?.status;
  if (typeof statusCode === "number" && Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600) return statusCode;
  return 500;
}

function fallbackApiErrorMessage(statusCode: number): string {
  if (statusCode === 401) return "Нужна авторизация для этой операции.";
  if (statusCode === 403) return "Недостаточно прав для этой операции.";
  if (statusCode === 404) return "Запрошенная запись не найдена.";
  if (statusCode >= 500) return "Сервер не выполнил действие. Повторите позже или обратитесь к администратору клиники.";
  return "Запрос не выполнен. Проверьте данные и повторите действие.";
}

function publicApiErrorMessage(error: unknown, statusCode: number): string {
  const rawMessage = typeof (error as HttpErrorLike)?.message === "string" ? String((error as HttpErrorLike).message) : "";
  const repairedMessage = repairMojibakeText(rawMessage).trim();
  if (repairedMessage && repairedMessage.length <= 600 && /[А-Яа-яЁё]/.test(repairedMessage) && !apiTechnicalErrorPattern.test(repairedMessage)) {
    return repairedMessage;
  }
  return fallbackApiErrorMessage(statusCode);
}

export async function createDenteApiApp(options: {
  startTelegramWorker?: boolean;
  startCommunicationWorker?: boolean;
  /** Фоновое выполнение переноса чужой базы. Тесты выключают, чтобы не гонять очередь. */
  startMigrationWorker?: boolean;
} = {}) {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      redact: {
        // Не пишем в логи секреты и токены — иначе они утекают в файлы логов
        // и в системы сбора логов вместе с обычной отладкой.
        paths: [
          'req.headers.authorization',
          'req.headers["x-dente-clinic-token"]',
          'req.headers["x-dente-staff-token"]',
          'req.headers["x-dente-admin-secret"]',
          'req.headers.cookie',
          'res.headers["set-cookie"]'
        ],
        censor: "[скрыто]"
      }
    },
    // За обратным прокси (nginx) реальный IP приходит в X-Forwarded-For.
    // Без trustProxy rate-limit видит один и тот же адрес контейнера у всех
    // клиентов. Включается явно, чтобы напрямую доступный API не доверял
    // подделанному заголовку.
    trustProxy: process.env.TRUST_PROXY === "1",
    // Ограничение размера тела запроса: снимки и DICOM приходят base64.
    bodyLimit: Number(process.env.API_BODY_LIMIT_BYTES ?? 256 * 1024 * 1024)
  });

  let rawWebOrigin = process.env.WEB_ORIGIN;
  if (!rawWebOrigin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WEB_ORIGIN environment variable is required in production");
    }
    rawWebOrigin = "http://127.0.0.1:5173";
  }

  const webOrigins = rawWebOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      if (origin === "*" || origin === "null") {
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Insecure WEB_ORIGIN configured: "${origin}" is not allowed in production`);
        }
        return origin;
      }
      try {
        return new URL(origin).origin;
      } catch {
        throw new Error(`Invalid WEB_ORIGIN configured: "${origin}"`);
      }
    });

  await app.register(cors, {
    origin: webOrigins,
    // Заголовки авторизации должны явно проходить преflight-проверку.
    allowedHeaders: [
      "content-type",
      "authorization",
      "x-dente-clinic-token",
      "x-dente-staff-token",
      "x-dente-admin-secret",
      "x-organization-id",
      "x-requested-with"
    ],
    exposedHeaders: ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining"],
    maxAge: 600
  });

  // Ограничение частоты запросов для аутентификации и публичных маршрутов.
  // Раньше в routes/auth.ts стоял config.rateLimit, но плагин @fastify/rate-limit
  // не установлен — конфигурация игнорировалась, и пароль кабинета можно было
  // перебирать без ограничений.
  registerRateLimiting(app);

  app.addHook("onRequest", async (request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "0"); // Устаревший фильтр сам был источником уязвимостей; актуальная защита — CSP.
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    // Один раз разбираем токены запроса и кладём результат в request.user,
    // чтобы маршруты не парсили заголовки самостоятельно и не расходились в логике.
    getRequestIdentity(request);
  });

  /* Несуществующий адрес отвечал штатным английским текстом Fastify с методом и
     путём внутри; фильтр клиента строку без русских букв отбрасывает целиком,
     поэтому человек не получал ни причины, ни шага. Текст и причина — в
     utils/routeNotFound.ts. */
  registerRouteNotFoundHandler(app);

  app.setErrorHandler((error, request, reply) => {
    // БЫЛО: каждый обработчик ошибок синхронно дописывал стектрейс в
    // "C:/Clinic_MVP/error.log" — жёстко зашитый Windows-путь, который не
    // существует на сервере, файл рос без ограничений (уже ~1 МБ) и содержал
    // внутренние пути и данные запросов. СТАЛО: штатный логгер Fastify.
    request.log.error({ err: error, url: request.url, method: request.method }, "Необработанная ошибка запроса");
    if (isZodValidationError(error)) {
      reply.status(400).send({
        error: "ValidationError",
        message: publicValidationErrorMessage
      });
      return;
    }

    const statusCode = apiErrorStatusCode(error);
    reply.status(statusCode).send({
      error: statusCode >= 500 ? "ServerError" : "RequestError",
      message: publicApiErrorMessage(error, statusCode)
    });
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    const contentType = String(reply.getHeader("content-type") ?? "");
    const contentSecurityPolicy = contentType.includes("text/html")
      ? "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
      : "default-src 'none'; frame-ancestors 'none'";
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("Content-Security-Policy", contentSecurityPolicy);
    return payload;
  });

  app.get("/api/health", async () => ({
    ok: true,
    service: "dental-crm-api",
    time: new Date().toISOString()
  }));

  await registerAiRoutes(app);
  await registerBillingRoutes(app);
  await registerClinicalRoutes(app);
  await registerCommunicationRoutes(app);
  await registerDashboardRoutes(app);
  await registerDocumentRoutes(app);
  await registerImagingRoutes(app);
  await registerIngestionRoutes(app);
  await registerImportRoutes(app);
  // Движок переноса чужой базы: стейджинг, карантин, сверка, откат.
  await registerMigrationRoutes(app);
  // Оркестрация по фазам для больших выгрузок: заливка потоком, очередь, воркер.
  await registerMigrationRunRoutes(app);
  // Зубная формула и история зуба. Оба модуля были написаны, но ни разу не
  // зарегистрированы: Fastify отвечал «Route POST:/api/patients/:id/
  // tooth-states/batch not found», поэтому состояния зубов физически не могли
  // сохраниться, а вкладка «История зуба» не имела источника данных.
  await registerOdontogramRoutes(app);
  await registerToothHistoryRoutes(app);
  // Ни один из этих модулей раньше не регистрировался, поэтому семейный кошелёк,
  // ДМС, зуботехническая лаборатория, лист ожидания, лиды, стерилизация,
  // файлы, планирование по снимкам и каналы VK/WhatsApp/MAX отвечали 404.
  // Проверено на дубли: среди 225 объявленных путей пересечений с уже
  // работающими маршрутами нет.
  await registerFilesRoutes(app);
  await registerFamilyFinanceRoutes(app);
  await registerImagingPlanningRoutes(app);
  await registerInsuranceRoutes(app);
  await registerLabRoutes(app);
  await registerLeadsRoutes(app);
  /* registerMaxRoutes и registerWhatsappRoutes навешивают внутри себя
     app.addHook("preHandler", ...) с проверкой requireNonDoctorAccess. При
     вызове напрямую с корневым экземпляром хук попадает в корневую область и
     срабатывает на КАЖДОМ запросе всего API, а не только на своих маршрутах.

     Замерено на живом сервере, scratch/probe-doctor-403-scope.mjs: врач,
     разблокировавший смену своим PIN, получал 403 «Доктора не могут
     выполнять это действие: non-doctor mutation» на всё, включая
     /api/health, /api/dashboard, /api/patients и чтение зубной формулы. Без
     токена сотрудника те же маршруты отвечали 200. То есть стоматолог,
     войдя под собой, не мог работать в программе вообще — а зубная формула
     это его основной инструмент.

     app.register создаёт границу инкапсуляции: хук остаётся внутри своего
     модуля. Маршруты внутри объявлены абсолютными путями (/api/max/...,
     /api/whatsapp/...), поэтому префикс не нужен и адреса не меняются. */
  await app.register(registerMaxRoutes);
  await registerSterilizationRoutes(app);
  await registerVkRoutes(app);
  await registerWaitlistRoutes(app);
  await app.register(registerWhatsappRoutes);
  await registerPatientRoutes(app);
  await registerPricelistRoutes(app);
  await registerScheduleRoutes(app);
  await registerSettingsRoutes(app);
  await registerSpeechRoutes(app);
  await registerSmartImportRoutes(app);
  await registerSystemRoutes(app);
  // Живые обновления. Раньше плагин не регистрировался вовсе, поэтому
  // /api/ws/schedule отвечал 404, а все wsBroker.broadcast* были пустышками.
  await registerWebsocketRoutes(app);
  await registerTelegramRoutes(app);
  await registerTelegramWebhookRoutes(app);
  await registerVisitRoutes(app);
  await registerDicomwebRoutes(app);
  await registerXrayRoutes(app);
  await registerAuthRoutes(app);
  await registerAnalyticsRoutes(app);
  await registerAuditRoutes(app);
  await workspaceProfileRoutes(app);

  // Вторая партия ранее незарегистрированных модулей.
  //
  // Префиксы восстановлены по адресам, которые уже вызывает фронтенд:
  //   /api/inventory/:organizationId...        — apps/web/src (25 обращений)
  //   /api/portal/auth/send-otp, /me, ...      — GuestLabPortal / портал пациента
  //   /api/public/booking/:organizationId/...  — pages/PublicBookingWidget.tsx
  // diary.ts и egisz.ts объявляют абсолютные пути, префикс им не нужен.
  //
  // Дубли проверены: из 29 путей этих модулей пересекался ровно один —
  // /api/clinical/custom-examination-form-catalogs объявлялся и в egisz.ts, и в
  // clinical.ts:85. Каталог форм осмотра к ЕГИСЗ отношения не имеет, поэтому
  // удалён из egisz.ts; на дубле Fastify падал бы при старте.
  await registerDiaryRoutes(app);
  await registerEgiszRoutes(app);
  // templates.ts нашёл тест routeRegistrationCoverage: полностью готовый
  // CRUD шаблонов приёма (аналог «Шаблонов амбулаторных карт»), при этом
  // apps/web обращается к /api/templates, а маршрута не существовало.
  await registerTemplateRoutes(app);
  await app.register(inventoryRoutes, { prefix: "/api/inventory" });
  await app.register(portalRoutes, { prefix: "/api/portal" });
  await app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" });
  await app.register(telephonyRoutes, { prefix: "/api/telephony" });

  // Сообщения пациентам: справочник шаблонов, очередь отправки, согласия,
  // настройки рассылки и состояние шлюзов. Прежний routes/communications.ts
  // состоял из одного обработчика «закрыть задачу связи»; отправлять было
  // нечем и посмотреть, почему сообщение не ушло, было негде.
  await registerCommunicationOutboxRoutes(app);

  // Отчёты руководителю. Единственным отчётом был /api/analytics/dashboard:
  // ни динамики выручки, ни доли неявок, ни дебиторки, ни того, что продаётся,
  // владелец клиники увидеть не мог, хотя данные для всего этого в базе есть.
  await registerReportRoutes(app);

  // Квитанции о доставке от провайдеров. Статус sent означает «шлюз принял», а
  // не «пациент получил»: SMS на выключенный телефон шлюз принимает и берёт за
  // неё деньги. Вызывается извне, поэтому защищён секретом обратного вызова.
  await registerCommunicationReceiptRoutes(app);

  // Подтверждение и отмена приёма пациентом по ссылке из напоминания. Без
  // авторизации — право несёт подписанный токен, а не идентификатор в адресе.
  await registerPublicAppointmentActionRoutes(app);

  // Утренний обзвон: кто подтвердил, до кого напоминание не дошло и кому
  // поэтому надо звонить. Без этого экрана подтверждение по ссылке не даёт
  // экономии — администратор всё равно обзванивает всех подряд.
  await registerDayConfirmationRoutes(app);

  // Разбор дублей пациентов. Виджет PatientDuplicateMergeQueuesWidget читает
  // /api/crm/patient-duplicate-merge-queues — такого маршрута не существует
  // (проверено запросом, 404), а искать дубли в проекте было нечем.
  await registerPatientDuplicateRoutes(app);

  // Возврат пациентов. Экран «потерянные пациенты» читал таблицу
  // lost_patients_filters, в которую никто ничего не пишет: список был снимком,
  // сделанным неизвестно когда. Здесь он считается по текущим данным.
  await registerPatientRecallRoutes(app);

  // Кому предложить окно после отмены. Лист ожидания заполнялся и читался, но с
  // отменами связан не был вовсе: приём отменяли, окно пропадало, а люди в
  // очереди ждали звонка, которого никто не делал.
  await registerWaitlistMatchRoutes(app);

  if (options.startTelegramWorker !== false) {
    const telegramOutboxDueWorker = startDenteTelegramOutboxDueWorker({ logger: app.log });
    app.addHook("onClose", async () => {
      telegramOutboxDueWorker.stop();
    });
  }

  // Разбор очереди исходящих сообщений. Прежний services/notificationWorker.ts
  // объявлял setInterval и ниоткуда не вызывался — очередь не разбиралась.
  // Включается DENTE_COMMUNICATION_WORKER_ENABLED=1.
  if (options.startCommunicationWorker !== false) {
    const communicationWorker = startCommunicationDispatchWorker({ logger: app.log });
    if (communicationWorker.enabled) {
      app.addHook("onClose", async () => {
        communicationWorker.stop();
      });
    }
  }

  /**
   * Фоновое выполнение переноса чужой базы.
   *
   * Без него прогон, поставленный в очередь маршрутом /execute, никто не возьмёт,
   * и оператор будет бесконечно видеть статус «в очереди». На старте воркер
   * подбирает прогоны, брошенные предыдущим экземпляром процесса, и продолжает
   * их с оставшихся строк стейджинга.
   */
  if (options.startMigrationWorker !== false) {
    await startMigrationWorker();
    app.addHook("onClose", async () => {
      stopMigrationWorker();
    });
  }

  return app;
}

export async function startDenteApiServer() {
  await setupProxyAndTunnels().catch(err => {
    console.error("[Proxy Boot] Failed to run proxy/tunnel diagnostics:", err);
  });
  const app = await createDenteApiApp();
  const host = process.env.API_HOST ?? "127.0.0.1";
  const port = Number(process.env.API_PORT ?? 4100);

  try {
    await app.listen({ host, port });

    const gracefulShutdown = async (signal: string) => {
      app.log.info(`[Shutdown] Received ${signal}, closing HTTP server and draining database pool...`);
      try {
        stopBackupDaemon();
        await app.close();
        const { pool } = await import("./db/client.js");
        if (pool) await pool.end();
        app.log.info("[Shutdown] Dente API server closed cleanly.");
        process.exit(0);
      } catch (err) {
        app.log.error(err, "[Shutdown] Error during server shutdown:");
        process.exit(1);
      }
    };

    // Резервное копирование базы. БЫЛО: модуль существовал, но startBackupDaemon
    // не вызывался НИ ОТКУДА — копий не создавалось вообще, при том что в логах
    // и в интерфейсе всё выглядело так, будто они делаются.
    startBackupDaemon();

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startDenteApiServer();
}

// trigger restart
