import { existsSync } from "node:fs";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const routePath = path.resolve("apps/api/dist/routes/settings.js");
const patientRoutePath = path.resolve("apps/api/dist/routes/patients.js");
const scheduleRoutePath = path.resolve("apps/api/dist/routes/schedule.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");
const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const alexeyPatientId = "fe736762-aef9-46c2-94d8-0ba5ea1bd11a";
const smokeTimeZone = "Europe/Samara";
const smokeUtcOffset = "+04:00";

if (!existsSync(routePath) || !existsSync(patientRoutePath) || !existsSync(scheduleRoutePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSettingsRoutes } = await import(pathToFileURL(routePath).href);
const { registerPatientRoutes } = await import(pathToFileURL(patientRoutePath).href);
const { registerScheduleRoutes } = await import(pathToFileURL(scheduleRoutePath).href);
const { appointments, buildDashboard, staffMembers } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scheduleRouteSource = fs.readFileSync("apps/api/src/routes/schedule.ts", "utf8");
assert(scheduleRouteSource.includes("appointmentRejectionResponse("), "schedule route must classify mutation failures before responding");
assert(scheduleRouteSource.includes("resource_overlap"), "schedule route must expose bounded rejection reasons");
assert(!scheduleRouteSource.includes("message: error instanceof Error ? error.message"), "schedule route must not forward domain error.message as public message");
assert(!scheduleRouteSource.includes("const message = error instanceof Error ? error.message"), "schedule route must not branch public status on raw error.message");

const forbiddenScheduleRejectionTerms =
  /ZodError|issues|path|request\.body|safeParse|patientId|doctorUserId|assistantUserId|chairId|startsAt|endsAt|appointmentId|undefined|null|Запись вне расписания [^"]*:/i;
const forbiddenSettingsRejectionTerms =
  /ZodError|issues|path|request\.body|safeParse|staffId|chairId|workingHours|undefined|null|Нельзя сократить/i;

function assertScheduleMutationRejection(response, label, expectedStatusCode, expectedCode, expectedReason, expectedMessageNeedle) {
  assert(response.statusCode === expectedStatusCode, `${label} status mismatch: ${response.statusCode} ${response.body}`);
  const payload = response.json();
  assert(payload.code === expectedCode, `${label} code mismatch: ${response.body}`);
  assert(payload.reason === expectedReason, `${label} reason mismatch: ${response.body}`);
  assert(
    typeof payload.message === "string" && payload.message.includes(expectedMessageNeedle),
    `${label} readable bounded message mismatch: ${response.body}`
  );
  assert(!Object.hasOwn(payload, "error"), `${label} must not expose machine code as error field`);
  assert(!forbiddenScheduleRejectionTerms.test(response.body), `${label} leaked raw schedule/schema detail: ${response.body}`);
}

function assertScheduleValidationRejection(response, label, expectedMessageNeedle) {
  assert(response.statusCode === 400, `${label} status mismatch: ${response.statusCode} ${response.body}`);
  const payload = response.json();
  assert(payload.code === "AppointmentValidationError", `${label} code mismatch: ${response.body}`);
  assert(typeof payload.message === "string" && payload.message.includes(expectedMessageNeedle), `${label} message mismatch: ${response.body}`);
  assert(!Object.hasOwn(payload, "issues"), `${label} must not expose zod issues`);
  assert(!Object.hasOwn(payload, "error"), `${label} must not expose machine code as error field`);
  assert(!forbiddenScheduleRejectionTerms.test(response.body), `${label} leaked raw schedule/schema detail: ${response.body}`);
}

function assertSettingsMutationRejection(response, label, expectedStatusCode, expectedError, expectedReason, expectedMessageNeedle) {
  assert(response.statusCode === expectedStatusCode, `${label} status mismatch: ${response.statusCode} ${response.body}`);
  const payload = response.json();
  assert(payload.error === expectedError, `${label} error code mismatch: ${response.body}`);
  assert(payload.reason === expectedReason, `${label} reason mismatch: ${response.body}`);
  assert(
    typeof payload.message === "string" && payload.message.includes(expectedMessageNeedle),
    `${label} readable bounded message mismatch: ${response.body}`
  );
  assert(!Object.hasOwn(payload, "issues"), `${label} must not expose zod issues`);
  assert(payload.error !== payload.message, `${label} must not place operator copy in error`);
  assert(!forbiddenSettingsRejectionTerms.test(response.body), `${label} leaked raw settings/schema detail: ${response.body}`);
}

function weekdayInTimeZone(date, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function dateKeyInTimeZone(date, timeZone) {
  const parts = new Map(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}

function nextWeekdayDateKey(targetWeekday) {
  const now = Date.now();
  for (let daysAhead = 1; daysAhead <= 21; daysAhead += 1) {
    const candidate = new Date(now + daysAhead * 24 * 60 * 60 * 1000);
    if (weekdayInTimeZone(candidate, smokeTimeZone) === targetWeekday) return dateKeyInTimeZone(candidate, smokeTimeZone);
  }
  throw new Error("Unable to find future smoke weekday");
}

function addDaysDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00${smokeUtcOffset}`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyInTimeZone(date, smokeTimeZone);
}

function smokeAt(dateKey, time) {
  return `${dateKey}T${time}:00${smokeUtcOffset}`;
}

const smokeTuesdayDate = nextWeekdayDateKey(2);
const smokeWednesdayDate = addDaysDateKey(smokeTuesdayDate, 1);

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({ error: "ValidationError", issues: error.issues });
  }
  return reply.send(error);
});
await registerSettingsRoutes(app);
await registerPatientRoutes(app);
await registerScheduleRoutes(app);

const scheduleDefaults = {
  workdayStart: "10:00",
  workdayEnd: "12:00",
  workingDays: [2],
  appointmentBufferMinutes: 35
};

const profileResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 45,
    scheduleDefaults
  }
});
assert(profileResponse.statusCode === 200, `profile schedule save failed: ${profileResponse.statusCode} ${profileResponse.body}`);
const clinicSettings = profileResponse.json();
assert(clinicSettings.profile.scheduleDefaults.workdayStart === "10:00", "clinic schedule start mismatch");
assert(clinicSettings.profile.scheduleDefaults.workingDays.length === 1, "clinic working days mismatch");

const customDurationProfileResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 50,
    scheduleDefaults
  }
});
assert(
  customDurationProfileResponse.statusCode === 200,
  `custom visit duration save failed: ${customDurationProfileResponse.statusCode} ${customDurationProfileResponse.body}`
);
const networkModeResponse = await app.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  payload: { mode: "network_clinic" }
});
assert(networkModeResponse.statusCode === 200, `network mode switch failed: ${networkModeResponse.statusCode} ${networkModeResponse.body}`);
assert(
  networkModeResponse.json().profile.defaultVisitMinutes === 50,
  "clinic mode switch must preserve custom default visit duration"
);
const restoreModeResponse = await app.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  payload: { mode: "one_chair" }
});
assert(restoreModeResponse.statusCode === 200, `clinic mode restore failed: ${restoreModeResponse.statusCode} ${restoreModeResponse.body}`);
const restoredProfileResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 45,
    scheduleDefaults
  }
});
assert(restoredProfileResponse.statusCode === 200, `profile restore failed: ${restoredProfileResponse.statusCode} ${restoredProfileResponse.body}`);

const invalidTimezoneResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Mars/Base",
    defaultVisitMinutes: 45,
    scheduleDefaults
  }
});
assert(invalidTimezoneResponse.statusCode === 400, "clinic profile must reject non-IANA timezone values");

const invalidClinicScheduleResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 45,
    scheduleDefaults: {
      workdayStart: "18:00",
      workdayEnd: "09:00",
      workingDays: [2],
      appointmentBufferMinutes: 10
    }
  }
});
assert(invalidClinicScheduleResponse.statusCode === 400, "clinic schedule must reject end before start");

const doctor = clinicSettings.staff.find((member) => member.role === "doctor");
assert(doctor, "sample doctor is required");
const assistant = clinicSettings.staff.find((member) => member.role === "assistant");
assert(assistant, "sample assistant is required");
const chair = clinicSettings.chairs[0];
assert(chair, "sample chair is required");

const invalidCalendarCreateResponse = await app.inject({
  method: "POST",
  url: "/api/appointments",
  payload: {
    patientId: alexeyPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: chair.id,
    status: "planned",
    startsAt: "2027-02-29T10:00:00+04:00",
    endsAt: "2027-02-29T10:30:00+04:00",
    reason: "Smoke: invalid calendar date must not normalize"
  }
});
assertScheduleValidationRejection(
  invalidCalendarCreateResponse,
  "appointment create invalid calendar date",
  "Запись не создана"
);

const invalidHourUpdateResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/59d16574-5f6e-4cc7-9f49-2da2f126e11d",
  payload: {
    startsAt: smokeAt(smokeTuesdayDate, "24:00"),
    endsAt: smokeAt(smokeWednesdayDate, "00:30")
  }
});
assertScheduleValidationRejection(
  invalidHourUpdateResponse,
  "appointment update invalid hour",
  "Запись не обновлена"
);

const futureClinicBlockerId = "66666666-6666-4666-8666-666666666666";
appointments.push({
  id: futureClinicBlockerId,
  organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
  patientId: marinaPatientId,
  doctorUserId: doctor.id,
  assistantUserId: assistant.id,
  chairId: clinicSettings.chairs[0]?.id ?? null,
  status: "confirmed",
  startsAt: smokeAt(smokeTuesdayDate, "20:00"),
  endsAt: smokeAt(smokeTuesdayDate, "21:00"),
  reason: "Smoke: future schedule guard",
  comment: null
});
const blockedClinicNarrowingResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 45,
    scheduleDefaults
  }
});
assertSettingsMutationRejection(
  blockedClinicNarrowingResponse,
  "clinic schedule narrowing",
  409,
  "ClinicProfileMutationRejected",
  "active_schedule_conflict",
  "активные записи"
);
const futureClinicBlockerIndex = appointments.findIndex((appointment) => appointment.id === futureClinicBlockerId);
if (futureClinicBlockerIndex >= 0) appointments.splice(futureClinicBlockerIndex, 1);

const staffWorkingHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  enabled: weekday === 2,
  start: "10:00",
  end: "12:00"
}));

const staffResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/staff/${doctor.id}/working-hours`,
  payload: { workingHours: staffWorkingHours }
});
assert(staffResponse.statusCode === 200, `staff schedule save failed: ${staffResponse.statusCode} ${staffResponse.body}`);
const savedDoctor = staffResponse.json();
assert(savedDoctor.workingHours.some((day) => day.weekday === 2 && day.enabled && day.start === "10:00"), "staff hours mismatch");
assert(!/[ÐÑÃÂâ]/.test(savedDoctor.fullName), "staff schedule endpoint must return readable staff name");

const invalidStaffScheduleResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/staff/${doctor.id}/working-hours`,
  payload: {
    workingHours: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      enabled: weekday === 2,
      start: "18:00",
      end: "09:00"
    }))
  }
});
assert(invalidStaffScheduleResponse.statusCode === 400, "enabled staff day must reject end before start");

const assistantResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/staff/${assistant.id}/working-hours`,
  payload: { workingHours: staffWorkingHours }
});
assert(assistantResponse.statusCode === 200, `assistant schedule save failed: ${assistantResponse.statusCode} ${assistantResponse.body}`);
const savedAssistant = assistantResponse.json();
assert(
  savedAssistant.workingHours.some((day) => day.weekday === 2 && day.enabled && day.end === "12:00"),
  "assistant hours mismatch"
);

const chairWorkingHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  enabled: weekday === 2,
  start: "10:00",
  end: "11:00"
}));
const chairResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/chairs/${chair.id}/working-hours`,
  payload: { workingHours: chairWorkingHours }
});
assert(chairResponse.statusCode === 200, `chair schedule save failed: ${chairResponse.statusCode} ${chairResponse.body}`);
const savedChair = chairResponse.json();
assert(savedChair.workingHours.some((day) => day.weekday === 2 && day.enabled && day.end === "11:00"), "chair hours mismatch");
const blockedChairAppointmentResponse = await app.inject({
  method: "POST",
  url: "/api/appointments",
  payload: {
    patientId: alexeyPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: chair.id,
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "11:30"),
    endsAt: smokeAt(smokeTuesdayDate, "11:50"),
    reason: "Smoke: кабинет закрыт"
  }
});
assertScheduleMutationRejection(blockedChairAppointmentResponse, "appointment outside chair hours", 409, "AppointmentCreateRejected", "outside_operational_hours", "расписание");
const allowedChairAppointmentResponse = await app.inject({
  method: "POST",
  url: "/api/appointments",
  payload: {
    patientId: alexeyPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: chair.id,
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "10:10"),
    endsAt: smokeAt(smokeTuesdayDate, "10:40"),
    reason: "Smoke: кабинет открыт"
  }
});
assert(allowedChairAppointmentResponse.statusCode === 201, `appointment inside chair hours failed: ${allowedChairAppointmentResponse.statusCode}`);
const chairSmokeAppointmentIndex = appointments.findIndex((appointment) => appointment.reason === "Smoke: кабинет открыт");
if (chairSmokeAppointmentIndex >= 0) appointments.splice(chairSmokeAppointmentIndex, 1);
const chairRestoreResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/chairs/${chair.id}/working-hours`,
  payload: { workingHours: staffWorkingHours }
});
assert(chairRestoreResponse.statusCode === 200, "chair schedule restore failed");

