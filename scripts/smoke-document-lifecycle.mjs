import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { issueAttestation } from "./lib/documentIssueAttestation.mjs";

process.env.DENTAL_STATE_PERSISTENCE = "off";
process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR = path.resolve(".data", "smoke-document-snapshots");

const routePath = path.resolve("apps/api/dist/routes/documents.js");
const dashboardRoutePath = path.resolve("apps/api/dist/routes/dashboard.js");
const sampleDataPath = path.resolve("apps/api/dist/sampleData.js");

if (!existsSync(routePath) || !existsSync(dashboardRoutePath) || !existsSync(sampleDataPath)) {
  throw new Error("Build API first: npm run build");
}

const requireFromApi = createRequire(path.resolve("apps/api/package.json"));
const Fastify = requireFromApi("fastify");
const { registerDocumentRoutes } = await import(pathToFileURL(routePath).href);
const { registerDashboardRoutes } = await import(pathToFileURL(dashboardRoutePath).href);
const { activeVisit, auditEvents, documents, patients, payments, treatmentPlanItems } = await import(pathToFileURL(sampleDataPath).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function voidAttestation(overrides = {}) {
  return {
    voidAttestation: {
      reasonCode: "issued_in_error",
      reasonText: "Smoke lifecycle structured annulment with archive preserved.",
      voidedAt: "24.05.2026 12:00",
      staffFullName: "Smoke Admin",
      staffRole: "Администратор",
      correctionDocumentId: null,
      replacementRequired: false,
      patientOrPayerNotified: true,
      archivePreserved: true,
      statusReviewed: true,
      ...overrides
    }
  };
}

const app = Fastify({ logger: false });
await registerDocumentRoutes(app);
await registerDashboardRoutes(app);

const receiptPayment = payments.find(
  (payment) => payment.patientId === activeVisit.patientId && payment.visitId === activeVisit.id && payment.status === "paid" && payment.fiscalReceiptNumber
);
assert(receiptPayment, "fixture paid payment with fiscal receipt missing");

const beforeAuditCount = auditEvents.length;
const receiptCreateResponse = await app.inject({
  method: "POST",
  url: "/api/documents",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    kind: "payment_receipt",
    totalAmountRub: 999999,
    payload: {
      paymentReceipt: {
        receiptNumber: "KV-LIFECYCLE-001",
        receiptDate: "23.05.2026 10:05",
        selectedPaymentIds: [receiptPayment.id],
        totalPaidRub: receiptPayment.amountRub,
        payerFullName: receiptPayment.payerFullName,
        taxSupportRequested: false,
        payerBirthDate: null,
        payerInn: null,
        payerIdentityDocument: null,
        payerRelationship: null,
        paymentPurpose: "payment receipt lifecycle smoke",
        fiscalReceiptNumbers: [receiptPayment.fiscalReceiptNumber],
        issuedByFullName: "Smoke Admin",
        paymentAndFiscalDataVerified: true,
        payerIdentityVerified: true,
        receiptDoesNotReplaceFiscalReceipt: true
      }
    }
  }
});
assert(receiptCreateResponse.statusCode === 201, `payment receipt create failed: ${receiptCreateResponse.statusCode}`);
const receiptDocument = receiptCreateResponse.json();

const receiptIssueWithoutAttestationResponse = await app.inject({
  method: "POST",
  url: `/api/documents/${receiptDocument.id}/issue`
});
assert(
  receiptIssueWithoutAttestationResponse.statusCode === 400,
  `completed payment receipt issue without signature attestation must be blocked, got ${receiptIssueWithoutAttestationResponse.statusCode}`
);
assert(
  String(receiptIssueWithoutAttestationResponse.body).includes("DocumentIssueValidationFailed") ||
    String(receiptIssueWithoutAttestationResponse.body).toLowerCase().includes("signature") ||
    String(receiptIssueWithoutAttestationResponse.body).includes("подпис"),
  "issue without attestation block must explain missing signature/receipt facts"
);

