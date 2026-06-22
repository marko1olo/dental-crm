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
  app.get<{ Params: { id: string }; Querystring: { download?: string } }>("/api/documents/:id/html", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "document html"))) return;
    const { id } = request.params as { id: string };
    const document = documents.find((candidate) => candidate.id === id);
    if (!document) {
      return reply.code(404).send(apiError("Документ не найден"));
    }

    const patient = patients.find((candidate) => candidate.id === document.patientId);
    if (!patient) {
      return reply.code(404).send(apiError("Пациент не найден"));
    }

    const issuedSnapshot = readIssuedDocumentSnapshot(document);
    if (documentRequiresIssuedArchive(document)) {
      if (!documentHasIssuedArchiveMetadata(document)) {
        return reply.code(409).send(apiError(issuedArchiveIntegrityError));
      }
      if (!issuedSnapshot) {
        return reply.code(409).send(apiError("Архивная копия выданного документа отсутствует или не прошла проверку целостности."));
      }
      if (request.query.download === "1" || request.query.download === "true") {
        reply.header("Content-Disposition", `attachment; filename="${documentAttachmentFileName(document, "html")}"`);
      }
      return reply.type("text/html; charset=utf-8").send(issuedSnapshot);
    }

    const renderContext = documentRenderContext();
    const blockReason = documentIssueBlockReason(document, patient, renderContext) ?? documentIssueChainBlockReason(document);
    if (blockReason) {
      return reply.code(409).send(apiError(`Печатная форма недоступна: ${blockReason}`));
    }

    return reply.type("text/html; charset=utf-8").send(renderDocumentHtml(document, patient, renderContext));
  });
}
