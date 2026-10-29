/**
 * apps/api/src/routes/emr/index.ts
 * Единый шлюз роутов Электронной Медицинской Карты (ЭМК / EMR)
 * Регламентировано Мандатами 8x, 8e: чистый доменный русский язык,
 * автономия врача, отсутствие бюрократического мусора и советских приказов.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { registerDiaryRoutes } from "../diary/index.js";
import { registerOutpatientRoutes } from "../outpatient.js";

export async function registerEmrRoutes(app: FastifyInstance): Promise<void> {
	// Подключаем канонические CRUD-роуты дневников и амбулаторной карты
	await registerDiaryRoutes(app);
	await registerOutpatientRoutes(app);

	/**
	 * GET /api/emr/status
	 * Проверка готовности контура ЭМК
	 */
	app.get("/api/emr/status", async (_request: FastifyRequest, reply: FastifyReply) => {
		return reply.send({
			status: "active",
			module: "EMR / Электронная медицинская карта",
			version: "2.0.0",
			standards: ["СтАР", "FDI 11-48", "МКБ-10"],
			physiologicalNormSupported: true,
			timestamp: new Date().toISOString(),
		});
	});
}

export default registerEmrRoutes;
