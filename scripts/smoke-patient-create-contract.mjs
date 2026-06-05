import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.NODE_ENV = "production";
process.env.DENTE_CLINICAL_ADMIN_SECRET = "synthetic-clinical-secret";

const routePath = path.resolve("apps/api/dist/routes/patients.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { ZodError } = requireFromApi("zod");
const { registerPatientRoutes } = await import(pathToFileURL(routePath).href);
const { createPatient, patients } = await import(pathToFileURL(sampleDataPath).href);
const patientRouteSource = readFileSync("apps/api/src/routes/patients.ts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validationErrorHandler(error, _request, reply) {
  if (error instanceof ZodError || (error?.name === "ZodError" && Array.isArray(error.issues))) {
    return reply.code(400).send({ error: "ValidationError", issues: error.issues });
  }
  return reply.send(error);
}

const app = Fastify({ logger: false });
app.setErrorHandler(validationErrorHandler);
await registerPatientRoutes(app);

const clinicalHeaders = { "x-dente-admin-secret": process.env.DENTE_CLINICAL_ADMIN_SECRET };
const originalPatientCount = patients.length;
const seededDuplicateSource = patients.find((patient) => patient.birthDate && patient.phone) ?? patients[0];
const patientCreateValidationMessage = "Пациент не создан: заполните ФИО, дату рождения, контакты и обязательные поля карты.";
const patientNotFoundMessage = "Пациент не найден. Обновите список пациентов и выберите актуальную карту.";
const patientDuplicateMessage = "Похожая карта пациента уже есть. Найдите пациента по ФИО или телефону и обновите существующую карточку.";

function assertNoPatientRouteLeak(text, label) {
  assert(
    !/ZodError|too_small|invalid_type|issues|path|fullName|birthDate|request\.body|safeParse|patientId|administrativeProfile|identityDocument|error\.message|undefined|null/i.test(
      text
    ),
    `${label} leaked parser/route/domain detail: ${text}`
  );
}

function assertPatientCreateValidationResponse(response, label) {
  assert(response.statusCode === 400, `${label} must be rejected: ${response.statusCode} ${response.body}`);
  const body = response.json();
  assert(body.error === "PatientValidationError", `${label} must return bounded PatientValidationError`);
  assert(body.message === patientCreateValidationMessage, `${label} must return the public patient-create validation message`);
  assert(!Object.hasOwn(body, "issues"), `${label} must not expose zod issues`);
  assertNoPatientRouteLeak(response.body, label);
  assert(patients.length === originalPatientCount, `${label} must not create a patient`);
}

function assertPatientNotFoundResponse(response, label) {
  assert(response.statusCode === 404, `${label} must return 404: ${response.statusCode} ${response.body}`);
  const body = response.json();
  assert(body.error === "PatientNotFound", `${label} must return stable PatientNotFound code`);
  assert(body.message === patientNotFoundMessage, `${label} must return operator-readable not-found message`);
  assert(!Object.hasOwn(body, "issues"), `${label} must not expose zod issues`);
  assertNoPatientRouteLeak(response.body, label);
}

function assertPatientDuplicateResponse(response, label) {
  assert(response.statusCode === 409, `${label} must return 409: ${response.statusCode} ${response.body}`);
  const body = response.json();
  assert(body.error === "PatientDuplicateError", `${label} must return stable PatientDuplicateError code`);
  assert(body.message === patientDuplicateMessage, `${label} must return operator-readable duplicate message`);
  assert(!Object.hasOwn(body, "issues"), `${label} must not expose zod issues`);
  assertNoPatientRouteLeak(response.body, label);
}

assert(patientRouteSource.includes("PatientNotFound"), "patient route must expose stable not-found code");
assert(patientRouteSource.includes("PatientRouteValidationError"), "patient route must expose stable route validation code");
assert(patientRouteSource.includes("PatientDuplicateError"), "patient route must expose stable duplicate code");
assert(
  !patientRouteSource.includes("error instanceof Error ? error.message") &&
    !patientRouteSource.includes('send({ error: "Не указан patientId пациента" })'),
  "patient route must not expose domain errors or route-id text directly in public error"
);

const whitespaceNameResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "     ",
    phone: "+7 900 000-00-00"
  }
});
assertPatientCreateValidationResponse(whitespaceNameResponse, "blank patient name");

const longNameResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "А".repeat(241)
  }
});
assertPatientCreateValidationResponse(longNameResponse, "overlong patient name");

const impossibleBirthDateResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "Birth Date Contract",
    birthDate: "31.02.2026"
  }
});
assertPatientCreateValidationResponse(impossibleBirthDateResponse, "impossible patient birth date");

const futureBirthDateResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "Future Birth Date Contract",
    birthDate: "2100-01-01"
  }
});
assertPatientCreateValidationResponse(futureBirthDateResponse, "future patient birth date");

const shortPhoneResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "Short Phone Contract",
    phone: "12"
  }
});
assertPatientCreateValidationResponse(shortPhoneResponse, "short patient phone");

const validCreateResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "  Контрактный Пациент  ",
    birthDate: " 1990-01-02 ",
    phone: " +7 900 111-22-33 ",
    email: " patient.contract@example.test ",
    notes: " заметка без внешних пробелов "
  }
});
assert(validCreateResponse.statusCode === 201, `trimmed patient create failed: ${validCreateResponse.statusCode} ${validCreateResponse.body}`);
const createdPatient = validCreateResponse.json();
assert(createdPatient.fullName === "Контрактный Пациент", "created patient fullName must be trimmed");
assert(createdPatient.birthDate === "1990-01-02", "created patient birthDate must be trimmed");
assert(createdPatient.phone === "+7 900 111-22-33", "created patient phone must be trimmed");
assert(createdPatient.email === "patient.contract@example.test", "created patient email must be trimmed");
assert(createdPatient.notes === "заметка без внешних пробелов", "created patient notes must be trimmed");

const russianDateResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "Russian Date Contract",
    birthDate: "03.02.1988"
  }
});
assert(russianDateResponse.statusCode === 201, `Russian patient birth date failed: ${russianDateResponse.statusCode} ${russianDateResponse.body}`);
assert(russianDateResponse.json().birthDate === "1988-02-03", "Russian patient birth date must be normalized to ISO date");

assert(seededDuplicateSource, "fixture patient for duplicate check missing");
const duplicateCreateResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: `  ${seededDuplicateSource.fullName}  `,
    birthDate: seededDuplicateSource.birthDate,
    phone: ` ${seededDuplicateSource.phone} `
  }
});
assertPatientDuplicateResponse(duplicateCreateResponse, "duplicate patient create");
assert(patients.length === originalPatientCount + 2, "duplicate patient create must not append a new patient");

const duplicateUpdateResponse = await app.inject({
  method: "PUT",
  url: `/api/patients/${createdPatient.id}`,
  headers: clinicalHeaders,
  payload: {
    fullName: seededDuplicateSource.fullName,
    birthDate: seededDuplicateSource.birthDate,
    phone: seededDuplicateSource.phone
  }
});
assertPatientDuplicateResponse(duplicateUpdateResponse, "duplicate patient update");

const missingUpdatePatientResponse = await app.inject({
  method: "PUT",
  url: "/api/patients/11111111-1111-4111-8111-111111111111",
  headers: clinicalHeaders,
  payload: {
    fullName: "Missing Patient Update",
    birthDate: "1980-01-01"
  }
});
assertPatientNotFoundResponse(missingUpdatePatientResponse, "missing patient core update");

const missingAdministrativePatientResponse = await app.inject({
  method: "PUT",
  url: "/api/patients/11111111-1111-4111-8111-111111111111/administrative-profile",
  headers: clinicalHeaders,
  payload: {
    identityDocument: "Паспорт 0000 000000"
  }
});
assertPatientNotFoundResponse(missingAdministrativePatientResponse, "missing patient administrative update");

let directCreateRejected = false;
try {
  createPatient({ fullName: "   " });
} catch (error) {
  directCreateRejected = error instanceof Error && error.message === "ФИО пациента обязательно";
}
assert(directCreateRejected, "domain createPatient must reject a whitespace-only direct call");

let directImpossibleBirthDateRejected = false;
try {
  createPatient({ fullName: "Direct Impossible Birth Date", birthDate: "2026-02-31" });
} catch (error) {
  directImpossibleBirthDateRejected = error instanceof Error && error.message.includes("Дата рождения пациента");
}
assert(directImpossibleBirthDateRejected, "domain createPatient must reject impossible birth dates");

const directRussianBirthDatePatient = createPatient({ fullName: "Direct Russian Birth Date", birthDate: "04.03.1988" });
assert(directRussianBirthDatePatient.birthDate === "1988-03-04", "domain createPatient must normalize Russian birth dates");

await app.close();

delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

console.log(
  JSON.stringify(
    {
      ok: true,
      patientCreateContract: true,
      createdPatientId: createdPatient.id
    },
    null,
    2
  )
);
