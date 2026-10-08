/**
 * Insurance Contracts & VHI/DMS API Canonical Facade
 *
 * Manages DMS (voluntary medical insurance) contracts, guarantee letters,
 * claims splitting, and statutory billing registries.
 * Decomposed into modular DAG structure under ./insuranceRoutes/ per Mandate 8t & /decomposer.
 */

export {
	insuranceRoutes,
	registerInsuranceRoutes,
} from "./insuranceRoutes/index.js";

export * from "./insuranceRoutes/types.js";
export * from "./insuranceRoutes/constants.js";
export { registerPolicyManagementRoutes } from "./insuranceRoutes/policyManagementHandlers.js";
export { registerGuaranteeLetterRoutes } from "./insuranceRoutes/guaranteeLetterHandlers.js";
export { registerClaimApprovalRoutes } from "./insuranceRoutes/claimApprovalHandlers.js";
export { registerInsuranceAnalyticsRoutes } from "./insuranceRoutes/insuranceAnalyticsHandlers.js";
