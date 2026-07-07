import { requireClinicalReadAccess } from "../../accessGuard.js";
import { apiError, buildDocumentAuditFacts } from "../documents.js";
import { getDocumentById } from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";
export async function register(app) {
    app.get("/api/documents/:id/audit-facts", async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "document audit facts")))
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
        return reply.send(buildDocumentAuditFacts(document, patient));
    });
}
