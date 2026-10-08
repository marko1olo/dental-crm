/**
 * Fastify Auth Routes Facade
 * 
 * Monolith decomposed into modular DAG layers under `apps/api/src/routes/auth/`:
 * - types.ts (Layer 0: Types & Zod Schemas)
 * - tokenHelpers.ts (Layer 1: Token & Pre-tenant Bypass Helpers)
 * - loginRoutes.ts (Layer 2: Clinic login, staff unlock, universal login, demo seed)
 * - sessionRoutes.ts (Layer 2: /status and /me routes)
 * - invitationRoutes.ts (Layer 2: Staff invitation create and accept)
 * - passwordRoutes.ts (Layer 2: Password reset and staff PIN)
 * - registrationRoutes.ts (Layer 2: Clinic first-run setup and SaaS registration)
 * - index.ts (Layer 5: Master Auth Plugin)
 */

export {
	TOKEN_SECRET,
	registerAuthRoutes,
	registerLoginRoutes,
	registerSessionRoutes,
	registerInvitationRoutes,
	registerPasswordRoutes,
	registerRegistrationRoutes,
} from "./auth/index.js";

export * from "./auth/types.js";
export * from "./auth/tokenHelpers.js";

export { registerAuthRoutes as default } from "./auth/index.js";