const dashboard = buildDashboard();
const activeReadiness = dashboard.appointmentReadiness.find((item) => item.appointmentId === "b82038a1-a97f-4f67-8450-c109562f0fd8");
assert(activeReadiness, "active appointment readiness missing");
assert(activeReadiness.checks.some((check) => check.key === "schedule"), "schedule readiness check missing");
assert(activeReadiness.blockers.some((blocker) => blocker.includes("вне окна")), "outside-hours blocker missing");
assert(
  activeReadiness.checks.some((check) => check.key === "team" && check.detail.includes("ассистент")),
  "assistant readiness detail missing"
);
assert(dashboard.shiftIntelligence.assistantLoads.length > 0, "assistant loads missing");
assert(
  dashboard.shiftIntelligence.assistantLoads.some((load) => load.kind === "assistant" && load.appointmentCount >= 2),
  "assistant assigned appointment load missing"
);
const assistantSnapshots = staffMembers
  .filter((member) => member.role === "assistant")
  .map((member) => ({ id: member.id, active: member.active }));
for (const member of staffMembers) {
  if (member.role === "assistant") member.active = false;
}
const dashboardWithoutAssistants = buildDashboard();
const noAssistantReadiness = dashboardWithoutAssistants.appointmentReadiness.find(
  (item) => item.appointmentId === "b82038a1-a97f-4f67-8450-c109562f0fd8"
);
assert(noAssistantReadiness, "no-assistant readiness appointment missing");
assert(
  noAssistantReadiness.checks.some((check) => check.key === "team" && !check.ready && check.detail.includes("ассистент")),
  "non-solo clinic must flag missing assistant even when no assistant exists in staff"
);
for (const snapshot of assistantSnapshots) {
  const member = staffMembers.find((candidate) => candidate.id === snapshot.id);
  if (member) member.active = snapshot.active;
}
assert(dashboard.shiftIntelligence.chairLoads.some((load) => load.state === "overbooked"), "configured short day must surface chair overload");
assert(dashboard.scheduleSuggestions.some((item) => item.id.startsWith("schedule-buffer-")), "buffer suggestion missing");
const crossDateScheduleAppointments = [
  {
    id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaa11",
    organizationId: doctor.organizationId,
    patientId: marinaPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: chair.id,
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "23:50"),
    endsAt: smokeAt(smokeWednesdayDate, "09:30"),
    reason: "Smoke: cross-date long record",
    comment: null
  },
  {
    id: "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaa12",
    organizationId: doctor.organizationId,
    patientId: alexeyPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: chair.id,
    status: "confirmed",
    startsAt: smokeAt(smokeWednesdayDate, "09:00"),
    endsAt: smokeAt(smokeWednesdayDate, "09:30"),
    reason: "Smoke: cross-date next day",
    comment: null
  }
];
appointments.push(...crossDateScheduleAppointments);
const dashboardWithCrossDateRecords = buildDashboard();
const crossDateSuggestionIds = dashboardWithCrossDateRecords.scheduleSuggestions
  .map((item) => item.id)
  .filter((id) => (id.startsWith("schedule-buffer-") || id.startsWith("schedule-gap-")) && id.includes("aaaaaaaa-1111"));
