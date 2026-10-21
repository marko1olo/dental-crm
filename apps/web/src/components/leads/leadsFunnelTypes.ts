/**
 * DENTE Dental CRM — Leads Funnel Types Central Facade
 * Mandate 8s (Anti-Bloat & Modular Architecture) <= 120 lines
 */

import type { Lead, LeadStatus } from "../../store/leadsStore";

export * from "./funnelTypes/attributionTypes";
export * from "./funnelTypes/funnelStageTypes";
export * from "./funnelTypes/marketingChannelTypes";
export * from "./funnelTypes/metricTypes";
export type { Lead, LeadStatus };
