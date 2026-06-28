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
import { registerPatientRoutes } from "./routes/patients.js";
import { registerPricelistRoutes } from "./routes/pricelist.js";
import { registerScheduleRoutes } from "./routes/schedule.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerSpeechRoutes } from "./routes/speech.js";
import { registerSmartImportRoutes } from "./routes/smartImports.js";
import { registerSystemRoutes } from "./routes/system.js";
import { registerTelegramRoutes, registerTelegramWebhookRoutes, startDenteTelegramOutboxDueWorker } from "./routes/telegram.js";
import { registerVisitRoutes } from "./routes/visits.js";
import { loadAdditionalServerEnv } from "./env/loadServerEnv.js";
import { repairMojibakeText } from "./text/repairMojibake.js";

loadAdditionalServerEnv();

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

export async function createDenteApiApp(options: { startTelegramWorker?: boolean } = {}) {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug"
    }
  });

  const webOrigins = (process.env.WEB_ORIGIN ?? "http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      if (origin === "*" || origin === "null") return origin;
      try {
        return new URL(origin).origin;
      } catch {
        throw new Error(`Invalid WEB_ORIGIN configured: "${origin}"`);
      }
    });

  await app.register(cors, {
    origin: webOrigins
  });

  app.setErrorHandler((error, _request, reply) => {
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
  await registerPatientRoutes(app);
  await registerPricelistRoutes(app);
  await registerScheduleRoutes(app);
  await registerSettingsRoutes(app);
  await registerSpeechRoutes(app);
  await registerSmartImportRoutes(app);
  await registerSystemRoutes(app);
  await registerTelegramRoutes(app);
  await registerTelegramWebhookRoutes(app);
  await registerVisitRoutes(app);

  if (options.startTelegramWorker !== false) {
    const telegramOutboxDueWorker = startDenteTelegramOutboxDueWorker({ logger: app.log });
    app.addHook("onClose", async () => {
      telegramOutboxDueWorker.stop();
    });
  }

  return app;
}

export async function startDenteApiServer() {
  const app = await createDenteApiApp();
  const host = process.env.API_HOST ?? "127.0.0.1";
  const port = Number(process.env.API_PORT ?? 4100);

  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startDenteApiServer();
}
