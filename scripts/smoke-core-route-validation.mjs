import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";
process.env.DENTE_SCHEDULE_ADMIN_SECRET = "synthetic-schedule-secret";
delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
delete process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS;

const routeFiles = {
  ai: path.resolve("apps/api/dist/routes/ai.js"),
  billing: path.resolve("apps/api/dist/routes/billing.js"),
  clinical: path.resolve("apps/api/dist/routes/clinical.js"),
  communications: path.resolve("apps/api/dist/routes/communications.js"),
  patients: path.resolve("apps/api/dist/routes/patients.js"),
  schedule: path.resolve("apps/api/dist/routes/schedule.js")
};

for (const [label, routePath] of Object.entries(routeFiles)) {
  if (!existsSync(routePath)) {
    throw new Error(`Build API first: npm run build -w @dental/api (${label} missing)`);
  }
}

const sourceFiles = {
  ai: readFileSync("apps/api/src/routes/ai.ts", "utf8"),
  billing: readFileSync("apps/api/src/routes/billing.ts", "utf8"),
  clinical: readFileSync("apps/api/src/routes/clinical.ts", "utf8"),
  communications: readFileSync("apps/api/src/routes/communications.ts", "utf8"),
  patients: readFileSync("apps/api/src/routes/patients.ts", "utf8"),
  schedule: readFileSync("apps/api/src/routes/schedule.ts", "utf8")
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const forbiddenSourceNeedles = [
  ["ai", "parsedInput.error.issues.map((issue) => issue.message).join"],
  ["billing", "parsedInput.error.issues.map((issue) => issue.message)"],
  ["communications", "parsedInput.error.issues.map((issue) => issue.message).join"],
  ["communications", "message: error.message"],
  ["clinical", "clinicalRuleEvaluationInputSchema.parse(request.body)"],
  ["clinical", "createClinicalRuleSchema.parse(request.body)"],
  ["patients", "createPatientSchema.parse(request.body)"],
  ["patients", "updatePatientSchema.parse(request.body)"],
  ["patients", "updatePatientAdministrativeProfileSchema.parse(request.body)"],
  ["schedule", "createAppointmentSchema.parse(request.body)"],
  ["schedule", "updateAppointmentSchema.parse(request.body)"],
  ["schedule", "message: error instanceof Error ? error.message"],
  ["schedule", "const message = error instanceof Error ? error.message"]
];

for (const [label, needle] of forbiddenSourceNeedles) {
  assert(!sourceFiles[label].includes(needle), `${label} route still exposes raw request validation: ${needle}`);
}

[
  ["ai", "AiRecognitionValidationError"],
  ["ai", "VisitNoteDraftValidationError"],
  ["billing", "BillingValidationError"],
  ["communications", "CommunicationTaskValidationError"],
  ["communications", "communicationTaskNotFoundMessage"],
  ["clinical", "parseClinicalPayload("],
  ["patients", "parsePatientPayload("],
  ["schedule", "parseSchedulePayload("],
  ["schedule", "appointmentRejectionResponse("]
].forEach(([label, needle]) => {
  assert(sourceFiles[label].includes(needle), `${label} route must keep route-owned validation marker: ${needle}`);
});

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerAiRoutes } = await import(pathToFileURL(routeFiles.ai).href);
const { registerBillingRoutes } = await import(pathToFileURL(routeFiles.billing).href);
const { registerClinicalRoutes } = await import(pathToFileURL(routeFiles.clinical).href);
const { registerCommunicationRoutes } = await import(pathToFileURL(routeFiles.communications).href);
const { registerPatientRoutes } = await import(pathToFileURL(routeFiles.patients).href);
const { registerScheduleRoutes } = await import(pathToFileURL(routeFiles.schedule).href);

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
await registerAiRoutes(app);
await registerBillingRoutes(app);
await registerClinicalRoutes(app);
await registerCommunicationRoutes(app);
await registerPatientRoutes(app);
await registerScheduleRoutes(app);

const clinicalHeaders = {
  "x-dente-admin-secret": "synthetic-clinical-secret",
  "content-type": "application/json"
};
const scheduleHeaders = {
  "x-dente-admin-secret": "synthetic-schedule-secret",
  "content-type": "application/json"
};

const forbiddenValidationTerms =
  /ZodError|too_small|invalid_type|invalid_string|issues|path|request\.body|safeParse|patientId|visitId|birthDate|fullName|administrativeProfile|preferredAppointmentStart|preferredAppointmentEnd|doctorUserId|assistantUserId|chairId|startsAt|endsAt|appointmentId|amountRub|fiscalReceipt|payerInn|kind|target|inputText|imagingStudyId|transcript|specialty|taskId|ruleId|serviceIds|triggerServiceIds|warningText|patientText/i;

