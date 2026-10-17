import type { FastifyInstance } from "fastify";
import { registerInstallationRoute } from "./installationRoute.js";
import { registerIsqRoute } from "./isqRoute.js";
import { registerPassportRoute } from "./passportRoute.js";
import { registerPatientImplantsRoute } from "./patientImplantsRoute.js";
import { registerStockRoute } from "./stockRoute.js";

export { CANONICAL_IMPLANT_WAREHOUSE_SEEDS } from "./implantWarehouseSeeds.js";

export async function registerClinicalImplantRoutes(app: FastifyInstance) {
	registerStockRoute(app);
	registerInstallationRoute(app);
	registerIsqRoute(app);
	registerPassportRoute(app);
	registerPatientImplantsRoute(app);
}
