import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-communication-secret";

const routePath = path.resolve("apps/api/dist/routes/communications.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerCommunicationRoutes } = await import(pathToFileURL(routePath).href);
const { communicationEvents, communicationTasks } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const routeSource = readFileSync("apps/api/src/routes/communications.ts", "utf8");
assert(!routeSource.includes("message: error.message"), "communication route must not forward raw domain error.message");
assert(
  !routeSource.includes('.send({ error: "CommunicationTaskNotFound", message: error.message })'),
  "communication route must not expose raw not-found domain text"
);
assert(routeSource.includes("communicationTaskNotFoundMessage"), "communication route must keep route-owned not-found copy");
assert(routeSource.includes("communicationTaskValidationMessage"), "communication route must keep route-owned validation copy");
assert(routeSource.includes("корректный исход действия"), "communication route validation copy must mention a valid task outcome");

const app = Fastify({ logger: false });
await registerCommunicationRoutes(app);

const headers = { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET };
const openTask = communicationTasks.find((task) => task.status !== "completed");
assert(openTask, "fixture open communication task missing");

const invalidNoteResponse = await app.inject({
  method: "POST",
  url: "/api/communications/tasks/complete",
  headers,
  payload: {
    taskId: openTask.id,
    note: "x".repeat(1001)
  }
});
assert(invalidNoteResponse.statusCode === 400, `long communication note must return 400, got ${invalidNoteResponse.statusCode}`);

const missingTaskResponse = await app.inject({
  method: "POST",
  url: "/api/communications/tasks/complete",
  headers,
  payload: {
    taskId: "11111111-1111-4111-8111-111111111111",
    note: "stale UI action"
  }
});
assert(missingTaskResponse.statusCode === 404, `unknown communication task must return 404, got ${missingTaskResponse.statusCode}`);
const missingTaskPayload = missingTaskResponse.json();
assert(missingTaskPayload.error === "CommunicationTaskNotFound", `unknown task must return stable error: ${missingTaskResponse.body}`);
assert(missingTaskPayload.reason === "task_not_found", `unknown task must return stable reason: ${missingTaskResponse.body}`);
assert(
  missingTaskPayload.message === "Задача связи не закрыта: задача не найдена или уже недоступна.",
  `unknown task must return bounded message: ${missingTaskResponse.body}`
);
assert(
  !/Задача коммуникации не найдена|taskId|issues|path|request\.body|undefined|null/i.test(missingTaskResponse.body),
  `unknown task leaked raw route/domain detail: ${missingTaskResponse.body}`
);

const eventCountBefore = communicationEvents.length;
const completeResponse = await app.inject({
  method: "POST",
  url: "/api/communications/tasks/complete",
  headers,
  payload: {
    taskId: openTask.id,
    outcome: "promised_payment",
    note: "Доктор подтвердил закрытие задачи связи."
  }
});
assert(completeResponse.statusCode === 200, `communication task complete failed: ${completeResponse.statusCode}`);
assert(completeResponse.json().status === "completed", "communication task status must be completed");
assert(completeResponse.json().lastOutcome === "promised_payment", "communication task completion must persist selected outcome");
assert(communicationEvents.length === eventCountBefore + 1, "first completion must create exactly one communication event");
assert(communicationEvents[0].message.includes("Исход:"), "communication event must include selected outcome context");

const duplicateResponse = await app.inject({
  method: "POST",
  url: "/api/communications/tasks/complete",
  headers,
  payload: {
    taskId: openTask.id,
    outcome: "no_answer",
    note: "Повторный клик не должен плодить журнал."
  }
});
assert(duplicateResponse.statusCode === 200, `duplicate communication complete should be idempotent: ${duplicateResponse.statusCode}`);
assert(communicationEvents.length === eventCountBefore + 1, "duplicate completion must not create another communication event");

console.log(
  JSON.stringify({
    ok: true,
    checked: "communication task complete contract",
    communicationEventCount: communicationEvents.length
  })
);
