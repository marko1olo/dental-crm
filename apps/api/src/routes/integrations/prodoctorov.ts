/**
 * routes/integrations/prodoctorov.ts — Интеграция с ПроДокторов / МедФлекс (MedFlex).
 * Канонический тонкий фасад (Layer 5 <= 50 строк).
 */

import type { FastifyInstance } from "fastify";
import { registerProdoctorovRouteEndpoints } from "./prodoctorov/index.js";

/**
 * Регистрация всех маршрутов интеграции с агрегаторами ПроДокторов и МедФлекс.
 */
export async function registerProdoctorovRoutes(
	app: FastifyInstance,
): Promise<void> {
	await registerProdoctorovRouteEndpoints(app);
}

export * from "./prodoctorov/index.js";
