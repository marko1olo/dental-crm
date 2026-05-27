import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rendererPath = path.resolve("apps/api/dist/documents/renderDocument.js");
const sharedPath = path.resolve("packages/shared/dist/index.js");

if (!existsSync(rendererPath) || !existsSync(sharedPath)) {
  throw new Error("Build API first: npm run build");
}

const { documentIssueBlockReason, renderDocumentHtml } = await import(pathToFileURL(rendererPath).href);
const { taxDeductionApplicationPayloadSchema } = await import(pathToFileURL(sharedPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const organizationId = "11111111-1111-4111-8111-111111111111";
const patientId = "22222222-2222-4222-8222-222222222222";
const patient = {
  id: patientId,
  organizationId,
  status: "active",
  fullName: "Fiscal Test Patient",
  birthDate: "1988-02-03",
  phone: "+7 900 000-00-00",
  email: "patient@example.test",
  notes: null,
  createdAt: "2026-05-18T00:00:00.000Z",
  updatedAt: "2026-05-18T00:00:00.000Z"
};

const clinicProfile = {
  organizationId,
  clinicName: "Test Dental Clinic",
  legalName: "ООО Тестовая стоматология",
  inn: "6312000000",
  kpp: "631201001",
  ogrn: "1236300000000",
  address: "Самара, ул. Тестовая, 1",
  phone: "+7 900 000-00-01",
  email: "clinic@example.test",
  website: "https://clinic.example.test",
  medicalLicenseNumber: "Л041-01184-63/00000000",
  medicalLicenseIssuedAt: "2024-01-15",
  medicalLicenseIssuer: "Министерство здравоохранения Самарской области",
  bankDetails: "р/с 40702810000000000000, БИК 043601000",
  signatoryName: "Иванова М.С.",
  signatoryTitle: "главный врач",
  mode: "one_chair",
  timezone: "Europe/Samara",
  defaultVisitMinutes: 45,
  networkEnabled: false,
  egiszEnabled: false,
  updatedAt: "2026-05-18T00:00:00.000Z"
};

function documentFor(kind) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    organizationId,
    patientId,
    visitId: null,
    kind,
    title: `Synthetic ${kind}`,
    status: "draft",
    issuedAt: null,
    totalAmountRub: 3000,
    taxYear: 2026,
    taxPayerInn: null
  };
}

const payments = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    organizationId,
    patientId,
    visitId: null,
    documentId: null,
    amountRub: 1000,
    method: "card",
    status: "paid",
    paidAt: "2026-02-01T10:00:00.000Z",
    createdAt: "2026-02-01T10:00:00.000Z",
    fiscalReceiptNumber: "FN-2026-CODE1",
    fiscalReceiptIssuedAt: "2026-02-01T10:00:00.000Z",
    fiscalReceiptUrl: "https://clinic.example.test/fiscal/FN-2026-CODE1",
    payerFullName: "Fiscal Payer",
    payerInn: "123456789012",
    payerBirthDate: "1988-02-03",
    payerIdentityDocument: "passport 3600 000000",
    payerRelationship: "patient",
    taxDeductionCode: "1",
    note: null
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    organizationId,
    patientId,
    visitId: null,
    documentId: null,
    amountRub: 2000,
    method: "bank_transfer",
    status: "paid",
    paidAt: "2026-03-02T10:00:00.000Z",
    createdAt: "2026-03-02T10:00:00.000Z",
    fiscalReceiptNumber: "FN-2026-CODE2",
    fiscalReceiptIssuedAt: "2026-03-01T10:00:00.000Z",
    fiscalReceiptUrl: "https://clinic.example.test/fiscal/FN-2026-CODE2",
    payerFullName: "Fiscal Payer",
    payerInn: "123456789012",
    payerBirthDate: "1988-02-03",
    payerIdentityDocument: "passport 3600 000000",
    payerRelationship: "patient",
    taxDeductionCode: "2",
    note: null
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    organizationId,
    patientId,
    visitId: null,
    documentId: null,
    amountRub: 6000,
    method: "card",
    status: "paid",
    paidAt: "2026-01-02T10:00:00.000Z",
    createdAt: "2026-01-02T10:00:00.000Z",
    fiscalReceiptNumber: "FN-FISCAL-2025-CRM-2026",
    fiscalReceiptIssuedAt: "2025-12-31T23:55:00.000Z",
    fiscalReceiptUrl: "https://clinic.example.test/fiscal/FN-FISCAL-2025-CRM-2026",
    payerFullName: "Fiscal Payer",
    payerInn: "123456789012",
    payerBirthDate: "1988-02-03",
    payerIdentityDocument: "passport 3600 000000",
    payerRelationship: "patient",
    taxDeductionCode: "1",
    note: null
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    organizationId,
    patientId,
    visitId: null,
    documentId: null,
    amountRub: 9000,
    method: "card",
    status: "paid",
    paidAt: "2025-12-01T10:00:00.000Z",
    createdAt: "2025-12-01T10:00:00.000Z",
    fiscalReceiptNumber: "FN-OLD-YEAR",
    fiscalReceiptIssuedAt: "2025-12-01T10:00:00.000Z",
    fiscalReceiptUrl: "https://clinic.example.test/fiscal/FN-OLD-YEAR",
    payerFullName: "Fiscal Payer",
    payerInn: "123456789012",
    payerBirthDate: "1988-02-03",
    payerIdentityDocument: "passport 3600 000000",
    payerRelationship: "patient",
    taxDeductionCode: "1",
    note: null
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    organizationId,
    patientId,
    visitId: null,
    documentId: null,
    amountRub: 4000,
    method: "card",
    status: "paid",
    paidAt: "2023-06-01T10:00:00.000Z",
    createdAt: "2023-06-01T10:00:00.000Z",
    fiscalReceiptNumber: "FN-LEGACY-2023",
    fiscalReceiptIssuedAt: "2023-06-01T10:00:00.000Z",
    fiscalReceiptUrl: "https://clinic.example.test/fiscal/FN-LEGACY-2023",
    payerFullName: "Fiscal Payer",
    payerInn: "123456789012",
    payerBirthDate: "1988-02-03",
    payerIdentityDocument: "passport 3600 000000",
    payerRelationship: "patient",
    taxDeductionCode: "1",
    note: null
  }
];