const receiptIssueResponse = await app.inject({
  method: "POST",
  url: `/api/documents/${receiptDocument.id}/issue`,
  payload: issueAttestation({
    signatureAttestation: {
      recipientFullName: receiptPayment.payerFullName ?? "Smoke Patient",
      note: "payment receipt lifecycle"
    }
  })
});
assert(
  receiptIssueResponse.statusCode === 200,
  `completed payment receipt issue must pass after signature attestation, got ${receiptIssueResponse.statusCode}: ${receiptIssueResponse.body}`
);
assert(receiptIssueResponse.json().status === "issued", "successful issue must return issued document");
assert(receiptIssueResponse.json().signatureAttestation?.recipientSigned === true, "issued document must return signature attestation");
assert(!Object.hasOwn(receiptIssueResponse.json(), "storagePath"), "issued document response must not expose local snapshot path");
assert(
  /^[a-f0-9]{64}$/.test(receiptIssueResponse.json().issuedSnapshotSha256 ?? ""),
  "issued document must return immutable snapshot sha256"
);

const dashboardResponse = await app.inject({
  method: "GET",
  url: "/api/dashboard"
});
assert(dashboardResponse.statusCode === 200, `dashboard response failed: ${dashboardResponse.statusCode}`);
const dashboardDocument = dashboardResponse.json().documents.find((candidate) => candidate.id === receiptDocument.id);
assert(dashboardDocument, "issued document missing from dashboard payload");
assert(!Object.hasOwn(dashboardDocument, "storagePath"), "dashboard document payload must not expose local snapshot path");

const receiptHtmlResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/html`
});
assert(receiptHtmlResponse.statusCode === 200, `issued receipt html failed: ${receiptHtmlResponse.statusCode}`);
assert(
  !receiptHtmlResponse.headers["content-disposition"],
  "issued receipt preview must not force download without download=1"
);
const originalIssuedHtml = receiptHtmlResponse.body;
assert(originalIssuedHtml.includes("Отметка о подписании"), "issued HTML must include signature attestation block");
assert(originalIssuedHtml.includes("Smoke Admin"), "issued HTML must include responsible staff from signature attestation");
const receiptAuditFactsResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/audit-facts`
});
assert(receiptAuditFactsResponse.statusCode === 200, `issued receipt audit facts failed: ${receiptAuditFactsResponse.statusCode}`);
const receiptAuditFacts = receiptAuditFactsResponse.json();
assert(receiptAuditFacts.immutableSnapshotReady === true, "issued audit facts must confirm immutable snapshot");
assert(receiptAuditFacts.canDownloadHtml === true, "issued audit facts must expose archive HTML download");
assert(receiptAuditFacts.canExportPdf === true, "issued audit facts must expose archive PDF export");
assert(receiptAuditFacts.htmlDownloadUrl === `/api/documents/${receiptDocument.id}/html?download=1`, "issued audit facts must expose stable HTML download URL");
assert(receiptAuditFacts.pdfDownloadUrl === `/api/documents/${receiptDocument.id}/pdf`, "issued audit facts must expose stable PDF download URL");
assert(receiptAuditFacts.snapshotSha256 === receiptIssueResponse.json().issuedSnapshotSha256, "audit snapshot sha256 must match issued document");
assert(receiptAuditFacts.signatureAttestation?.recipientSigned === true, "audit facts must expose signature attestation");
assert(!Object.hasOwn(receiptAuditFacts, "storagePath"), "audit facts must not expose local snapshot path");

const receiptDownloadResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/html?download=1`
});
assert(receiptDownloadResponse.statusCode === 200, `issued receipt html download failed: ${receiptDownloadResponse.statusCode}`);
assert(
  /attachment;\s*filename="dente-payment_receipt-.*\.html"/.test(String(receiptDownloadResponse.headers["content-disposition"] ?? "")),
  "issued receipt download must set an HTML attachment filename"
);
assert(receiptDownloadResponse.body === originalIssuedHtml, "downloaded issued HTML must equal immutable preview snapshot");

const receiptPdfResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/pdf`
});
assert(receiptPdfResponse.statusCode === 200, `issued receipt pdf failed: ${receiptPdfResponse.statusCode}: ${receiptPdfResponse.body}`);
assert(
  /attachment;\s*filename="dente-payment_receipt-.*\.pdf"/.test(String(receiptPdfResponse.headers["content-disposition"] ?? "")),
  "issued receipt pdf must set a PDF attachment filename"
);
assert(String(receiptPdfResponse.headers["content-type"] ?? "").includes("application/pdf"), "issued receipt pdf must use application/pdf");
assert(receiptPdfResponse.rawPayload.subarray(0, 4).equals(Buffer.from("%PDF")), "issued receipt pdf must be a real PDF file");
assert(receiptPdfResponse.rawPayload.length > 1_000, "issued receipt pdf must not be an empty placeholder");

const patient = patients.find((candidate) => candidate.id === activeVisit.patientId);
assert(patient, "fixture patient missing");
const originalName = patient.fullName;
patient.fullName = "Changed Smoke Patient";
const repeatedReceiptHtmlResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/html`
});
patient.fullName = originalName;
assert(repeatedReceiptHtmlResponse.statusCode === 200, `reloaded issued receipt html failed: ${repeatedReceiptHtmlResponse.statusCode}`);
assert(repeatedReceiptHtmlResponse.body === originalIssuedHtml, "issued document html must come from immutable snapshot");
assert(!repeatedReceiptHtmlResponse.body.includes("Changed Smoke Patient"), "issued snapshot must not re-render mutated patient data");

const repeatIssueResponse = await app.inject({
  method: "POST",
  url: `/api/documents/${receiptDocument.id}/issue`
});
assert(repeatIssueResponse.statusCode === 409, `already issued document must not re-issue, got ${repeatIssueResponse.statusCode}`);

const issuedReceipt = documents.find((candidate) => candidate.id === receiptDocument.id);
assert(issuedReceipt, "issued receipt fixture missing from mutable document store");
const originalSnapshotHash = issuedReceipt.issuedSnapshotSha256;
issuedReceipt.issuedSnapshotSha256 = null;
const missingHashHtmlResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/html`
});
issuedReceipt.issuedSnapshotSha256 = originalSnapshotHash;
assert(
  missingHashHtmlResponse.statusCode === 409,
  `issued document without snapshot hash must fail integrity check, got ${missingHashHtmlResponse.statusCode}`
);

const originalSnapshotCreatedAt = issuedReceipt.issuedSnapshotCreatedAt;
issuedReceipt.issuedSnapshotCreatedAt = null;
const missingSnapshotCreatedAtAuditResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/audit-facts`
});
assert(
  missingSnapshotCreatedAtAuditResponse.statusCode === 200,
  `issued document without snapshot created-at audit facts failed: ${missingSnapshotCreatedAtAuditResponse.statusCode}`
);
assert(
  missingSnapshotCreatedAtAuditResponse.json().immutableSnapshotReady === false,
  "issued document without snapshot created-at must not report immutable archive readiness"
);
assert(
  missingSnapshotCreatedAtAuditResponse.json().canDownloadHtml === false,
  "issued document without snapshot created-at must not expose HTML archive download"
);
const missingSnapshotCreatedAtHtmlResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/html`
});
issuedReceipt.issuedSnapshotCreatedAt = originalSnapshotCreatedAt;
assert(
  missingSnapshotCreatedAtHtmlResponse.statusCode === 409,
  `issued document without snapshot created-at must fail integrity check, got ${missingSnapshotCreatedAtHtmlResponse.statusCode}`
);

const voidIssuedReceiptWithoutReasonResponse = await app.inject({
  method: "POST",
  url: `/api/documents/${receiptDocument.id}/void`
});
assert(
  voidIssuedReceiptWithoutReasonResponse.statusCode === 400,
  `issued receipt void without attestation must be blocked, got ${voidIssuedReceiptWithoutReasonResponse.statusCode}`
);

