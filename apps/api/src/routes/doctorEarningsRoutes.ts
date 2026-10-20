/**
 * doctorEarningsRoutes.ts — Фасад модуля сдельной оплаты труда врача («Тайный блокнот врача»).
 *
 * Декомпозирован в подмаршруты директории ./doctorEarnings/ (Mandate 8e, Anti-Monolith Limit <= 500 lines).
 */

import type { FastifyInstance } from "fastify";
import { registerDoctorEarningsHandlers } from "./doctorEarnings/index.js";

export * from "./doctorEarnings/types.js";
export * from "./doctorEarnings/sampleEarningsAdapter.js";
export * from "./doctorEarnings/liveEarningsCalculator.js";

export async function registerDoctorEarningsRoutes(
	app: FastifyInstance,
): Promise<void> {
	await registerDoctorEarningsHandlers(app);
}

export default registerDoctorEarningsRoutes;
