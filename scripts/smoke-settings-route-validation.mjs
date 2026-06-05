import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_SETTINGS_ADMIN_SECRET = "synthetic-settings-secret";
delete process.env.DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS;

const routePath = path.resolve("apps/api/dist/routes/settings.js");

if (!existsSync(routePath)) {
  throw new Error("Build API first: npm run build -w @dental/api");
}

const settingsSource = readFileSync("apps/api/src/routes/settings.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

[
  "uiPreferencesInputSchema.parse(request.body)",
  "updateClinicModeSchema.parse(request.body)",
  "updateClinicProfileSchema.safeParse(request.body)",
  "parsed.error.issues.map((issue) => issue.message)",
  "createStaffMemberSchema.parse(request.body)",
  "updateStaffWorkingHoursSchema.parse(request.body)",
  "createChairSchema.parse(request.body)",
  "updateChairWorkingHoursSchema.parse(request.body)",
  "error instanceof Error ? error.message",
  ".send({ error: message })",
  "send({ error: repairMojibakeDeep(error instanceof Error ? error.message",
  "Не указан staffId сотрудника",
  "Не указан chairId кресла"
].forEach((needle) => {
  assert(!settingsSource.includes(needle), `settings route still exposes raw request validation: ${needle}`);
});
assert(settingsSource.includes("parseSettingsPayload("), "settings route must keep route-owned validation helper");
assert(settingsSource.includes("clinicProfileMutationRejection("), "settings route must keep clinic profile mutation boundary");
assert(settingsSource.includes("staffWorkingHoursRejection("), "settings route must keep staff working-hours mutation boundary");
assert(settingsSource.includes("chairWorkingHoursRejection("), "settings route must keep chair working-hours mutation boundary");

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerSettingsRoutes } = await import(pathToFileURL(routePath).href);

const app = Fastify({ logger: false });
app.setErrorHandler((error, _request, reply) => {
  if (error?.name === "ZodError" && Array.isArray(error.issues)) {
    return reply.code(400).send({
      error: "ValidationError",
      issues: error.issues
    });
  }
  return reply.send(error);
});
await registerSettingsRoutes(app);

const settingsHeaders = {
  "x-dente-admin-secret": process.env.DENTE_SETTINGS_ADMIN_SECRET,
  "content-type": "application/json"
};

const forbiddenValidationTerms =
  /ZodError|too_small|invalid_type|invalid_string|issues|path|request\.body|safeParse|uiLanguage|selectedWorkspaceRole|selectedSpecialty|clinicName|legalName|inn|kpp|ogrn|medicalLicenseIssuedAt|timezone|defaultVisitMinutes|scheduleDefaults|mode|fullName|role|specialties|workingHours|staffId|chairId|room|hasXraySensor|hasMicroscope|hasSurgeryKit/i;

async function requestJson(options) {
  const response = await app.inject({
    ...options,
    headers: {
      ...settingsHeaders,
      ...(options.headers ?? {})
    }
  });
  let body;
  try {
    body = response.json();
  } catch {
    body = {};
  }
  return { response, body, text: response.body };
}

function assertRouteValidationResponse(actual, label, expectedMessage) {
  assert(actual.response.statusCode === 400, `${label} must return 400, got ${actual.response.statusCode}: ${actual.text}`);
  assert(actual.body.message === expectedMessage, `${label} must return bounded message, got: ${actual.text}`);
  assert(!Object.hasOwn(actual.body, "issues"), `${label} must not return zod issues`);
  assert(!forbiddenValidationTerms.test(actual.text), `${label} leaked schema/parser detail: ${actual.text}`);
}

function assertSettingsMutationRejection(actual, label, expectedStatus, expectedError, expectedReason, expectedMessage) {
  assert(
    actual.response.statusCode === expectedStatus,
    `${label} must return ${expectedStatus}, got ${actual.response.statusCode}: ${actual.text}`
  );
  assert(actual.body.error === expectedError, `${label} must return stable error code, got: ${actual.text}`);
  assert(actual.body.reason === expectedReason, `${label} must return stable reason, got: ${actual.text}`);
  assert(actual.body.message === expectedMessage, `${label} must return bounded message, got: ${actual.text}`);
  assert(!Object.hasOwn(actual.body, "issues"), `${label} must not return zod issues`);
  assert(actual.body.error !== actual.body.message, `${label} must not place operator copy in error`);
  assert(actual.body.error !== "Сотрудник не найден.", `${label} must not expose raw staff domain error`);
  assert(actual.body.error !== "Кресло не найдено.", `${label} must not expose raw chair domain error`);
  assert(actual.body.message !== "Сотрудник не найден.", `${label} must not expose raw staff domain message`);
  assert(actual.body.message !== "Кресло не найдено.", `${label} must not expose raw chair domain message`);
  assert(!forbiddenValidationTerms.test(actual.text), `${label} leaked schema/parser detail: ${actual.text}`);
}

