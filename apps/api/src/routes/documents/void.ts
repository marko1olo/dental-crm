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
  app.post("/api/documents/:id/void", async (request, reply) => {
    if (!(await requireClinicalMutationAccess(request, reply, "document void"))) return;
    const { id } = request.params as { id: string };
    const existing = documents.find((candidate) => candidate.id === id);
    if (!existing) {
      return reply.code(404).send(apiError("Документ не найден"));
    }

    const parsedVoidInput = voidDocumentSchema.safeParse(request.body);
    if (!parsedVoidInput.success) {
      return reply.code(400).send({
        error: "DocumentVoidValidationFailed",
        message: repairMojibakeText(documentVoidValidationMessage)
      });
    }

    const voidAttestationInput = repairMojibakeDeep(parsedVoidInput.data.voidAttestation);
    const correctionDocumentId = voidAttestationInput.correctionDocumentId ?? null;
    if (correctionDocumentId === id) {
      return reply.code(409).send(apiError("Документ не может ссылаться на себя как на исправление."));
    }
    if (correctionDocumentId) {
      const correctionDocument = documents.find((candidate) => candidate.id === correctionDocumentId);
      if (
        !correctionDocument ||
        correctionDocument.organizationId !== existing.organizationId ||
        correctionDocument.patientId !== existing.patientId ||
        correctionDocument.status === "voided"
      ) {
        return reply
          .code(409)
          .send(apiError("Исправляющий документ должен существовать у того же пациента, той же клиники и не быть аннулированным."));
      }
    }

    const voidedAt = new Date().toISOString();
    const document = voidGeneratedDocument(id, {
      voidedAt,
      voidAttestation: {
        ...voidAttestationInput,
        voidedAt
      }
    });
    if (!document) {
      return reply.code(409).send(apiError("Статус документа нельзя изменить."));
    }
    return reply.send(publicGeneratedDocumentSchema.parse(document));
  });
}
