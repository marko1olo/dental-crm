import { readIssuedDocumentSnapshot } from "../../db/documentQuery.js";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { apiError, documentAttachmentFileName, documentHasIssuedArchiveMetadata, documentRequiresIssuedArchive, issuedArchiveIntegrityError, renderIssuedHtmlToPdf, documentRenderContext } from "../documents.js";
import { getDocumentById } from "../../db/documentQuery.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
export async function register(app) {
    // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    // GET /api/documents/:id/pdf  вЂ” issued documents (signed archive)
    // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    app.get("/api/documents/:id/pdf", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "document pdf")))
            return;
        const { id } = request.params;
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        const payload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;
        const orgId = payload?.organizationId || "mock-org";
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
    app.get("/api/documents/:id/treatment-plan-pdf", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "treatment plan pdf")))
            return;
        const clinicHeader = request.headers["x-dente-clinic-token"];
        const clinicToken = Array.isArray(clinicHeader) ? clinicHeader[0] : clinicHeader;
        const payload = clinicToken ? verifyToken(clinicToken, TOKEN_SECRET()) : null;
        const orgId = payload?.organizationId || "mock-org";
        const { id } = request.params;
        const document = await getDocumentById(orgId, id);
        if (!document) {
            return reply.code(404).send(apiError("Р”РѕРєСѓРјРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ"));
        }
        if (document.kind !== "treatment_plan") {
            return reply.code(409).send(apiError("Р­С‚РѕС‚ РјР°СЂС€СЂСѓС‚ РїСЂРµРґРЅР°Р·РЅР°С‡РµРЅ С‚РѕР»СЊРєРѕ РґР»СЏ РґРѕРєСѓРјРµРЅС‚РѕРІ С‚РёРїР° treatment_plan."));
        }
        const patient = await import("../../db/patientsQuery.js").then(m => m.getPatientByIdFromDb(orgId, document.patientId));
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