assert(
  crossDateSuggestionIds.length === 0,
  `schedule suggestions must not compare buffer/gap across clinic dates: ${crossDateSuggestionIds.join(", ")}`
);
for (const syntheticAppointment of crossDateScheduleAppointments) {
  const syntheticIndex = appointments.findIndex((appointment) => appointment.id === syntheticAppointment.id);
  if (syntheticIndex >= 0) appointments.splice(syntheticIndex, 1);
}

const moscowScheduleDefaults = {
  workdayStart: "08:00",
  workdayEnd: "09:15",
  workingDays: [2],
  appointmentBufferMinutes: 5
};
const moscowProfileResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Moscow",
    defaultVisitMinutes: 45,
    scheduleDefaults: moscowScheduleDefaults
  }
});
assert(moscowProfileResponse.statusCode === 200, `moscow profile schedule save failed: ${moscowProfileResponse.statusCode}`);
const moscowStaffHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  enabled: weekday === 2,
  start: "08:00",
  end: "09:15"
}));
assert(
  (
    await app.inject({
      method: "PUT",
      url: `/api/settings/staff/${doctor.id}/working-hours`,
      payload: { workingHours: moscowStaffHours }
    })
  ).statusCode === 200,
  "moscow doctor schedule save failed"
);
assert(
  (
    await app.inject({
      method: "PUT",
      url: `/api/settings/staff/${assistant.id}/working-hours`,
      payload: { workingHours: moscowStaffHours }
    })
  ).statusCode === 200,
  "moscow assistant schedule save failed"
);
assert(
  (
    await app.inject({
      method: "PUT",
      url: `/api/settings/chairs/${chair.id}/working-hours`,
      payload: { workingHours: moscowStaffHours }
    })
  ).statusCode === 200,
  "moscow chair schedule save failed"
);
const dashboardInMoscowTimezone = buildDashboard();
const moscowReadiness = dashboardInMoscowTimezone.appointmentReadiness.find((item) => item.appointmentId === "b82038a1-a97f-4f67-8450-c109562f0fd8");
assert(moscowReadiness, "timezone readiness appointment missing");
const moscowScheduleCheck = moscowReadiness.checks.find((check) => check.key === "schedule");
assert(moscowScheduleCheck?.ready, `clinic timezone must drive appointment clock, got ${moscowScheduleCheck?.detail}`);
assert(moscowScheduleCheck.detail.includes("Europe/Moscow"), "schedule detail must expose timezone used for checks");

const patientPreferenceResponse = await app.inject({
  method: "PUT",
  url: `/api/patients/${marinaPatientId}/administrative-profile`,
  payload: {
    preferredAppointmentWeekdays: [2],
    preferredAppointmentStart: "10:30",
    preferredAppointmentEnd: "11:30",
    preferredAppointmentNote: "Smoke: patient accepts only late morning appointments."
  }
});
assert(
  patientPreferenceResponse.statusCode === 200,
  `patient schedule preference save failed: ${patientPreferenceResponse.statusCode} ${patientPreferenceResponse.body}`
);
const dashboardAfterPatientPreference = buildDashboard();
const patientPreferenceReadiness = dashboardAfterPatientPreference.appointmentReadiness.find(
  (item) => item.appointmentId === "b82038a1-a97f-4f67-8450-c109562f0fd8"
);
assert(
  patientPreferenceReadiness && !patientPreferenceReadiness.blockers.some((blocker) => blocker.includes("пациента")),
  "patient appointment preference must not become a hard blocker"
);
assert(
  patientPreferenceReadiness?.warnings.some((warning) => warning.includes("пациента")),
  "patient appointment preference warning missing"
);

