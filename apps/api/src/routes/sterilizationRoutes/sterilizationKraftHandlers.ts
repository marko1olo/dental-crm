import type { FastifyInstance } from "fastify";
import {
	handleGenerateBarcode,
	handleSterilizationLink,
	handleUnsealKraftPackage,
} from "../sanpin/sterilizationModules/sterilizationKraftHandlers.js";

export * from "../sanpin/sterilizationModules/sterilizationKraftHandlers.js";

export async function registerSterilizationKraftRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/sterilization/link", handleSterilizationLink);
	app.post("/api/sterilization/generate-barcode", handleGenerateBarcode);
	app.post("/api/sterilization/unseal", handleUnsealKraftPackage);
}
