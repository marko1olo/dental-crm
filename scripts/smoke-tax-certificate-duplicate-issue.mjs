import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-tax-duplicate-"));

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.join(tempRoot, "snapshots");

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { activeVisit, documents, patients, payments } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function documentErrorText(response) {
  const body = response.json();
  return String(body.message ?? body.error ?? "");
}

function voidAttestation(overrides = {}) {
  return {
    reasonCode: "tax_certificate_correction",
    reasonText: "Smoke tax certificate correction after annual duplicate block.",
    voidedAt: "2026-05-24T10:00:00.000+04:00",
    staffFullName: "Smoke Admin",
    staffRole: "Администратор",
    correctionDocumentId: null,
    replacementRequired: true,
    patientOrPayerNotified: true,
    archivePreserved: true,
    statusReviewed: true,
    ...overrides
  };
}

const app = Fastify({ logger: false });

try {
  await registerDocumentRoutes(app);

  const taxPayment = payments.find((payment) => payment.patientId === activeVisit.patientId && payment.payerInn === "123456789012");
  assert(taxPayment, "fixture must contain a tax payment for the active patient");
  const activePatient = patients.find((patient) => patient.id === activeVisit.patientId);
  assert(activePatient, "fixture must contain the active patient");
  activePatient.administrativeProfile = {
    ...(activePatient.administrativeProfile ?? {}),
    identityDocument: "паспорт 6300 000000, выдан 01.02.2020",
    taxpayerInn: "323456789012"
  };

  const certificatePayload = {
    patientId: activeVisit.patientId,
    visitId: null,
    kind: "tax_deduction_certificate",
    taxYear: 2026,
    taxPayerInn: "123456789012",
    totalAmountRub: 999999,
    payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment.id] } }
  };

  const firstCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: certificatePayload
  });
  assert(firstCreateResponse.statusCode === 201, `first tax certificate create failed: ${firstCreateResponse.statusCode}`);
  const firstCertificate = firstCreateResponse.json();

  const issueWithoutApplicationResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${firstCertificate.id}/issue`
  });
  assert(
    issueWithoutApplicationResponse.statusCode === 409,
    `tax certificate without issued application must be blocked: ${issueWithoutApplicationResponse.statusCode}`
  );
  assert(
    documentErrorText(issueWithoutApplicationResponse).includes("заявление"),
    "tax certificate block must explain missing taxpayer application"
  );

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
    payload: issueAttestation({ signatureAttestation: { recipientFullName: taxPayment.payerFullName, note: "duplicate smoke application" } })
  });
  assert(applicationIssueResponse.statusCode === 200, `tax application issue failed: ${applicationIssueResponse.statusCode} ${applicationIssueResponse.body}`);

  const firstIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${firstCertificate.id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: taxPayment.payerFullName, note: "first certificate" } })
  });
  assert(firstIssueResponse.statusCode === 200, `first tax certificate issue failed: ${firstIssueResponse.statusCode} ${firstIssueResponse.body}`);
  assert(firstIssueResponse.json().status === "issued", "first certificate must be issued");
  const firstIssuedDocument = documents.find((document) => document.id === firstCertificate.id);
  assert(firstIssuedDocument?.taxPaymentSnapshot?.paymentIds.includes(taxPayment.id), "issued certificate must freeze covered payment ids");

  const secondCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: certificatePayload
  });
  assert(secondCreateResponse.statusCode === 201, `second tax certificate create failed: ${secondCreateResponse.statusCode}`);
  const secondCertificate = secondCreateResponse.json();

  const duplicateIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${secondCertificate.id}/issue`
  });
  assert(duplicateIssueResponse.statusCode === 409, `duplicate certificate issue must be blocked, got ${duplicateIssueResponse.statusCode}`);
  assert(
    documentErrorText(duplicateIssueResponse).includes("налоговый год"),
    "duplicate certificate issue must explain annual taxpayer scope"
  );

  const originalReceiptNumber = taxPayment.fiscalReceiptNumber;
  taxPayment.fiscalReceiptNumber = "MUTATED-RECEIPT-AFTER-ISSUE";
  const mutatedDuplicateCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: certificatePayload
  });
  assert(mutatedDuplicateCreateResponse.statusCode === 201, `mutated duplicate certificate create failed: ${mutatedDuplicateCreateResponse.statusCode}`);
  const mutatedDuplicateIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${mutatedDuplicateCreateResponse.json().id}/issue`
  });
  taxPayment.fiscalReceiptNumber = originalReceiptNumber;
  assert(
    mutatedDuplicateIssueResponse.statusCode === 409,
    `mutated original payment must still be blocked by frozen issued payment id, got ${mutatedDuplicateIssueResponse.statusCode}`
  );

  const newPayment = {
    ...taxPayment,
    id: randomUUID(),
    amountRub: 1700,
    documentId: null,
    fiscalReceiptNumber: `NEW-FISCAL-${Date.now()}`,
    fiscalReceiptIssuedAt: "2026-05-22T09:00:00.000+04:00",
    paidAt: "2026-05-22T09:00:00.000+04:00",
    createdAt: "2026-05-22T09:00:00.000+04:00"
  };
  payments.push(newPayment);

  const newPaymentApplicationCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: newPayment.payerFullName,
          taxpayerInn: newPayment.payerInn,
          taxpayerBirthDate: newPayment.payerBirthDate,
          taxpayerIdentityDocument: newPayment.payerIdentityDocument,
          relationshipToPatient: "self",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [newPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: null,
          requestedAt: "2026-05-22T09:10:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(
    newPaymentApplicationCreateResponse.statusCode === 201,
    `new payment tax application create failed: ${newPaymentApplicationCreateResponse.statusCode}`
  );
  const newPaymentApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${newPaymentApplicationCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: newPayment.payerFullName, note: "new payment application" } })
  });
  assert(
    newPaymentApplicationIssueResponse.statusCode === 200,
    `new payment tax application issue failed: ${newPaymentApplicationIssueResponse.statusCode} ${newPaymentApplicationIssueResponse.body}`
  );

  const thirdCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      ...certificatePayload,
      payload: { taxPaymentSelection: { selectedPaymentIds: [newPayment.id] } }
    }
  });
  assert(thirdCreateResponse.statusCode === 201, `third tax certificate create failed: ${thirdCreateResponse.statusCode}`);
  const thirdIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${thirdCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: newPayment.payerFullName, note: "new payment certificate" } })
  });
  assert(
    thirdIssueResponse.statusCode === 409,
    `new fiscal payment for the same annual taxpayer scope must be blocked: ${thirdIssueResponse.statusCode} ${thirdIssueResponse.body}`
  );
  assert(
    documentErrorText(thirdIssueResponse).includes("налоговый год"),
    "new payment duplicate block must explain annual taxpayer scope"
  );
  const thirdDocument = documents.find((document) => document.id === thirdCreateResponse.json().id);
  assert(thirdDocument?.status !== "issued", "same-year same-taxpayer certificate must remain unissued");

  const voidFirstCertificateResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${firstCertificate.id}/void`,
    payload: { voidAttestation: voidAttestation() }
  });
  assert(
    voidFirstCertificateResponse.statusCode === 200,
    `structured tax certificate void failed: ${voidFirstCertificateResponse.statusCode} ${voidFirstCertificateResponse.body}`
  );
  assert(
    voidFirstCertificateResponse.json().voidAttestation?.reasonCode === "tax_certificate_correction",
    "voided tax certificate must keep structured correction attestation"
  );
  const voidedFirstDocument = documents.find((document) => document.id === firstCertificate.id);
  assert(voidedFirstDocument?.status === "voided", "first certificate must be voided before replacement issue");
  assert(
    voidedFirstDocument?.voidAttestation?.archivePreserved === true &&
      voidedFirstDocument.voidAttestation.statusReviewed === true,
    "structured void must require archive preservation and status review"
  );

  const replacementCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      ...certificatePayload,
      payload: { taxPaymentSelection: { selectedPaymentIds: [newPayment.id] } }
    }
  });
  assert(
    replacementCreateResponse.statusCode === 201,
    `replacement tax certificate create failed after structured void: ${replacementCreateResponse.statusCode} ${replacementCreateResponse.body}`
  );
  const replacementIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${replacementCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: newPayment.payerFullName, note: "replacement after structured void" } })
  });
  assert(
    replacementIssueResponse.statusCode === 200,
    `replacement certificate must be allowed after structured void: ${replacementIssueResponse.statusCode} ${replacementIssueResponse.body}`
  );
  const replacementIssuedDocument = documents.find((document) => document.id === replacementCreateResponse.json().id);
  assert(replacementIssuedDocument?.status === "issued", "replacement certificate must be issued after structured void");
  assert(
    replacementIssuedDocument?.taxPaymentSnapshot?.paymentIds.includes(newPayment.id),
    "replacement certificate must freeze the new payment id"
  );

  const spousePayment = {
    ...taxPayment,
    id: randomUUID(),
    amountRub: 2300,
    documentId: null,
    payerFullName: "Петрова Анна Викторовна",
    payerInn: "223456789012",
    payerBirthDate: "1987-03-12",
    payerIdentityDocument: "паспорт 6300 000001, выдан 01.02.2020",
    payerRelationship: "spouse",
    fiscalReceiptNumber: `SPOUSE-FISCAL-${Date.now()}`,
    fiscalReceiptIssuedAt: "2026-05-23T09:00:00.000+04:00",
    paidAt: "2026-05-23T09:00:00.000+04:00",
    createdAt: "2026-05-23T09:00:00.000+04:00"
  };
  payments.push(spousePayment);

  const spouseApplicationCreateResponse = await app.inject({
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
          requestedAt: "2026-05-23T09:10:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(
    spouseApplicationCreateResponse.statusCode === 201,
    `spouse tax application create failed: ${spouseApplicationCreateResponse.statusCode} ${spouseApplicationCreateResponse.body}`
  );
  const spouseApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${spouseApplicationCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: spousePayment.payerFullName, note: "spouse application" } })
  });
  assert(
    spouseApplicationIssueResponse.statusCode === 200,
    `spouse tax application issue failed: ${spouseApplicationIssueResponse.statusCode} ${spouseApplicationIssueResponse.body}`
  );

  const spouseCertificateCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      ...certificatePayload,
      taxPayerInn: spousePayment.payerInn,
      payload: { taxPaymentSelection: { selectedPaymentIds: [spousePayment.id] } }
    }
  });
  assert(
    spouseCertificateCreateResponse.statusCode === 201,
    `spouse tax certificate create failed: ${spouseCertificateCreateResponse.statusCode} ${spouseCertificateCreateResponse.body}`
  );
  const spouseCertificateIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${spouseCertificateCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: spousePayment.payerFullName, note: "spouse certificate" } })
  });
  assert(
    spouseCertificateIssueResponse.statusCode === 200,
    `different taxpayer certificate must be allowed: ${spouseCertificateIssueResponse.statusCode} ${spouseCertificateIssueResponse.body}`
  );
  const spouseIssuedDocument = documents.find((document) => document.id === spouseCertificateCreateResponse.json().id);
  assert(spouseIssuedDocument?.taxPaymentSnapshot?.paymentIds.includes(spousePayment.id), "spouse certificate must freeze spouse payment id");
  assert(
    !spouseIssuedDocument?.taxPaymentSnapshot?.paymentIds.includes(taxPayment.id),
    "spouse certificate snapshot must not capture self taxpayer payment"
  );
  assert(spouseIssuedDocument?.totalAmountRub === spousePayment.amountRub, "spouse certificate amount must equal spouse payment");

  const registryCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      ...certificatePayload,
      kind: "tax_deduction_registry",
      payload: { taxPaymentSelection: { selectedPaymentIds: [taxPayment.id] } }
    }
  });
  assert(registryCreateResponse.statusCode === 201, `tax registry create failed: ${registryCreateResponse.statusCode}`);
  const registryIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${registryCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: taxPayment.payerFullName, note: "registry still allowed" } })
  });
  assert(registryIssueResponse.statusCode === 200, `tax registry must not be blocked by issued certificate: ${registryIssueResponse.statusCode}`);

  console.log(
    JSON.stringify({
      ok: true,
      duplicateIssueBlocked: duplicateIssueResponse.statusCode,
      mutatedOriginalStillBlocked: true,
      sameTaxpayerAnnualNewPaymentBlocked: thirdIssueResponse.statusCode,
      replacementIssuedAfterStructuredVoid: true,
      differentTaxpayerIssuedSeparately: true,
      registryStillAllowed: true
    })
  );
} finally {
  await app.close();
  rmSync(tempRoot, { recursive: true, force: true });
}
