/**
 * apps/api/src/routes/warehouse.ts — Warehouse API routes.
 *
 * Implements Mandate 8e item 10 & Mandate 8n (Solo Doctor & Small Clinic):
 * 1. 1-click nurse disposal of empty anesthetic carpules (SanPiN 3.3686-21, single nurse signature, NO 3-person commission).
 * 2. Soft warehouse overdraft: when stock is 0 or insufficient due to supplier invoice delay,
 *    never throws fatal 400/500 or blocks patient care/treatment/operation. Decrements stock into negative,
 *    records emergency_overdraft transaction, and returns 200 OK with soft overdraft warning.
 * 3. 1-click auto-deduction of consumables by procedure tech-cards / visit (Mandate 8v).
 * 4. Zero Dead-Ends (Mandate 8n): endpoints under /api/warehouse support both parameterized (/ :organizationId / ...)
 *    and unparameterized master routes (/deduct, /deduct/visit, /soft-overdraft-deduct, /quick-carpule-disposal).
 * 5. Full bidirectional SSOT parity with /api/inventory: delegates directly to inventoryRoutes,
 *    eliminating all duplicate route logic, code drift, and disparate handlers.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { inventoryRoutes } from "./inventory/index.js";

export const warehouseRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// Full bidirectional SSOT parity with /api/inventory (Mandates 8e, 8n)
	await server.register(inventoryRoutes);
};

export default warehouseRoutes;
