import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";


import {
  buildTaxPaymentSnapshotForIssue,
  taxDocumentUsesPaymentSnapshot
} from "../../documents/taxPaymentSnapshot.js";
import { buildKnd1151156Xml } from "../../documents/taxXml.js";

import {
  apiError,
  configuredTaxOfficeCode,
  documentIssueBlockReason,
  documentIssueChainBlockReason,
  findIssuedDuplicateTaxCertificate,
  frozenTaxXmlClinicProfile,
  frozenTaxXmlPatient,
  frozenTaxXmlPayments,
  taxSnapshotDocument,
  taxXmlSourceSnapshotSha256,
  documentRenderContext
} from "../documents.js";
import { getDocumentById, issueGeneratedDocumentInDb, voidGeneratedDocumentInDb, storeTaxXmlSnapshotInDb } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";
import { getVisitByIdInDb } from "../../db/visitsQuery.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";

import { taxFiscalDocumentBlockReason } from "../../documents/renderDocument.js";

export async function register(app: FastifyInstance) {
  app.get("/api/documents/:id/tax-xml", handleGetTaxXml);
}

async function handleGetTaxXml(request: FastifyRequest, reply: FastifyReply) {
  if (!(await requireClinicalReadAccess(request, reply, "document tax xml"))) return;
    const { id } = request.params as { id: string };
        const clinicHeader = request.headers["x-dente-clinic-token"];
    const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
    const payload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;
    const orgId = payload?.organizationId as string || "mock-org";
    const document = await getDocumentById(orgId, id);
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

    const patient = await getPatientByIdFromDb(orgId, document.patientId);
    if (!patient) {
      return reply.code(404).send(apiError("Пациент не найден"));
    }

    const taxPaymentSnapshot =
      document.taxPaymentSnapshot ??
      (taxDocumentUsesPaymentSnapshot(document.kind) ? buildTaxPaymentSnapshotForIssue(document, await import("../../db/billingQuery.js").then(m => m.getPaymentsByPatientIdInDb(orgId, document.patientId)), await import("../../db/documentQuery.js").then(m => m.getDocumentsByPatientId(orgId, document.patientId))) : null);
    if (taxDocumentUsesPaymentSnapshot(document.kind) && !taxPaymentSnapshot) {
      const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(document, []);
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
    const xmlClinicProfile = frozenTaxXmlClinicProfile(xmlDocument, await import("../../db/settingsQuery.js").then(m => m.getClinicSettingsFromDb(orgId).then(s => s.profile)));
    const xmlPayments = frozenTaxXmlPayments(xmlDocument, await import("../../db/billingQuery.js").then(m => m.getPaymentsByPatientIdInDb(orgId, xmlDocument.patientId)));
    const xmlRenderContext = { ...renderContext, clinicProfile: xmlClinicProfile, payments: xmlPayments };
    const blockReason = documentIssueBlockReason(xmlDocument, xmlPatient, xmlRenderContext);
    if (blockReason) {
      return reply.code(409).send(apiError(blockReason));
    }
    const taxBlockReason = taxFiscalDocumentBlockReason(xmlDocument, xmlPatient, xmlRenderContext);
    if (taxBlockReason) {
      return reply.code(409).send(apiError(taxBlockReason));
    }
    const chainBlockReason = await documentIssueChainBlockReason(xmlDocument);
    if (chainBlockReason) {
      return reply.code(409).send(apiError(chainBlockReason));
    }
    const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(xmlDocument, []);
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
    const storedDocument = await storeTaxXmlSnapshotInDb(orgId, document.id, {
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
}
