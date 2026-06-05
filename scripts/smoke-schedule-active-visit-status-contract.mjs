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

function assertNoScheduleRouteLeak(response, label) {
  assert(!Object.hasOwn(response.json(), "error"), `${label} must not expose machine code as error field`);
  assert(!/appointmentId|request\.body|safeParse|issues|path|undefined|null/i.test(response.body), `${label} leaked raw route detail`);
}

const activeAppointment = appointments.find((appointment) => appointment.id === activeVisit.appointmentId);
assert(activeAppointment, "sample active visit must reference an appointment");
assert(activeVisit.status === "draft", `sample active visit must be draft, got ${activeVisit.status}`);

const app = Fastify({ logger: false });
await registerScheduleRoutes(app);

const mutationHeaders = { "x-dente-admin-secret": process.env.DENTE_SCHEDULE_ADMIN_SECRET };
const originalStatus = activeAppointment.status;
const terminalStatuses = ["completed", "cancelled", "no_show"];
const alternatePatientId = appointments.find(
  (appointment) => appointment.patientId && appointment.patientId !== activeAppointment.patientId
)?.patientId;
assert(alternatePatientId, "sample alternate patient is required for active visit handoff smoke");
assert(activeAppointment.patientId === activeVisit.patientId, "sample active appointment must match active visit patient");

for (const status of terminalStatuses) {
  const response = await app.inject({
    method: "PATCH",
    url: `/api/appointments/${activeAppointment.id}`,
    headers: mutationHeaders,
    payload: { status }
  });
  const payload = response.json();
  assert(response.statusCode === 409, `draft visit appointment must reject ${status}: ${response.statusCode} ${response.body}`);
  assert(payload.code === "AppointmentUpdateRejected", `${status} rejection code mismatch: ${response.body}`);
  assert(payload.reason === "active_visit_locked", `${status} rejection reason mismatch: ${response.body}`);
  assert(String(payload.message ?? "").includes("открыт прием"), `${status} rejection must explain the open visit linkage`);
  assertNoScheduleRouteLeak(response, `${status} active visit rejection`);
  assert(activeAppointment.status === originalStatus, `${status} rejection must not mutate appointment status`);
}

const patientChangeResponse = await app.inject({
  method: "PATCH",
  url: `/api/appointments/${activeAppointment.id}`,
  headers: mutationHeaders,
  payload: { patientId: alternatePatientId }
});
const patientChangePayload = patientChangeResponse.json();
assert(
  patientChangeResponse.statusCode === 409,
  `draft visit appointment must reject patient reassignment: ${patientChangeResponse.statusCode} ${patientChangeResponse.body}`
);
assert(patientChangePayload.code === "AppointmentUpdateRejected", `patient reassignment rejection code mismatch: ${patientChangeResponse.body}`);
assert(patientChangePayload.reason === "active_visit_locked", `patient reassignment rejection reason mismatch: ${patientChangeResponse.body}`);
assert(
  String(patientChangePayload.message ?? "").includes("открыт прием"),
  "patient reassignment rejection must explain the open visit linkage"
);
assertNoScheduleRouteLeak(patientChangeResponse, "active visit patient reassignment rejection");
assert(activeAppointment.patientId === activeVisit.patientId, "patient reassignment rejection must not break active visit handoff");

const unknownResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/00000000-0000-4000-8000-000000000000",
  headers: mutationHeaders,
  payload: { status: "confirmed" }
});
const unknownPayload = unknownResponse.json();
assert(unknownResponse.statusCode === 404, `unknown appointment update must be 404: ${unknownResponse.statusCode} ${unknownResponse.body}`);
assert(unknownPayload.code === "AppointmentNotFound", `unknown appointment rejection code mismatch: ${unknownResponse.body}`);
assert(unknownPayload.reason === "appointment_not_found", `unknown appointment rejection reason mismatch: ${unknownResponse.body}`);
assert(!unknownResponse.body.includes("00000000"), "unknown appointment response leaked raw appointment id");
assertNoScheduleRouteLeak(unknownResponse, "unknown appointment rejection");

await app.close();

delete process.env.DENTE_SCHEDULE_ADMIN_SECRET;

console.log(
  JSON.stringify(
    {
      ok: true,
      activeVisitAppointmentStatusContract: true,
      activeVisitPatientHandoffContract: true,
      appointmentId: activeAppointment.id,
      originalStatus
    },
    null,
    2
  )
);
