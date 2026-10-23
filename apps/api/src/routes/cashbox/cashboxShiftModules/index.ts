/**
 * index.ts — Cashbox Shift Submodules Aggregator & Router.
 *
 * Decomposed from monolithic cashboxShiftRoutes.ts (< 500 lines constraint).
 * Adheres to 54-FZ and Mandates 8e/8i/8n.
 */

import type { FastifyInstance } from "fastify";
import { registerCashTransferRoutes } from "./cashTransferRoutes.js";
import { registerShiftLifecycleRoutes } from "./shiftLifecycleRoutes.js";
import { registerShiftReconciliationRoutes } from "./shiftReconciliationRoutes.js";

export * from "./cashTransferRoutes.js";
export * from "./shiftLifecycleRoutes.js";
export * from "./shiftReconciliationEngine.js";
export * from "./shiftReconciliationRoutes.js";

export async function registerCashboxShiftSubmodules(app: FastifyInstance): Promise<void> {
	registerShiftLifecycleRoutes(app);
	registerCashTransferRoutes(app);
	registerShiftReconciliationRoutes(app);
}
