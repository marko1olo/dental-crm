import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { issueDocumentSchema, publicGeneratedDocumentSchema } from "@dental/shared";
import { buildTaxPaymentSnapshotForIssue, taxDocumentUsesPaymentSnapshot } from "../../documents/taxPaymentSnapshot.js";
import { repairMojibakeDeep, repairMojibakeText } from "../../text/repairMojibake.js";
import { apiError, documentIssueBlockReason, documentIssueChainBlockReason, findIssuedDuplicateTaxCertificate, taxSnapshotDocument, documentRenderContext, documentIssueValidationMessage, buildMedicalDocumentReleaseJournalEntry, taxXmlSourceSnapshotForIssue } from "../documents.js";
import { getDocumentById, issueGeneratedDocumentInDb } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
export async function register(app) {
    app.post("/api/documents/:id/issue", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "document issue")))
            return;
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        const payload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;
        const orgId = payload?.organizationId || "mock-org";
        const { id } = request.params;
        const existing = await getDocumentById(orgId, id);
        if (!existing) {
            return reply.code(404).send(apiError("Документ не найден"));
        }
        if (existing.status === "voided") {
            return reply.code(409).send(apiError("Аннулированный документ нельзя выдать."));
        }
        if (existing.status === "issued") {
            return reply.code(409).send(apiError("Документ уже выдан."));
        }
        const patient = await getPatientByIdFromDb(orgId, existing.patientId);
        if (!patient) {
            return reply.code(404).send(apiError("Пациент не найден"));
        }
        const taxPaymentSnapshot = taxDocumentUsesPaymentSnapshot(existing.kind)
            ? buildTaxPaymentSnapshotForIssue(existing, await import("../../db/billingQuery.js").then(m => m.getPaymentsByPatientIdInDb(orgId, existing.patientId)), await import("../../db/documentQuery.js").then(m => m.getDocumentsByPatientId(orgId, existing.patientId)))
            : null;
        if (taxDocumentUsesPaymentSnapshot(existing.kind) && !taxPaymentSnapshot) {
            const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(existing, []);
            if (duplicateTaxCertificate) {
                return reply
                    .code(409)
                    .send(apiError("За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку."));
            }
            return reply
                .code(409)
                .send(apiError("Для налогового документа нет новых оплаченных фискальных чеков за выбранный год."));
        }
        const issueCandidate = taxSnapshotDocument(existing, taxPaymentSnapshot);
        const requestHost = request.headers.host ?? "127.0.0.1:4100";
        const requestProto = request.headers["x-forwarded-proto"] ?? "http";
        const origin = `${requestProto}://${requestHost}`;
        const renderContext = { ...documentRenderContext(), origin };
        const blockReason = documentIssueBlockReason(issueCandidate, patient, renderContext);
        if (blockReason) {
            return reply.code(409).send(apiError(blockReason));
        }
        const chainBlockReason = await documentIssueChainBlockReason(issueCandidate);
        if (chainBlockReason) {
            return reply.code(409).send(apiError(chainBlockReason));
        }
        const duplicateTaxCertificate = await findIssuedDuplicateTaxCertificate(issueCandidate, []);
        if (duplicateTaxCertificate) {
            return reply
                .code(409)
                .send(apiError("За этот налоговый год и этого налогоплательщика уже выдана налоговая справка. Справка должна быть годовой; сначала аннулируйте или корректно оформите предыдущую справку."));
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
        const releaseJournalEntry = await buildMedicalDocumentReleaseJournalEntry(issueCandidate, issuedAt, signatureAttestation);
        const taxXmlSourceSnapshot = taxXmlSourceSnapshotForIssue(issueCandidate, patient, taxPaymentSnapshot, issuedAt);
        const issuedDocumentCandidate = {
            ...issueCandidate,
            status: "issued",
            issuedAt,
            signatureAttestation,
            releaseJournalEntry,
            taxXmlSourceSnapshot
        };
        const issuedHtml = renderDocumentHtml(issuedDocumentCandidate, patient, renderContext);
        const document = await issueGeneratedDocumentInDb(orgId, id, {
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