const voidIssuedReceiptResponse = await app.inject({
  method: "POST",
  url: `/api/documents/${receiptDocument.id}/void`,
  payload: voidAttestation({
    reasonCode: "payment_correction",
    reasonText: "Smoke lifecycle payment receipt annulled after fiscal payment correction.",
    replacementRequired: true
  })
});
assert(voidIssuedReceiptResponse.statusCode === 200, `issued receipt void failed: ${voidIssuedReceiptResponse.statusCode}`);
assert(voidIssuedReceiptResponse.json().status === "voided", "issued receipt void endpoint must return voided document");
assert(
  voidIssuedReceiptResponse.json().voidAttestation?.reasonCode === "payment_correction",
  "void endpoint must return structured void attestation"
);
patient.fullName = "Changed After Void Smoke Patient";
const voidedIssuedHtmlResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/html`
});
patient.fullName = originalName;
assert(voidedIssuedHtmlResponse.statusCode === 200, `voided issued receipt html failed: ${voidedIssuedHtmlResponse.statusCode}`);
assert(voidedIssuedHtmlResponse.body === originalIssuedHtml, "voided issued document html must keep archived snapshot");
assert(!voidedIssuedHtmlResponse.body.includes("Changed After Void"), "voided issued snapshot must not re-render mutated patient data");
const voidedAuditFactsResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${receiptDocument.id}/audit-facts`
});
assert(voidedAuditFactsResponse.statusCode === 200, `voided receipt audit facts failed: ${voidedAuditFactsResponse.statusCode}`);
assert(voidedAuditFactsResponse.json().status === "voided", "voided audit facts must report voided status");
assert(voidedAuditFactsResponse.json().immutableSnapshotReady === true, "voided issued audit facts must preserve immutable snapshot");
assert(
  voidedAuditFactsResponse.json().voidAttestation?.reasonCode === "payment_correction",
  "voided audit facts must expose structured void attestation"
);
assert(
  voidedAuditFactsResponse.json().warnings.some((warning) => warning.includes("аннулирован")),
  "voided audit facts must warn that document was voided"
);
assert(
  voidedAuditFactsResponse.json().warnings.some((warning) => warning.includes("payment receipt annulled")),
  "voided audit facts must expose void reason"
);

const emptyProcedureConsentCreateResponse = await app.inject({
  method: "POST",
  url: "/api/documents",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    kind: "procedure_specific_consent_packet",
    totalAmountRub: null
  }
});
assert(
  emptyProcedureConsentCreateResponse.statusCode === 409,
  `procedure consent without structured payload must be blocked, got ${emptyProcedureConsentCreateResponse.statusCode}`
);

const emptyTreatmentPlanCreateResponse = await app.inject({
  method: "POST",
  url: "/api/documents",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    kind: "treatment_plan",
    totalAmountRub: null
  }
});
assert(
  emptyTreatmentPlanCreateResponse.statusCode === 409,
  `treatment plan without structured payload must be blocked, got ${emptyTreatmentPlanCreateResponse.statusCode}`
);

const estimateServiceLines = treatmentPlanItems
  .filter(
    (item) => item.patientId === activeVisit.patientId && item.visitId === activeVisit.id && item.status !== "cancelled"
  )
  .map((item, index) => ({
    serviceName: `Lifecycle smoke plan line ${index + 1}: ${item.serviceId}`,
    toothOrArea: item.toothCode ?? null,
    quantity: item.quantity,
    unitPriceRub: item.unitPriceRub,
    discountRub: item.discountRub,
    totalRub: Math.max(0, item.quantity * item.unitPriceRub - item.discountRub)
  }));
const estimateTotalAmountRub = estimateServiceLines.reduce((total, line) => total + line.totalRub, 0);
assert(estimateTotalAmountRub > 0, "lifecycle smoke needs a positive active treatment plan amount");

