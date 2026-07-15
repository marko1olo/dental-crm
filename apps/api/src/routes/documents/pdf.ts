import { readIssuedDocumentSnapshot } from "../../db/documentQuery.js";
﻿import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess, requireResolvedOrganizationId } from "../../accessGuard.js";
import {
  createDocumentSchema,
  issueDocumentSchema,
  publicGeneratedDocumentSchema,
  voidDocumentSchema
} from "@dental/shared";

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
import { getDocumentById, issueGeneratedDocumentInDb, voidGeneratedDocumentInDb, storeTaxXmlSnapshotInDb } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { getVisitByIdInDb } from "../../db/visitsQuery.js";
import { renderDocumentHtml, taxFiscalDocumentBlockReason } from "../../documents/renderDocument.js";

export async function register(app: FastifyInstance) {
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // GET /api/documents/:id/pdf  2 issued documents (signed archive)
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get<{ Params: { id: string } }>("/api/documents/:id/pdf", async (request, reply) => {
    const orgId = await requireResolvedOrganizationId(request, reply, "document pdf");
    if (!orgId) return;
    const { id } = request.params;
    const document = await getDocumentById(orgId, id);
    if (!document) {
      return reply.code(404).send(apiError("Документ не найден"));
    }
    if (!documentRequiresIssuedArchive(document)) {
      return reply.code(409).send(apiError("PDF недоступен: документ не требует архива выданного HTML."));
    }
    if (!document.signatureAttestation) {
      return reply.code(409).send(apiError("PDF недоступен: требуется отметка о подписании при выдаче документа."));
    }

    if (!documentHasIssuedArchiveMetadata(document)) {
      return reply.code(409).send(apiError(issuedArchiveIntegrityError));
    }

    const issuedSnapshot = readIssuedDocumentSnapshot(document);
    if (!issuedSnapshot) {
      return reply.code(409).send(apiError("Архив выданного документа не прошёл проверку целостности."));
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

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // GET /api/documents/:id/treatment-plan-pdf
  // On-the-fly PDF for treatment_plan documents (draft or issued).
  // Does NOT require signatureAttestation 2 used for immediate
  // patient hand-out directly from the visit screen.
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get<{ Params: { id: string } }>("/api/documents/:id/treatment-plan-pdf", async (request, reply) => {
    const orgId = await requireResolvedOrganizationId(request, reply, "treatment plan pdf");
    if (!orgId) return;
    const { id } = request.params;
    const document = await getDocumentById(orgId, id);
    if (!document) {
      return reply.code(404).send(apiError("Документ не найден"));
    }
    if (document.kind !== "treatment_plan") {
      return reply.code(409).send(apiError("Этот маршрут предназначен только для документов типа treatment_plan."));
    }

    const patient = await import("../../db/patientsQuery.js").then(m => m.getPatientByIdFromDb(orgId, document.patientId));
    if (!patient) {
      return reply.code(404).send(apiError("Пациент не найден"));
    }

    const context = documentRenderContext();
    const html = renderDocumentHtml(document, patient, context);

    const result = await renderIssuedHtmlToPdf(html);
    if (!result.ok) {
      return reply.code(503).send(apiError(result.error));
    }

    const patientNameSlug = (patient.fullName ?? "patient")
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .slice(0, 40);
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `plan-${patientNameSlug}-${dateSlug}.pdf`;

    return reply
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .type("application/pdf")
      .send(result.pdf);
  });
}