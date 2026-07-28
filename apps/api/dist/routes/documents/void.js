import { requireOrganizationId } from "../../security/identity.js";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { publicGeneratedDocumentSchema, voidDocumentSchema } from "@dental/shared";
import { repairMojibakeDeep, repairMojibakeText } from "../../text/repairMojibake.js";
import { apiError, documentVoidValidationMessage } from "../documents.js";
import { getDocumentById, voidGeneratedDocumentInDb } from "../../db/documentQuery.js";
export async function register(app) {
    app.post("/api/documents/:id/void", async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "document void")))
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
        // БЫЛО: аннулировать можно было документ в ЛЮБОМ статусе, включая уже
        // аннулированный. Повторное аннулирование перезаписывало причину в
        // voidAttestation — исходное основание, на которое ссылается «Паспорт
        // документа», терялось безвозвратно.
        if (existing.status === "voided") {
            return reply.code(409).send(apiError("Документ уже аннулирован."));
        }
        if (existing.status !== "issued") {
            return reply
                .code(409)
                .send(apiError("Аннулировать можно только выданный документ. Черновик достаточно удалить или изменить."));
        }
        if (correctionDocumentId) {
            const correctionDocument = await getDocumentById(orgId, correctionDocumentId);
            // БЫЛО: проверялось лишь `status === "voided"`, поэтому исправляющим
            // документом принимался ЧЕРНОВИК. Аннулирование ссылалось на документ,
            // который юридически ещё не существует. Во всех остальных звеньях цепочки
            // (documents.ts) требуется именно статус "issued".
            if (!correctionDocument ||
                correctionDocument.organizationId !== existing.organizationId ||
                correctionDocument.patientId !== existing.patientId ||
                correctionDocument.status !== "issued") {
                return reply
                    .code(409)
                    .send(apiError("Исправляющий документ должен быть ВЫДАН, относиться к тому же пациенту и той же клинике."));
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
