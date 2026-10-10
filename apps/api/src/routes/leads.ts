/**
 * apps/api/src/routes/leads.ts
 * DENTE Dental CRM — Leads & Pipeline Canonical Route Facade
 * Mandate 8b: Thin canonical facade (<= 20 lines)
 */
export {
	leadStatusEnum,
	registerLeadsRoutes,
} from "./leadsModules/index.js";
export type * from "./leadsModules/types.js";
