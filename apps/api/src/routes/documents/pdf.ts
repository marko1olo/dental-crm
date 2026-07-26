import { readIssuedDocumentSnapshot } from "../../db/documentQuery.js";
import { requireOrganizationId } from "../../security/identity.js";
﻿import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
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
  resolveDocumentRenderContext,
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
  // GET /api/documents/:id/pdf  вЂ” issued documents (signed archive)
  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get<{ Params: { id: string } }>("/api/documents/:id/pdf", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "document pdf"))) return;
    const { id } = request.params;
    // БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
    // Все проверки принадлежности сравнивали подделку саму с собой и сходились,
    // а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
    // Организация теперь берётся только из проверенного токена (401 иначе).
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;
    const document = await getDocumentById(orgId, id);
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
    // БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
    // Все проверки принадлежности сравнивали подделку саму с собой и сходились,
    // а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
    // Организация теперь берётся только из проверенного токена (401 иначе).
    const orgId = requireOrganizationId(request, reply);
    if (!orgId) return;
    const { id } = request.params;
    const document = await getDocumentById(orgId, id);
    if (!document) {
      return reply.code(404).send(apiError("Р”РѕРєСѓРјРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"));
    }
    if (document.kind !== "treatment_plan") {
      return reply.code(409).send(apiError("Р­С‚РѕС‚ РјР°СЂС€СЂСѓС‚ РїСЂРµРґРЅР°Р·РЅР°С‡РµРЅ С‚РѕР»СЊРєРѕ РґР»СЏ РґРѕРєСѓРјРµРЅС‚РѕРІ С‚РёРїР° treatment_plan."));
    }

    // БЫЛО: маршрут не проверял статус вообще и ВСЕГДА рендерил документ заново
    // из текущих данных. План лечения, выданный и подписанный 1 марта, после
    // изменения фамилии пациента 10 марта скачивался уже с другими данными —
    // то есть отличался от копии, которую пациент подписал. Аннулированный план
    // тоже скачивался как обычный. Замороженный архив при этом игнорировался.
    if (document.status === "voided") {
      return reply
        .code(409)
        .send(apiError("Документ аннулирован: печатная форма недоступна."));
    }

    // Для выданного документа отдаём именно архивную копию, как это делает
    // соседний маршрут /pdf: она заверена и проверяется на целостность.
    if (document.status === "issued") {
      if (!documentHasIssuedArchiveMetadata(document)) {
        return reply.code(409).send(apiError(issuedArchiveIntegrityError));
      }
      const issuedSnapshot = readIssuedDocumentSnapshot(document);
      if (!issuedSnapshot) {
        return reply
          .code(409)
          .send(apiError("Архив выданного документа не прошёл проверку целостности."));
      }
      const issuedResult = await renderIssuedHtmlToPdf(issuedSnapshot);
      if (!issuedResult.ok) {
        return reply.code(503).send(apiError(issuedResult.error));
      }
      return reply
        .header("Content-Disposition", `attachment; filename="${documentAttachmentFileName(document, "pdf")}"`)
        .type("application/pdf")
        .send(issuedResult.pdf);
    }

    const patient = await import("../../db/patientsQuery.js").then(m => m.getPatientByIdFromDb(orgId, document.patientId));
    if (!patient) {
      return reply.code(404).send(apiError("РџР°С†РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"));
    }

    // Реальный контекст вместо пустой заглушки (см. documents.ts).
    const context = await resolveDocumentRenderContext(orgId, document.patientId);
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