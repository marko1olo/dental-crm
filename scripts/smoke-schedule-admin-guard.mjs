import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_SCHEDULE_ADMIN_SECRET = "synthetic-schedule-secret";

const routePath = path.resolve("apps/api/dist/routes/schedule.js");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerScheduleRoutes } = await import(pathToFileURL(routePath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = Fastify({ logger: false });
await registerScheduleRoutes(app);

const request = {
  method: "PATCH",
  url: "/api/appointments/59d16574-5f6e-4cc7-9f49-2da2f126e11d",
  payload: { reason: "Schedule admin guard smoke" }
};

const missingSecretResponse = await app.inject(request);
assert(missingSecretResponse.statusCode === 403, `missing schedule secret must block mutation: ${missingSecretResponse.statusCode}`);
assert(missingSecretResponse.json().error === "ScheduleAdminSecretRequired", "missing schedule secret error mismatch");

const wrongSecretResponse = await app.inject({
  ...request,
  headers: { "x-dente-admin-secret": "wrong-secret" }
});
assert(wrongSecretResponse.statusCode === 403, `wrong schedule secret must block mutation: ${wrongSecretResponse.statusCode}`);
assert(wrongSecretResponse.json().error === "ScheduleAdminSecretRequired", "wrong schedule secret error mismatch");

const allowedResponse = await app.inject({
  ...request,
  headers: { "x-dente-admin-secret": process.env.DENTE_SCHEDULE_ADMIN_SECRET }
});
assert(allowedResponse.statusCode === 200, `valid schedule secret must allow mutation: ${allowedResponse.statusCode} ${allowedResponse.body}`);
assert(allowedResponse.json().appointments.some((appointment) => appointment.reason === "Schedule admin guard smoke"), "schedule mutation result missing");

const createWithoutSecretResponse = await app.inject({
  method: "POST",
  url: "/api/appointments",
  payload: {
    patientId: "fe736762-aef9-46c2-94d8-0ba5ea1bd11a",
    doctorUserId: "8356141b-7cfa-4221-95f7-70f47e7344b1",
    assistantUserId: "f365da0c-7094-4f80-b52d-59b7b1254791",
    chairId: "b5450677-b0fc-4228-9672-56b27062783f",
    status: "planned",
    startsAt: "2026-05-26T14:00:00+04:00",
    endsAt: "2026-05-26T14:30:00+04:00",
    reason: "Schedule admin guard create smoke"
  }
});
assert(createWithoutSecretResponse.statusCode === 403, "missing schedule secret must block appointment creation");

await app.close();

delete process.env.DENTE_SCHEDULE_ADMIN_SECRET;

console.log(JSON.stringify({ ok: true, scheduleAdminGuard: true }, null, 2));
