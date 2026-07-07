import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { publicGeneratedDocumentSchema, voidDocumentSchema } from "@dental/shared";
import { repairMojibakeDeep, repairMojibakeText } from "../../text/repairMojibake.js";
import { apiError, documentVoidValidationMessage } from "../documents.js";
import { getDocumentById, voidGeneratedDocumentInDb } from "../../db/documentQuery.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../auth.js";
export async function register(app) {
    app.post("/api/documents/:id/void", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "document void")))
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
        const parsedVoidInput = voidDocumentSchema.safeParse(request.body);
        if (!parsedVoidInput.success) {
            return reply.code(400).send({
                error: "DocumentVoidValidationFailed",
                message: repairMojibakeText(documentVoidValidationMessage)
            });
        }
        const voidAttestationInput = repairMojibakeDeep(parsedVoidInput.data.voidAttestation);
        const correctionDocumentId = voidAttestationInput.correctionDocumentId ?? null;
        if (correctionDocumentId === id) {
            return reply.code(409).send(apiError("Документ не может ссылаться на себя как на исправление."));
        }
        if (correctionDocumentId) {
            const correctionDocument = await getDocumentById(orgId, correctionDocumentId);
            if (!correctionDocument ||
                correctionDocument.organizationId !== existing.organizationId ||
                correctionDocument.patientId !== existing.patientId ||
                correctionDocument.status === "voided") {
                return reply
                    .code(409)
                    .send(apiError("Исправляющий документ должен существовать у того же пациента, той же клиники и не быть аннулированным."));
            }
        }
        const voidedAt = new Date().toISOString();
        const document = await voidGeneratedDocumentInDb(orgId, id, {
            voidedAt,
            voidAttestation: {
                ...voidAttestationInput,
                voidedAt
            }
        });
        if (!document) {
            return reply.code(409).send(apiError("Статус документа нельзя изменить."));
        }
        return reply.send(publicGeneratedDocumentSchema.parse(document));
    });
}
