import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";

const routePath = path.resolve("apps/api/dist/routes/telegram.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerTelegramRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, buildDenteTelegramOutbox, communicationTasks } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });

try {
  await registerTelegramRoutes(app);

  const targetTaskId = randomUUID();
  for (let index = 0; index < 320; index += 1) {
    const taskId = index === 319 ? targetTaskId : randomUUID();
    const dueAt = new Date(Date.UTC(2026, 4, 1, 4, index, 0)).toISOString();
    communicationTasks.push({
      id: taskId,
      organizationId: activeVisit.organizationId,
      patientId: activeVisit.patientId,
      appointmentId: null,
      visitId: null,
      documentId: null,
      assignedRole: "administrator",
      channel: "telegram",
      intent: "general",
      status: "needs_call",
      priority: "normal",
      dueAt,
      title: `Synthetic outbox lookup ${index}`,
      body: "Synthetic no-PHI Telegram outbox lookup item.",
      workflowCode: "telegram_contact_request",
      lastEventAt: dueAt,
      createdAt: dueAt
    });
  }

  const outboxItemId = `task:${targetTaskId}`;
  const firstPage = buildDenteTelegramOutbox({ limit: 300 });
  assert(!firstPage.items.some((item) => item.id === outboxItemId), "target item must be outside the first 300 outbox rows");
  assert(firstPage.totalCount >= 320, "outbox fixture must contain more than 300 rows");

  const sendResponse = await app.inject({
    method: "POST",
    url: `/api/telegram/outbox/${encodeURIComponent(outboxItemId)}/send`,
    payload: { dryRun: true }
  });
  assert(sendResponse.statusCode !== 404, `direct send lookup must not be capped to first 300 rows: ${sendResponse.statusCode}`);
  const body = sendResponse.json();
  assert(body.outboxItem?.id === outboxItemId, `direct send response must include the target outbox item: ${sendResponse.statusCode} ${sendResponse.body}`);
  assert(
    body.blockedReason !== "telegram_outbox_item_not_found_or_no_longer_open",
    "direct send must not report item-not-found for a paginated outbox row"
  );

  console.log(JSON.stringify({ ok: true, firstPageLimit: firstPage.limit, totalCount: firstPage.totalCount, lookupStatus: sendResponse.statusCode }));
} finally {
  await app.close();
}
