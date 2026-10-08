import type { FastifyInstance } from "fastify";
import { registerSanpinBactericidalRoutes } from "./sanpin/bactericidalRoutes.js";
import { registerSanpinChairReadinessRoutes } from "./sanpin/chairReadinessRoutes.js";
import { registerSanpinCleaningRoutes } from "./sanpin/cleaningRoutes.js";
import { registerSanpinPsoRoutes } from "./sanpin/psoRoutes.js";
import { registerSanpinRegulatoryExportAndShiftCloseRoutes } from "./sanpin/regulatoryExportAndShiftCloseRoutes.js";
import { registerSanpinShiftAutofillRoutes } from "./sanpin/shiftAutofillRoutes.js";
import { registerSanpinSterilizationRoutes } from "./sanpin/sterilizationRoutes.js";
import { registerSanpinSummaryRoutes } from "./sanpin/summaryRoutes.js";
import { registerSanpinTemperatureRoutes } from "./sanpin/temperatureRoutes.js";
import { registerSanpinWasteAndBiohazardRoutes } from "./sanpin/wasteAndBiohazardRoutes.js";

declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; role?: string; organizationId?: string; [key: string]: unknown };
	}
}

/**
 * SanPiN 3.3686-21 Regulatory Registers Master Route Facade.
 *
 * Dispatches to modular domain route sub-modules:
 * - Summary & Compliance Dashboard (`summaryRoutes.ts`)
 * - Pre-Sterilization Cleaning (PSO) Journal (`psoRoutes.ts`)
 * - Sterilization Equipment & Logs (`sterilizationRoutes.ts`)
 * - Bactericidal Irradiators & Disinfection (`bactericidalRoutes.ts`)
 * - General & Current Room Cleaning Journal (`cleaningRoutes.ts`)
 * - Medical Waste & Emergency Biohazard Logs (`wasteAndBiohazardRoutes.ts`)
 * - Temperature & Humidity Monitoring (`temperatureRoutes.ts`)
 * - Rapid Shift Autofill Engine (`shiftAutofillRoutes.ts`)
 * - Chair & Cabinet Readiness Status (`chairReadinessRoutes.ts`)
 * - Regulatory Export Dossiers & Shift Close (`regulatoryExportAndShiftCloseRoutes.ts`)
 */
export async function registerSanpinRoutes(app: FastifyInstance): Promise<void> {
	registerSanpinSummaryRoutes(app);
	registerSanpinPsoRoutes(app);
	registerSanpinSterilizationRoutes(app);
	registerSanpinBactericidalRoutes(app);
	registerSanpinCleaningRoutes(app);
	registerSanpinWasteAndBiohazardRoutes(app);
	registerSanpinTemperatureRoutes(app);
	registerSanpinShiftAutofillRoutes(app);
	registerSanpinChairReadinessRoutes(app);
	registerSanpinRegulatoryExportAndShiftCloseRoutes(app);
}

export {
	registerSanpinBactericidalRoutes,
	registerSanpinChairReadinessRoutes,
	registerSanpinCleaningRoutes,
	registerSanpinPsoRoutes,
	registerSanpinRegulatoryExportAndShiftCloseRoutes,
	registerSanpinShiftAutofillRoutes,
	registerSanpinSterilizationRoutes,
	registerSanpinSummaryRoutes,
	registerSanpinTemperatureRoutes,
	registerSanpinWasteAndBiohazardRoutes,
};
