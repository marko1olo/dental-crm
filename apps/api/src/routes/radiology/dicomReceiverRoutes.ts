/**
 * dicomReceiverRoutes.ts — REST API маршруты управления сетевым сервисом приема DICOM (C-STORE SCP)
 * и мостом мониторинга аппаратов Vatech (FMData/Files).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { getImagingOrganizationId } from "../imaging/imagingHelpers.js";
import {
	dicomCStoreScpServer,
	dicomStudyIngestService,
	vatechDirectBridgeService,
} from "../../services/dicom/index.js";
import { registerRadiologyCrawlerRoutes } from "./dicomCrawlerRoutes.js";

export async function registerRadiologyDicomRoutes(app: FastifyInstance) {
	await registerRadiologyCrawlerRoutes(app);

	/**
	 * GET /api/radiology/dicom/server/status
	 * Текущее состояние и метрики DICOM C-STORE SCP сервера и Vatech папки.
	 */
	app.get("/api/radiology/dicom/server/status", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "radiology dicom status"))) return;

		const scpStats = dicomCStoreScpServer.getStats();
		const bridgeStats = vatechDirectBridgeService.getStatus();

		return reply.send({
			success: true,
			scpServer: scpStats,
			vatechBridge: bridgeStats,
		});
	});

	/**
	 * POST /api/radiology/dicom/server/start
	 * Запуск TCP-сервера DICOM C-STORE SCP.
	 */
	app.post("/api/radiology/dicom/server/start", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "start dicom scp server"))) return;

		const bodySchema = z.object({
			port: z.number().int().min(1).max(65535).optional(),
		});

		const parsed = bodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный порт для DICOM SCP сервера.",
				details: parsed.error.issues,
			});
		}

		try {
			await dicomCStoreScpServer.start(parsed.data.port);
			return reply.send({
				success: true,
				message: `DICOM C-STORE SCP сервер успешно запущен на порту ${dicomCStoreScpServer.getPort()}.`,
				status: dicomCStoreScpServer.getStats(),
			});
		} catch (err) {
			return reply.code(500).send({
				error: "DicomServerStartError",
				message: `Не удалось запустить DICOM SCP сервер: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	});

	/**
	 * POST /api/radiology/dicom/server/stop
	 * Остановка TCP-сервера DICOM C-STORE SCP.
	 */
	app.post("/api/radiology/dicom/server/stop", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "stop dicom scp server"))) return;

		try {
			await dicomCStoreScpServer.stop();
			return reply.send({
				success: true,
				message: "DICOM C-STORE SCP сервер остановлен.",
				status: dicomCStoreScpServer.getStats(),
			});
		} catch (err) {
			return reply.code(500).send({
				error: "DicomServerStopError",
				message: `Ошибка при остановке сервера: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	});

	/**
	 * POST /api/radiology/dicom/server/ingest
	 * Прямая загрузка буфера DICOM-исследования (Base64 или бинарный поток).
	 */
	app.post("/api/radiology/dicom/server/ingest", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "ingest dicom study"))) return;

		const organizationId = getImagingOrganizationId(request, reply);
		if (!organizationId) return;

		const bodySchema = z.object({
			dicomBase64: z.string().min(132, "Минимальный размер Base64 DICOM — 132 байта"),
			visitId: z.string().uuid().optional().nullable(),
			doctorId: z.string().uuid().optional().nullable(),
			toothCode: z.string().optional().nullable(),
			sourceName: z.string().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный payload для ручного DICOM-инжеста.",
				details: parsed.error.issues,
			});
		}

		try {
			const buffer = Buffer.from(parsed.data.dicomBase64, "base64");
			const result = await dicomStudyIngestService.ingestBuffer(buffer, {
				organizationId,
				visitId: parsed.data.visitId,
				doctorId: parsed.data.doctorId,
				toothCode: parsed.data.toothCode,
				sourceKind: "manual_upload",
				sourceName: parsed.data.sourceName ?? "Manual DICOM Ingest API",
			});

			return reply.code(201).send({
				success: true,
				message: `Исследование успешно импортировано (${result.modality}, ${result.patientFullName ?? "Пациент не указан"}).`,
				result,
			});
		} catch (err) {
			return reply.code(500).send({
				error: "DicomIngestError",
				message: `Сбой импорта DICOM: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	});

	/**
	 * POST /api/radiology/dicom/bridge/start
	 * Запуск фонового мониторинга локальной папки Vatech.
	 */
	app.post("/api/radiology/dicom/bridge/start", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "start vatech bridge"))) return;

		const bodySchema = z.object({
			watchDirectory: z.string().optional(),
		});
		const parsed = bodySchema.safeParse(request.body ?? {});

		try {
			await vatechDirectBridgeService.start(parsed.success ? parsed.data.watchDirectory : undefined);
			return reply.send({
				success: true,
				message: "Мониторинг папки аппаратов Vatech запущен.",
				status: vatechDirectBridgeService.getStatus(),
			});
		} catch (err) {
			return reply.code(500).send({
				error: "VatechBridgeStartError",
				message: `Ошибка запуска мониторинга Vatech: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	});

	/**
	 * POST /api/radiology/dicom/bridge/stop
	 * Остановка мониторинга папки Vatech.
	 */
	app.post("/api/radiology/dicom/bridge/stop", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "stop vatech bridge"))) return;

		try {
			await vatechDirectBridgeService.stop();
			return reply.send({
				success: true,
				message: "Мониторинг папки Vatech остановлен.",
				status: vatechDirectBridgeService.getStatus(),
			});
		} catch (err) {
			return reply.code(500).send({
				error: "VatechBridgeStopError",
				message: `Ошибка при остановке мониторинга: ${err instanceof Error ? err.message : String(err)}`,
			});
		}
	});

	/**
	 * POST /api/radiology/dicom/bridge/scan-now
	 * Принудительное мгновенное сканирование папки Vatech.
	 */
	app.post("/api/radiology/dicom/bridge/scan-now", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "scan vatech directory"))) return;

		const bodySchema = z.object({
			directoryPath: z.string().optional(),
		});
		const parsed = bodySchema.safeParse(request.body ?? {});
		const targetDir =
			(parsed.success ? parsed.data.directoryPath : undefined) ??
			vatechDirectBridgeService.getStatus().watchedDirectory ??
			process.cwd();

		const scannedCount = await vatechDirectBridgeService.scanDirectoryRecursively(targetDir);
		return reply.send({
			success: true,
			message: `Сканирование завершено: обнаружено ${scannedCount} файлов снимков.`,
			scannedCount,
			status: vatechDirectBridgeService.getStatus(),
		});
	});
}
