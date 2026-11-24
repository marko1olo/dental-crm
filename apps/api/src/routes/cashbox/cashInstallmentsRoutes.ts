/**
 * cashInstallmentsRoutes.ts — Thin Facade for 0% Clinic Internal Installments & Stage Tranches API.
 * Delegates to ./installmentModules/ while preserving 100% public exports.
 */

import type { FastifyInstance } from "fastify";
import {
	registerInstallmentContractsRoutes,
	registerInstallmentTranchePayRoutes,
} from "./installmentModules/index.js";

export async function registerCashInstallmentsRoutes(app: FastifyInstance): Promise<void> {
	registerInstallmentContractsRoutes(app);
	registerInstallmentTranchePayRoutes(app);
}