const certificate = documentFor("tax_deduction_certificate");
const registry = documentFor("tax_deduction_registry");
const context = { clinicProfile, payments };
certificate.payload = { taxPaymentSelection: { selectedPaymentIds: [payments[0].id, payments[1].id] } };
registry.payload = { taxPaymentSelection: { selectedPaymentIds: [payments[0].id, payments[1].id] } };
const legacyCertificate = { ...certificate, taxYear: 2023 };
const scopedCertificate = { ...certificate, taxPayerInn: "123456789012" };
const scopedRegistry = { ...registry, taxPayerInn: "123456789012" };
const legacyOldFormCertificate = documentFor("legacy_tax_deduction_certificate");
legacyOldFormCertificate.taxYear = 2023;
legacyOldFormCertificate.totalAmountRub = 4000;
legacyOldFormCertificate.payload = { taxPaymentSelection: { selectedPaymentIds: [payments[4].id] } };
const legacyOldFormWrongYear = { ...legacyOldFormCertificate, taxYear: 2024 };

const certificateHtml = renderDocumentHtml(certificate, patient, context);
const normalizedCertificateHtml = certificateHtml.replace(/\u00a0/g, " ");
assert(certificateHtml.includes("Fiscal Payer"), "certificate must use payer name from fiscal payment");
assert(certificateHtml.includes("123456789012"), "certificate must use payer INN from fiscal payment");
assert(certificateHtml.includes("Форма по КНД 1151156"), "KND certificate must render official form title");
assert(certificateHtml.includes("Лист 001"), "KND certificate must render page 001 control block");
assert(certificateHtml.includes("Номер справки"), "KND certificate must render certificate number field");
assert(certificateHtml.includes("Номер корректировки"), "KND certificate must render correction number field");
assert(!certificateHtml.includes("Код вида документа"), "KND certificate must not fill identity document code when payer INN is present");
assert(!/DENTE-KND-/.test(certificateHtml), "KND certificate number must not use internal DENTE slug format");
assert(certificateHtml.includes("Налогоплательщик и пациент являются одним лицом"), "KND certificate must render taxpayer/patient same-person flag");
assert(certificateHtml.includes("1 - да"), "KND certificate must mark patient-paid services as same person");
assert(certificateHtml.includes("Л041-01184-63/00000000"), "certificate must include clinic license data");
assert(certificateHtml.includes("FN-2026-CODE1"), "KND certificate must include ordinary fiscal receipt basis");
assert(certificateHtml.includes("FN-2026-CODE2"), "KND certificate must include expensive fiscal receipt basis");
assert(normalizedCertificateHtml.includes("1 000"), "certificate must split ordinary code-1 amount");
assert(normalizedCertificateHtml.includes("2 000"), "certificate must split expensive code-2 amount");
assert(!certificateHtml.includes("FN-FISCAL-2025-CRM-2026"), "certificate must use fiscal receipt year, not CRM paidAt year");
assert(documentIssueBlockReason(certificate, patient, context) === null, "complete tax certificate must be issue-ready");
const missingFiscalContext = {
  clinicProfile,
  payments: [{ ...payments[0], fiscalReceiptNumber: null }]
};
assert(
  documentIssueBlockReason(certificate, patient, missingFiscalContext)?.includes("номер фискального чека"),
  "tax certificate must be blocked when an included paid payment has no fiscal receipt number"
);
const missingFiscalDateContext = {
  clinicProfile,
  payments: [{ ...payments[0], fiscalReceiptIssuedAt: null }]
};
assert(
  documentIssueBlockReason(certificate, patient, missingFiscalDateContext)?.includes("дату фискального чека"),
  "tax certificate must be blocked when an included paid payment has no fiscal receipt date"
);
const missingTaxCodeContext = {
  clinicProfile,
  payments: [{ ...payments[0], taxDeductionCode: null }]
};
assert(
  documentIssueBlockReason(certificate, patient, missingTaxCodeContext)?.includes("код медицинской услуги"),
  "tax certificate must be blocked when an included paid payment has no explicit tax deduction service code"
);
const missingTaxCodeHtml = renderDocumentHtml(certificate, patient, missingTaxCodeContext);
assert(missingTaxCodeHtml.includes("код не выбран"), "tax certificate draft must not silently default missing tax code to code 1");
const missingPayerNameContext = {
  clinicProfile,
  payments: [{ ...payments[0], payerFullName: null }]
};
assert(
  documentIssueBlockReason(certificate, patient, missingPayerNameContext)?.includes("ФИО плательщика"),
  "tax certificate must be blocked when an included paid payment has no payer full name"
);
const missingPayerBirthDateContext = {
  clinicProfile,
  payments: [{ ...payments[0], payerBirthDate: null }]
};
assert(
  documentIssueBlockReason(certificate, patient, missingPayerBirthDateContext)?.includes("дату рождения плательщика"),
  "tax certificate must be blocked when an included paid payment has no payer birth date"
);
const missingPayerRelationshipContext = {
  clinicProfile,
  payments: [{ ...payments[0], payerRelationship: null }]
};
assert(
  documentIssueBlockReason(certificate, patient, missingPayerRelationshipContext)?.includes("родство плательщика"),
  "tax certificate must be blocked when an included paid payment has no payer relationship"
);
const invalidPayerRelationshipContext = {
  clinicProfile,
  payments: [{ ...payments[0], payerRelationship: "друг" }]
};
assert(
  documentIssueBlockReason(certificate, patient, invalidPayerRelationshipContext)?.includes("пациент, супруг, родитель"),
  "tax certificate must reject unsupported payer relationship"
);
const spousePayerHtml = renderDocumentHtml(certificate, patient, {
  clinicProfile,
  payments: [{ ...payments[0], payerRelationship: "spouse", payerFullName: "Spouse Fiscal Payer", payerInn: "223456789012" }]
});
assert(spousePayerHtml.includes("0 - нет"), "KND certificate must mark spouse payer as not the patient");
assert(spousePayerHtml.includes("Лист 002"), "KND certificate must render patient page when payer is not the patient");
assert(spousePayerHtml.includes(patient.birthDate), "KND certificate must keep patient birth date separate from payer data");
const mixedTaxpayerContext = {
  clinicProfile,
  payments: [
    payments[0],
    {
      ...payments[1],
      payerFullName: "Other Fiscal Payer",
      payerInn: "999999999999"
    }
  ]
};
assert(
  documentIssueBlockReason(certificate, patient, mixedTaxpayerContext)?.includes("разных налогоплательщиков"),
  "tax certificate must be blocked when selected-year payments belong to different taxpayers"
);
const mixedIdentityDocumentContext = {
  clinicProfile,
  payments: [
    payments[0],
    {
      ...payments[1],
      payerIdentityDocument: "passport 3600 111111"
    }
  ]
};
assert(
  documentIssueBlockReason(certificate, patient, mixedIdentityDocumentContext)?.includes("разных налогоплательщиков"),
  "tax certificate must be blocked when payer name and INN match but identity document differs"
);
assert(
  documentIssueBlockReason(scopedCertificate, patient, mixedTaxpayerContext) === null,
  "tax certificate with payer INN scope must ignore other taxpayers in the same year"
);
const scopedRegistryHtml = renderDocumentHtml(scopedRegistry, patient, mixedTaxpayerContext);
assert(scopedRegistryHtml.includes("FN-2026-CODE1"), "scoped registry must include selected payer receipt");
assert(!scopedRegistryHtml.includes("FN-2026-CODE2"), "scoped registry must exclude another payer receipt");
assert(
  documentIssueBlockReason(legacyCertificate, patient, context)?.includes("2024"),
  "KND 1151156 certificate must be blocked for pre-2024 payment years"
);
const legacyOldFormHtml = renderDocumentHtml(legacyOldFormCertificate, patient, context);
assert(legacyOldFormHtml.includes("289/БГ-3-04/256"), "legacy tax certificate must reference the old certificate order");
assert(legacyOldFormHtml.includes("FN-LEGACY-2023"), "legacy tax certificate must include old-year fiscal receipt");
assert(!legacyOldFormHtml.includes("FN-2026-CODE1"), "legacy tax certificate must exclude KND-year payments");
assert(documentIssueBlockReason(legacyOldFormCertificate, patient, context) === null, "complete legacy tax certificate must be issue-ready");
assert(
  documentIssueBlockReason(legacyOldFormWrongYear, patient, context)?.includes("2021-2023"),
  "legacy tax certificate must reject 2024+ years"
);

