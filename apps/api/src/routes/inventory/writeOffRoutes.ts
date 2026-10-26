/**
 * writeOffRoutes.ts — Ультракомпактный фасад маршрутов списания ТМЦ (Мандат 8b, <= 30 строк).
 * Логика декомпозирована в writeOffModules: пакеты, овердрафт, FEFO, аудит.
 */

import type { FastifyPluginAsync } from "fastify";
import { registerBatchDeductionRoutes } from "./writeOffModules/writeOffBatchDeduction.js";
import { registerSoftOverdraftRoutes } from "./writeOffModules/writeOffSoftOverdraft.js";
import { registerFefoPartiesRoutes } from "./writeOffModules/writeOffFefoParties.js";
import { registerAuditTrailRoutes } from "./writeOffModules/writeOffAuditTrail.js";

export const writeOffRoutes: FastifyPluginAsync = async (server) => {
	await registerBatchDeductionRoutes(server);
	await registerSoftOverdraftRoutes(server);
	await registerFefoPartiesRoutes(server);
	await registerAuditTrailRoutes(server);
};

export default writeOffRoutes;
