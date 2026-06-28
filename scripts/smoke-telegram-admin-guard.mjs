import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_TELEGRAM_ADMIN_SECRET = "synthetic-admin-secret";
process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = "synthetic-webhook-secret";

const routePath = path.resolve("apps/api/dist/routes/telegram.js");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerTelegramRoutes, registerTelegramWebhookRoutes } = await import(pathToFileURL(routePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });
await registerTelegramRoutes(app);
if (typeof registerTelegramWebhookRoutes === "function") {
  await registerTelegramWebhookRoutes(app);
}

const missingSecretResponse = await app.inject({
  method: "GET",
  url: "/api/telegram/status"
});
assert(missingSecretResponse.statusCode === 403, `missing admin secret must block status: ${missingSecretResponse.statusCode}`);

const wrongSecretResponse = await app.inject({
  method: "GET",
  url: "/api/telegram/status",
  headers: { "x-dente-admin-secret": "wrong-secret" }
});
assert(wrongSecretResponse.statusCode === 403, `wrong admin secret must block status: ${wrongSecretResponse.statusCode}`);

const allowedResponse = await app.inject({
  method: "GET",
  url: "/api/telegram/status",
  headers: { "x-dente-admin-secret": process.env.DENTE_TELEGRAM_ADMIN_SECRET }
});
assert(allowedResponse.statusCode === 200, `valid admin secret must allow status: ${allowedResponse.statusCode}`);

const webhookResponse = await app.inject({
  method: "POST",
  url: "/api/telegram/webhook",
  headers: { "x-telegram-bot-api-secret-token": process.env.DENTE_TELEGRAM_WEBHOOK_SECRET },
  payload: {
    update_id: 99001,
    message: {
      chat: { id: 777000111, type: "private" },
      text: "/start"
    }
  }
});
assert(webhookResponse.statusCode === 200, `webhook must not require DENTE admin secret: ${webhookResponse.statusCode}`);
assert(webhookResponse.json().action === "queued_safe_triage", "webhook action mismatch");

await app.close();

delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;
delete process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE;

const missingEnvApp = Fastify({ logger: false });
await registerTelegramRoutes(missingEnvApp);
const missingEnvResponse = await missingEnvApp.inject({
  method: "GET",
  url: "/api/telegram/status"
});
assert(missingEnvResponse.statusCode === 503, `missing admin env must block status: ${missingEnvResponse.statusCode}`);
await missingEnvApp.close();

process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";
const explicitDevApp = Fastify({ logger: false });
await registerTelegramRoutes(explicitDevApp);
const explicitDevResponse = await explicitDevApp.inject({
  method: "GET",
  url: "/api/telegram/status"
});
assert(explicitDevResponse.statusCode === 200, `explicit local unguarded flag must allow status: ${explicitDevResponse.statusCode}`);
await explicitDevApp.close();

console.log(JSON.stringify({ ok: true, controlPlaneGuard: true, webhookExempt: true, explicitLocalEscapeHatch: true }));
