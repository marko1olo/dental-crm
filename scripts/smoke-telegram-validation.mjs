import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_TELEGRAM_ADMIN_SECRET = "synthetic-admin-secret";
process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = "synthetic-webhook-secret";

const routePath = path.resolve("apps/api/dist/routes/telegram.js");
const routeSourcePath = path.resolve("apps/api/src/routes/telegram.ts");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerTelegramRoutes } = await import(pathToFileURL(routePath).href);
const { patients } = await import(pathToFileURL(sampleDataPath).href);

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

function assertNoTelegramDomainLeak(response, label) {
  assert(
    !/DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY|Защищенная связка Telegram-чата не настроена|одноразовые коды Telegram нельзя выпускать|Субъект привязки Telegram|Пациент для предпросмотра Telegram не найден|Запись для предпросмотра Telegram не найдена|Документ для предпросмотра Telegram не найден|Задача коммуникации для предпросмотра Telegram не найдена|request\.body|request\.params|request\.query|linkId|organizationId|botConfigId|issues|path|undefined|null/i.test(
      response.body
    ),
    `${label} leaked Telegram domain internals: ${response.body}`
  );
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
assert(
  !routeSource.includes("updateDenteTelegramBotSettingsSchema.parse(request.body)"),
  "Telegram settings route must not parse request.body directly"
);
assert(
  routeSource.includes("parseTelegramRouteBody(updateDenteTelegramBotSettingsSchema, request.body)"),
  "Telegram settings route must use the shared route-body parser"
);
[
  "return rawMessage;",
  "repairMojibakeText(linkCodeError.message)",
  "repairMojibakeText(previewError.message)"
].forEach((needle) => {
  assert(!routeSource.includes(needle), `Telegram route must not forward raw domain errors: ${needle}`);
});
assert(
  routeSource.includes("telegramLinkCodeRejection(") && routeSource.includes("telegramMessagePreviewRejection("),
  "Telegram link-code and preview failures must keep route-owned rejection helpers"
);
assert(
  routeSource.includes("telegramChatLinkNotFoundMessage"),
  "Telegram chat-link revoke must keep route-owned not-found copy"
);
assert(
  !routeSource.includes('return reply.code(404).send({ error: "TelegramChatLinkNotFound" });'),
  "Telegram chat-link revoke must not return a bare not-found code"
);

const app = Fastify({ logger: false });
await registerTelegramRoutes(app);

const adminHeaders = { "x-dente-admin-secret": process.env.DENTE_TELEGRAM_ADMIN_SECRET };
const webhookHeaders = { "x-telegram-bot-api-secret-token": process.env.DENTE_TELEGRAM_WEBHOOK_SECRET };
const activePatient = patients.find((patient) => patient.status === "active");
assert(activePatient, "fixture active patient missing");

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
    method: "PUT",
    url: "/api/settings/telegram",
    headers: adminHeaders,
    payload: {
      mode: "enabled",
      enabledFeatures: "patient_linking",
      webhookBaseUrl: 123,
      botUsername: 42
    }
  },
  "TelegramSettingsValidationFailed",
  "malformed Telegram settings"
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

const linkCodeEncryptionResponse = await app.inject({
  method: "POST",
  url: "/api/telegram/link-codes",
  headers: adminHeaders,
  payload: { subjectType: "patient", subjectId: activePatient.id }
});
assert(linkCodeEncryptionResponse.statusCode === 409, `link code encryption response status mismatch: ${linkCodeEncryptionResponse.body}`);
const linkCodeEncryptionBody = linkCodeEncryptionResponse.json();
assert(linkCodeEncryptionBody.error === "TelegramChatEncryptionKeyMissing", `link code error mismatch: ${linkCodeEncryptionResponse.body}`);
assert(linkCodeEncryptionBody.reason === "chat_encryption_missing", `link code reason mismatch: ${linkCodeEncryptionResponse.body}`);
assert(
  typeof linkCodeEncryptionBody.message === "string" && linkCodeEncryptionBody.message.includes("защищенную привязку Telegram-чата"),
  `link code message mismatch: ${linkCodeEncryptionResponse.body}`
);
assertNoMojibake(linkCodeEncryptionResponse.body, "link code encryption response");
assertNoSecretLeak(linkCodeEncryptionResponse, "link code encryption response");
assertNoTelegramDomainLeak(linkCodeEncryptionResponse, "link code encryption response");

const missingChatLinkRevokeResponse = await app.inject({
  method: "POST",
  url: "/api/telegram/chat-links/11111111-1111-4111-8111-111111111111/revoke",
  headers: adminHeaders
});
assert(
  missingChatLinkRevokeResponse.statusCode === 404,
  `missing chat link revoke status mismatch: ${missingChatLinkRevokeResponse.body}`
);
const missingChatLinkRevokeBody = missingChatLinkRevokeResponse.json();
assert(
  missingChatLinkRevokeBody.error === "TelegramChatLinkNotFound",
  `missing chat link revoke error mismatch: ${missingChatLinkRevokeResponse.body}`
);
assert(
  typeof missingChatLinkRevokeBody.message === "string" && missingChatLinkRevokeBody.message.includes("связь не найдена"),
  `missing chat link revoke message mismatch: ${missingChatLinkRevokeResponse.body}`
);
assertNoMojibake(missingChatLinkRevokeResponse.body, "missing chat link revoke response");
assertNoSecretLeak(missingChatLinkRevokeResponse, "missing chat link revoke response");
assertNoTelegramDomainLeak(missingChatLinkRevokeResponse, "missing chat link revoke response");

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

const missingPatientPreviewResponse = await app.inject({
  method: "POST",
  url: "/api/telegram/messages/preview",
  headers: adminHeaders,
  payload: { templateKind: "appointment_reminder", patientId: "11111111-1111-4111-8111-111111111111" }
});
assert(
  missingPatientPreviewResponse.statusCode === 404,
  `missing patient preview response status mismatch: ${missingPatientPreviewResponse.body}`
);
const missingPatientPreviewBody = missingPatientPreviewResponse.json();
assert(
  missingPatientPreviewBody.error === "TelegramMessagePreviewNotFound",
  `missing patient preview error mismatch: ${missingPatientPreviewResponse.body}`
);
assert(
  missingPatientPreviewBody.reason === "patient_not_found",
  `missing patient preview reason mismatch: ${missingPatientPreviewResponse.body}`
);
assert(
  typeof missingPatientPreviewBody.message === "string" && missingPatientPreviewBody.message.includes("актуального пациента"),
  `missing patient preview message mismatch: ${missingPatientPreviewResponse.body}`
);
assertNoMojibake(missingPatientPreviewResponse.body, "missing patient preview response");
assertNoSecretLeak(missingPatientPreviewResponse, "missing patient preview response");
assertNoTelegramDomainLeak(missingPatientPreviewResponse, "missing patient preview response");

await app.close();

delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;
delete process.env.DENTE_TELEGRAM_WEBHOOK_SECRET;

console.log(JSON.stringify({ ok: true, telegramValidation: "malformed payloads return controlled Russian 400 responses" }, null, 2));
