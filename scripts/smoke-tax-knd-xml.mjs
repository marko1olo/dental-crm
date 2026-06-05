import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-tax-knd-xml-"));

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.join(tempRoot, "snapshots");
delete process.env.DENTE_FNS_TAX_OFFICE_CODE;
delete process.env.FNS_TAX_OFFICE_CODE;

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, clinicProfile, documents, patients, payments } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function documentErrorText(response) {
  const body = response.json();
  return String(body.message ?? body.error ?? "");
}

function assertNoMojibake(value, label) {
  assert(!/[ÐÑ]/.test(String(value)), `${label} contains mojibake`);
}

const appSource = [readFileSync("apps/web/src/App.tsx", "utf8"), readFileSync("apps/web/src/DocumentsView.tsx", "utf8")].join("\n");
const documentRoutesSource = readFileSync("apps/api/src/routes/documents.ts", "utf8");
const sampleDataSource = readFileSync("apps/api/src/sampleData.ts", "utf8");
const taxXmlSource = readFileSync("apps/api/src/documents/taxXml.ts", "utf8");
assert(appSource.includes("черновой файл заархивирован"), "document passport UI must expose immutable FNS draft file snapshot status");
assert(
  appSource.includes("факты готовы, нужна проверка формата, подпись и отправка"),
  "document passport UI must show that tax electronic file source facts still need external validation/signing/submission"
);
assert(
  appSource.includes("черновой файл для ФНС доступен после выдачи"),
  "document passport UI must describe KND file availability as a draft, not an official ready package"
);
assert(!appSource.includes('"XML КНД доступен после выдачи"'), "document passport UI must not call KND XML ready without the draft boundary");
assert(appSource.includes("humanizeDocumentAuditText(documentAuditFacts.taxXmlOfficialValidationNote)"), "document passport UI must render official tax XML validation boundary note through humanized copy");
assert(appSource.includes("Официальная проверка формата ФНС"), "Documents UI must translate XSD jargon for administrators");
assert(appSource.includes("электронная подпись"), "Documents UI must translate KEP jargon for administrators");
assert(appSource.includes("taxXmlSourceSnapshotSha256"), "document passport UI must show tax XML source snapshot hash");
assert(appSource.includes("taxXmlSnapshotSha256"), "document passport UI must show tax XML byte snapshot hash");
assert(appSource.includes('/api/documents/${documentId}/tax-xml'), "Documents UI must call the guarded FNS XML export endpoint");
assert(appSource.includes("Черновой файл ФНС"), "Documents UI must label KND export in Russian as a draft that still needs validation/signing");
assert(!appSource.includes("XML draft КНД"), "Documents UI must not expose English fallback in the KND XML button");
assert(
  appSource.includes('document.kind === "tax_deduction_certificate" && document.status === "issued"'),
  "Documents UI must expose FNS XML only for issued KND 1151156 certificates"
);
assert(taxXmlSource.includes('const KND_1151156_PRINT_FORM_CODE = "1151156"'), "tax XML must name the printed KND 1151156 form code");
assert(taxXmlSource.includes('const FNS_MEDICAL_EXPENSE_XML_KND = "1184043"'), "tax XML must name the electronic FNS KND 1184043 code");
assert(taxXmlSource.includes('const FNS_MEDICAL_EXPENSE_XML_VERSION = "5.01"'), "tax XML must name the FNS XSD version");
assert(taxXmlSource.includes("FNS_MEDICAL_EXPENSE_NOTICE_NUMBER_MAX_LENGTH = 12"), "tax XML must enforce official XSD НомерСвед length");
assert(taxXmlSource.includes("DENTE XML draft for issued KND"), "tax XML must be explicitly described as a draft export");
assert(taxXmlSource.includes("validateKnd1151156XmlDraft"), "tax XML must run an internal DENTE structural preflight before archiving");
assert(taxXmlSource.includes("структурную предпроверку DENTE"), "tax XML preflight failures must be operator-readable in Russian");
assert(taxXmlSource.includes("invalid-token"), "tax XML preflight must reject technical placeholder tokens");
assert(taxXmlSource.includes("не подписанный ТКС-пакет"), "tax XML warning must say it is not a signed TKS package");
assert(taxXmlSource.includes("СведДок"), "tax XML must export parseable identity document data as official СведДок");
assert(taxXmlSource.includes("КодВидДок"), "tax XML identity document export must include official document kind code");
assert(!taxXmlSource.includes("patient.administrativeProfile?.taxpayerInn || fallbackPayment.payerInn"), "non-self tax XML must not reuse payer INN as patient INN");
assert(!taxXmlSource.includes("patient.birthDate || fallbackPayment.payerBirthDate"), "non-self tax XML must not reuse payer birth date as patient birth date");
assert(documentRoutesSource.includes("taxXmlSourceSnapshotForIssue"), "tax XML source facts must be frozen during document issue");
assert(documentRoutesSource.includes("frozenTaxXmlPatient"), "tax XML export must read frozen patient facts");
assert(documentRoutesSource.includes("frozenTaxXmlClinicProfile"), "tax XML export must read frozen clinic facts");
assert(documentRoutesSource.includes("frozenTaxXmlPayments"), "tax XML export must read frozen payment facts");
assert(documentRoutesSource.includes("document.taxXmlSnapshot"), "tax XML route must reuse the immutable first exported XML snapshot");
assert(documentRoutesSource.includes("taxXmlSourceSnapshotSha256"), "tax XML audit must expose the source snapshot hash");
assert(documentRoutesSource.includes("taxXmlOfficialValidationStatus"), "tax XML audit must expose external validation status");
assert(documentRoutesSource.includes("Официальная XSD-валидация, КЭП и отправка ЭДО/ТКС"), "tax XML audit must state external XSD/KEP/EDO boundary in Russian");
assert(sampleDataSource.includes("storeTaxXmlSnapshot"), "sample data store must persist immutable tax XML snapshots");