const disabledWorkingHours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  enabled: false,
  start: "09:00",
  end: "18:00"
}));

const checks = [
  [
    "preferences invalid payload",
    await requestJson({ method: "PUT", url: "/api/settings/preferences", payload: { uiLanguage: "bad" } }),
    "Настройки интерфейса не сохранены: проверьте выбранную роль, разделы, фильтры и параметры рабочего места."
  ],
  [
    "clinic mode invalid payload",
    await requestJson({ method: "POST", url: "/api/settings/clinic/mode", payload: { mode: "bad-mode" } }),
    "Режим клиники не сохранен: выберите допустимый режим работы клиники."
  ],
  [
    "clinic profile invalid payload",
    await requestJson({ method: "PUT", url: "/api/settings/clinic/profile", payload: { medicalLicenseIssuedAt: "31.02.2026" } }),
    "Профиль клиники не сохранен: проверьте название, реквизиты, лицензию, часовой пояс и рабочий график."
  ],
  [
    "staff create invalid payload",
    await requestJson({ method: "POST", url: "/api/settings/staff", payload: { fullName: "", role: "doctor" } }),
    "Сотрудник не создан: заполните ФИО, роль, специальности и контактные данные в допустимом формате."
  ],
  [
    "staff working hours invalid payload",
    await requestJson({
      method: "PUT",
      url: "/api/settings/staff/00000000-0000-4000-8000-000000000001/working-hours",
      payload: { workingHours: { weekdays: "bad" } }
    }),
    "Расписание сотрудника не сохранено: проверьте рабочие дни, начало и окончание смены."
  ],
  [
    "chair create invalid payload",
    await requestJson({ method: "POST", url: "/api/settings/chairs", payload: { name: "" } }),
    "Кресло не создано: заполните название, кабинет, оснащение и специализацию в допустимом формате."
  ],
  [
    "chair working hours invalid payload",
    await requestJson({
      method: "PUT",
      url: "/api/settings/chairs/00000000-0000-4000-8000-000000000001/working-hours",
      payload: { workingHours: { weekdays: "bad" } }
    }),
    "Расписание кресла не сохранено: проверьте рабочие дни, начало и окончание смены."
  ]
];

for (const [label, actual, expectedMessage] of checks) {
  assertRouteValidationResponse(actual, label, expectedMessage);
}

const mutationRejectionChecks = [
  [
    "staff working hours unknown staff",
    await requestJson({
      method: "PUT",
      url: "/api/settings/staff/00000000-0000-4000-8000-000000000001/working-hours",
      payload: { workingHours: disabledWorkingHours }
    }),
    404,
    "StaffScheduleNotFound",
    "staff_not_found",
    "Расписание сотрудника не сохранено: сотрудник не найден."
  ],
  [
    "chair working hours unknown chair",
    await requestJson({
      method: "PUT",
      url: "/api/settings/chairs/00000000-0000-4000-8000-000000000001/working-hours",
      payload: { workingHours: disabledWorkingHours }
    }),
    404,
    "ChairScheduleNotFound",
    "chair_not_found",
    "Расписание кресла не сохранено: кресло не найдено."
  ]
];

for (const [label, actual, expectedStatus, expectedError, expectedReason, expectedMessage] of mutationRejectionChecks) {
  assertSettingsMutationRejection(actual, label, expectedStatus, expectedError, expectedReason, expectedMessage);
}

await app.close();
delete process.env.DENTE_SETTINGS_ADMIN_SECRET;
delete process.env.NODE_ENV;

console.log(
  JSON.stringify({
    ok: true,
    checkedRoutes: checks.map(([label]) => label),
    checkedMutationBoundaries: mutationRejectionChecks.map(([label]) => label),
    rawValidationHidden: true
  })
);
