import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

const tempRoot = mkdtempSync(path.join(tmpdir(), "dental-tax-explicit-scope-"));

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
const { activeVisit, documents, payments } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function documentErrorText(response) {
  const body = response.json();
  return String(body.message ?? body.error ?? "");
}

const app = Fastify({ logger: false });

try {
  await registerDocumentRoutes(app);

  const firstPayment = payments.find((payment) => payment.patientId === activeVisit.patientId && payment.payerInn === "123456789012");
  assert(firstPayment, "fixture must contain a tax payment for explicit scope smoke");

  const secondPayment = {
    ...firstPayment,
    id: randomUUID(),
    amountRub: 1700,
    documentId: null,
    fiscalReceiptNumber: `FN-SCOPE-${Date.now()}`,
    fiscalReceiptIssuedAt: "2026-05-22T10:00:00.000+04:00",
    paidAt: "2026-05-22T10:00:00.000+04:00",
    createdAt: "2026-05-22T10:00:00.000+04:00",
    taxDeductionCode: "2"
  };
  secondPayment.fiscalReceipt = {
    fn: "9287440300000102",
    fd: "221102",
    fpd: "771102",
    cashierName: "Smoke cashier",
    receiptUrl: "https://clinic.example.test/ofd/scope-2",
    operationType: "income"
  };
  payments.push(secondPayment);

  const missingSelectionResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_certificate",
      taxYear: 2026,
      taxPayerInn: firstPayment.payerInn,
      totalAmountRub: 999999
    }
  });
  assert(missingSelectionResponse.statusCode === 409, `tax certificate without selected payments must be 409, got ${missingSelectionResponse.statusCode}`);
  const missingSelectionError = documentErrorText(missingSelectionResponse);
  assert(
    missingSelectionError.includes("явно") || missingSelectionError.includes("фискальные"),
    "missing selection block must explain explicit fiscal receipt selection"
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
          taxpayerFullName: firstPayment.payerFullName,
          taxpayerInn: firstPayment.payerInn,
          taxpayerBirthDate: firstPayment.payerBirthDate,
          taxpayerIdentityDocument: firstPayment.payerIdentityDocument,
          relationshipToPatient: "self",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [firstPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: null,
          requestedAt: "2026-05-22T10:30:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(applicationCreateResponse.statusCode === 201, `tax application create failed: ${applicationCreateResponse.statusCode}`);
  const applicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${applicationCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: firstPayment.payerFullName, note: "first payment application" } })
  });
  assert(applicationIssueResponse.statusCode === 200, `tax application issue failed: ${applicationIssueResponse.statusCode} ${applicationIssueResponse.body}`);

  const certificateCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_certificate",
      taxYear: 2026,
      taxPayerInn: firstPayment.payerInn,
      totalAmountRub: 999999,
      payload: { taxPaymentSelection: { selectedPaymentIds: [firstPayment.id] } }
    }
  });
  assert(certificateCreateResponse.statusCode === 201, `tax certificate create failed: ${certificateCreateResponse.statusCode}`);
  const certificateIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${certificateCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: firstPayment.payerFullName, note: "first payment certificate" } })
  });
  assert(certificateIssueResponse.statusCode === 200, `tax certificate issue failed: ${certificateIssueResponse.statusCode} ${certificateIssueResponse.body}`);
  const certificate = documents.find((document) => document.id === certificateCreateResponse.json().id);
  assert(certificate?.taxPaymentSnapshot?.paymentIds.includes(firstPayment.id), "certificate snapshot must include explicitly selected first payment");
  assert(!certificate?.taxPaymentSnapshot?.paymentIds.includes(secondPayment.id), "certificate snapshot must not capture unselected second payment");
  assert(certificate?.totalAmountRub === firstPayment.amountRub, "certificate amount must equal explicitly selected first payment");

  const registryCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_registry",
      taxYear: 2026,
      taxPayerInn: firstPayment.payerInn,
      totalAmountRub: 999999,
      payload: { taxPaymentSelection: { selectedPaymentIds: [secondPayment.id] } }
    }
  });
  assert(registryCreateResponse.statusCode === 201, `tax registry create failed: ${registryCreateResponse.statusCode}`);
  const registryBeforeApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${registryCreateResponse.json().id}/issue`
  });
  assert(
    registryBeforeApplicationIssueResponse.statusCode === 409,
    `registry must be blocked when issued application selected another receipt: ${registryBeforeApplicationIssueResponse.statusCode}`
  );

  const wrongRelationshipApplicationCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      taxYear: 2026,
      taxPayerInn: firstPayment.payerInn,
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: firstPayment.payerFullName,
          taxpayerInn: firstPayment.payerInn,
          taxpayerBirthDate: firstPayment.payerBirthDate,
          taxpayerIdentityDocument: firstPayment.payerIdentityDocument,
          relationshipToPatient: "spouse",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [secondPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: "Synthetic spouse authority document for mismatch smoke",
          requestedAt: "2026-05-22T10:40:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(
    wrongRelationshipApplicationCreateResponse.statusCode === 201,
    `wrong relationship tax application create failed: ${wrongRelationshipApplicationCreateResponse.statusCode}`
  );
  const wrongRelationshipApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${wrongRelationshipApplicationCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: firstPayment.payerFullName, note: "wrong relationship application" } })
  });
  assert(
    wrongRelationshipApplicationIssueResponse.statusCode === 200,
    `wrong relationship tax application issue failed: ${wrongRelationshipApplicationIssueResponse.statusCode} ${wrongRelationshipApplicationIssueResponse.body}`
  );
  const registryWrongRelationshipIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${registryCreateResponse.json().id}/issue`
  });
  assert(
    registryWrongRelationshipIssueResponse.statusCode === 409,
    `registry must be blocked when application payer relationship differs from receipt: ${registryWrongRelationshipIssueResponse.statusCode}`
  );

  const secondApplicationCreateResponse = await app.inject({
    method: "POST",
    url: "/api/documents",
    payload: {
      patientId: activeVisit.patientId,
      visitId: null,
      kind: "tax_deduction_application",
      taxYear: 2026,
      taxPayerInn: firstPayment.payerInn,
      payload: {
        taxDeductionApplication: {
          taxpayerFullName: firstPayment.payerFullName,
          taxpayerInn: firstPayment.payerInn,
          taxpayerBirthDate: firstPayment.payerBirthDate,
          taxpayerIdentityDocument: firstPayment.payerIdentityDocument,
          relationshipToPatient: "self",
          requestedTaxYear: 2026,
          requestedForm: "knd_1151156",
          selectedPaymentIds: [secondPayment.id],
          deliveryChannel: "paper",
          contactForReadyDocument: "+7 900 000-00-00",
          applicantAuthorityDocument: null,
          requestedAt: "2026-05-22T10:45:00.000+04:00",
          duplicateWarningAccepted: true
        }
      }
    }
  });
  assert(secondApplicationCreateResponse.statusCode === 201, `second tax application create failed: ${secondApplicationCreateResponse.statusCode}`);
  const secondApplicationIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${secondApplicationCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: firstPayment.payerFullName, note: "second payment application" } })
  });
  assert(
    secondApplicationIssueResponse.statusCode === 200,
    `second tax application issue failed: ${secondApplicationIssueResponse.statusCode} ${secondApplicationIssueResponse.body}`
  );

  const registryIssueResponse = await app.inject({
    method: "POST",
    url: `/api/documents/${registryCreateResponse.json().id}/issue`,
    payload: issueAttestation({ signatureAttestation: { recipientFullName: firstPayment.payerFullName, note: "second payment registry" } })
  });
  assert(registryIssueResponse.statusCode === 200, `tax registry issue failed: ${registryIssueResponse.statusCode} ${registryIssueResponse.body}`);
  const registry = documents.find((document) => document.id === registryCreateResponse.json().id);
  assert(registry?.taxPaymentSnapshot?.paymentIds.includes(secondPayment.id), "registry snapshot must include explicitly selected second payment");
  assert(!registry?.taxPaymentSnapshot?.paymentIds.includes(firstPayment.id), "registry snapshot must not capture unselected first payment");
  assert(registry?.totalAmountRub === secondPayment.amountRub, "registry amount must equal explicitly selected second payment");

  console.log(
    JSON.stringify({
      ok: true,
      missingSelectionBlocked: missingSelectionResponse.statusCode,
      certificatePaymentIds: certificate.taxPaymentSnapshot.paymentIds,
      registryPaymentIds: registry.taxPaymentSnapshot.paymentIds
    })
  );
} finally {
  await app.close();
  rmSync(tempRoot, { recursive: true, force: true });
}