const oneSidedPatientPreferenceResponse = await app.inject({
  method: "PUT",
  url: `/api/patients/${marinaPatientId}/administrative-profile`,
  payload: {
    preferredAppointmentStart: "10:30",
    preferredAppointmentEnd: null
  }
});
assert(oneSidedPatientPreferenceResponse.statusCode === 400, "one-sided patient appointment time preference must be rejected");

const restoredSamaraBeforeMutationResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 45,
    scheduleDefaults
  }
});
assert(
  restoredSamaraBeforeMutationResponse.statusCode === 200,
  `samara schedule restore before appointment mutation failed: ${restoredSamaraBeforeMutationResponse.statusCode}`
);
assert(
  (
    await app.inject({
      method: "PUT",
      url: `/api/settings/staff/${doctor.id}/working-hours`,
      payload: { workingHours: staffWorkingHours }
    })
  ).statusCode === 200,
  "samara doctor schedule restore before appointment mutation failed"
);
assert(
  (
    await app.inject({
      method: "PUT",
      url: `/api/settings/staff/${assistant.id}/working-hours`,
      payload: { workingHours: staffWorkingHours }
    })
  ).statusCode === 200,
  "samara assistant schedule restore before appointment mutation failed"
);
assert(
  (
    await app.inject({
      method: "PUT",
      url: `/api/settings/chairs/${chair.id}/working-hours`,
      payload: { workingHours: staffWorkingHours }
    })
  ).statusCode === 200,
  "samara chair schedule restore before appointment mutation failed"
);

const appointmentUpdateResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/59d16574-5f6e-4cc7-9f49-2da2f126e11d",
  payload: {
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "11:20"),
    endsAt: smokeAt(smokeTuesdayDate, "11:50"),
    assistantUserId: assistant.id,
    reason: "Smoke schedule mutation"
  }
});
assert(appointmentUpdateResponse.statusCode === 200, `appointment update failed: ${appointmentUpdateResponse.statusCode} ${appointmentUpdateResponse.body}`);
const appointmentDashboard = appointmentUpdateResponse.json();
const updatedAppointment = appointmentDashboard.appointments.find((appointment) => appointment.id === "59d16574-5f6e-4cc7-9f49-2da2f126e11d");
assert(updatedAppointment?.status === "confirmed", "appointment update must return updated status in dashboard");
assert(updatedAppointment?.startsAt === smokeAt(smokeTuesdayDate, "11:20"), "appointment update must return updated start time");
assert(updatedAppointment?.reason === "Smoke schedule mutation", "appointment update must return updated reason");
assert(
  appointmentDashboard.appointmentReadiness.some((item) => item.appointmentId === updatedAppointment.id),
  "appointment update response must include recalculated readiness"
);

const invalidAppointmentTimeResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/59d16574-5f6e-4cc7-9f49-2da2f126e11d",
  payload: {
    startsAt: smokeAt(smokeTuesdayDate, "12:30")
  }
});
assert(invalidAppointmentTimeResponse.statusCode === 409, "merged appointment time validation must reject start after existing end");
const invalidAppointmentTimePayload = invalidAppointmentTimeResponse.json();
assertScheduleMutationRejection(invalidAppointmentTimeResponse, "merged appointment time validation", 409, "AppointmentUpdateRejected", "time_invalid", "окончания");

const missingAppointmentUpdateResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/11111111-1111-4111-8111-111111111111",
  payload: {
    reason: "Smoke missing appointment update"
  }
});
assertScheduleMutationRejection(missingAppointmentUpdateResponse, "missing appointment update", 404, "AppointmentNotFound", "appointment_not_found", "Запись не найдена");

const activeAppointmentPatientChangeResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/b82038a1-a97f-4f67-8450-c109562f0fd8",
  payload: {
    patientId: "e221bd35-55eb-4ad4-9c10-8770df08d6fb"
  }
});
assertScheduleMutationRejection(activeAppointmentPatientChangeResponse, "active visit appointment patient reassignment", 409, "AppointmentUpdateRejected", "active_visit_locked", "открыт прием");

const expandedScheduleDefaults = {
  workdayStart: "09:00",
  workdayEnd: "13:00",
  workingDays: [2],
  appointmentBufferMinutes: 10
};
const expandedProfileResponse = await app.inject({
  method: "PUT",
  url: "/api/settings/clinic/profile",
  payload: {
    clinicName: "Schedule Smoke Dental",
    timezone: "Europe/Samara",
    defaultVisitMinutes: 45,
    scheduleDefaults: expandedScheduleDefaults
  }
});
assert(expandedProfileResponse.statusCode === 200, `expanded profile schedule save failed: ${expandedProfileResponse.statusCode}`);

const expandedStaffHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  enabled: weekday === 2,
  start: "09:00",
  end: "13:00"
}));
const expandedDoctorResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/staff/${doctor.id}/working-hours`,
  payload: { workingHours: expandedStaffHours }
});
assert(expandedDoctorResponse.statusCode === 200, `expanded doctor hours failed: ${expandedDoctorResponse.statusCode}`);
const expandedAssistantResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/staff/${assistant.id}/working-hours`,
  payload: { workingHours: expandedStaffHours }
});
assert(expandedAssistantResponse.statusCode === 200, `expanded assistant hours failed: ${expandedAssistantResponse.statusCode}`);
const expandedChairResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/chairs/${chair.id}/working-hours`,
  payload: { workingHours: expandedStaffHours }
});
assert(expandedChairResponse.statusCode === 200, `expanded chair hours failed: ${expandedChairResponse.statusCode}`);

const createAppointmentResponse = await app.inject({
  method: "POST",
  url: "/api/appointments",
  payload: {
    patientId: alexeyPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: clinicSettings.chairs[0]?.id ?? null,
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "09:10"),
    endsAt: smokeAt(smokeTuesdayDate, "09:40"),
    reason: "Smoke: новая запись из расписания",
    comment: "Создание должно проходить те же проверки, что редактирование."
  }
});
assert(createAppointmentResponse.statusCode === 201, `appointment create failed: ${createAppointmentResponse.statusCode} ${createAppointmentResponse.body}`);
const createAppointmentDashboard = createAppointmentResponse.json();
const createdAppointment = createAppointmentDashboard.appointments.find((appointment) => appointment.reason === "Smoke: новая запись из расписания");
assert(createdAppointment, "created appointment must be returned in dashboard");
assert(createdAppointment.patientId === alexeyPatientId, "created appointment patient mismatch");
assert(
  createAppointmentDashboard.appointmentReadiness.some((item) => item.appointmentId === createdAppointment.id),
  "created appointment must include readiness"
);

const overlappingCreateAppointmentResponse = await app.inject({
  method: "POST",
  url: "/api/appointments",
  payload: {
    patientId: alexeyPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: clinicSettings.chairs[0]?.id ?? null,
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "09:20"),
    endsAt: smokeAt(smokeTuesdayDate, "09:50"),
    reason: "Smoke: пересечение новой записи"
  }
});
assertScheduleMutationRejection(overlappingCreateAppointmentResponse, "appointment create overlap", 409, "AppointmentCreateRejected", "resource_overlap", "занято");

const patientPreferenceWarningResponse = await app.inject({
  method: "POST",
  url: "/api/appointments",
  payload: {
    patientId: marinaPatientId,
    doctorUserId: doctor.id,
    assistantUserId: assistant.id,
    chairId: clinicSettings.chairs[0]?.id ?? null,
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "12:10"),
    endsAt: smokeAt(smokeTuesdayDate, "12:40"),
    reason: "Smoke: вне предпочтения пациента"
  }
});
assert(patientPreferenceWarningResponse.statusCode === 201, "future appointment outside patient preference must be allowed with warning");
const patientPreferenceWarningDashboard = patientPreferenceWarningResponse.json();
const patientPreferenceWarningAppointment = patientPreferenceWarningDashboard.appointments.find(
  (appointment) => appointment.reason === "Smoke: вне предпочтения пациента"
);
assert(patientPreferenceWarningAppointment, "patient preference warning appointment must be returned");
assert(
  patientPreferenceWarningDashboard.appointmentReadiness
    .find((item) => item.appointmentId === patientPreferenceWarningAppointment.id)
    ?.warnings.some((warning) => warning.includes("пациента")),
  "future appointment outside patient preference must carry readiness warning"
);
const patientPreferenceWarningAppointmentIndex = appointments.findIndex(
  (appointment) => appointment.id === patientPreferenceWarningAppointment.id
);
if (patientPreferenceWarningAppointmentIndex >= 0) appointments.splice(patientPreferenceWarningAppointmentIndex, 1);

const missingAssistantNonSoloResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/286c0899-f2cc-4e72-833d-a1e89036e319",
  payload: {
    status: "confirmed",
    doctorUserId: doctor.id,
    chairId: clinicSettings.chairs[0]?.id ?? null,
    assistantUserId: null,
    startsAt: smokeAt(smokeTuesdayDate, "12:00"),
    endsAt: smokeAt(smokeTuesdayDate, "12:30")
  }
});
assertScheduleMutationRejection(missingAssistantNonSoloResponse, "non-solo missing assistant", 409, "AppointmentUpdateRejected", "resource_missing", "ассистент");

const soloModeResponse = await app.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  payload: { mode: "solo_doctor" }
});
assert(soloModeResponse.statusCode === 200, `solo mode switch failed: ${soloModeResponse.statusCode}`);
const missingAssistantSoloResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/286c0899-f2cc-4e72-833d-a1e89036e319",
  payload: {
    status: "confirmed",
    doctorUserId: doctor.id,
    chairId: clinicSettings.chairs[0]?.id ?? null,
    assistantUserId: null,
    startsAt: smokeAt(smokeTuesdayDate, "12:00"),
    endsAt: smokeAt(smokeTuesdayDate, "12:30")
  }
});
assert(missingAssistantSoloResponse.statusCode === 200, "solo doctor mode must allow active appointment without assistant");
const restoreOneChairModeResponse = await app.inject({
  method: "POST",
  url: "/api/settings/clinic/mode",
  payload: { mode: "one_chair" }
});
assert(restoreOneChairModeResponse.statusCode === 200, `one-chair mode restore failed: ${restoreOneChairModeResponse.statusCode}`);

const futureAppointmentResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/59d16574-5f6e-4cc7-9f49-2da2f126e11d",
  payload: {
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "10:00"),
    endsAt: smokeAt(smokeTuesdayDate, "10:30"),
    assistantUserId: assistant.id
  }
});
assert(futureAppointmentResponse.statusCode === 200, `future in-hours appointment update failed: ${futureAppointmentResponse.statusCode}`);

const blockedStaffNarrowingResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/staff/${doctor.id}/working-hours`,
  payload: {
    workingHours: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      enabled: weekday === 2,
      start: "09:00",
      end: "09:30"
    }))
  }
});
assertSettingsMutationRejection(
  blockedStaffNarrowingResponse,
  "staff schedule narrowing",
  409,
  "StaffScheduleRejected",
  "active_schedule_conflict",
  "активная запись"
);

