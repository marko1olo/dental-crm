import { dentalPricelistAnalysisRequestSchema, dentalPricelistAnalysisResponseSchema } from "@dental/shared";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../accessGuard.js";
import { analyzePricelist } from "../pricelist/analyzer.js";
import { getServiceCatalogForOrganization } from "../db/pricelistQuery.js";
const pricelistValidationMessage = "Ошибка валидации: прайс-лист или запрос не соответствуют формату.";
function parsePricelistPayload(schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        return null;
    }
    return parsed.data;
}
export async function registerPricelistRoutes(app) {
    app.post("/api/pricelist/analyze", {
        bodyLimit: 5 * 1024 * 1024
    }, async (request, reply) => {
        if (!(await requireClinicalReadAccess(request, reply, "pricelist analysis")))
            return;
        const input = parsePricelistPayload(dentalPricelistAnalysisRequestSchema, request.body);
        if (!input) {
            return reply.code(400).send({
                error: "PricelistValidationError",
                message: pricelistValidationMessage
            });
        }
        // БЫЛО: getDefaultOrganizationId() — прайс сравнивался с каталогом услуг
        // ПЕРВОЙ организации в базе. Клиника получала анализ по чужим ценам.
        const orgId = await requireResolvedOrganizationId(request, reply, "pricelist analysis");
        if (!orgId)
            return;
        const catalog = await getServiceCatalogForOrganization(orgId);
        return dentalPricelistAnalysisResponseSchema.parse(await analyzePricelist(input, catalog));
    });
}
