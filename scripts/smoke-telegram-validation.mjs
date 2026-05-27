import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_TELEGRAM_ADMIN_SECRET = "synthetic-admin-secret";
process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = "synthetic-webhook-secret";

const routePath = path.resolve("apps/api/dist/routes/telegram.js");
const routeSourcePath = path.resolve("apps/api/src/routes/telegram.ts");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerTelegramRoutes } = await import(pathToFileURL(routePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoSecretLeak(response, label) {
  const body = response.body;
  assert(!body.includes(process.env.DENTE_TELEGRAM_ADMIN_SECRET), `${label} leaked admin secret`);
  assert(!body.includes(process.env.DENTE_TELEGRAM_WEBHOOK_SECRET), `${label} leaked webhook secret`);
}

function hasMojibakeMarker(value) {
  return /[ÃÂÐÑ�]/.test(String(value));
}

function assertNoMojibake(value, label) {
  assert(!hasMojibakeMarker(value), `${label} contains mojibake markers: ${String(value).slice(0, 220)}`);
}

async function assertBadRequest(app, request, expectedError, label) {
  const response = await app.inject(request);
  assert(response.statusCode === 400, `${label} must return 400, got ${response.statusCode}: ${response.body}`);
  const body = response.json();
  assert(body.error === expectedError, `${label} error mismatch: ${body.error}`);
  assert(typeof body.message === "string" && body.message.includes("Некорректный запрос Telegram"), `${label} message must be Russian`);
  assertNoMojibake(response.body, `${label} response`);
  assertNoSecretLeak(response, label);
}

const routeSource = readFileSync(routeSourcePath, "utf8");
assert(routeSource.includes("DENTE: безопасный ответ отправлен."), "callback fallback answer must be readable Russian");
assertNoMojibake(routeSource.match(/DENTE: .{0,80}/)?.[0] ?? "", "callback fallback source");

const app = Fastify({ logger: false });
await registerTelegramRoutes(app);

const adminHeaders = { "x-dente-admin-secret": process.env.DENTE_TELEGRAM_ADMIN_SECRET };
const webhookHeaders = { "x-telegram-bot-api-secret-token": process.env.DENTE_TELEGRAM_WEBHOOK_SECRET };

await assertBadRequest(
  app,
  {
    method: "POST",
    url: "/api/telegram/webhook",
    headers: webhookHeaders,
    payload: {
      message: {
        chat: { id: 777000111, type: "private" },
        text: "/start"
      }
    }
  },
  "TelegramWebhookValidationFailed",
  "malformed webhook"
);

await assertBadRequest(
  app,
  {
    method: "POST",
    url: "/api/telegram/outbox/dente-task-any/send",
    headers: adminHeaders,
    payload: { dryRun: "yes" }
  },
  "TelegramValidationFailed",
  "malformed outbox send"
);

await assertBadRequest(
  app,
  {
    method: "POST",
    url: "/api/telegram/outbox/send-due",
    headers: adminHeaders,
    payload: { limit: 0 }
  },
  "TelegramOutboxDueValidationFailed",
  "malformed due outbox send"
);

await assertBadRequest(
  app,
  {
    method: "POST",
    url: "/api/telegram/link-codes",
    headers: adminHeaders,
    payload: { subjectType: "patient", subjectId: "not-a-uuid" }
  },
  "TelegramValidationFailed",
  "malformed link code"
);

await assertBadRequest(
  app,
  {
    method: "POST",
    url: "/api/telegram/messages/preview",
    headers: adminHeaders,
    payload: { templateKind: "unknown_template" }
  },
  "TelegramValidationFailed",
  "malformed message preview"
);

await app.close();

delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;
delete process.env.DENTE_TELEGRAM_WEBHOOK_SECRET;

console.log(JSON.stringify({ ok: true, telegramValidation: "malformed payloads return controlled Russian 400 responses" }, null, 2));
