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
  app.get<{ Params: { id: string } }>("/api/documents/:id/pdf", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "document pdf"))) return;
    const { id } = request.params;
    const document = documents.find((candidate) => candidate.id === id);
    if (!document) {
      return reply.code(404).send(apiError("Документ не найден"));
    }
    if (!documentRequiresIssuedArchive(document)) {
      return reply.code(409).send(apiError("PDF можно выгрузить только из выданной архивной HTML-копии."));
    }
    if (!document.signatureAttestation) {
      return reply.code(409).send(apiError("PDF нельзя выгрузить без отметки подписания и получения выданного документа."));
    }

    if (!documentHasIssuedArchiveMetadata(document)) {
      return reply.code(409).send(apiError(issuedArchiveIntegrityError));
    }

    const issuedSnapshot = readIssuedDocumentSnapshot(document);
    if (!issuedSnapshot) {
      return reply.code(409).send(apiError("Архивная копия выданного документа отсутствует или не прошла проверку целостности."));
    }

    const result = await renderIssuedHtmlToPdf(issuedSnapshot);
    if (!result.ok) {
      return reply.code(503).send(apiError(result.error));
    }

    return reply
      .header("Content-Disposition", `attachment; filename="${documentAttachmentFileName(document, "pdf")}"`)
      .type("application/pdf")
      .send(result.pdf);
  });
}
