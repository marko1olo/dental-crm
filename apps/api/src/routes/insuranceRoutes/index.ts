import type { FastifyInstance } from "fastify";
import { registerClaimApprovalRoutes } from "./claimApprovalHandlers.js";
import { registerGuaranteeLetterRoutes } from "./guaranteeLetterHandlers.js";
import { registerInsuranceAnalyticsRoutes } from "./insuranceAnalyticsHandlers.js";
import { registerPolicyManagementRoutes } from "./policyManagementHandlers.js";

/**
 * Master Fastify Registration Plugin for all Insurance and VHI/DMS Routes.
 * Assembles sub-route controllers in a strictly decoupled DAG.
 */
export async function registerInsuranceRoutes(app: FastifyInstance) {
	await registerPolicyManagementRoutes(app);
	await registerGuaranteeLetterRoutes(app);
	await registerClaimApprovalRoutes(app);
	await registerInsuranceAnalyticsRoutes(app);
}

export const insuranceRoutes = registerInsuranceRoutes;

export * from "./types.js";
export * from "./constants.js";
export { registerPolicyManagementRoutes } from "./policyManagementHandlers.js";
export { registerGuaranteeLetterRoutes } from "./guaranteeLetterHandlers.js";
export { registerClaimApprovalRoutes } from "./claimApprovalHandlers.js";
export { registerInsuranceAnalyticsRoutes } from "./insuranceAnalyticsHandlers.js";
