import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-communication-outcome-secret";

const routePath = path.resolve("apps/api/dist/routes/communications.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const outcomes = ["no_answer", "callback_requested", "reschedule_requested", "promised_payment", "document_pickup"];
const outcomeLabels = {
  no_answer: "нет ответа",
  callback_requested: "нужен обратный звонок",
  reschedule_requested: "нужен перенос записи",
  promised_payment: "пациент обещал оплату",
  document_pickup: "документы готовы к выдаче/получению"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sharedSource = readFileSync("packages/shared/src/index.ts", "utf8");
const routeSource = readFileSync("apps/api/src/routes/communications.ts", "utf8");
const sampleSource = readFileSync("apps/api/src/sampleData.ts", "utf8");
const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const communicationsSource = readFileSync("apps/web/src/CommunicationsView.tsx", "utf8");

for (const outcome of outcomes) {
  assert(sharedSource.includes(`"${outcome}"`), `shared contract missing communication outcome: ${outcome}`);
  assert(communicationsSource.includes(outcome), `CommunicationsView missing outcome option: ${outcome}`);
}
assert(sharedSource.includes("communicationTaskOutcomeSchema"), "shared contract must export communicationTaskOutcomeSchema");
assert(sharedSource.includes("lastOutcome: communicationTaskOutcomeSchema.nullable().optional()"), "communication tasks must carry optional lastOutcome");
assert(sharedSource.includes("outcome: communicationTaskOutcomeSchema.optional()"), "completeCommunicationTaskSchema must accept optional typed outcome");
assert(routeSource.includes("корректный исход действия"), "communication route validation copy must mention outcome validation");
assert(sampleSource.includes("communicationTaskOutcomeLabels"), "sample data completion must map outcomes to event copy");
assert(sampleSource.includes("task.lastOutcome = input.outcome ?? null"), "sample data completion must persist the selected outcome");
assert(appSource.includes("outcome,"), "App completion payload must send outcome");
assert(communicationsSource.includes("disabled={communicationSaveInProgress || !selectedOutcome}"), "web close button must require an outcome");

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerCommunicationRoutes } = await import(pathToFileURL(routePath).href);
const { communicationEvents, communicationTasks } = await import(pathToFileURL(sampleDataPath).href);

const app = Fastify({ logger: false });
await registerCommunicationRoutes(app);

const headers = { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET };
const fixtureTask = communicationTasks.find((task) => task.status !== "completed");
assert(fixtureTask, "fixture open communication task missing");

function makeTask(outcome) {
  const now = new Date().toISOString();
  return {
    ...fixtureTask,
    id: randomUUID(),
    status: "queued",
    priority: "normal",
    title: `Synthetic communication outcome ${outcome}`,
    body: `Synthetic task for ${outcome}`,
    workflowCode: null,
    lastOutcome: null,
    lastEventAt: null,
    dueAt: now,
    createdAt: now
  };
}

for (const outcome of outcomes) {
  const task = makeTask(outcome);
  communicationTasks.unshift(task);
  const eventCountBefore = communicationEvents.length;
  const response = await app.inject({
    method: "POST",
    url: "/api/communications/tasks/complete",
    headers,
    payload: {
      taskId: task.id,
      outcome,
      note: `Synthetic note for ${outcome}`
    }
  });
  assert(response.statusCode === 200, `${outcome} completion failed: ${response.statusCode} ${response.body}`);
  const completedTask = response.json();
  assert(completedTask.status === "completed", `${outcome} task must be completed`);
  assert(completedTask.lastOutcome === outcome, `${outcome} task must return selected lastOutcome`);
  assert(communicationEvents.length === eventCountBefore + 1, `${outcome} must create one communication event`);
  assert(communicationEvents[0].taskId === task.id, `${outcome} event must point to completed task`);
  assert(communicationEvents[0].message.includes(outcomeLabels[outcome]), `${outcome} event must include readable outcome context`);

  const duplicateResponse = await app.inject({
    method: "POST",
    url: "/api/communications/tasks/complete",
    headers,
    payload: {
      taskId: task.id,
      outcome: "no_answer",
      note: "Duplicate click"
    }
  });
  assert(duplicateResponse.statusCode === 200, `${outcome} duplicate completion must stay idempotent`);
  assert(communicationEvents.length === eventCountBefore + 1, `${outcome} duplicate completion must not create another event`);
  assert(duplicateResponse.json().lastOutcome === outcome, `${outcome} duplicate completion must not overwrite first outcome`);
}

const invalidOutcomeResponse = await app.inject({
  method: "POST",
  url: "/api/communications/tasks/complete",
  headers,
  payload: {
    taskId: randomUUID(),
    outcome: "generic_done",
    note: "Invalid synthetic outcome"
  }
});
assert(invalidOutcomeResponse.statusCode === 400, `invalid outcome must return 400, got ${invalidOutcomeResponse.statusCode}`);
assert(
  !/issues|path|invalid_type|invalid_enum|generic_done/i.test(invalidOutcomeResponse.body),
  `invalid outcome leaked schema internals: ${invalidOutcomeResponse.body}`
);

const legacyTask = makeTask("legacy");
communicationTasks.unshift(legacyTask);
const legacyResponse = await app.inject({
  method: "POST",
  url: "/api/communications/tasks/complete",
  headers,
  payload: {
    taskId: legacyTask.id,
    note: "Legacy client without typed outcome"
  }
});
assert(legacyResponse.statusCode === 200, `legacy completion without outcome must stay compatible: ${legacyResponse.statusCode}`);
assert(legacyResponse.json().lastOutcome === null, "legacy completion must return null lastOutcome");

console.log(
  JSON.stringify({
    ok: true,
    checked: "communication task outcomes",
    outcomes
  })
);
