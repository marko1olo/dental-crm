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
import { dicomCrawlerDaemon, type DicomCrawlerDaemonConfig } from "../../services/dicom/DicomCrawlerDaemon.js";
import { requireClinicalMutationAccess, requireClinicalReadAccess, requireNonDoctorAccess } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import { and, eq, inArray, desc, ne } from "drizzle-orm";
import { mapImagingStudy } from "../../db/imaging/imagingMappers.js";
import { recordStudySanpinDose } from "../../services/dicom/ingest/metadataParser.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { getImagingOrganizationId } from "./imagingHelpers.js";
import { validateAndResolvePacsLocalFilePath } from "../../services/imaging/localPacsSanitizer.js";

export async function registerDicomRoutes(app: FastifyInstance) {
	/**
	 * GET /api/imaging/daemon/status
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/imaging/daemon/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireClinicalReadAccess(request, reply, "dicom daemon status"))) return;
			const status = dicomCrawlerDaemon.getStatus();
			return reply.send({ success: true, status });
		},
	});

	/**
	 * POST /api/imaging/daemon/start
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/imaging/daemon/start",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireNonDoctorAccess(request, reply, "start dicom daemon"))) return;
			const orgId = getImagingOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "InvalidIdempotencyKey",
					message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
				});
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			dicomCrawlerDaemon.start();
			return reply.send({
				success: true,
				message: "Фоновый автопоиск КТ томографов запущен.",
				status: dicomCrawlerDaemon.getStatus(),
			});
		},
	});

	/**
	 * POST /api/imaging/daemon/stop
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/imaging/daemon/stop",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await requireNonDoctorAccess(request, reply, "stop dicom daemon"))) return;
			const orgId = getImagingOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "InvalidIdempotencyKey",
					message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
				});
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			dicomCrawlerDaemon.stop();
			return reply.send({
				success: true,
				message: "Фоновый автопоиск КТ томографов остановлен.",
				status: dicomCrawlerDaemon.getStatus(),
			});
		},
	});

	/**
	 * POST /api/imaging/daemon/scan-now
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/imaging/daemon/scan-now",
		permission: "public",
		handler: async ({ request, reply }) => {
		if (!(await requireClinicalMutationAccess(request, reply, "manual dicom scan"))) return;

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "InvalidIdempotencyKey",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const bodySchema = z
			.object({
				paths: z.array(z.string()).optional(),
			})
			.strict();
		const parsed = bodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запуска сканирования КТ.",
			});
		}
		const rawPaths = parsed.data.paths;

		let explicitPaths: string[] | undefined;
		if (rawPaths && rawPaths.length > 0) {
			try {
				explicitPaths = rawPaths.map((p) => validateAndResolvePacsLocalFilePath(orgId, p));
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Недопустимый путь к папке КТ.";
				return reply.code(400).send({
					error: "PathValidationError",
					message,
				});
			}
		}

		const result = await dicomCrawlerDaemon.scanNow(explicitPaths);
		return reply.send({
			success: true,
			message: `Сканирование завершено: обнаружено ${result.newStudiesDiscovered} новых серий КТ (${result.archivesFound} архивов найдено, ${result.archivesUnpacked} распаковано).`,
			result,
			status: dicomCrawlerDaemon.getStatus(),
		});
		},
	});

	/**
	 * POST /api/imaging/daemon/config
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/imaging/daemon/config",
		permission: "public",
		handler: async ({ request, reply }) => {
		if (!(await requireClinicalMutationAccess(request, reply, "configure dicom daemon"))) return;

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "InvalidIdempotencyKey",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const configSchema = z
			.object({
				watchPaths: z.array(z.string()).optional(),
				pollIntervalMinutes: z.number().int().min(1).max(1440).optional(),
				pollIntervalMs: z.number().int().min(5000).max(3600000).optional(),
				autoUnpack: z.boolean().optional(),
				enabled: z.boolean().optional(),
			})
			.strict();

		const parsed = configSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры настройки демона КТ.",
				details: parsed.error.issues,
			});
		}

		const updatePayload: Partial<DicomCrawlerDaemonConfig> = {};
		if (parsed.data.watchPaths !== undefined) {
			try {
				updatePayload.watchPaths = parsed.data.watchPaths.map((p) =>
					validateAndResolvePacsLocalFilePath(orgId, p),
				);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Недопустимый путь для мониторинга КТ.";
				return reply.code(400).send({
					error: "PathValidationError",
					message,
				});
			}
		}
		if (parsed.data.autoUnpack !== undefined) updatePayload.autoUnpack = parsed.data.autoUnpack;
		if (parsed.data.enabled !== undefined) updatePayload.enabled = parsed.data.enabled;
		if (parsed.data.pollIntervalMinutes !== undefined) {
			updatePayload.pollIntervalMinutes = parsed.data.pollIntervalMinutes;
		} else if (parsed.data.pollIntervalMs !== undefined) {
			updatePayload.pollIntervalMinutes = Math.max(1, Math.round(parsed.data.pollIntervalMs / 60000));
		}

		const updatedStatus = dicomCrawlerDaemon.updateConfig(updatePayload);
		return reply.send({
			success: true,
			message: "Настройки автопоиска томографов сохранены.",
			status: updatedStatus,
		});
		},
	});

	/**
	 * GET /api/imaging/daemon/pending
	 * Исследования, ожидающие решения врача или нераспознанные
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/imaging/daemon/pending",
		permission: "public",
		handler: async ({ request, reply }) => {
		if (!(await requireClinicalReadAccess(request, reply, "pending dicom studies"))) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.imaging.read",
				role: staffRole,
				message: "Доступ к очереди КТ разрешен только клиническому персоналу.",
			});
		}

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;

		const studies = await withTenantReadCtx(orgId, async (tx) =>
			tx
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
				.leftJoin(
					schema.patients,
					and(
						eq(schema.patients.organizationId, orgId),
						eq(schema.patients.id, schema.imagingStudies.patientId),
					),
				)
				.where(
					and(
						eq(schema.imagingStudies.organizationId, orgId),
						inArray(schema.imagingStudies.bindingStatus, ["pending_review", "unassigned"]),
						ne(schema.imagingStudies.status, "failed"),
					),
				)
				.orderBy(desc(schema.imagingStudies.capturedAt))
				.limit(100),
		);

		return reply.send({
			success: true,
			pendingStudies: studies,
			count: studies.length,
		});
		},
	});

	/**
	 * POST /api/imaging/daemon/bind-patient
	 * Привязка КТ к пациенту
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/imaging/daemon/bind-patient",
		permission: "public",
		handler: async ({ request, reply }) => {
		if (!(await requireClinicalMutationAccess(request, reply, "bind study to patient"))) return;

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "InvalidIdempotencyKey",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const schemaBody = z
			.object({
				studyId: z.string().uuid(),
				patientId: z.string().uuid(),
			})
			.strict();

		const parsed = schemaBody.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Требуется studyId и patientId для привязки КТ.",
				details: parsed.error.issues,
			});
		}

		const { studyId, patientId } = parsed.data;
		const identity = getRequestIdentity(request);

		const txResult = await withTenantWriteCtx(orgId, async (tx) => {
			const [patient] = await tx
				.select({ id: schema.patients.id, fullName: schema.patients.fullName })
				.from(schema.patients)
				.where(and(eq(schema.patients.organizationId, orgId), eq(schema.patients.id, patientId)))
				.limit(1);

			if (!patient) {
				return { status: "patient_not_found" as const };
			}

			const [updatedStudy] = await tx
				.update(schema.imagingStudies)
				.set({
					patientId: patient.id,
					bindingStatus: "manual_bound",
					bindingConfidence: 100,
					aiSummary: `Вручную привязано врачом к пациенту: ${patient.fullName}`,
				})
				.where(and(eq(schema.imagingStudies.organizationId, orgId), eq(schema.imagingStudies.id, studyId)))
				.returning();

			if (!updatedStudy) {
				return { status: "study_not_found" as const };
			}

			await recordStudySanpinDose(
				orgId,
				patient.id,
				mapImagingStudy(updatedStudy, patient.fullName),
				identity.userId ?? null,
				tx,
			);

			return { status: "ok" as const, patient };
		});

		if (txResult.status === "patient_not_found") {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в базе клиники.",
			});
		}
		if (txResult.status === "study_not_found") {
			return reply.code(404).send({
				error: "ImagingStudyNotFound",
				message: "Исследование КТ не найдено в базе клиники.",
			});
		}

		return reply.send({
			success: true,
			message: `Исследование КТ успешно привязано к пациенту ${txResult.patient.fullName}.`,
			studyId,
			patientId: txResult.patient.id,
			patientFullName: txResult.patient.fullName,
		});
		},
	});

	/**
	 * POST /api/imaging/daemon/dismiss
	 * Архивация исследования
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/imaging/daemon/dismiss",
		permission: "public",
		handler: async ({ request, reply }) => {
		if (!(await requireClinicalMutationAccess(request, reply, "dismiss study"))) return;

		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "InvalidIdempotencyKey",
				message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const schemaBody = z
			.object({
				studyId: z.string().uuid(),
			})
			.strict();

		const parsed = schemaBody.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Требуется studyId.",
			});
		}

		const [dismissed] = await withTenantWriteCtx(orgId, async (tx) =>
			tx
				.update(schema.imagingStudies)
				.set({
					status: "failed",
					bindingStatus: "unassigned",
					aiSummary: "Отклонено врачом (скрыто из очереди автодетекта КТ)",
				})
				.where(and(eq(schema.imagingStudies.organizationId, orgId), eq(schema.imagingStudies.id, parsed.data.studyId)))
				.returning({ id: schema.imagingStudies.id }),
		);

		if (!dismissed) {
			return reply.code(404).send({
				error: "ImagingStudyNotFound",
				message: "Исследование КТ не найдено.",
			});
		}

		return reply.send({
			success: true,
			message: "Исследование скрыто из очереди входящих КТ.",
		});
		},
	});
}