const blockedChairNarrowingResponse = await app.inject({
  method: "PUT",
  url: `/api/settings/chairs/${chair.id}/working-hours`,
  payload: {
    workingHours: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      enabled: weekday === 2,
      start: "09:00",
      end: "09:30"
    }))
  }
});
assertSettingsMutationRejection(
  blockedChairNarrowingResponse,
  "chair schedule narrowing",
  409,
  "ChairScheduleRejected",
  "active_schedule_conflict",
  "активная запись"
);

const overlappingFutureAppointmentResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/286c0899-f2cc-4e72-833d-a1e89036e319",
  payload: {
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "10:15"),
    endsAt: smokeAt(smokeTuesdayDate, "10:45"),
    chairId: updatedAppointment.chairId,
    assistantUserId: assistant.id
  }
});
assertScheduleMutationRejection(overlappingFutureAppointmentResponse, "future appointment overlap", 409, "AppointmentUpdateRejected", "resource_overlap", "занято");

const outsideFutureAppointmentResponse = await app.inject({
  method: "PATCH",
  url: "/api/appointments/286c0899-f2cc-4e72-833d-a1e89036e319",
  payload: {
    status: "confirmed",
    startsAt: smokeAt(smokeTuesdayDate, "13:30"),
    endsAt: smokeAt(smokeTuesdayDate, "14:00"),
    assistantUserId: assistant.id
  }
});
assertScheduleMutationRejection(outsideFutureAppointmentResponse, "future appointment outside clinic/staff hours", 409, "AppointmentUpdateRejected", "outside_operational_hours", "расписание");

const dashboardAfterExpandedSchedule = buildDashboard();
const missingAssistantReadiness = dashboardAfterExpandedSchedule.appointmentReadiness.find(
  (item) => item.appointmentId === "286c0899-f2cc-4e72-833d-a1e89036e319"
);
assert(missingAssistantReadiness, "missing-assistant appointment readiness missing");
assert(missingAssistantReadiness.state === "blocked", `missing assistant must hard-block appointment, got ${missingAssistantReadiness.state}`);
assert(missingAssistantReadiness.nextAction === "Назначить ассистента", "missing assistant next action mismatch");
assert(
  missingAssistantReadiness.blockers.some((blocker) => blocker.includes("ассистент не назначен")),
  "missing assistant team blocker missing"
);
assert(
  missingAssistantReadiness.checks.some((check) => check.key === "schedule" && check.detail.includes("нет ассистента")),
  "missing assistant schedule blocker detail missing"
);

