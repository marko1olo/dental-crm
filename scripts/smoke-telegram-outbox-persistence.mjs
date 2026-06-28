import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-telegram-outbox-persist-"));
const stateFilePath = path.join(tempRoot, "state.json");
const backupDirectoryPath = path.join(tempRoot, "backups");

process.env.DENTAL_STATE_FILE = stateFilePath;
process.env.DENTAL_STATE_BACKUP_DIR = backupDirectoryPath;
process.env.DENTAL_STATE_BACKUPS = "2";
delete process.env.DENTAL_STATE_PERSISTENCE;
process.env.DENTE_TELEGRAM_BOT_TOKEN = "123456:synthetic-dente-token";
process.env.DENTE_TELEGRAM_BOT_USERNAME = "dentecrm_bot";
process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = "synthetic-webhook-secret";
process.env.DENTE_TELEGRAM_LINK_CODE_SALT = "synthetic-link-code-salt";
process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY = "synthetic-chat-encryption-key-for-smoke";
process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";

const routePath = path.resolve("apps/api/dist/routes/telegram.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const clinicId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerTelegramRoutes, registerTelegramWebhookRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function telegramFetchStub(calls) {
  return async (url, init = {}) => {
    calls.push({ href: String(url), body: JSON.parse(String(init.body ?? "{}")) });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 76001 } })
    };
  };
}

