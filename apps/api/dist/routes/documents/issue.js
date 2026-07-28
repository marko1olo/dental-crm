import { requireOrganizationId } from "../../security/identity.js";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { issueDocumentSchema, publicGeneratedDocumentSchema } from "@dental/shared";
import { paymentRefundCorrectionSelectionErrorForDocument } from "../../documents/guards.js";
import { buildTaxPaymentSnapshotForIssue, taxDocumentUsesPaymentSnapshot } from "../../documents/taxPaymentSnapshot.js";
import { repairMojibakeDeep, repairMojibakeText } from "../../text/repairMojibake.js";
import { apiError, documentIssueBlockReason, documentIssueChainBlockReason, findIssuedDuplicateTaxCertificate, taxSnapshotDocument, resolveDocumentRenderContext, documentIssueValidationMessage, buildMedicalDocumentReleaseJournalEntry, taxXmlSourceSnapshotForIssue } from "../documents.js";
import { getDocumentById, issueGeneratedDocumentInDb } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
export async function register(app) {
    app.post("/api/documents/:id/issue", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "document issue")))
            return;
        // БЫЛО: при отсутствии/невалидности токена подставлялась строка "mock-org".
        // Все проверки принадлежности сравнивали подделку саму с собой и сходились,
        // а в uuid-колонку уходило "mock-org" → 500 на каждом маршруте документов.
        // Организация теперь берётся только из проверенного токена (401 иначе).
        const orgId = requireOrganizationId(request, reply);
        if (!orgId)
            return;
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
        // Реальный контекст вместо пустой заглушки: без профиля клиники выдача
        // договоров и актов отклонялась как «профиль заполнен не полностью».
        const renderContext = {
            ...(await resolveDocumentRenderContext(orgId, existing.patientId)),
            origin,
        };
        const blockReason = documentIssueBlockReason(issueCandidate, patient, renderContext);
        if (blockReason) {
            return reply.code(409).send(apiError(blockReason));
        }
        const chainBlockReason = await documentIssueChainBlockReason(issueCandidate);
        if (chainBlockReason) {
            return reply.code(409).send(apiError(chainBlockReason));
        }
        // Контроль суммарных возвратов именно в момент ВЫДАЧИ — здесь деньги реально
        // покидают кассу. Проверка при создании черновика недостаточна: между
        // созданием и выдачей мог быть выдан другой возврат по тому же чеку.
        if (issueCandidate.kind === "payment_refund_correction_request") {
            const [refundPayments, refundDocuments] = await Promise.all([
                import("../../db/billingQuery.js").then((m) => m.getPaymentsByPatientIdInDb(orgId, existing.patientId)),
                import("../../db/documentQuery.js").then((m) => m.getDocumentsByPatientId(orgId, existing.patientId)),
            ]);
            const refundLimitError = paymentRefundCorrectionSelectionErrorForDocument(issueCandidate, refundPayments, refundDocuments, existing.id);
            if (refundLimitError) {
                return reply.code(409).send(apiError(refundLimitError));
            }
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