const routeValidationMessageOverrides = new Map([
  ["appointment create invalid payload", "Запись не создана: выберите пациента, врача, кресло, дату и время приема."],
  ["appointment update invalid payload", "Запись не обновлена: проверьте статус, время, врача, кресло и пациента."]
]);

async function requestJson(options, headers = clinicalHeaders) {
  const response = await app.inject({
    ...options,
    headers: {
      ...headers,
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
  const boundedMessage = routeValidationMessageOverrides.get(label) ?? expectedMessage;
  assert(actual.response.statusCode === 400, `${label} must return 400, got ${actual.response.statusCode}: ${actual.text}`);
  assert(actual.body.message === boundedMessage, `${label} must return bounded message, got: ${actual.text}`);
  assert(!Object.hasOwn(actual.body, "issues"), `${label} must not return zod issues`);
  assert(!forbiddenValidationTerms.test(actual.text), `${label} leaked schema/parser detail: ${actual.text}`);
}

const checks = [
  [
    "patient create invalid payload",
    await requestJson({ method: "POST", url: "/api/patients", payload: {} }),
    "Пациент не создан: заполните ФИО, дату рождения, контакты и обязательные поля карты."
  ],
  [
    "patient update invalid payload",
    await requestJson({
      method: "PUT",
      url: "/api/patients/00000000-0000-4000-8000-000000000001",
      payload: { birthDate: 123 }
    }),
    "Пациент не обновлен: проверьте ФИО, дату рождения, контакты и обязательные поля карты."
  ],
  [
    "patient administrative profile invalid payload",
    await requestJson({
      method: "PUT",
      url: "/api/patients/00000000-0000-4000-8000-000000000001/administrative-profile",
      payload: { preferredAppointmentStart: "10:00" }
    }),
    "Административный профиль не сохранен: проверьте документы, согласия, страховку и данные представителя."
  ],
  [
    "billing payment invalid payload",
    await requestJson({ method: "POST", url: "/api/billing/payments", payload: {} }),
    "Оплата не записана: проверьте сумму, дату, способ оплаты, фискальный чек и явные данные плательщика."
  ],
  [
    "ai recognition invalid payload",
    await requestJson({ method: "POST", url: "/api/ai/recognition-jobs", payload: {} }),
    "AI-задача не создана: выберите пациента или снимок и тип черновика."
  ],
  [
    "visit note draft invalid payload",
    await requestJson({ method: "POST", url: "/api/ai/visit-note-draft", payload: {} }),
    "Черновик приема не собран: передайте текст диктовки и специальность врача."
  ],
  [
    "communication task complete invalid payload",
    await requestJson({ method: "POST", url: "/api/communications/tasks/complete", payload: {} }),
    "Задача связи не закрыта: выберите задачу, сотрудника и корректный исход действия."
  ],
  [
    "clinical rule evaluate invalid payload",
    await requestJson({ method: "POST", url: "/api/clinical/rules/evaluate", payload: {} }),
    "Клинические правила не проверены: передайте пациента, визит и факты приема."
  ],
  [
    "clinical rule create invalid payload",
    await requestJson({ method: "POST", url: "/api/clinical/rules", payload: {} }),
    "Клиническое правило не сохранено: заполните название, условие и действие правила."
  ],
  [
    "clinical rule update invalid payload",
    await requestJson({
      method: "PATCH",
      url: "/api/clinical/rules/smoke-rule",
      payload: { active: "yes" }
    }),
    "Клиническое правило не сохранено: заполните название, условие и действие правила."
  ],
  [
    "appointment create invalid payload",
    await requestJson({ method: "POST", url: "/api/appointments", payload: {} }, scheduleHeaders),
    "Запись не создана: выберите пациента, врача, кресло, дату и время приема."
  ],
  [
    "appointment update invalid payload",
    await requestJson(
      {
        method: "PATCH",
        url: "/api/appointments/00000000-0000-4000-8000-000000000001",
        payload: { startsAt: "bad-date" }
      },
      scheduleHeaders
    ),
    "Запись не обновлена: проверьте статус, время, врача, кресло и пациента."
  ]
];

for (const [label, actual, expectedMessage] of checks) {
  assertRouteValidationResponse(actual, label, expectedMessage);
}

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    checkedRoutes: checks.map(([label]) => label),
    rawValidationHidden: true
  })
);
