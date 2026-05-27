import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
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
import { registerTelegramRoutes, startDenteTelegramOutboxDueWorker } from "./routes/telegram.js";
import { registerVisitRoutes } from "./routes/visits.js";
import { loadAdditionalServerEnv } from "./env/loadServerEnv.js";
import { getPersistentStateMeta } from "./persistentState.js";

loadAdditionalServerEnv();

type ZodIssueLike = {
  path?: Array<string | number>;
  code?: string;
  message?: string;
};

function isZodValidationError(error: unknown): error is { issues: ZodIssueLike[] } {
  if (error instanceof ZodError) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { issues?: unknown; name?: unknown };
  return candidate.name === "ZodError" && Array.isArray(candidate.issues);
}

function localizeZodIssueMessage(issue: ZodIssueLike): string {
  const message = issue.message ?? "";
  if (!message || message === "Invalid input") return "Некорректное значение";
  if (/required/i.test(message)) return "Обязательное поле не заполнено";
  if (/must be later/i.test(message)) return "Окончание должно быть позже начала";
  if (/valid date-time/i.test(message)) return "Нужна корректная дата и время";
  if (/invalid/i.test(message)) return "Некорректное значение";
  if (/expected/i.test(message)) return "Значение не соответствует ожидаемому типу";
  return message;
}

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug"
  }
});

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? "http://127.0.0.1:5173"
});

app.setErrorHandler((error, _request, reply) => {
  if (isZodValidationError(error)) {
    reply.status(400).send({
      error: "ValidationError",
      message: "Тело запроса не соответствует контракту API.",
      issues: error.issues.map((issue) => ({
        path: (issue.path ?? []).join("."),
        code: issue.code ?? "invalid_payload",
        message: localizeZodIssueMessage(issue)
      }))
    });
    return;
  }

  reply.send(error);
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

function publicPersistentStateMeta() {
  const meta = getPersistentStateMeta();
  return {
    enabled: meta.enabled,
    exists: meta.exists,
    version: meta.version,
    savedAt: meta.savedAt,
    backupCount: meta.backupCount,
    latestBackupAt: meta.latestBackupAt,
    latestBackupSizeBytes: meta.latestBackupSizeBytes,
    maxBackupCount: meta.maxBackupCount
  };
}

app.get("/api/health", async () => ({
  ok: true,
  service: "dental-crm-api",
  time: new Date().toISOString(),
  persistence: publicPersistentStateMeta()
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
await registerVisitRoutes(app);

const telegramOutboxDueWorker = startDenteTelegramOutboxDueWorker({ logger: app.log });
app.addHook("onClose", async () => {
  telegramOutboxDueWorker.stop();
});

const host = process.env.API_HOST ?? "127.0.0.1";
const port = Number(process.env.API_PORT ?? 4100);

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