const appSource = [
  fs.readFileSync("apps/web/src/App.tsx", "utf8"),
  fs.readFileSync("apps/web/src/SettingsView.tsx", "utf8"),
  fs.readFileSync("apps/web/src/ScheduleView.tsx", "utf8"),
  fs.readFileSync("apps/web/src/PatientsView.tsx", "utf8")
].join("\n");
assert(appSource.includes("perDay: StaffWorkingHours"), "staff schedule draft must preserve per-day hours");
assert(appSource.includes("updateStaffScheduleDay"), "staff per-day schedule editor missing");
assert(appSource.includes("staff-day-hours"), "staff per-day schedule UI missing");
assert(appSource.includes("staffScheduleDirtyIds"), "staff schedule edits must be tracked for autosave");
assert(appSource.includes("Ждет автосохранения"), "staff schedule autosave status missing");
assert(appSource.includes("staff-schedule-actions"), "staff schedule autosave controls missing");
assert(appSource.includes("preferredAppointmentWeekdays"), "patient appointment weekday preferences missing");
assert(appSource.includes("Удобные дни записи"), "patient appointment preference UI missing");
assert(appSource.includes("patientAdministrativeProfileDirty"), "patient appointment preferences need dirty tracking");
assert(appSource.includes("patientAdministrativeProfileDraftSignature"), "patient administrative autosave must guard against stale saves");
assert(appSource.includes("Ждет сохранения"), "patient appointment preference pending-save status missing");
assert(appSource.includes("scheduleSaveError"), "staff schedule autosave must catch fetch failures");
assert(appSource.includes("assistantLoads"), "assistant load UI missing");
assert(appSource.includes("scheduleAssistantFilterId"), "schedule assistant filter preference missing");
assert(appSource.includes("setScheduleAssistantFilterId(event.target.value || null)"), "schedule assistant filter control missing");
assert(appSource.includes("appointment.assistantUserId !== scheduleAssistantFilterId"), "schedule list must filter by assistant");
assert(appSource.includes("appointmentScheduleDrafts"), "appointment inline editor draft state missing");
assert(appSource.includes("appointmentScheduleDirtyIds"), "appointment inline editor must track dirty state");
assert(appSource.includes("appointmentScheduleErrors"), "appointment inline editor must render row-local save errors");
assert(appSource.includes("dirtyAppointmentIds"), "appointment inline editor changes must be autosaved with debounce");
assert(appSource.includes("newAppointmentDraft"), "schedule must expose a real new appointment draft");
assert(appSource.includes("createAppointmentFromDraft"), "schedule must have a real appointment creation action");
assert(appSource.includes("normalizedAppointmentStatus(event.target.value)"), "appointment status selects must normalize DOM values");
assert(appSource.includes("normalizedAppointmentStatusFilter(event.target.value)"), "appointment status filter must normalize DOM values");
assert(
  !appSource.includes('event.target.value as Appointment["status"]'),
  "schedule status controls must not cast raw DOM values"
);
assert(appSource.includes('fetch("/api/appointments"'), "schedule create action must call the appointment create endpoint");
assert(appSource.includes("newAppointmentDraftFromDashboard"), "schedule create form must default from clinic/team/patient data");
assert(appSource.includes("scheduleDefaultDoctorUserId?: string | null"), "new appointment defaults must accept persisted doctor choice");
assert(appSource.includes("scheduleDefaultAssistantUserId?: string | null"), "new appointment defaults must accept persisted assistant choice");
assert(appSource.includes("scheduleDefaultChairId?: string | null"), "new appointment defaults must accept persisted chair choice");
assert(appSource.includes("candidate.id === preferences.selectedPatientId"), "new appointment defaults must prefer saved patient selection");
assert(appSource.includes("member.id === preferences.scheduleDefaultDoctorUserId"), "new appointment defaults must prefer saved doctor selection");
assert(appSource.includes("member.id === preferences.scheduleDefaultAssistantUserId"), "new appointment defaults must prefer saved assistant selection");
assert(appSource.includes("candidate.id === preferences.scheduleDefaultChairId"), "new appointment defaults must prefer saved chair selection");
assert(appSource.includes("specialtyMatches(member.specialties)"), "new appointment defaults must prefer doctors for saved specialty");
assert(appSource.includes("candidate.specialization === selectedSpecialty"), "new appointment defaults must prefer chairs for saved specialty");
assert(appSource.includes("newAppointmentPreferenceDefaults()"), "schedule reset/default draft must pass persisted patient and appointment defaults");
assert(appSource.includes('if (key === "doctorUserId" && typeof value === "string") setScheduleDefaultDoctorUserId(value || null);'), "new appointment doctor selection must persist automatically");
assert(appSource.includes('if (key === "assistantUserId" && typeof value === "string") setScheduleDefaultAssistantUserId(value || null);'), "new appointment assistant selection must persist automatically");
assert(appSource.includes('if (key === "chairId" && typeof value === "string") setScheduleDefaultChairId(value || null);'), "new appointment chair selection must persist automatically");
assert(appSource.includes("Доступ к сохранению расписания"), "schedule screen must expose admin unlock near appointment mutations");
assert(appSource.includes("Разблокировать сохранение"), "schedule admin unlock action missing");
assert(appSource.includes("fromDateTimeLocalValue(event.target.value, dashboard.clinicSettings.profile.timezone)"), "appointment datetime edits must use clinic timezone");
assert(appSource.includes("timeZoneOffsetMinutes"), "appointment datetime conversion must not depend only on browser timezone");
assert(
  appSource.includes("saveAppointmentSchedule(appointmentId, { closeEditorOnSave: false })"),
  "appointment autosave must not close the inline editor"
);
assert(
  appSource.indexOf('typeof payload.message === "string"') < appSource.indexOf('typeof payload.error === "string"'),
  "responseErrorMessage must prefer readable API message before machine error code"
);
assert(appSource.includes('type="datetime-local"'), "appointment inline editor must use datetime-local controls");
assert(appSource.includes("/api/appointments/"), "appointment inline editor save route missing");
assert(appSource.includes("Редактирование записи"), "appointment inline editor UI missing");
assert(appSource.includes("ассистент не назначен"), "schedule row assistant fallback missing");

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    workdayStart: dashboard.clinicSettings.profile.scheduleDefaults.workdayStart,
    bufferMinutes: dashboard.clinicSettings.profile.scheduleDefaults.appointmentBufferMinutes,
    scheduleCheck: activeReadiness.checks.find((check) => check.key === "schedule")?.detail
  })
);