const app = Fastify({ logger: false });

try {
  await registerDocumentRoutes(app);

  const taxPayment = payments.find((payment) => payment.patientId === activeVisit.patientId && payment.payerInn === "123456789012");
  assert(taxPayment, "fixture must contain a tax payment for XML export");

  const certificatePayload = {
    patientId: activeVisit.patientId,
    visitId: null,
    kind: "tax_deduction_certificate",
    taxYear: 2026,
    taxPayerInn: "123456789012",
    totalAmountRub: 3000,
    payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment.id] } }
  };

  const certificateCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: certificatePayload
  });
  assert(certificateCreateResponse.statusCode === 201, `tax certificate create failed: ${certificateCreateResponse.statusCode}`);
  const certificate = certificateCreateResponse.json();

  const draftXmlResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${certificate.id}/tax-xml`
  });
  assert(draftXmlResponse.statusCode === 409, `draft tax XML must be blocked: ${draftXmlResponse.statusCode}`);
  assert(documentErrorText(draftXmlResponse).includes("после выдачи"), "draft tax XML block must require issued certificate");
  assertNoMojibake(draftXmlResponse.body, "draft tax XML response");

  const missingApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${certificate.id}/issue`
  });
  assert(
    missingApplicationIssueResponse.statusCode === 409,
    `tax certificate issue without application must be blocked: ${missingApplicationIssueResponse.statusCode}`
  );
  assert(
    documentErrorText(missingApplicationIssueResponse).includes("заявление"),
    "tax certificate issue block must explain missing taxpayer application"
  );
  assertNoMojibake(missingApplicationIssueResponse.body, "missing application issue response");

  const tenDigitInnPayment = {
    ...taxPayment,
    id: randomUUID(),
    documentId: null,
    amountRub: 3100,
    payerInn: "1234567890",
    payerRelationship: "self",
    fiscalReceiptNumber: `TEN-DIGIT-INN-${Date.now()}`,
    fiscalReceiptIssuedAt: "2026-05-23T09:00:00.000+04:00",
    paidAt: "2026-05-23T09:00:00.000+04:00",
    createdAt: "2026-05-23T09:00:00.000+04:00"
  };
  payments.push(tenDigitInnPayment);
  const tenDigitInnApplicationResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: tenDigitInnPayment.payerFullName,
          taxpayerInn: tenDigitInnPayment.payerInn,
          taxpayerBirthDate: tenDigitInnPayment.payerBirthDate,
          taxpayerIdentityDocument: tenDigitInnPayment.payerIdentityDocument,
          relationshipToPatient: "self",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [tenDigitInnPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: null,
          requestedAt: "2026-05-20T10:30:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(tenDigitInnApplicationResponse.statusCode === 400, `10-digit KND taxpayer INN must be rejected at create: ${tenDigitInnApplicationResponse.statusCode}`);
  assert(String(tenDigitInnApplicationResponse.json().message).includes("12-"), "10-digit KND taxpayer INN block must explain 12-digit physical-person INN");
  assertNoMojibake(tenDigitInnApplicationResponse.body, "10-digit payer INN create response");

  const identityOnlyPayment = {
    ...taxPayment,
    id: randomUUID(),
    documentId: null,
    amountRub: 3300,
    payerFullName: "Сидоров Алексей Петрович",
    payerInn: null,
    payerBirthDate: "1982-04-05",
    payerIdentityDocument: "паспорт 3601 000002, выдан 02.03.2021",
    payerRelationship: "self",
    fiscalReceiptNumber: `IDENTITY-ONLY-${Date.now()}`,
    fiscalReceiptIssuedAt: "2026-05-25T09:00:00.000+04:00",
    paidAt: "2026-05-25T09:00:00.000+04:00",
    createdAt: "2026-05-25T09:00:00.000+04:00"
  };
  payments.push(identityOnlyPayment);
  const identityOnlyApplicationResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: identityOnlyPayment.payerFullName,
          taxpayerInn: "",
          taxpayerBirthDate: identityOnlyPayment.payerBirthDate,
          taxpayerIdentityDocument: identityOnlyPayment.payerIdentityDocument,
          relationshipToPatient: "self",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [identityOnlyPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: null,
          requestedAt: "2026-05-20T10:30:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(
    identityOnlyApplicationResponse.statusCode === 201,
    `identity-only KND application create failed: ${identityOnlyApplicationResponse.statusCode} ${identityOnlyApplicationResponse.body}`
  );
  const identityOnlyApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${identityOnlyApplicationResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: identityOnlyPayment.payerFullName, note: "identity only application" } })
  });
  assert(
    identityOnlyApplicationIssueResponse.statusCode === 200,
    `identity-only KND application issue failed: ${identityOnlyApplicationIssueResponse.statusCode} ${identityOnlyApplicationIssueResponse.body}`
  );
  const identityOnlyCertificateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      ...certificatePayload,
      taxPayerInn: null,
      totalAmountRub: 3300,
      payload: { taxPaymentSelection: { selectedPaymentIds: [identityOnlyPayment.id] } }
    }
  });
  assert(
    identityOnlyCertificateResponse.statusCode === 201,
    `identity-only KND certificate create failed: ${identityOnlyCertificateResponse.statusCode} ${identityOnlyCertificateResponse.body}`
  );
  const identityOnlyIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${identityOnlyCertificateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: identityOnlyPayment.payerFullName, note: "identity only certificate" } })
  });
  assert(
    identityOnlyIssueResponse.statusCode === 200,
    `identity-only KND certificate issue failed: ${identityOnlyIssueResponse.statusCode} ${identityOnlyIssueResponse.body}`
  );

  const spousePayment = {
    ...taxPayment,
    id: randomUUID(),
    documentId: null,
    amountRub: 3200,
    payerFullName: "Петрова Анна Викторовна",
    payerInn: "223456789012",
    payerBirthDate: "1987-03-12",
    payerIdentityDocument: "паспорт 6300 000001, выдан 01.02.2020",
    payerRelationship: "spouse",
    fiscalReceiptNumber: `SPOUSE-PAYER-${Date.now()}`,
    fiscalReceiptIssuedAt: "2026-05-24T09:00:00.000+04:00",
    paidAt: "2026-05-24T09:00:00.000+04:00",
    createdAt: "2026-05-24T09:00:00.000+04:00"
  };
  payments.push(spousePayment);
  const spouseApplicationResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: spousePayment.payerFullName,
          taxpayerInn: spousePayment.payerInn,
          taxpayerBirthDate: spousePayment.payerBirthDate,
          taxpayerIdentityDocument: spousePayment.payerIdentityDocument,
          relationshipToPatient: "spouse",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [spousePayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: "свидетельство о браке, проверено администратором",
          requestedAt: "2026-05-20T10:30:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(spouseApplicationResponse.statusCode === 201, `spouse application create failed: ${spouseApplicationResponse.statusCode}`);
  const spouseApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${spouseApplicationResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: spousePayment.payerFullName, note: "spouse application" } })
  });
  assert(spouseApplicationIssueResponse.statusCode === 200, `spouse application issue failed: ${spouseApplicationIssueResponse.statusCode}`);
  const spouseCertificateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      ...certificatePayload,
      taxPayerInn: spousePayment.payerInn,
      payload: { taxPaymentSelection: { selectedPaymentIds: [spousePayment.id] } }
    }
  });
  assert(spouseCertificateResponse.statusCode === 201, `spouse certificate create failed: ${spouseCertificateResponse.statusCode}`);
  const spouseIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${spouseCertificateResponse.json().id}/issue`
  });
  assert(spouseIssueResponse.statusCode === 409, "non-self KND certificate must require patient tax identity before issue");
  assert(documentErrorText(spouseIssueResponse).includes("ИНН пациента"), "non-self KND block must explain missing patient INN");
  assertNoMojibake(spouseIssueResponse.body, "non-self missing patient INN issue response");

  const activePatient = patients.find((patient) => patient.id === activeVisit.patientId);
  assert(activePatient, "fixture must contain active tax XML patient");
  const originalPatientFacts = {
    fullName: activePatient.fullName,
    birthDate: activePatient.birthDate,
    administrativeProfile: activePatient.administrativeProfile
      ? JSON.parse(JSON.stringify(activePatient.administrativeProfile))
      : null
  };
  const originalClinicFacts = {
    inn: clinicProfile.inn,
    signatoryName: clinicProfile.signatoryName
  };
  activePatient.administrativeProfile = {
    identityDocument: "паспорт 6300 000099, выдан 01.01.2020",
    taxpayerInn: "323456789012",
    registrationAddress: null,
    residentialAddress: null,
    insurancePolicyNumber: null,
    snils: null,
    legalRepresentativeFullName: null,
    legalRepresentativeRelationship: null,
    legalRepresentativeIdentityDocument: null,
    legalRepresentativePhone: null,
    preferredDocumentRecipient: null,
    preferredAppointmentWeekdays: [],
    preferredAppointmentStart: null,
    preferredAppointmentEnd: null,
    preferredAppointmentNote: null,
    dataProcessingBasisNote: null
  };
  const spouseIssueReadyResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${spouseCertificateResponse.json().id}/issue`,
    payload: issueAttestation({
      signatureAttestation: { recipientFullName: spousePayment.payerFullName, note: "spouse certificate after patient tax identity" }
    })
  });
  assert(
    spouseIssueReadyResponse.statusCode === 200,
    `non-self KND certificate issue with patient tax identity failed: ${spouseIssueReadyResponse.statusCode} ${spouseIssueReadyResponse.body}`
  );
  const spouseIssuedCertificate = documents.find((document) => document.id === spouseCertificateResponse.json().id);
  assert(
    spouseIssuedCertificate?.taxXmlSourceSnapshot?.patient.administrativeProfile?.taxpayerInn === "323456789012",
    "non-self issued tax certificate must freeze patient taxpayer facts for XML"
  );
  assert(
    spouseIssuedCertificate?.taxXmlSourceSnapshot?.clinicProfile.inn === originalClinicFacts.inn,
    "non-self issued tax certificate must freeze clinic facts for XML"
  );
  try {
    activePatient.fullName = "MUTATED XML PATIENT";
    activePatient.birthDate = "2000-01-01";
    activePatient.administrativeProfile.taxpayerInn = "999999999999";
    activePatient.administrativeProfile.identityDocument = "паспорт 9999 999999, выдан 09.09.2099";
    clinicProfile.inn = "999999999999";
    clinicProfile.signatoryName = "MUTATED XML SIGNER";
    process.env.DENTE_FNS_TAX_OFFICE_CODE = "6310";
    const spouseXmlResponse = await app.inject({
      method: "GET",
      url: `/api/documents/${spouseCertificateResponse.json().id}/tax-xml`
    });
    assert(
      spouseXmlResponse.statusCode === 200,
      `non-self tax XML must use frozen patient/clinic facts, got ${spouseXmlResponse.statusCode} ${spouseXmlResponse.body}`
    );
    assert(spouseXmlResponse.body.includes('ИНН="323456789012"'), "non-self XML must keep frozen patient INN");
    assert(spouseXmlResponse.body.includes('ИННФЛ="631234567890"'), "non-self XML must keep frozen clinic INN");
    assert(spouseXmlResponse.body.includes('ПрПациент="0"'), "non-self XML must mark taxpayer and patient as different people");
    assert(spouseXmlResponse.body.includes("<Пациент"), "non-self XML must include frozen patient node");
    assert(spouseXmlResponse.body.includes('НомКорр="0"'), "non-self XML must keep primary correction number");
    assert(!spouseXmlResponse.body.includes("MUTATED XML"), "non-self XML must not use mutated live patient/clinic text");
    assert(!spouseXmlResponse.body.includes("999999999999"), "non-self XML must not use mutated live INN values");
    assert(!spouseXmlResponse.body.includes("NaN"), "non-self XML must not contain NaN");
    assert(!spouseXmlResponse.body.includes("null"), "non-self XML must not contain null");
    assertNoMojibake(spouseXmlResponse.body, "non-self tax XML after live patient/clinic mutation");
  } finally {
    activePatient.fullName = originalPatientFacts.fullName;
    activePatient.birthDate = originalPatientFacts.birthDate;
    activePatient.administrativeProfile = originalPatientFacts.administrativeProfile;
    clinicProfile.inn = originalClinicFacts.inn;
    clinicProfile.signatoryName = originalClinicFacts.signatoryName;
    delete process.env.DENTE_FNS_TAX_OFFICE_CODE;
  }

  const mismatchedApplicationResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      taxYear: 2026,
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: taxPayment.payerFullName,
          taxpayerInn: taxPayment.payerInn,
          taxpayerBirthDate: taxPayment.payerBirthDate,
          taxpayerIdentityDocument: taxPayment.payerIdentityDocument,
          relationshipToPatient: "self",
          requestedTaxYear: 2025,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [taxPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: null,
          requestedAt: "2026-05-20T10:30:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(mismatchedApplicationResponse.statusCode === 409, "tax application with mismatched document/payload year must be blocked");
  assert(documentErrorText(mismatchedApplicationResponse).includes("не совпадает"), "tax application mismatch must explain year mismatch");
  assertNoMojibake(mismatchedApplicationResponse.body, "mismatched tax application response");

  const applicationCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: taxPayment.payerFullName,
          taxpayerInn: taxPayment.payerInn,
          taxpayerBirthDate: taxPayment.payerBirthDate,
          taxpayerIdentityDocument: taxPayment.payerIdentityDocument,
          relationshipToPatient: "self",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [taxPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: null,
          requestedAt: "2026-05-20T10:30:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(applicationCreateResponse.statusCode === 201, `tax application create failed: ${applicationCreateResponse.statusCode}`);

  const applicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${applicationCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: taxPayment.payerFullName, note: "self tax application" } })
  });
  assert(applicationIssueResponse.statusCode === 200, `tax application issue failed: ${applicationIssueResponse.statusCode} ${applicationIssueResponse.body}`);

  const certificateIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${certificate.id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: taxPayment.payerFullName, note: "self tax certificate" } })
  });
  assert(certificateIssueResponse.statusCode === 200, `tax certificate issue failed before XML export: ${certificateIssueResponse.statusCode}`);
  const issuedCertificate = documents.find((document) => document.id === certificate.id);
  assert(issuedCertificate?.taxPaymentSnapshot?.paymentIds.includes(taxPayment.id), "issued tax certificate must freeze XML payment facts");
  assert(issuedCertificate?.taxXmlSourceSnapshot?.patient.id === activeVisit.patientId, "issued tax certificate must freeze patient facts for XML");
  assert(issuedCertificate?.taxXmlSourceSnapshot?.clinicProfile.inn === clinicProfile.inn, "issued tax certificate must freeze clinic facts for XML");
  assert(issuedCertificate?.taxXmlSourceSnapshot?.payments[0]?.id === taxPayment.id, "issued tax certificate must freeze XML payment rows");
  assert(!issuedCertificate?.taxXmlSnapshot, "tax XML snapshot must be created only after first successful XML export");
  const issuedAuditFactsResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${certificate.id}/audit-facts`
  });
  assert(issuedAuditFactsResponse.statusCode === 200, `issued tax audit facts failed: ${issuedAuditFactsResponse.statusCode}`);
  const issuedAuditFacts = issuedAuditFactsResponse.json();
  assert(
    issuedAuditFacts.taxXmlOfficialValidationStatus === "external_validation_required",
    "issued tax certificate audit must require external FNS XML validation"
  );
  assert(
    String(issuedAuditFacts.taxXmlOfficialValidationNote).includes("Официальная XSD-валидация"),
    "issued tax certificate audit must explain external XSD validation boundary"
  );
  assert(
    String(issuedAuditFacts.taxXmlOfficialValidationNote).includes("ЭДО/ТКС"),
    "issued tax certificate audit must explain external EDO/TKS boundary"
  );
  assertNoMojibake(issuedAuditFactsResponse.body, "issued tax audit facts response");

  const missingTaxOfficeResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${certificate.id}/tax-xml`
  });
  assert(missingTaxOfficeResponse.statusCode === 409, `tax XML without tax office code must be blocked: ${missingTaxOfficeResponse.statusCode}`);
  assert(
    documentErrorText(missingTaxOfficeResponse).includes("4-значный код налогового органа"),
    "tax XML block must explain missing FNS tax office code"
  );
  assert(
    !documentErrorText(missingTaxOfficeResponse).includes("DENTE_FNS_TAX_OFFICE_CODE"),
    "tax XML block must not expose the server env key as user-facing copy"
  );
  assertNoMojibake(missingTaxOfficeResponse.body, "missing tax office response");

  process.env.DENTE_FNS_TAX_OFFICE_CODE = "6310";

  const xmlResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${certificate.id}/tax-xml`
  });
  assert(xmlResponse.statusCode === 200, `tax XML export failed: ${xmlResponse.statusCode} ${xmlResponse.body}`);
  assert(xmlResponse.headers["content-type"]?.includes("application/xml"), "tax XML content-type mismatch");
  assert(xmlResponse.headers["content-disposition"]?.includes(".xml"), "tax XML content-disposition must expose XML filename");

  const xml = xmlResponse.body;
  assert(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'), "XML declaration missing");
  assert(xml.includes("<Файл "), "Файл root missing");
  assert(xml.includes('ВерсФорм="5.01"'), "FNS format version missing");
  assert(xml.includes('<Документ КНД="1184043"'), "official XSD KND code missing");
  assert(xml.includes("DENTE XML draft for issued KND 1151156"), "XML comment must tie draft export to issued printed KND certificate");
  assert(xml.includes("Not a signed TKS package"), "XML comment must warn that operator validation and KEP signing are still required");
  assert(xml.includes('КодНО="6310"'), "tax office code missing");
  assert(xml.includes("<СвНП>"), "clinic taxpayer node missing");
  assert(xml.includes("<НПИП "), "individual entrepreneur clinic node missing");
  assert(xml.includes("<Подписант "), "signer node missing");
  assert(xml.includes("<СведРасхУсл "), "medical expense info node missing");
  const noticeNumberMatch = xml.match(/НомерСвед="([^"]+)"/);
  assert(noticeNumberMatch, "medical expense notice number missing");
  assert(noticeNumberMatch[1].length <= 12, `medical expense notice number must fit official XSD maxLength=12, got ${noticeNumberMatch[1].length}`);
  assert(xml.includes("<НППлатМедУсл "), "payer node missing");
  assert(xml.includes('НомКорр="0"'), "primary correction number missing");
  assert(xml.includes('ПрПациент="1"'), "self-payer patient flag missing");
  assert(!xml.includes("<Пациент"), "self-payer XML must not include separate patient node");
  assert(!xml.includes('СерНомДок="3600 000000"'), "payer identity document must be omitted when 12-digit INN is present");
  assert(xml.includes('СуммаКод1="3000.00"'), "service code sum missing");
  assert(!xml.includes("undefined"), "XML must not contain undefined");
  assert(!xml.includes("NaN"), "XML must not contain NaN");
  assert(!xml.includes("null"), "XML must not contain null");
  assert(!xml.includes("[object Object]"), "XML must not contain object placeholders");
  assertNoMojibake(xml, "tax XML");

  const xmlSnapshotDocument = documents.find((document) => document.id === certificate.id);
  assert(xmlSnapshotDocument?.taxXmlSnapshot?.sha256, "first successful tax XML export must persist immutable XML sha256");
  assert(xmlSnapshotDocument.taxXmlSnapshot.sourceSnapshotSha256, "tax XML snapshot must carry the source snapshot hash");
  assert(xmlSnapshotDocument.taxXmlSnapshot.taxOfficeCode === "6310", "tax XML snapshot must persist the original tax office code");
  const exportedAuditFactsResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${certificate.id}/audit-facts`
  });
  assert(exportedAuditFactsResponse.statusCode === 200, `exported tax audit facts failed: ${exportedAuditFactsResponse.statusCode}`);
  const exportedAuditFacts = exportedAuditFactsResponse.json();
  assert(exportedAuditFacts.taxXmlSnapshotSha256 === xmlSnapshotDocument.taxXmlSnapshot.sha256, "tax audit facts must expose archived XML draft hash");
  assert(
    exportedAuditFacts.taxXmlOfficialValidationStatus === "external_validation_required",
    "exported tax XML audit must still require official external validation"
  );
  assert(
    String(exportedAuditFacts.taxXmlOfficialValidationNote).includes("КЭП"),
    "exported tax XML audit must still explain KEP boundary"
  );
  assertNoMojibake(exportedAuditFactsResponse.body, "exported tax audit facts response");
  process.env.DENTE_FNS_TAX_OFFICE_CODE = "7777";
  const xmlAfterTaxOfficeMutationResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${certificate.id}/tax-xml`
  });
  assert(
    xmlAfterTaxOfficeMutationResponse.statusCode === 200,
    `tax XML re-export must reuse immutable XML snapshot: ${xmlAfterTaxOfficeMutationResponse.statusCode} ${xmlAfterTaxOfficeMutationResponse.body}`
  );
  assert(xmlAfterTaxOfficeMutationResponse.body === xml, "tax XML re-export must return the first exported XML bytes");
  assert(xmlAfterTaxOfficeMutationResponse.body.includes('КодНО="6310"'), "tax XML re-export must keep frozen tax office code");
  assert(!xmlAfterTaxOfficeMutationResponse.body.includes('КодНО="7777"'), "tax XML re-export must not use mutated tax office code");
  process.env.DENTE_FNS_TAX_OFFICE_CODE = "6310";

  const identityOnlyXmlResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${identityOnlyCertificateResponse.json().id}/tax-xml`
  });
  assert(
    identityOnlyXmlResponse.statusCode === 200,
    `identity-only tax XML export failed: ${identityOnlyXmlResponse.statusCode} ${identityOnlyXmlResponse.body}`
  );
  const identityOnlyXml = identityOnlyXmlResponse.body;
  assert(identityOnlyXml.includes('СерНомДок="3601 000002"'), "identity-only XML must export payer identity document number");
  assert(identityOnlyXml.includes('ДатаДок="02.03.2021"'), "identity-only XML must export payer identity document issue date");
  assert(!identityOnlyXml.includes('ИНН="'), "identity-only XML must not invent taxpayer INN");
  assertNoMojibake(identityOnlyXml, "identity-only tax XML");

  const originalRelationship = taxPayment.payerRelationship;
  const originalAmountRub = taxPayment.amountRub;
  const originalReceiptNumber = taxPayment.fiscalReceiptNumber;
  taxPayment.payerRelationship = "friend";
  taxPayment.amountRub = 999999;
  taxPayment.fiscalReceiptNumber = "MUTATED-RECEIPT-AFTER-ISSUE";
  const issuedXmlAfterMutationResponse = await app.inject({
    method: "GET",
    url: `/api/documents/${certificate.id}/tax-xml`
  });
  taxPayment.payerRelationship = originalRelationship;
  taxPayment.amountRub = originalAmountRub;
  taxPayment.fiscalReceiptNumber = originalReceiptNumber;
  assert(
    issuedXmlAfterMutationResponse.statusCode === 200,
    `issued tax XML must use frozen payment facts, got ${issuedXmlAfterMutationResponse.statusCode} ${issuedXmlAfterMutationResponse.body}`
  );
  assert(issuedXmlAfterMutationResponse.body.includes('СуммаКод1="3000.00"'), "issued XML must keep frozen payment amount");
  assert(!issuedXmlAfterMutationResponse.body.includes("999999.00"), "issued XML must not use mutated live amount");
  assert(issuedXmlAfterMutationResponse.body === xml, "issued tax XML after live payment mutation must reuse immutable XML bytes");
  assert(!issuedXmlAfterMutationResponse.body.includes('ÐšÐ¾Ð´ÐÐž="7777"'), "issued XML must not use later tax office code after snapshot");
  assertNoMojibake(issuedXmlAfterMutationResponse.body, "issued tax XML after live payment mutation");

  console.log(
    JSON.stringify({
      ok: true,
      kndXml: true,
      draftXmlBlocked: true,
      missingApplicationIssueBlocked: true,
      tenDigitPayerInnCreateBlocked: true,
      identityOnlyTaxpayerXml: true,
      nonSelfPatientTaxIdentityBlocked: true,
      nonSelfPatientClinicXmlFrozen: true,
      mismatchedApplicationBlocked: true,
      missingTaxOfficeBlocked: true,
      taxXmlSnapshotFrozen: true,
      issuedXmlFrozen: true
    })
  );
} finally {
  await app.close();
  rmSync(tempRoot, { recursive: true, force: true });
}
