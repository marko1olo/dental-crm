import { readIssuedDocumentSnapshot } from "../../db/documentQuery.js";
﻿import type { FastifyInstance } from "fastify";
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
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  // GET /api/documents/:id/pdf  вЂ” issued documents (signed archive)
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get<{ Params: { id: string } }>("/api/documents/:id/pdf", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "document pdf"))) return;
    const { id } = request.params;
    const document = documents.find((candidate) => candidate.id === id);
    if (!document) {
      return reply.code(404).send(apiError("Р”РѕРєСѓРјРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"));
    }
    if (!documentRequiresIssuedArchive(document)) {
      return reply.code(409).send(apiError("PDF РЅРµРґРѕСЃС‚СѓРїРµРЅ: РґРѕРєСѓРјРµРЅС‚ РЅРµ С‚СЂРµР±СѓРµС‚ Р°СЂС…РёРІР° РІС‹РґР°РЅРЅРѕРіРѕ HTML."));
    }
    if (!document.signatureAttestation) {
      return reply.code(409).send(apiError("PDF РЅРµРґРѕСЃС‚СѓРїРµРЅ: С‚СЂРµР±СѓРµС‚СЃСЏ РѕС‚РјРµС‚РєР° Рѕ РїРѕРґРїРёСЃР°РЅРёРё РїСЂРё РІС‹РґР°С‡Рµ РґРѕРєСѓРјРµРЅС‚Р°."));
    }

    if (!documentHasIssuedArchiveMetadata(document)) {
      return reply.code(409).send(apiError(issuedArchiveIntegrityError));
    }

    const issuedSnapshot = readIssuedDocumentSnapshot(document);
    if (!issuedSnapshot) {
      return reply.code(409).send(apiError("РђСЂС…РёРІ РІС‹РґР°РЅРЅРѕРіРѕ РґРѕРєСѓРјРµРЅС‚Р° РЅРµ РїСЂРѕС€С‘Р» РїСЂРѕРІРµСЂРєСѓ С†РµР»РѕСЃС‚РЅРѕСЃС‚Рё."));
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
  // Does NOT require signatureAttestation вЂ” used for immediate
  // patient hand-out directly from the visit screen.
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get<{ Params: { id: string } }>("/api/documents/:id/treatment-plan-pdf", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "treatment plan pdf"))) return;
    const { id } = request.params;
    const document = documents.find((candidate) => candidate.id === id);
    if (!document) {
      return reply.code(404).send(apiError("Р”РѕРєСѓРјРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"));
    }
    if (document.kind !== "treatment_plan") {
      return reply.code(409).send(apiError("Р­С‚РѕС‚ РјР°СЂС€СЂСѓС‚ РїСЂРµРґРЅР°Р·РЅР°С‡РµРЅ С‚РѕР»СЊРєРѕ РґР»СЏ РґРѕРєСѓРјРµРЅС‚РѕРІ С‚РёРїР° treatment_plan."));
    }

    const patient = patients.find((p) => p.id === document.patientId);
    if (!patient) {
      return reply.code(404).send(apiError("РџР°С†РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"));
    }

    const context = documentRenderContext();
    const html = renderDocumentHtml(document, patient, context);

    const result = await renderIssuedHtmlToPdf(html);
    if (!result.ok) {
      return reply.code(503).send(apiError(result.error));
    }

    const patientNameSlug = (patient.fullName ?? "patient")
      .toLowerCase()
      .replace(/[^a-zР°-СЏС‘0-9]+/gi, "-")
      .slice(0, 40);
    const dateSlug = new Date().toISOString().slice(0, 10);
    const filename = `plan-${patientNameSlug}-${dateSlug}.pdf`;

    return reply
      .header("Content-Disposition", `attachment; filename="${filename}"`)
      .type("application/pdf")
      .send(result.pdf);
  });
}