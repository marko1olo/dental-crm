import type { FastifyInstance } from "fastify";
import { handleAnalyzePricelist, handleIngestPricelist } from "./handlersAnalyzeAndIngest.js";
import { handleBatchImport, handleSeedBaseline804n, handleSeedStandardCatalog } from "./handlersBatchImportAndSeed.js";
import { handleExportPricelist, handleBatchReprice } from "./handlersExportAndReprice.js";
import { handleGetPricelists, handleGetCategories } from "./handlersGetAndCategories.js";
import { handleParseFile } from "./handlersParseFile.js";
import { handleScanAndImport } from "./handlersScanAndImport.js";

export {
	handleGetPricelists,
	handleGetCategories,
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

/**
 * Регистрация маршрутов прейскуранта.
 */
export async function registerPricelistRoutes(app: FastifyInstance) {
	app.get("/api/pricelists", handleGetPricelists);
	app.get("/api/pricelist", handleGetPricelists);
	app.get("/api/pricing/catalog", handleGetPricelists);
	app.get("/api/pricelist/categories", handleGetCategories);

	app.post("/api/pricelist/analyze", { bodyLimit: 5 * 1024 * 1024 }, handleAnalyzePricelist);
	app.post("/api/pricelist/ingest", { bodyLimit: 10 * 1024 * 1024 }, handleIngestPricelist);
	app.post("/api/pricelist/parse-file", { bodyLimit: 15 * 1024 * 1024 }, handleParseFile);
	app.post("/api/pricelist/scan-and-import", { bodyLimit: 20 * 1024 * 1024 }, handleScanAndImport);
	app.post("/api/pricelist/batch-import", { bodyLimit: 15 * 1024 * 1024 }, handleBatchImport);

	app.post("/api/pricelist/seed-standard-catalog", handleSeedBaseline804n);
	app.post("/api/pricelist/seed-baseline-804n", handleSeedBaseline804n);
	app.post("/api/pricelist/seed-baseline", handleSeedBaseline804n);
	app.post("/api/pricelist/seed", handleSeedBaseline804n);

	app.get("/api/pricelist/export", handleExportPricelist);
	app.post("/api/pricelist/batch-reprice", handleBatchReprice);
}
