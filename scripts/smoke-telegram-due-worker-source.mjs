import { readFileSync } from "node:fs";

const telegramSource = readFileSync("apps/api/src/routes/telegram.ts", "utf8");
const serverSource = readFileSync("apps/api/src/server.ts", "utf8");
const sampleSource = readFileSync("apps/api/src/sampleData.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requiredTelegramSnippets = [
  "export async function executeDenteTelegramOutboxDueBatch",
  "export function startDenteTelegramOutboxDueWorker",
  "DENTE_TELEGRAM_OUTBOX_WORKER_ENABLED",
  "DENTE_TELEGRAM_OUTBOX_WORKER_INTERVAL_MS",
  "DENTE_TELEGRAM_OUTBOX_WORKER_BATCH_LIMIT",
  "DENTE_TELEGRAM_OUTBOX_WORKER_DRY_RUN",
  "DENTE_TELEGRAM_OUTBOX_WORKER_RUN_ON_START",
  "setTimeout",
  "retryAfterSeconds",
  "executeDenteTelegramOutboxDueBatch(input, runtimeResult.runtime)",
  "clientMutationId?.startsWith(\"due-\")"
];

for (const snippet of requiredTelegramSnippets) {
  assert(telegramSource.includes(snippet), `telegram worker source missing: ${snippet}`);
}

assert(!telegramSource.includes("setInterval"), "due worker must use recursive setTimeout, not setInterval");
assert(
  sampleSource.includes('existing?.status === "failed" && clientMutationId.startsWith("due-")'),
  "failed due-send receipts must not become permanent idempotent replays"
);
assert(
  serverSource.includes("startDenteTelegramOutboxDueWorker") && serverSource.includes('app.addHook("onClose"'),
  "API server must start and stop the Telegram due worker"
);

const sendDueRouteStart = telegramSource.indexOf("\"/api/telegram/outbox/send-due\"");
const nextRouteStart = sendDueRouteStart >= 0 ? telegramSource.indexOf("\n  app.post", sendDueRouteStart + 1) : -1;
const routeBlock =
  sendDueRouteStart >= 0
    ? telegramSource.slice(sendDueRouteStart, nextRouteStart >= 0 ? nextRouteStart : undefined)
    : "";
assert(
  routeBlock.includes("executeDenteTelegramOutboxDueBatch(input, runtimeResult.runtime)"),
  "manual send-due route must reuse worker batch service in the resolved bot runtime scope"
);
assert(!routeBlock.includes("for (const item of dueItems)"), "manual send-due route must not duplicate worker batch loop");

console.log(JSON.stringify({ ok: true, checked: "telegram due worker source" }, null, 2));