const registryHtml = renderDocumentHtml(registry, patient, context);
assert(registryHtml.includes("FN-2026-CODE1"), "registry must include selected-year fiscal receipt code 1");
assert(registryHtml.includes("FN-2026-CODE2"), "registry must include selected-year fiscal receipt code 2");
assert(registryHtml.includes("01.03.2026"), "registry must render fiscal receipt date first");
assert(!registryHtml.includes("02.03.2026"), "registry must not use CRM paidAt when fiscal receipt date exists");
assert(!registryHtml.includes("FN-OLD-YEAR"), "registry must exclude payments outside selected tax year");
assert(documentIssueBlockReason(registry, patient, context) === null, "complete tax registry must be issue-ready");
const issuedRegistry = {
  ...registry,
  status: "issued",
  issuedAt: "2026-05-22T09:30:00.000Z",
  taxPaymentSnapshot: {
    createdAt: "2026-05-22T09:30:00.000Z",
    taxYear: 2026,
    taxPayerInn: null,
    paymentIds: [payments[0].id, payments[1].id],
    fiscalReceiptKeys: [payments[0].fiscalReceiptNumber, payments[1].fiscalReceiptNumber],
    payments: [payments[0], payments[1]]
  }
};
const issuedRegistryHtml = renderDocumentHtml(issuedRegistry, patient, {
  clinicProfile,
  payments: [
    { ...payments[0], amountRub: 999999, fiscalReceiptNumber: "MUTATED-FISCAL-AFTER-ISSUE" },
    { ...payments[1], amountRub: 999999, fiscalReceiptNumber: "MUTATED-FISCAL-AFTER-ISSUE-2" }
  ]
});
assert(issuedRegistryHtml.includes("FN-2026-CODE1"), "issued registry must keep frozen fiscal receipt code 1");
assert(issuedRegistryHtml.includes("FN-2026-CODE2"), "issued registry must keep frozen fiscal receipt code 2");
assert(!issuedRegistryHtml.includes("MUTATED-FISCAL-AFTER-ISSUE"), "issued registry must not use mutated live receipt numbers");
assert(issuedRegistryHtml.replace(/\u00a0/g, " ").includes("1 000"), "issued registry must keep frozen payment amount");
assert(!issuedRegistryHtml.includes("999999"), "issued registry must not use mutated live payment amount");