const createResponse = await app.inject({
  method: "POST",
  url: "/api/documents",
  payload: {
    patientId: activeVisit.patientId,
    visitId: activeVisit.id,
    kind: "treatment_cost_estimate",
    totalAmountRub: null,
    payload: {
      treatmentCostEstimate: {
        estimateNumber: "СМ-LIFE-001",
        estimateDate: "20.05.2026",
        patientOrPayerFullName: "Lifecycle Smoke Payer",
        treatmentBasis: "смета по активному визиту smoke-теста",
        serviceLines: estimateServiceLines,
        totalAmountRub: estimateTotalAmountRub,
        estimateValidUntil: "27.05.2026",
        priceChangeRules: "изменения согласуются до оказания дополнительных услуг",
        excludedItems: ["услуги вне строк сметы"],
        paymentMilestoneNotes: "оплата по этапам с выдачей кассового чека после оплаты",
        responsibleDoctorFullName: "Lifecycle Smoke Doctor",
        responsibleAdminFullName: null,
        signedAt: "20.05.2026 10:30",
        patientUnderstandsPreliminaryEstimate: true,
        serviceScopeMatchesTreatmentPlan: true,
        estimateDoesNotReplaceContractOrFiscalReceipt: true,
        changesRequireUpdatedEstimate: true
      }
    }
  }
});
assert(createResponse.statusCode === 201, `document create failed: ${createResponse.statusCode}`);
const document = createResponse.json();

const draftAuditFactsResponse = await app.inject({
  method: "GET",
  url: `/api/documents/${document.id}/audit-facts`
});
assert(draftAuditFactsResponse.statusCode === 200, `draft audit facts failed: ${draftAuditFactsResponse.statusCode}`);
assert(draftAuditFactsResponse.json().status === "draft", "draft audit facts must report draft status");
assert(draftAuditFactsResponse.json().canDownloadHtml === false, "draft audit facts must not expose archive HTML download");
assert(draftAuditFactsResponse.json().canExportPdf === false, "draft audit facts must not expose PDF export");
assert(draftAuditFactsResponse.json().htmlDownloadUrl === null, "draft audit facts must not expose a download URL");
assert(draftAuditFactsResponse.json().pdfDownloadUrl === null, "draft audit facts must not expose a PDF URL");
assert(
  draftAuditFactsResponse.json().warnings.some((warning) => warning.includes("не выдан")),
  "draft audit facts must warn that document is not issued"
);

const voidResponse = await app.inject({
  method: "POST",
  url: `/api/documents/${document.id}/void`,
  payload: voidAttestation({
    reasonCode: "draft_error",
    reasonText: "Smoke lifecycle draft annulled because payload needs correction.",
    patientOrPayerNotified: false
  })
});
assert(voidResponse.statusCode === 200, `document void failed: ${voidResponse.statusCode}`);
assert(voidResponse.json().status === "voided", "void endpoint must return voided document");
assert(voidResponse.json().voidAttestation?.reasonCode === "draft_error", "draft void must return structured reason");

const afterAudit = auditEvents.slice(0, auditEvents.length - beforeAuditCount);
assert(afterAudit.some((event) => event.action === "document_created"), "document creation audit missing");
assert(afterAudit.some((event) => event.action === "document_issued"), "document issued audit missing");
assert(afterAudit.some((event) => event.action === "document_voided"), "document void audit missing");
assert(
  afterAudit.filter((event) => event.action === "document_issued").length === 1,
  "blocked structured create must not write an extra issued audit"
);

await app.close();

console.log(
  JSON.stringify({
    ok: true,
    issued: receiptDocument.id,
    created: document.id,
    structuredCreateBlocked: emptyTreatmentPlanCreateResponse.statusCode,
    emptyProcedureConsentBlocked: emptyProcedureConsentCreateResponse.statusCode,
    emptyTreatmentPlanBlocked: emptyTreatmentPlanCreateResponse.statusCode,
    repeatIssueBlocked: repeatIssueResponse.statusCode,
    missingSnapshotHashBlocked: missingHashHtmlResponse.statusCode,
    storagePathHidden: true,
    voidedIssuedSnapshotPreserved: true,
    voided: true
  })
);
