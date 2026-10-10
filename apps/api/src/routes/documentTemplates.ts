/**
 * apps/api/src/routes/documentTemplates.ts
 * DENTE Dental CRM — Document Templates Canonical Route Facade (Mandate 8b <= 30 lines)
 * Dynamic clinic resolution via organizations.id is encapsulated in documentTemplatesModules.
 */
export {
	registerAllTemplateRoutes,
	registerDocumentTemplateRoutes,
} from "./documentTemplatesModules/index.js";
export * from "./documentTemplatesModules/index.js";
