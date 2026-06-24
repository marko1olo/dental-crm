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
  app.post("/api/documents/:id/issue", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "document issue"))) return;
    const { id } = request.params as { id: string };
    const existing = documents.find((candidate) => candidate.id === id);
    if (!existing) {
      return reply.code(404).send(apiError("Документ не найден"));
    }
    if (existing.status === "voided") {
      return reply.code(409).send(apiError("Аннулированный документ нельзя выдать."));
    }
    if (existing.status === "issued") {
      return reply.code(409).send(apiError("Документ уже выдан."));
    }
    const patient = patients.find((candidate) => candidate.id === existing.patientId);
    if (!patient) {
      return reply.code(404).send(apiError("Пациент не найден"));
    }
    const taxPaymentSnapshot = taxDocumentUsesPaymentSnapshot(existing.kind)
      ? buildTaxPaymentSnapshotForIssue(existing, payments, documents)
      : null;
    if (taxDocumentUsesPaymentSnapshot(existing.kind) && !taxPaymentSnapshot) {
      const duplicateTaxCertificate = findIssuedDuplicateTaxCertificate(existing);
      if (duplicateTaxCertificate) {
        return reply
          .code(409)
          .send(
            apiError(
              "За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку."
            )
          );
      }
      return reply
        .code(409)
        .send(apiError("Для налогового документа нет новых оплаченных фискальных чеков за выбранный год."));
    }

    const issueCandidate = taxSnapshotDocument(existing, taxPaymentSnapshot);
    const renderContext = documentRenderContext();
    const blockReason = documentIssueBlockReason(issueCandidate, patient, renderContext);
    if (blockReason) {
      return reply.code(409).send(apiError(blockReason));
    }
    const chainBlockReason = documentIssueChainBlockReason(issueCandidate);
    if (chainBlockReason) {
      return reply.code(409).send(apiError(chainBlockReason));
    }
    const duplicateTaxCertificate = findIssuedDuplicateTaxCertificate(issueCandidate);
    if (duplicateTaxCertificate) {
      return reply
        .code(409)
        .send(
          apiError(
            "За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку."
          )
        );
    }

    const parsedIssueInput = issueDocumentSchema.safeParse(request.body);
    if (!parsedIssueInput.success) {
      return reply.code(400).send({
        error: "DocumentIssueValidationFailed",
        message: repairMojibakeText(documentIssueValidationMessage)
      });
    }

    const signatureAttestation = repairMojibakeDeep(parsedIssueInput.data.signatureAttestation);
    const issuedAt = new Date().toISOString();
    const releaseJournalEntry = buildMedicalDocumentReleaseJournalEntry(
      issueCandidate,
      issuedAt,
      signatureAttestation
    );
    const taxXmlSourceSnapshot = taxXmlSourceSnapshotForIssue(issueCandidate, patient, taxPaymentSnapshot, issuedAt);
    const issuedDocumentCandidate = {
      ...issueCandidate,
      status: "issued" as const,
      issuedAt,
      signatureAttestation,
      releaseJournalEntry,
      taxXmlSourceSnapshot
    };
    const issuedHtml = renderDocumentHtml(issuedDocumentCandidate, patient, renderContext);
    const document = issueGeneratedDocument(id, {
      issuedAt,
      releaseJournalEntry,
      snapshotHtml: issuedHtml,
      signatureAttestation,
      taxPaymentSnapshot,
      taxXmlSourceSnapshot,
      totalAmountRub: issueCandidate.totalAmountRub
    });
    if (!document) {
      return reply.code(409).send(apiError("Статус документа нельзя изменить."));
    }
    return reply.send(publicGeneratedDocumentSchema.parse(document));
  });
}
