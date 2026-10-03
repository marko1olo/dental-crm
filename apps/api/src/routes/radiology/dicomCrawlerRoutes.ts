/**
 * dicomCrawlerRoutes.ts — REST API маршруты автономного демона поиска КТ и дедупликации архивов.
 *
 * ЭНДПОИНТЫ:
 * - GET  /api/radiology/crawler/status   — Текущий статус, счетчики найденных КТ, распакованных архивов и дубликатов.
 * - POST /api/radiology/crawler/scan-now — Мгновенный ручной запуск поиска КТ на диске (вызывается из кнопки интерфейса).
 * - POST /api/radiology/crawler/config   — Обновление каталогов поиска, периодичности и авто-распаковки.
 * - POST /api/radiology/crawler/start    — Запуск демона.
 * - POST /api/radiology/crawler/stop     — Остановка демона.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { dicomCrawlerDaemon } from "../../services/dicom/index.js";

export async function registerRadiologyCrawlerRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/radiology/crawler/status
	 * Получение текущего состояния демона поиска КТ и реестра исследований.
	 */
	app.get("/api/radiology/crawler/status", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "radiology crawler status"))) return;

		const status = dicomCrawlerDaemon.getStatus();
		return reply.send({
			success: true,
			status,
		});
	});

	/**
	 * POST /api/radiology/crawler/scan-now
	 * Принудительное мгновенное сканирование диска на наличие КТ папок и архивов.
	 * Привязан к кнопке [ 🔍 Найти КТ на диске ] в картотеке исследований.
	 */
	app.post("/api/radiology/crawler/scan-now", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "scan disk for dicom studies"))) return;

		const bodySchema = z.object({
			paths: z.array(z.string()).optional(),
		});

		const parsed = bodySchema.safeParse(request.body ?? {});
		const targetPaths = parsed.success ? parsed.data.paths : undefined;

		try {
			const report = await dicomCrawlerDaemon.scanNow(targetPaths);
			return reply.send({
				success: true,
				message: `Сканирование завершено: найдено ${report.newStudiesDiscovered} новых КТ, ${report.archivesFound} архивов (распаковано: ${report.archivesUnpacked}), исключено ${report.duplicatesAvoided} дубликатов.`,
				report,
				status: dicomCrawlerDaemon.getStatus(),
			});
		} catch (err) {
			return reply.code(500).send({
				error: "CrawlerScanError",
				message: `Сбой при сканировании диска: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	});

	/**
	 * POST /api/radiology/crawler/config
	 * Обновление конфигурации демона
	 */
	app.post("/api/radiology/crawler/config", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "update crawler config"))) return;

		const bodySchema = z.object({
			watchPaths: z.array(z.string()).optional(),
			hotFolders: z.array(z.string()).optional(),
			pollIntervalMinutes: z.number().int().min(1).max(1440).optional(),
			autoUnpack: z.boolean().optional(),
			enabled: z.boolean().optional(),
		});

		const parsed = bodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная конфигурация демона поиска КТ.",
				details: parsed.error.issues,
			});
		}
		const cleanConfig = Object.fromEntries(
			Object.entries(parsed.data).filter(([, v]) => v !== undefined)
		);
		const updatedStatus = dicomCrawlerDaemon.updateConfig(cleanConfig);
		return reply.send({
			success: true,
			message: "Конфигурация демона поиска КТ успешно обновлена.",
			status: updatedStatus,
		});
	});

	/**
	 * POST /api/radiology/crawler/start
	 * Запуск фонового мониторинга
	 */
	app.post("/api/radiology/crawler/start", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "start dicom crawler"))) return;

		dicomCrawlerDaemon.start();
		return reply.send({
			success: true,
			message: "Фоновый демон поиска КТ успешно запущен.",
			status: dicomCrawlerDaemon.getStatus(),
		});
	});

	/**
	 * POST /api/radiology/crawler/stop
	 * Остановка фонового мониторинга
	 */
	app.post("/api/radiology/crawler/stop", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "stop dicom crawler"))) return;

		dicomCrawlerDaemon.stop();
		return reply.send({
			success: true,
			message: "Фоновый демон поиска КТ остановлен.",
			status: dicomCrawlerDaemon.getStatus(),
		});
	});
}
