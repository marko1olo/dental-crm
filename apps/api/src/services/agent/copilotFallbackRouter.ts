/**
 * copilotFallbackRouter.ts — Canonical Thin Facade for Copilot Fallback Router (Mandate 8b).
 *
 * Routes doctor/staff natural language commands to CRM Universal Tools (Mandates 8l, 8e, 8n)
 * when external LLMs are unavailable or disabled.
 *
 * Core architecture decomposed into modular layers under ./copilotFallback/:
 * - Layer 0 (types.ts): LLM provider types, health states, route context
 * - Layer 1 (providerHealthMonitor.ts): Health and availability tracking
 * - Layer 2 (fallbackDecisionMatrix.ts): Failover decision matrix & latency gates
 * - Layer 3 (streamFallbackAdapter.ts): Seamless streaming fallback adapter
 * - Layer 2 (knowledgeFallback.ts): Statutory clinical knowledge & tour guides
 */

export type { FallbackRouteContext } from "./copilotFallback/index.js";
export { routeCopilotFallback } from "./copilotFallback/index.js";
