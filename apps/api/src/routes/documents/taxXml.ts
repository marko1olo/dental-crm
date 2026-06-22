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
  app.get("/api/documents/:id/tax-xml", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "document tax xml"))) return;
    const { id } = request.params as { id: string };
    const document = documents.find((candidate) => candidate.id === id);
    if (!document) {
      return reply.code(404).send(apiError("Документ не найден"));
    }
    if (document.status === "voided") {
      return reply.code(409).send(apiError("Аннулированный документ нельзя выгрузить в XML ФНС."));
    }
    if (document.status !== "issued") {
      return reply.code(409).send(apiError("XML ФНС можно выгрузить только после выдачи налоговой справки. Сначала выпустите справку и заморозьте состав оплат."));
    }
    if (!document.signatureAttestation) {
      return reply.code(409).send(apiError("XML ФНС нельзя выгрузить без отметки подписания и получения выданного документа."));
    }

    if (document.taxXmlSnapshot) {
      return reply
        .header("Content-Disposition", `attachment; filename="${document.taxXmlSnapshot.fileName}.xml"`)
        .type("application/xml; charset=utf-8")
        .send(document.taxXmlSnapshot.xml);
    }

    const patient = patients.find((candidate) => candidate.id === document.patientId);
    if (!patient) {
      return reply.code(404).send(apiError("Пациент не найден"));
    }

    const taxPaymentSnapshot =
      document.taxPaymentSnapshot ??
      (taxDocumentUsesPaymentSnapshot(document.kind) ? buildTaxPaymentSnapshotForIssue(document, payments, documents) : null);
    if (taxDocumentUsesPaymentSnapshot(document.kind) && !taxPaymentSnapshot) {
      const duplicateTaxCertificate = findIssuedDuplicateTaxCertificate(document);
      if (duplicateTaxCertificate) {
        return reply
          .code(409)
          .send(
            apiError(
              "За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. XML ФНС нельзя собирать до аннулирования или корректировки предыдущей справки."
            )
          );
      }
      return reply
        .code(409)
        .send(apiError("Для XML ФНС нет новых оплаченных фискальных чеков за выбранный год."));
    }
    const xmlDocument = taxSnapshotDocument(document, taxPaymentSnapshot);
    const xmlSourceSnapshotSha256 = taxXmlSourceSnapshotSha256(xmlDocument.taxXmlSourceSnapshot);
    if (!xmlSourceSnapshotSha256) {
      return reply
        .code(409)
        .send(apiError("XML ФНС нельзя собрать без снимка данных пациента, клиники и платежей на момент выдачи. Аннулируйте и выдайте исправленную справку."));
    }
    const renderContext = documentRenderContext();
    const xmlPatient = frozenTaxXmlPatient(xmlDocument, patient);
    const xmlClinicProfile = frozenTaxXmlClinicProfile(xmlDocument, clinicProfile);
    const xmlPayments = frozenTaxXmlPayments(xmlDocument, payments);
    const xmlRenderContext = { ...renderContext, clinicProfile: xmlClinicProfile, payments: xmlPayments };
    const blockReason = documentIssueBlockReason(xmlDocument, xmlPatient, xmlRenderContext);
    if (blockReason) {
      return reply.code(409).send(apiError(blockReason));
    }
    const taxBlockReason = taxFiscalDocumentBlockReason(xmlDocument, xmlPatient, xmlRenderContext);
    if (taxBlockReason) {
      return reply.code(409).send(apiError(taxBlockReason));
    }
    const chainBlockReason = documentIssueChainBlockReason(xmlDocument);
    if (chainBlockReason) {
      return reply.code(409).send(apiError(chainBlockReason));
    }
    const duplicateTaxCertificate = findIssuedDuplicateTaxCertificate(xmlDocument);
    if (duplicateTaxCertificate) {
      return reply
        .code(409)
        .send(
          apiError(
            "За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. XML ФНС нельзя собирать до аннулирования или корректировки предыдущей справки."
          )
        );
    }

    const taxOfficeCode = configuredTaxOfficeCode();
    const result = buildKnd1151156Xml(xmlDocument, xmlPatient, {
      clinicProfile: xmlClinicProfile,
      payments: xmlPayments,
      taxOfficeCode
    });
    if (!result.ok) {
      return reply.code(result.statusCode).send(apiError(result.error));
    }
    const storedDocument = storeTaxXmlSnapshot(document.id, {
      fileName: result.fileName,
      xml: result.xml,
      taxOfficeCode: (taxOfficeCode ?? "").replace(/\D+/g, ""),
      sourceSnapshotSha256: xmlSourceSnapshotSha256
    });
    const snapshot = storedDocument?.taxXmlSnapshot;
    if (!snapshot) {
      return reply.code(409).send(apiError("XML ФНС собран, но не сохранен как архивный снимок."));
    }

    return reply
      .header("Content-Disposition", `attachment; filename="${snapshot.fileName}.xml"`)
      .type("application/xml; charset=utf-8")
      .send(snapshot.xml);
  });
}
