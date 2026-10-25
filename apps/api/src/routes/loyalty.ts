import type { FastifyInstance } from "fastify";
import { registerLoyaltyCertificateRoutes } from "./loyaltyCertificates.js";
import {
	registerLoyaltyBalanceRoutes,
	registerLoyaltyFamilyRoutes,
	registerLoyaltyLedgerRoutes,
	registerLoyaltyReferralRoutes,
} from "./loyaltyModules/index.js";

export * from "./loyaltyModules/index.js";

/**
 * Fastify routes registration facade for Statutory Loyalty, Bonus & Gift Certificates.
 * Mandate 8b Decomposition: Facade <= 80 lines, Submodules <= 120 lines.
 */
export async function registerLoyaltyRoutes(app: FastifyInstance) {
	await registerLoyaltyBalanceRoutes(app);
	await registerLoyaltyLedgerRoutes(app);
	await registerLoyaltyFamilyRoutes(app);
	await registerLoyaltyReferralRoutes(app);
	await registerLoyaltyCertificateRoutes(app);
}
