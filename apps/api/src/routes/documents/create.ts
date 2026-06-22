import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import {
  createDocumentSchema,
  issueDocumentSchema,
  publicGeneratedDocumentSchema,
  voidDocumentSchema
} from "@dental/shared";
import {
  clinicProfile,
  createGeneratedDocument,
  documents,
  findVisitById,
  issueGeneratedDocument,
  patients,
  payments,
  readIssuedDocumentSnapshot,
  storeTaxXmlSnapshot,
  treatmentPlanItems,
  voidGeneratedDocument
} from "../../sampleData.js";
import {
  paidAmountRubForDocument,
  plannedAmountRubForDocument,
  paymentRefundCorrectionSelectionErrorForDocument,
  paymentReceiptSelectionErrorForDocument,
  taxPaymentSelectionErrorForDocument,
  validateDocumentCreation
} from "../../documents/guards.js";

import {
  buildTaxPaymentSnapshotForIssue,
  taxDocumentUsesPaymentSnapshot
} from "../../documents/taxPaymentSnapshot.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";
import { repairMojibakeDeep, repairMojibakeText } from "../../text/repairMojibake.js";

import {
  apiError,
  buildDocumentAuditFacts,
  configuredTaxOfficeCode,
  documentAttachmentFileName,
  documentCreateValidationMessageForRequest,
  documentHasIssuedArchiveMetadata,
  documentIssueBlockReason,
  documentIssueChainBlockReason,
  documentRequiresIssuedArchive,
  findIssuedDuplicateTaxCertificate,
  frozenTaxXmlClinicProfile,
  frozenTaxXmlPatient,
  frozenTaxXmlPayments,
  issuedArchiveIntegrityError,
  renderIssuedHtmlToPdf,
  taxSnapshotDocument,
  taxXmlSourceSnapshotSha256,
  documentRenderContext,
  documentVoidValidationMessage,
  documentIssueValidationMessage,
  buildMedicalDocumentReleaseJournalEntry,
  taxXmlSourceSnapshotForIssue
} from "../documents.js";
import { renderDocumentHtml, taxFiscalDocumentBlockReason } from "../../documents/renderDocument.js";

export async function register(app: FastifyInstance) {
  app.post("/api/documents", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "document create"))) return;
    const parsedInput = createDocumentSchema.safeParse(request.body);
    if (!parsedInput.success) {
      return reply.code(400).send({
        error: "DocumentValidationFailed",
        message: repairMojibakeText(documentCreateValidationMessageForRequest(request.body))
      });
    }
    const input = repairMojibakeDeep(parsedInput.data);
    const patient = patients.find((candidate) => candidate.id === input.patientId);
    const visit = input.visitId ? findVisitById(input.visitId) : null;
    const validation = validateDocumentCreation(input, {
      patient: patient ?? null,
      visit,
      paidAmountRub: paidAmountRubForDocument(input.kind, input, payments),
      plannedAmountRub: plannedAmountRubForDocument(input.kind, input, treatmentPlanItems),
      taxPaymentSelectionError: taxPaymentSelectionErrorForDocument(input, payments),
      paymentReceiptSelectionError: paymentReceiptSelectionErrorForDocument(input, payments),
      paymentRefundCorrectionSelectionError: paymentRefundCorrectionSelectionErrorForDocument(input, payments)
    });
    if (!validation.ok) {
      return reply.code(validation.statusCode).send(apiError(validation.error));
    }

    const document = createGeneratedDocument(validation.input);
    return reply.code(201).send(publicGeneratedDocumentSchema.parse(document));
  });
}
