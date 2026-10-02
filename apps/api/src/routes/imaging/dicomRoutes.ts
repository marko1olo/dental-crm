/**
 * dicomRoutes.ts — API маршруты управления демоном автодетекта томографов и очередью КТ.
 *
 * МАРШРУТЫ:
 * - GET  /api/imaging/daemon/status       — текущий статус демона, пути, статистика
 * - POST /api/imaging/daemon/start        — запуск фонового мониторинга
 * - POST /api/imaging/daemon/stop         — остановка фонового мониторинга
 * - POST /api/imaging/daemon/scan-now     — немедленный ручной прогон поиска КТ
 * - POST /api/imaging/daemon/config       — обновление конфигурации (пути, интервалы)
 * - GET  /api/imaging/daemon/pending      — список КТ, требующих подтверждения или нераспознанных
 * - POST /api/imaging/daemon/bind-patient — 1-клик привязка КТ к пациенту
 * - POST /api/imaging/daemon/dismiss      — архивация / исключение снимка
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { dicomWatcherDaemon } from "../../services/imaging/dicomFolderWatcherDaemon.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { and, eq, inArray, desc, ne } from "drizzle-orm";
import { getImagingOrganizationId } from "./imagingHelpers.js";

export async function registerDicomRoutes(app: FastifyInstance) {
	/**
	 * GET /api/imaging/daemon/status
	 */
	app.get("/api/imaging/daemon/status", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "dicom daemon status"))) return;
		const status = dicomWatcherDaemon.getStatus();
		return reply.send({ success: true, status });
	});

	/**
	 * POST /api/imaging/daemon/start
	 */
	app.post("/api/imaging/daemon/start", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "start dicom daemon"))) return;
		dicomWatcherDaemon.start();
		return reply.send({
			success: true,
			message: "Фоновый автопоиск КТ томографов запущен.",
			status: dicomWatcherDaemon.getStatus(),
		});
	});

	/**
	 * POST /api/imaging/daemon/stop
	 */
	app.post("/api/imaging/daemon/stop", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "stop dicom daemon"))) return;
		dicomWatcherDaemon.stop();
		return reply.send({
			success: true,
			message: "Фоновый автопоиск КТ томографов остановлен.",
			status: dicomWatcherDaemon.getStatus(),
		});
	});

	/**
	 * POST /api/imaging/daemon/scan-now
	 */
	app.post("/api/imaging/daemon/scan-now", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "manual dicom scan"))) return;

		const bodySchema = z.object({
			paths: z.array(z.string()).optional(),
		});
		const parsed = bodySchema.safeParse(request.body ?? {});
		const explicitPaths = parsed.success ? parsed.data.paths : undefined;

		const result = await dicomWatcherDaemon.scanNow(explicitPaths);
		return reply.send({
			success: true,
			message: `Сканирование завершено: обнаружено ${result.newStudiesDiscovered} новых серий КТ (${result.autoBound} автопривязано, ${result.pendingReview} требуют подтверждения).`,
			result,
			status: dicomWatcherDaemon.getStatus(),
		});
	});

	/**
	 * POST /api/imaging/daemon/config
	 */
	app.post("/api/imaging/daemon/config", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "configure dicom daemon"))) return;

		const configSchema = z.object({
			watchPaths: z.array(z.string()).optional(),
			pollIntervalMs: z.number().int().min(5000).max(3600000).optional(),
			debounceDelayMs: z.number().int().min(1000).max(60000).optional(),
			enabled: z.boolean().optional(),
		});

		const parsed = configSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры настройки демона КТ.",
				details: parsed.error.issues,
			});
		}

		const updatedStatus = dicomWatcherDaemon.updateConfig(parsed.data);
		return reply.send({
			success: true,
			message: "Настройки автопоиска томографов сохранены.",
			status: updatedStatus,
		});
	});

	/**
	 * GET /api/imaging/daemon/pending
	 * Исследования, ожидающие решения врача или нераспознанные
	 */
	app.get("/api/imaging/daemon/pending", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "pending dicom studies"))) return;

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;

		const studies = await db
			.select({
				id: schema.imagingStudies.id,
				title: schema.imagingStudies.title,
				patientId: schema.imagingStudies.patientId,
				kind: schema.imagingStudies.kind,
				modality: schema.imagingStudies.modality,
				capturedAt: schema.imagingStudies.capturedAt,
				storagePath: schema.imagingStudies.storagePath,
				sliceCount: schema.imagingStudies.sliceCount,
				dimensions: schema.imagingStudies.dimensions,
				voxelSpacing: schema.imagingStudies.voxelSpacing,
				fileSizeBytes: schema.imagingStudies.fileSizeBytes,
				bindingStatus: schema.imagingStudies.bindingStatus,
				bindingConfidence: schema.imagingStudies.bindingConfidence,
				dicomPatientName: schema.imagingStudies.dicomPatientName,
				dicomPatientId: schema.imagingStudies.dicomPatientId,
				dicomBirthDate: schema.imagingStudies.dicomBirthDate,
				aiSummary: schema.imagingStudies.aiSummary,
				patientFullName: schema.patients.fullName,
			})
			.from(schema.imagingStudies)
			.leftJoin(schema.patients, eq(schema.patients.id, schema.imagingStudies.patientId))
			.where(
				and(
					eq(schema.imagingStudies.organizationId, orgId),
					inArray(schema.imagingStudies.bindingStatus, ["pending_review", "unassigned"]),
					ne(schema.imagingStudies.status, "failed"),
				),
			)
			.orderBy(desc(schema.imagingStudies.capturedAt))
			.limit(100);

		return reply.send({
			success: true,
			pendingStudies: studies,
			count: studies.length,
		});
	});

	/**
	 * POST /api/imaging/daemon/bind-patient
	 * 1-клик связывание КТ с пациентом
	 */
	app.post("/api/imaging/daemon/bind-patient", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "bind study to patient"))) return;

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		const schemaBody = z.object({
			studyId: z.string().uuid(),
			patientId: z.string().uuid(),
		});

		const parsed = schemaBody.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Требуется studyId и patientId для привязки КТ.",
				details: parsed.error.issues,
			});
		}

		const { studyId, patientId } = parsed.data;

		// Проверяем существование пациента
		const [patient] = await db
			.select({ id: schema.patients.id, fullName: schema.patients.fullName })
			.from(schema.patients)
			.where(and(eq(schema.patients.organizationId, orgId), eq(schema.patients.id, patientId)))
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в базе клиники.",
			});
		}

		// Обновляем исследование
		await db
			.update(schema.imagingStudies)
			.set({
				patientId: patient.id,
				bindingStatus: "manual_bound",
				bindingConfidence: 100,
				aiSummary: `Вручную привязано врачом к пациенту: ${patient.fullName}`,
			})
			.where(and(eq(schema.imagingStudies.organizationId, orgId), eq(schema.imagingStudies.id, studyId)));

		return reply.send({
			success: true,
			message: `Исследование КТ успешно привязано к пациенту ${patient.fullName}.`,
			studyId,
			patientId: patient.id,
			patientFullName: patient.fullName,
		});
	});

	/**
	 * POST /api/imaging/daemon/dismiss
	 * Архивация исследования
	 */
	app.post("/api/imaging/daemon/dismiss", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "dismiss study"))) return;

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		const schemaBody = z.object({
			studyId: z.string().uuid(),
		});

		const parsed = schemaBody.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Требуется studyId.",
			});
		}

		await db
			.update(schema.imagingStudies)
			.set({
				status: "failed",
				bindingStatus: "unassigned",
				aiSummary: "Отклонено врачом (скрыто из очереди автодетекта КТ)",
			})
			.where(and(eq(schema.imagingStudies.organizationId, orgId), eq(schema.imagingStudies.id, parsed.data.studyId)));

		return reply.send({
			success: true,
			message: "Исследование скрыто из очереди входящих КТ.",
		});
	});
}
