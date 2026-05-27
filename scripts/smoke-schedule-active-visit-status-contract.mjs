import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_SCHEDULE_ADMIN_SECRET = "synthetic-schedule-secret";

const routePath = path.resolve("apps/api/dist/routes/schedule.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerScheduleRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, appointments } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const activeAppointment = appointments.find((appointment) => appointment.id === activeVisit.appointmentId);
assert(activeAppointment, "sample active visit must reference an appointment");
assert(activeVisit.status === "draft", `sample active visit must be draft, got ${activeVisit.status}`);

const app = Fastify({ logger: false });
await registerScheduleRoutes(app);

const mutationHeaders = { "x-dente-admin-secret": process.env.DENTE_SCHEDULE_ADMIN_SECRET };
const originalStatus = activeAppointment.status;
const terminalStatuses = ["completed", "cancelled", "no_show"];

for (const status of terminalStatuses) {
  const response = await app.inject({
    method: "PATCH",
    url: `/api/appointments/${activeAppointment.id}`,
    headers: mutationHeaders,
    payload: { status }
  });
  assert(response.statusCode === 409, `draft visit appointment must reject ${status}: ${response.statusCode} ${response.body}`);
  assert(response.json().code === "AppointmentUpdateRejected", `${status} rejection code mismatch`);
  assert(
    String(response.json().message ?? "").includes("связанный прием открыт"),
    `${status} rejection must explain the open visit linkage`
  );
  assert(activeAppointment.status === originalStatus, `${status} rejection must not mutate appointment status`);
}

const unknownResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/00000000-0000-4000-8000-000000000000",
  headers: mutationHeaders,
  payload: { status: "confirmed" }
});
assert(unknownResponse.statusCode === 404, `unknown appointment update must be 404: ${unknownResponse.statusCode} ${unknownResponse.body}`);
assert(unknownResponse.json().code === "AppointmentUpdateRejected", "unknown appointment rejection code mismatch");

await app.close();

delete process.env.DENTE_SCHEDULE_ADMIN_SECRET;

console.log(
  JSON.stringify(
    {
      ok: true,
      activeVisitAppointmentStatusContract: true,
      appointmentId: activeAppointment.id,
      originalStatus
    },
    null,
    2
  )
);
