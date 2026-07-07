import { documentIngestionRequestSchema, documentIngestionResponseSchema } from "@dental/shared";
import { extractDocument } from "../ingestion/documentExtractor.js";
import { requireClinicalMutationAccess } from "../accessGuard.js";
const ingestionValidationMessage = "Файл не разобран: передайте название и файл или текст документа до безопасного лимита.";
function parseIngestionPayload(schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        return null;
    }
    return parsed.data;
}
export async function registerIngestionRoutes(app) {
    app.post("/api/ingestion/extract", {
        bodyLimit: 9 * 1024 * 1024
    }, async (request, reply) => {
        if (!(await requireClinicalMutationAccess(request, reply, "document ingestion extract")))
            return;
        const input = parseIngestionPayload(documentIngestionRequestSchema, request.body);
        if (!input) {
            return reply.code(400).send({
                error: "DocumentIngestionValidationError",
                message: ingestionValidationMessage
            });
        }
        return documentIngestionResponseSchema.parse(extractDocument(input));
    });
}
