import type { FastifyInstance } from "fastify";
import {
	EGISZ_DENTAL_SPECIALTY_LABELS,
	EGISZ_DENTAL_SPECIALTY_NSI_CODES,
	type EgiszGatewayConfig,
	extractIcd10,
	formatDoctorSpecialtyLabelForCda,
	formatDoctorSpecialtyNsiCodeForCda,
	readGatewayConfig,
	readGenderFromProfile,
	readSnilsFromProfile,
	splitFullName,
} from "./egisz/helpers.js";
import { registerEgiszModularRoutes } from "./egiszModules/egiszRoutes.js";

// Re-export helper functions and types for backwards compatibility
export {
	readGatewayConfig,
	type EgiszGatewayConfig,
	EGISZ_DENTAL_SPECIALTY_LABELS,
	EGISZ_DENTAL_SPECIALTY_NSI_CODES,
	extractIcd10,
	formatDoctorSpecialtyLabelForCda,
	formatDoctorSpecialtyNsiCodeForCda,
	readGenderFromProfile,
	readSnilsFromProfile,
	splitFullName,
};

export * from "./egiszModules/egiszTypes.js";
export * from "./egiszModules/egiszAuthService.js";
export * from "./egiszModules/egiszSemdBuilder.js";
export * from "./egiszModules/egiszVimisSender.js";

/**
 * Root Fastify router for EGISZ/VIMIS integration.
 * Delegates to modular egiszModules architecture (<= 50 lines facade).
 */
export default async function registerEgiszRoutes(app: FastifyInstance) {
	await registerEgiszModularRoutes(app);
}
