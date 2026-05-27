import { existsSync } from "node:fs";
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

const whitespaceNameResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "     ",
    phone: "+7 900 000-00-00"
  }
});
assert(whitespaceNameResponse.statusCode === 400, `blank patient name must be rejected: ${whitespaceNameResponse.statusCode} ${whitespaceNameResponse.body}`);
assert(whitespaceNameResponse.json().error === "ValidationError", "blank patient name must return validation error");
assert(patients.length === originalPatientCount, "blank patient name must not create a patient");

const longNameResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "А".repeat(241)
  }
});
assert(longNameResponse.statusCode === 400, `overlong patient name must be rejected: ${longNameResponse.statusCode} ${longNameResponse.body}`);
assert(patients.length === originalPatientCount, "overlong patient name must not create a patient");

const impossibleBirthDateResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "Birth Date Contract",
    birthDate: "31.02.2026"
  }
});
assert(
  impossibleBirthDateResponse.statusCode === 400,
  `impossible patient birth date must be rejected: ${impossibleBirthDateResponse.statusCode} ${impossibleBirthDateResponse.body}`
);
assert(patients.length === originalPatientCount, "impossible patient birth date must not create a patient");

const futureBirthDateResponse = await app.inject({
  method: "POST",
  url: "/api/patients",
  headers: clinicalHeaders,
  payload: {
    fullName: "Future Birth Date Contract",
    birthDate: "2100-01-01"
  }
});
assert(
  futureBirthDateResponse.statusCode === 400,
  `future patient birth date must be rejected: ${futureBirthDateResponse.statusCode} ${futureBirthDateResponse.body}`
);
assert(patients.length === originalPatientCount, "future patient birth date must not create a patient");

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