const applicationWithoutPayload = documentFor("tax_deduction_application");
assert(
  documentIssueBlockReason(applicationWithoutPayload, patient, context)?.includes("структурированные данные"),
  "tax application must be blocked without structured payload"
);
const applicationHtml = renderDocumentHtml(
  {
    ...applicationWithoutPayload,
    payload: {
      taxDeductionApplication: {
        taxpayerFullName: "Fiscal Payer",
        taxpayerInn: "123456789012",
        taxpayerBirthDate: "1988-02-03",
        taxpayerIdentityDocument: "passport 3600 000000",
        relationshipToPatient: "self",
        requestedTaxYear: 2026,
        requestedForm: "knd_1151156",
        selectedPaymentIds: [payments[0].id],
        deliveryChannel: "paper",
        contactForReadyDocument: "+7 900 000-00-00",
        applicantAuthorityDocument: null,
        requestedAt: "20.05.2026 10:30",
        duplicateWarningAccepted: true
      }
    }
  },
  patient,
  context
);
assert(applicationHtml.includes("Fiscal Payer"), "tax application must render structured taxpayer name");
assert(applicationHtml.includes("123456789012"), "tax application must render structured taxpayer INN");
assert(applicationHtml.includes("passport 3600 000000"), "tax application must render structured taxpayer identity document");
const validApplicationPayload = {
  taxpayerFullName: "Fiscal Payer",
  taxpayerInn: "123456789012",
  taxpayerBirthDate: "1988-02-03",
  taxpayerIdentityDocument: "passport 3600 000000",
  relationshipToPatient: "self",
  requestedTaxYear: 2026,
  requestedForm: "knd_1151156",
  selectedPaymentIds: [payments[0].id],
  deliveryChannel: "paper",
  contactForReadyDocument: "+7 900 000-00-00",
  applicantAuthorityDocument: null,
  requestedAt: "20.05.2026 10:30",
  duplicateWarningAccepted: true
};
assert(taxDeductionApplicationPayloadSchema.safeParse(validApplicationPayload).success, "valid KND application payload must pass schema");
const validApplicationWithoutSelectedPaymentsPayload = { ...validApplicationPayload, selectedPaymentIds: [] };
assert(
  taxDeductionApplicationPayloadSchema.safeParse(validApplicationWithoutSelectedPaymentsPayload).success,
  "tax application payload must allow request registration before fiscal receipts are selected"
);
const applicationWithoutSelectedPaymentsHtml = renderDocumentHtml(
  {
    ...applicationWithoutPayload,
    payload: {
      taxDeductionApplication: validApplicationWithoutSelectedPaymentsPayload
    }
  },
  patient,
  context
);
assert(
  applicationWithoutSelectedPaymentsHtml.includes("чеки пока не выбраны"),
  "tax application without selected payments must render pending fiscal selection text"
);
assert(
  !applicationWithoutSelectedPaymentsHtml.includes(payments[0].id),
  "tax application must not render internal payment UUIDs"
);
assert(
  !taxDeductionApplicationPayloadSchema.safeParse({ ...validApplicationPayload, requestedTaxYear: 2023, requestedForm: "knd_1151156" }).success,
  "pre-2024 tax application must reject KND 1151156 form"
);
assert(
  !taxDeductionApplicationPayloadSchema.safeParse({ ...validApplicationPayload, requestedTaxYear: 2026, requestedForm: "legacy_2021_2023" }).success,
  "2024+ tax application must reject legacy form"
);
assert(
  !taxDeductionApplicationPayloadSchema.safeParse({ ...validApplicationPayload, taxpayerInn: "6312000000" }).success,
  "KND 1151156 tax application must reject 10-digit organization INN"
);
assert(
  taxDeductionApplicationPayloadSchema.safeParse({
    ...validApplicationPayload,
    taxpayerInn: "6312000000",
    requestedTaxYear: 2023,
    requestedForm: "legacy_2021_2023"
  }).success,
  "legacy tax application may keep 10-digit payer INN compatibility"
);
assert(
  !taxDeductionApplicationPayloadSchema.safeParse({ ...validApplicationPayload, taxpayerBirthDate: "03/02/1988" }).success,
  "tax application must reject ambiguous taxpayer birth dates"
);
assert(
  !taxDeductionApplicationPayloadSchema.safeParse({ ...validApplicationPayload, requestedAt: "today" }).success,
  "tax application must reject free-form request dates"
);
assert(
  !taxDeductionApplicationPayloadSchema.safeParse({
    ...validApplicationPayload,
    relationshipToPatient: "spouse",
    applicantAuthorityDocument: null
  }).success,
  "tax application for representative must require authority document"
);
assert(
  taxDeductionApplicationPayloadSchema.safeParse({
    ...validApplicationPayload,
    relationshipToPatient: "spouse",
    applicantAuthorityDocument: "доверенность или документ супруга, проверен администратором"
  }).success,
  "tax application for representative with authority document must pass"
);

console.log(JSON.stringify({ ok: true, includedReceipts: 2, excludedOldYear: true }));
