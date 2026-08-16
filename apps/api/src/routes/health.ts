/**
 * health.ts — маршруты проверки жизнеспособности, детального мониторинга и Prometheus-метрик (Feature #44).
 *
 * МАРШРУТЫ:
 * - GET /api/health — базовый liveness probe для балансировщиков и контейнеров.
 * - GET /api/system/health/detailed — детальный отчет о состоянии ОЗУ, пула PostgreSQL и очередей задач (доступен администраторам клиники).
 * - GET /api/system/metrics — Prometheus-совместимый текстовый формат метрик (OpenMetrics).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, resolveOrganizationId } from "../accessGuard.js";
import { ServerHealthWatchdog } from "../services/system/ServerHealthWatchdog.js";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * Базовый liveness probe.
	 */
	app.get("/api/health", async () => {
		return {
			ok: true,
			service: "dental-crm-api",
			status: "healthy",
			time: new Date().toISOString(),
		};
	});

	/**
	 * Детальный отчет о здоровье сервера и системных ресурсах.
	 * Доступен администраторам клиники (защищен requireClinicalReadAccess).
	 */
	app.get("/api/system/health/detailed", async (request: FastifyRequest, reply: FastifyReply) => {
		const isAllowed = await requireClinicalReadAccess(
			request,
			reply,
			"system health detailed",
		);
		if (!isAllowed) {
			return;
		}

		const metrics = await ServerHealthWatchdog.getSystemMetrics();

		// Опциональное сохранение снимка в базу данных при запросе с токеном организации
		const orgId = await resolveOrganizationId(request);
		if (orgId) {
			try {
				await ServerHealthWatchdog.recordRamSnapshot(orgId);
			} catch (err) {
				request.log.warn(
					{ err, organizationId: orgId },
					"[ServerHealthWatchdog] Failed to record RAM snapshot to DB",
				);
			}
		}

		return reply.code(200).send(metrics);
	});

	/**
	 * Prometheus-совместимый эндпоинт метрик для scraping'а системами мониторинга (Prometheus / Grafana / VictoriaMetrics).
	 */
	app.get("/api/system/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
		const metrics = await ServerHealthWatchdog.getSystemMetrics();
		const prometheusText = ServerHealthWatchdog.toPrometheusMetrics(metrics);

		return reply
			.type("text/plain; version=0.0.4; charset=utf-8")
			.code(200)
			.send(prometheusText);
	});
}

export default registerHealthRoutes;
