import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleAnalyzePricelist, handleIngestPricelist } from "./handlersAnalyzeAndIngest.js";
import { handleBatchImport, handleSeedBaseline804n, handleSeedStandardCatalog } from "./handlersBatchImportAndSeed.js";
import {
	handleCreateCatalogItem,
	handleDeactivateCatalogItem,
	handleGetCatalogItem,
	handleGetServiceBom,
	handleUpdateCatalogItem,
	handleUpdateServiceBom,
} from "./handlersCatalogCrud.js";
import { handleExportPricelist, handleBatchReprice } from "./handlersExportAndReprice.js";
import { handleGetPricelists, handleGetCategories } from "./handlersGetAndCategories.js";
import { handleParseFile } from "./handlersParseFile.js";
import { handleScanAndImport } from "./handlersScanAndImport.js";

export {
	handleGetPricelists,
	handleGetCategories,
	handleCreateCatalogItem,
	handleGetCatalogItem,
	handleUpdateCatalogItem,
	handleDeactivateCatalogItem,
	handleGetServiceBom,
	handleUpdateServiceBom,
	handleAnalyzePricelist,
	handleIngestPricelist,
	handleParseFile,
	handleScanAndImport,
	handleBatchImport,
	handleSeedBaseline804n,
	handleSeedStandardCatalog,
	handleExportPricelist,
	handleBatchReprice,
};

const PRICELIST_READ_PERMISSION = {
	anyOf: ["clinical.read", "settings.read", "finance.read"],
} as const;

const PRICELIST_WRITE_PERMISSION = {
	anyOf: ["clinical.write", "settings.write", "finance.write"],
} as const;

const PRICELIST_AUTH_OPTIONS = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
} as const;

const PRICELIST_WRITE_AUTH_OPTIONS = {
	allowClinicTokenWithoutStaff: true,
	allowAdminSecretBypass: true,
	permissionDeniedMessage:
		"Для изменения прейскуранта и каталога услуг требуются полномочия врача, администратора или руководства клиники.",
} as const;

const pricelistMutationSchema = {
	description:
		"Pricelist mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
	headers: {
		type: "object",
		properties: {
			"idempotency-key": { type: "string" },
			"x-idempotency-key": { type: "string" },
			organizationid: { type: "string" },
			"x-organization-id": { type: "string" },
		},
	},
} as const;

/**
 * Регистрация маршрутов прейскуранта.
 */
export async function registerPricelistRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pricelists",
		permission: PRICELIST_READ_PERMISSION,
		authOptions: PRICELIST_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleGetPricelists(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pricelist",
		permission: PRICELIST_READ_PERMISSION,
		authOptions: PRICELIST_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleGetPricelists(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pricing/catalog",
		permission: PRICELIST_READ_PERMISSION,
		authOptions: PRICELIST_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleGetPricelists(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pricelist/categories",
		permission: PRICELIST_READ_PERMISSION,
		authOptions: PRICELIST_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleGetCategories(request, reply),
	});

	// Канонический CRUD прейскуранта и техкарт расхода материалов (BOM)
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		schema: pricelistMutationSchema,
		handler: ({ request, reply }) => handleCreateCatalogItem(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/items",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		schema: pricelistMutationSchema,
		handler: ({ request, reply }) => handleCreateCatalogItem(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pricelist/:serviceId",
		permission: PRICELIST_READ_PERMISSION,
		authOptions: PRICELIST_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleGetCatalogItem(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/pricelist/:serviceId",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleUpdateCatalogItem(request, reply),
	});
	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/pricelist/:serviceId",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleUpdateCatalogItem(request, reply),
	});
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/pricelist/:serviceId",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		schema: pricelistMutationSchema,
		handler: ({ request, reply }) => handleDeactivateCatalogItem(request, reply),
	});

	// BOM / Техкарты списания материалов (Мандаты 8b, 8aa)
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pricelist/:serviceId/bom",
		permission: PRICELIST_READ_PERMISSION,
		authOptions: PRICELIST_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleGetServiceBom(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/pricelist/:serviceId/bom",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleUpdateServiceBom(request, reply),
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/analyze",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		bodyLimit: 5 * 1024 * 1024,
		handler: ({ request, reply }) => handleAnalyzePricelist(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/ingest",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		bodyLimit: 10 * 1024 * 1024,
		handler: ({ request, reply }) => handleIngestPricelist(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/parse-file",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		bodyLimit: 15 * 1024 * 1024,
		handler: ({ request, reply }) => handleParseFile(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/scan-and-import",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		bodyLimit: 20 * 1024 * 1024,
		handler: ({ request, reply }) => handleScanAndImport(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/batch-import",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		bodyLimit: 15 * 1024 * 1024,
		handler: ({ request, reply }) => handleBatchImport(request, reply),
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/seed-standard-catalog",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleSeedStandardCatalog(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/seed-baseline-804n",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleSeedBaseline804n(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/seed-baseline",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleSeedBaseline804n(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/seed",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleSeedBaseline804n(request, reply),
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/pricelist/export",
		permission: PRICELIST_READ_PERMISSION,
		authOptions: PRICELIST_AUTH_OPTIONS,
		handler: ({ request, reply }) => handleExportPricelist(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/pricelist/batch-reprice",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		schema: pricelistMutationSchema,
		handler: ({ request, reply }) => handleBatchReprice(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/services/batch-reprice",
		permission: PRICELIST_WRITE_PERMISSION,
		authOptions: PRICELIST_WRITE_AUTH_OPTIONS,
		schema: pricelistMutationSchema,
		handler: ({ request, reply }) => handleBatchReprice(request, reply),
	});
}
