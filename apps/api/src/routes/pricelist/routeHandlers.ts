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

const pricelistMutationRouteOptions = {
	config: { tenantTxSelfManaged: true },
	schema: {
		description:
			"Pricelist mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				"organizationid": { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
};

/**
 * Регистрация маршрутов прейскуранта.
 */
export async function registerPricelistRoutes(app: FastifyInstance) {
	defineStreamRoute(app, { method: "GET", path: "/api/pricelists", permission: "public", handler: ({ request, reply }) => handleGetPricelists(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/pricelist", permission: "public", handler: ({ request, reply }) => handleGetPricelists(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/pricing/catalog", permission: "public", handler: ({ request, reply }) => handleGetPricelists(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/pricelist/categories", permission: "public", handler: ({ request, reply }) => handleGetCategories(request, reply) });

	const pricelistCreateOptions = {
		config: { tenantTxSelfManaged: true },
		schema: {
			description: "Pricelist item create mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
	} as const;

	// Канонический CRUD прейскуранта и техкарт расхода материалов (BOM)
	app.post("/api/pricelist", pricelistCreateOptions, handleCreateCatalogItem);
	app.post("/api/pricelist/items", pricelistCreateOptions, handleCreateCatalogItem);
	defineStreamRoute(app, { method: "GET", path: "/api/pricelist/:serviceId", permission: "public", handler: ({ request, reply }) => handleGetCatalogItem(request, reply) });
	defineStreamRoute(app, { method: "PUT", path: "/api/pricelist/:serviceId", permission: "public", handler: ({ request, reply }) => handleUpdateCatalogItem(request, reply) });
	defineStreamRoute(app, { method: "PATCH", path: "/api/pricelist/:serviceId", permission: "public", handler: ({ request, reply }) => handleUpdateCatalogItem(request, reply) });
	app.delete("/api/pricelist/:serviceId", pricelistMutationRouteOptions, handleDeactivateCatalogItem);

	// BOM / Техкарты списания материалов (Мандаты 8b, 8aa)
	defineStreamRoute(app, { method: "GET", path: "/api/pricelist/:serviceId/bom", permission: "public", handler: ({ request, reply }) => handleGetServiceBom(request, reply) });
	defineStreamRoute(app, { method: "PUT", path: "/api/pricelist/:serviceId/bom", permission: "public", handler: ({ request, reply }) => handleUpdateServiceBom(request, reply) });

	app.post("/api/pricelist/analyze", { bodyLimit: 5 * 1024 * 1024, config: { tenantTxSelfManaged: true } }, handleAnalyzePricelist);
	app.post("/api/pricelist/ingest", { bodyLimit: 10 * 1024 * 1024, config: { tenantTxSelfManaged: true } }, handleIngestPricelist);
	app.post("/api/pricelist/parse-file", { bodyLimit: 15 * 1024 * 1024, config: { tenantTxSelfManaged: true } }, handleParseFile);
	app.post("/api/pricelist/scan-and-import", { bodyLimit: 20 * 1024 * 1024, config: { tenantTxSelfManaged: true } }, handleScanAndImport);
	app.post("/api/pricelist/batch-import", { bodyLimit: 15 * 1024 * 1024, config: { tenantTxSelfManaged: true } }, handleBatchImport);

	defineStreamRoute(app, { method: "POST", path: "/api/pricelist/seed-standard-catalog", permission: "public", handler: ({ request, reply }) => handleSeedStandardCatalog(request, reply) });
	defineStreamRoute(app, { method: "POST", path: "/api/pricelist/seed-baseline-804n", permission: "public", handler: ({ request, reply }) => handleSeedBaseline804n(request, reply) });
	defineStreamRoute(app, { method: "POST", path: "/api/pricelist/seed-baseline", permission: "public", handler: ({ request, reply }) => handleSeedBaseline804n(request, reply) });
	defineStreamRoute(app, { method: "POST", path: "/api/pricelist/seed", permission: "public", handler: ({ request, reply }) => handleSeedBaseline804n(request, reply) });

	defineStreamRoute(app, { method: "GET", path: "/api/pricelist/export", permission: "public", handler: ({ request, reply }) => handleExportPricelist(request, reply) });
	app.post("/api/pricelist/batch-reprice", pricelistCreateOptions, handleBatchReprice);
	app.post("/api/services/batch-update", pricelistCreateOptions, handleBatchReprice);
	app.post("/api/services/batch-reprice", pricelistCreateOptions, handleBatchReprice);
}
