import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-patient-admin-"));
const stateFilePath = path.join(tempRoot, "state.json");
const backupDirectoryPath = path.join(tempRoot, "backups");

process.env.DENTAL_STATE_FILE = stateFilePath;
process.env.DENTAL_STATE_BACKUP_DIR = backupDirectoryPath;
process.env.DENTAL_STATE_BACKUPS = "2";
delete process.env.DENTAL_STATE_PERSISTENCE;

const routePath = path.resolve("apps/api/dist/routes/patients.js");
const rendererPath = path.resolve("apps/api/dist/documents/renderDocument.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(rendererPath) || !existsSync(sampleDataPath)) {
  throw new Error("Build shared and API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerPatientRoutes } = await import(pathToFileURL(routePath).href);
const { renderDocumentHtml } = await import(pathToFileURL(rendererPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const appSource = readFileSync(path.resolve("apps/web/src/App.tsx"), "utf8");
const patientsSource = readFileSync(path.resolve("apps/web/src/PatientsView.tsx"), "utf8");
assert(appSource.includes('lazy(() => import("./PatientsView")'), "patients screen must stay behind the lazy route boundary");
assert(patientsSource.includes("patient-core-form-grid"), "patient core edit form is missing from UI source");
assert(appSource.includes("setSelectedPatientId(patient.id)"), "created patient must become selected");
assert(patientsSource.includes("setSelectedPatientId(patient.id)}"), "patient list action must select the clicked patient");
assert(patientsSource.includes("Сохранить карточку"), "patient core save button must be readable Russian");
assert(patientsSource.includes("Телефон нового пациента"), "quick patient creation must capture phone");
assert(patientsSource.includes("Дата рождения нового пациента"), "quick patient creation must capture birth date");
assert(patientsSource.includes("patientCoreReadyToSave"), "patient core save button must use a readiness guard");
assert(patientsSource.includes("patientAdministrativeProfileReadyToSave"), "patient requisites save button must use a readiness guard");

const organizationId = "11111111-1111-4111-8111-111111111111";
const representativeValidationMessage =
  "Данные представителя не сохранены: если указаны телефон, документ или получатель представителя, заполните ФИО и основание представительства.";
const profilePayload = {
  identityDocument: "паспорт РФ 3600 123456",
  taxpayerInn: "123456789012",
  registrationAddress: "443000, Самара, ул. Документальная, 10",
  residentialAddress: "443001, Самара, ул. Фактическая, 20",
  insurancePolicyNumber: "ДМС-123456",
  snils: "123-456-789 00",
  legalRepresentativeFullName: "Иванова Анна Петровна",
  legalRepresentativeRelationship: "мать",
  legalRepresentativeIdentityDocument: "паспорт РФ 3601 654321",
  legalRepresentativePhone: "+7 900 111-22-33",
  preferredDocumentRecipient: "законному представителю Ивановой А.П.",
  dataProcessingBasisNote: "согласие представителя на обработку ПДн"
};

function documentFor(kind, patientId) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    organizationId,
    patientId,
    visitId: null,
    kind,
    title: `Administrative smoke ${kind}`,
    status: "draft",
    issuedAt: null,
    totalAmountRub: null,
    taxYear: null,
    taxPayerInn: null,
    payload: null
  };
}

try {
  const app = Fastify({ logger: false });
  await registerPatientRoutes(app);

  const listResponse = await app.inject({ method: "GET", url: "/api/patients" });
  assert(listResponse.statusCode === 200, `patient list failed: ${listResponse.statusCode} ${listResponse.body}`);
  const patient = JSON.parse(listResponse.body)[0];
  assert(patient?.id, "expected seeded patient");

  const incompleteRepresentativeResponse = await app.inject({
    method: "PUT",
    url: `/api/patients/${patient.id}/administrative-profile`,
    payload: { legalRepresentativePhone: "+7 900 000-00-01" }
  });
  assert(
    incompleteRepresentativeResponse.statusCode === 400,
    `incomplete representative profile must be blocked: ${incompleteRepresentativeResponse.statusCode} ${incompleteRepresentativeResponse.body}`
  );
  const incompleteRepresentativeBody = JSON.parse(incompleteRepresentativeResponse.body);
  assert(incompleteRepresentativeBody.error === "PatientValidationError", "incomplete representative block must use stable validation code");
  assert(
    incompleteRepresentativeBody.message === representativeValidationMessage,
    "incomplete representative block must return operator-safe Russian guidance"
  );
  assert(
    !/ZodError|issues|path|patientId|legalRepresentativePhone|undefined|null|request\.body|safeParse/i.test(
      incompleteRepresentativeResponse.body
    ),
    `incomplete representative response leaked parser or route detail: ${incompleteRepresentativeResponse.body}`
  );

  const coreUpdateResponse = await app.inject({
    method: "PUT",
    url: `/api/patients/${patient.id}`,
    payload: {
      fullName: "Тестовый Пациент Документов",
      birthDate: "1988-04-21",
      phone: "+7 900 333-44-55",
      email: "patient.documents@example.test",
      notes: "проверка карточки пациента для документов"
    }
  });
  assert(coreUpdateResponse.statusCode === 200, `patient core save failed: ${coreUpdateResponse.statusCode} ${coreUpdateResponse.body}`);
  const coreSavedPatient = JSON.parse(coreUpdateResponse.body);
  assert(coreSavedPatient.fullName === "Тестовый Пациент Документов", "patient core fullName mismatch");
  assert(coreSavedPatient.birthDate === "1988-04-21", "patient core birthDate mismatch");
  assert(coreSavedPatient.phone === "+7 900 333-44-55", "patient core phone mismatch");
  assert(coreSavedPatient.email === "patient.documents@example.test", "patient core email mismatch");

  const saveResponse = await app.inject({
    method: "PUT",
    url: `/api/patients/${patient.id}/administrative-profile`,
    payload: profilePayload
  });
  assert(saveResponse.statusCode === 200, `profile save failed: ${saveResponse.statusCode} ${saveResponse.body}`);
  const savedPatient = JSON.parse(saveResponse.body);
  assert(savedPatient.administrativeProfile.identityDocument === profilePayload.identityDocument, "identity document mismatch");
  assert(savedPatient.administrativeProfile.taxpayerInn === profilePayload.taxpayerInn, "taxpayer INN mismatch");
  assert(savedPatient.administrativeProfile.registrationAddress === profilePayload.registrationAddress, "address mismatch");
  assert(
    savedPatient.administrativeProfile.legalRepresentativeFullName === profilePayload.legalRepresentativeFullName,
    "representative mismatch"
  );

  const partialSaveResponse = await app.inject({
    method: "PUT",
    url: `/api/patients/${patient.id}/administrative-profile`,
    payload: { legalRepresentativePhone: "+7 900 222-33-44" }
  });
  assert(
    partialSaveResponse.statusCode === 200,
    `partial profile save failed: ${partialSaveResponse.statusCode} ${partialSaveResponse.body}`
  );
  const partiallySavedPatient = JSON.parse(partialSaveResponse.body);
  assert(
    partiallySavedPatient.administrativeProfile.identityDocument === profilePayload.identityDocument,
    "partial profile save wiped identity document"
  );
  assert(
    partiallySavedPatient.administrativeProfile.legalRepresentativePhone === "+7 900 222-33-44",
    "partial profile save did not update representative phone"
  );
  savedPatient.administrativeProfile = partiallySavedPatient.administrativeProfile;

  const representativeHtml = renderDocumentHtml(
    documentFor("minor_legal_representative_consent", savedPatient.id),
    savedPatient,
    {}
  );
  assert(representativeHtml.includes(profilePayload.legalRepresentativeFullName), "representative consent did not render saved representative");
  assert(
    representativeHtml.includes(profilePayload.legalRepresentativeIdentityDocument),
    "representative consent did not render representative document"
  );
  assert(representativeHtml.includes(profilePayload.preferredDocumentRecipient), "representative consent did not render recipient preference");

  const releaseHtml = renderDocumentHtml(documentFor("medical_document_release_receipt", savedPatient.id), savedPatient, {});
  assert(releaseHtml.includes(profilePayload.identityDocument), "release receipt did not render patient identity document");
  assert(releaseHtml.includes(profilePayload.preferredDocumentRecipient), "release receipt did not render recipient preference");

  const personalDataHtml = renderDocumentHtml(documentFor("personal_data_processing_consent", savedPatient.id), savedPatient, {});
  assert(personalDataHtml.includes(profilePayload.insurancePolicyNumber), "personal data consent did not render insurance policy");
  assert(personalDataHtml.includes(profilePayload.snils), "personal data consent did not render SNILS");
  assert(personalDataHtml.includes(profilePayload.taxpayerInn), "personal data consent did not render taxpayer INN");
  assert(personalDataHtml.includes(profilePayload.dataProcessingBasisNote), "personal data consent did not render processing basis note");

  const taxApplicationDocument = { ...documentFor("tax_deduction_application", savedPatient.id), taxYear: 2026 };
  const taxApplicationHtml = renderDocumentHtml(taxApplicationDocument, savedPatient, {});
  assert(taxApplicationHtml.includes(profilePayload.taxpayerInn), "tax application did not fallback to saved taxpayer INN");
  assert(taxApplicationHtml.includes(profilePayload.identityDocument), "tax application did not fallback to saved identity document");
  assert(taxApplicationHtml.includes(profilePayload.preferredDocumentRecipient), "tax application did not render saved recipient preference");

  await app.close();

  assert(existsSync(stateFilePath), "administrative profile save must create persistent state file");
  const persisted = JSON.parse(readFileSync(stateFilePath, "utf8"));
  const persistedPatient = persisted.state.patients.find((entry) => entry.id === savedPatient.id);
  assert(persistedPatient?.administrativeProfile?.identityDocument === profilePayload.identityDocument, "state file profile mismatch");
  assert(persisted.checksum, "state file must keep checksum after patient administrative save");

  const childCode = `
    import { patients } from ${JSON.stringify(pathToFileURL(sampleDataPath).href)};
    const patient = patients.find((entry) => entry.id === ${JSON.stringify(savedPatient.id)});
    console.log(JSON.stringify(patient?.administrativeProfile ?? null));
  `;
  const childOutput = execFileSync(process.execPath, ["--input-type=module", "-e", childCode], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DENTAL_STATE_FILE: stateFilePath,
      DENTAL_STATE_BACKUP_DIR: backupDirectoryPath,
      DENTAL_STATE_BACKUPS: "2",
      DENTAL_STATE_PERSISTENCE: ""
    },
    encoding: "utf8"
  });
  const reloadedProfile = JSON.parse(childOutput);
  assert(reloadedProfile?.identityDocument === profilePayload.identityDocument, "reloaded administrative profile mismatch");

  console.log(JSON.stringify({ ok: true, patientId: savedPatient.id, persisted: true }));
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
