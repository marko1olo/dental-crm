/**
 * apps/api/src/routes/perio.ts — Canonical SSOT & Route Alias Gateway for Periodontology
 *
 * Provides backwards-compatible and ergonomic /api/perio/* route aliases for
 * /api/periodontogram/* endpoints (PostgreSQL 18 Drizzle ORM).
 * Conforms to Mandates 8e, 8k, 8n & The Hammer Master Prompt.
 */

import type { FastifyInstance } from "fastify";
import { registerPeriodontogramRoutes } from "./periodontogram.js";

export * from "./periodontogram.js";

/**
 * Registers /api/perio/* route aliases forwarding directly to periodontogram services.
 */
export async function registerPerioRoutes(app: FastifyInstance): Promise<void> {
	await registerPeriodontogramRoutes(app);
}

export default registerPerioRoutes;
