/**
 * cashboxShiftRoutes.ts — Layer 2: Shift Lifecycle, X/Z-Reports, Cash Introduction & Withdrawal Facade.
 *
 * Decomposed into modular architecture under ./cashboxShiftModules/:
 * - shiftReconciliationEngine: SSOT tender types, 54-FZ reconciliation & arithmetic
 * - shiftLifecycleRoutes: shift open/close (Z-report), Idempotency protection
 * - cashTransferRoutes: cash-in (introduction) & cash-out (withdrawal)
 * - shiftReconciliationRoutes: X-report & pre-closure live audit
 *
 * Compliant with 54-FZ and Mandates 8e/8n.
 */

import type { FastifyInstance } from "fastify";
import { registerCashboxShiftSubmodules } from "./cashboxShiftModules/index.js";

export * from "./cashboxShiftModules/index.js";

export async function registerCashboxShiftRoutes(app: FastifyInstance): Promise<void> {
	await registerCashboxShiftSubmodules(app);
}
