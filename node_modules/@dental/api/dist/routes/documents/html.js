import { readIssuedDocumentSnapshot } from "../../db/documentQuery.js";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { apiError, documentAttachmentFileName, documentHasIssuedArchiveMetadata, documentIssueBlockReason, documentIssueChainBlockReason, documentRequiresIssuedArchive, issuedArchiveIntegrityError, documentRenderContext } from "../documents.js";
import { getDocumentById } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
export async function register(app) {
    app.get("/api/documents/:id/html", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "document html")))
            return;
        const { id } = request.params;
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        const payload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;
        const orgId = payload?.organizationId || "mock-org";
        const document = await getDocumentById(orgId, id);
        if (!document) {
            return reply.code(404).send(apiError("Документ не найден"));
        }
        const patient = await getPatientByIdFromDb(orgId, document.patientId);
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
        const requestHost = request.headers.host ?? "127.0.0.1:4100";
        const requestProto = request.headers["x-forwarded-proto"] ?? "http";
        const origin = `${requestProto}://${requestHost}`;
        const renderContext = { ...documentRenderContext(), origin };
        const blockReason = documentIssueBlockReason(document, patient, renderContext) ?? documentIssueChainBlockReason(document);
        if (blockReason) {
            return reply.code(409).send(apiError(`Печатная форма недоступна: ${blockReason}`));
        }
        return reply.type("text/html; charset=utf-8").send(renderDocumentHtml(document, patient, renderContext));
    });
}