try {
  const app = Fastify({ logger: false });
  await registerTelegramRoutes(app);
  await registerTelegramWebhookRoutes(app);
  const telegramFetchCalls = [];
  globalThis.fetch = telegramFetchStub(telegramFetchCalls);

  const settingsResponse = await app.inject({
    method: "PUT",
    url: "/api/settings/telegram",
    payload: {
      patientPortalBaseUrl: "https://portal.dente.example/p",
      clinicReviewUrl: "https://reviews.dente.example/rate",
      clinicMapsUrl: "https://maps.dente.example/clinic"
    }
  });
  assert(settingsResponse.statusCode === 200, `telegram settings save failed: ${settingsResponse.statusCode} ${settingsResponse.body}`);

  const linkCodeResponse = await app.inject({
    method: "POST",
    url: "/api/telegram/link-codes",
    payload: {
      subjectType: "patient",
      subjectId: marinaPatientId,
      clinicId,
      ttlMinutes: 15,
      createdByUserId: doctorUserId
    }
  });
  assert(linkCodeResponse.statusCode === 200, `link code create failed: ${linkCodeResponse.statusCode} ${linkCodeResponse.body}`);
  const linkCode = linkCodeResponse.json();
  assert(linkCode.clinicId === clinicId, "persistent link code must keep clinic scope");

  const webhookResponse = await app.inject({
    method: "POST",
    url: "/api/telegram/webhook",
    headers: {
      "x-telegram-bot-api-secret-token": process.env.DENTE_TELEGRAM_WEBHOOK_SECRET
    },
    payload: {
      update_id: 97001,
      message: {
        chat: { id: 777000111, type: "private" },
        text: `/start ${linkCode.code}`
      }
    }
  });
  assert(webhookResponse.statusCode === 200, `link webhook failed: ${webhookResponse.statusCode} ${webhookResponse.body}`);
  assert(webhookResponse.json().action === "linked_patient_telegram_chat", "link webhook did not bind patient chat");
  telegramFetchCalls.length = 0;
  activeVisit.status = "signed";
  activeVisit.updatedAt = new Date().toISOString();

  const outboxResponse = await app.inject({ method: "GET", url: "/api/telegram/outbox" });
  assert(outboxResponse.statusCode === 200, `outbox failed: ${outboxResponse.statusCode} ${outboxResponse.body}`);
  const outbox = outboxResponse.json();
  const readyItem = outbox.items.find((item) => item.deliveryStatus === "ready");
  assert(readyItem, "outbox must expose at least one ready item after patient chat link");

  const mutationId = "smoke-persistent-outbox-send";
  const sendResponse = await app.inject({
    method: "POST",
    url: `/api/telegram/outbox/${encodeURIComponent(readyItem.id)}/send`,
    payload: {
      dryRun: false,
      clientMutationId: mutationId
    }
  });
  assert(sendResponse.statusCode === 200, `outbox send failed: ${sendResponse.statusCode} ${sendResponse.body}`);
  const sent = sendResponse.json();
  assert(sent.status === "sent", "outbox send status mismatch");
  assert(sent.outboxItem?.replyMarkup, "sent outbox response must preserve operator-visible inline buttons");
  assert(telegramFetchCalls.length === 1, "first send must call Telegram exactly once");
  await app.close();

  const persisted = JSON.parse(readFileSync(stateFilePath, "utf8"));
  const receipts = persisted.state.denteTelegramOutboxDeliveryReceipts ?? [];
  assert(receipts.length === 1, "outbox delivery receipt must be persisted");
  assert(receipts[0].outboxItemId === readyItem.id, "persisted receipt item id mismatch");
  assert(receipts[0].clientMutationId === mutationId, "persisted receipt mutation id mismatch");
  assert(!JSON.stringify(persisted).includes(process.env.DENTE_TELEGRAM_BOT_TOKEN), "persistent state must not store Telegram bot token");

  const replayCode = `
    import { createRequire } from "node:module";
    import path from "node:path";
    import { pathToFileURL } from "node:url";
    const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
    const Fastify = requireFromApi("fastify");
    const { registerTelegramRoutes } = await import(pathToFileURL(path.resolve("apps/api/dist/routes/telegram.js")).href);
    const app = Fastify({ logger: false });
    await registerTelegramRoutes(app);
    let telegramFetchCount = 0;
    globalThis.fetch = async () => {
      telegramFetchCount += 1;
      throw new Error("Telegram transport must not be called for persisted idempotent replay");
    };
    const response = await app.inject({
      method: "POST",
      url: ${JSON.stringify(`/api/telegram/outbox/${encodeURIComponent(readyItem.id)}/send`)},
      payload: {
        dryRun: false,
        clientMutationId: ${JSON.stringify(mutationId)}
      }
    });
    await app.close();
    console.log(JSON.stringify({ statusCode: response.statusCode, body: response.json(), telegramFetchCount }));
  `;
  const childOutput = execFileSync(process.execPath, ["--input-type=module", "-e", replayCode], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DENTAL_STATE_FILE: stateFilePath,
      DENTAL_STATE_BACKUP_DIR: backupDirectoryPath,
      DENTAL_STATE_BACKUPS: "2",
      DENTAL_STATE_PERSISTENCE: "",
      DENTE_TELEGRAM_BOT_TOKEN: process.env.DENTE_TELEGRAM_BOT_TOKEN,
      DENTE_TELEGRAM_BOT_USERNAME: process.env.DENTE_TELEGRAM_BOT_USERNAME,
      DENTE_TELEGRAM_WEBHOOK_SECRET: process.env.DENTE_TELEGRAM_WEBHOOK_SECRET,
      DENTE_TELEGRAM_LINK_CODE_SALT: process.env.DENTE_TELEGRAM_LINK_CODE_SALT,
      DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY: process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY
    },
    encoding: "utf8"
  });
  const replay = JSON.parse(childOutput);
  assert(replay.statusCode === 200, `persisted replay failed: ${replay.statusCode} ${JSON.stringify(replay.body)}`);
  assert(replay.body.status === "sent", "persisted replay must return original sent receipt");
  assert(replay.telegramFetchCount === 0, "persisted idempotent replay must not call Telegram again");

  console.log(
    JSON.stringify({
      ok: true,
      persistedReceiptCount: receipts.length,
      replayStatus: replay.body.status,
      telegramFetchCount: replay.telegramFetchCount
    })
  );
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
