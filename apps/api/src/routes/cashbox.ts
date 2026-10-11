/**
 * cashbox.ts — High-Precision 6-Account Cash Box, Installments, 12 Expense Reasons & Dental Lab Payments API.
 * 
 * Compliant with 54-FZ, StomX Reverse Engineering Bible (Sections 6, 8, 9), Order 804n, and Form T-51.
 * Decomposed into modular DAG package apps/api/src/routes/cashbox/.
 */

import type { FastifyInstance } from "fastify";
import { registerCashboxPaymentRoutes } from "./cashbox/cashboxPaymentRoutes.js";
import { registerCashboxRefundRoutes } from "./cashbox/cashboxRefundRoutes.js";
import { registerCashboxShiftRoutes } from "./cashbox/cashboxShiftRoutes.js";

export async function registerCashboxRoutes(app: FastifyInstance): Promise<void> {
	await registerCashboxShiftRoutes(app);
	await registerCashboxPaymentRoutes(app);
	await registerCashboxRefundRoutes(app);
}

export default registerCashboxRoutes;

export * from "./cashbox/index.js";
