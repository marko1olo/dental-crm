import type { FastifyInstance } from "fastify";
import { registerTemplateCrudRoutes } from "./templateCrudRoutes.js";
import { registerTemplateRenderAndPreviewRoutes } from "./templateRenderAndPreviewRoutes.js";

export * from "./typesAndSchemas.js";
export * from "./defaultStatutoryTemplates.js";
export { registerTemplateCrudRoutes } from "./templateCrudRoutes.js";
export { registerTemplateRenderAndPreviewRoutes } from "./templateRenderAndPreviewRoutes.js";

/**
 * Регистрация Fastify маршрутов каталога и шаблонизатора документов DENTE CRM
 */
export async function registerDocumentTemplateRoutes(app: FastifyInstance) {
	await registerTemplateCrudRoutes(app);
	await registerTemplateRenderAndPreviewRoutes(app);
}

/**
 * Единая консолидированная точка монтирования шаблонов клиники:
 * 1. Бланки официальных документов (ИДС, договоры, справки) -> /api/document-templates
 * 2. Клинические протоколы приёма (Дневник приёма / протокол осмотра) -> /api/templates
 */
export async function registerAllTemplateRoutes(app: FastifyInstance) {
	await registerDocumentTemplateRoutes(app);
	const registerTemplateRoutes = (await import("../templates.js")).default;
	await registerTemplateRoutes(app);
}
