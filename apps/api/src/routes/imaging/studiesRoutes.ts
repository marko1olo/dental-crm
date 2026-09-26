import path from "node:path";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import {
	browserRenderableImageMimeType,
	isDicomOrRadiographFile,
} from "../../imaging/previewFormats.js";
import {
	LocalPacsStorageService,
	PathTraversalError,
	TenantIsolationError,
} from "../../services/imaging/localPacsStorageService.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	createImagingStudySchema,
	imagingStudySchema,
	saveImagingViewerSessionRequestSchema,
	imagingViewerSessionResponseSchema,
} from "@dental/shared";
import {
	getImagingOrganizationId,
	parseImagingPayload,
	sendImagingStudyNotFound,
	sendImagingStudyScopeError,
} from "./imagingHelpers.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { previewSvg } from "./previewSvg.js";
import {
	createImagingStudyInDb,
	getAllImagingStudies,
	getImagingStudiesForPatient,
	getImagingStudyById,
	getOrCreateImagingViewerSession,
	saveImagingViewerSession,
	updateImagingStudyInDb,
} from "../../db/imagingQuery.js";
import {
	getPatientByIdFromDb,
	getPatientsFromDb,
} from "../../db/patientsQuery.js";
import { getVisitByIdInDb } from "../../db/visitsQuery.js";
import {
	getRequestIdentity,
} from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export async function registerStudiesRoutes(app: FastifyInstance) {
	app.get("/api/imaging/studies", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "imaging studies")))
			return;

		// 152-ФЗ / 323-ФЗ: КТ / DICOM исследования — врачебная тайна
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			(process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.imaging.read",
				role: staffRole,
				message: `Отказ в доступе к КТ / DICOM исследованиям (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const querySchema = z.object({
			patientId: z.string().uuid().optional(),
		});
		const parsedQuery = querySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр patientId должен быть валидным UUID.",
				details: parsedQuery.error.issues,
			});
		}
		const patientId = parsedQuery.data.patientId;
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		const studies = patientId
			? await getImagingStudiesForPatient(orgId, patientId)
			: await getAllImagingStudies(orgId);
		return studies.map((study) => imagingStudySchema.parse(study));
	});


	app.get("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging viewer session read",
			))
		)
			return;

		// 152-ФЗ / 323-ФЗ: КТ / DICOM сессия просмотра — врачебная тайна
		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			(process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.imaging.read",
				role: staffRole,
				message: `Отказ в доступе к КТ / DICOM исследованиям (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const { id } = request.params as { id: string };
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		const study = await getImagingStudyById(orgId, id);
		if (!study) return sendImagingStudyNotFound(reply);
		const session = await getOrCreateImagingViewerSession(orgId, study);
		return imagingViewerSessionResponseSchema.parse({
			session,
			warnings: session.warnings,
		});
	});


	app.put("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
		const parsed = parseImagingPayload(
			saveImagingViewerSessionRequestSchema,
			request.body,
			"Сеанс просмотра снимка не сохранен: передайте состояние просмотра и разметку.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging viewer session save",
			))
		)
			return;
		const { id } = request.params as { id: string };
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return;
		const study = await getImagingStudyById(orgId, id);
		if (!study) return sendImagingStudyNotFound(reply);
		const input = parsed.data;
		const session = await saveImagingViewerSession(orgId, id, input);
		return reply.code(200).send(
			imagingViewerSessionResponseSchema.parse({
				session,
				warnings: session.warnings,
			}),
		);
	});


	app.post("/api/imaging/studies", async (request, reply) => {
		const parsed = parseImagingPayload(
			createImagingStudySchema,
			request.body,
			"Снимок не создан: выберите пациента, вид снимка и название.",
		);
		if (!parsed.ok) return reply.code(400).send(parsed.response);
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return reply;
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging study create",
			))
		)
			return reply;
		const input = parsed.data;
		const patient = await getPatientByIdFromDb(orgId, input.patientId);
		if (!patient) {
			return sendImagingStudyScopeError(
				reply,
				404,
				"Пациент для снимка не найден.",
			);
		}
		if (input.visitId) {
			const visit = await getVisitByIdInDb(orgId, input.visitId);
			if (!visit) {
				return sendImagingStudyScopeError(
					reply,
					404,
					"Прием для снимка не найден.",
				);
			}
			if (visit.patientId !== input.patientId) {
				return sendImagingStudyScopeError(
					reply,
					409,
					"Снимок относится к приему другого пациента.",
				);
			}
			if (visit.organizationId !== patient.organizationId) {
				return sendImagingStudyScopeError(
					reply,
					409,
					"Снимок относится к приему другой клиники.",
				);
			}
		}
		const study = await createImagingStudyInDb(orgId, {
			patientId: input.patientId,
			visitId: input.visitId,
			kind: input.kind,
			title: input.title,
			toothCode: input.toothCode,
			region: input.region,
			sourceKind: input.sourceKind,
			sourceName: input.sourceName,
			storagePath: input.storagePath,
			dicomStudyUid: input.dicomStudyUid,
			capturedAt: input.capturedAt,
			aiSummary: input.aiSummary,
		});
		return reply.code(201).send(imagingStudySchema.parse(study));
	});

	// ─── AI Analysis ──────────────────────────────────────────────────────────

	app.get("/api/imaging/studies/:id/preview.svg", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "imaging preview")))
			return reply;
		const { id } = request.params as { id: string };
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return reply;
		const study = await getImagingStudyById(orgId, id);
		if (!study) {
			return sendImagingStudyNotFound(reply);
		}
		return reply.type("image/svg+xml; charset=utf-8").send(previewSvg(study));
	});

	/**
	 * Сам снимок.
	 *
	 * ЧТО БЫЛО. `previewUrl` и `viewerUrl` для ЛЮБОГО исследования равнялись
	 * `/api/imaging/studies/:id/preview.svg` (apps/api/src/db/imagingQuery.ts), а
	 * этот адрес рисует бирюзовый градиент с контуром челюсти. Поле storagePath с
	 * настоящим файлом в URL не попадало вообще. Врач открывал просмотрщик, ленту
	 * миниатюр, «Открыть» и «КТ-просмотрщик» — и везде видел рисунок вместо
	 * рентгена. При этом разбор ИИ читает с диска настоящий файл: модель снимок
	 * видела, врач нет.
	 *
	 * ЧТО ЗДЕСЬ. Отдаём файл из storagePath, если браузер умеет его показать.
	 * DICOM и всё нераспознанное сюда не попадает: для них остаётся заглушка,
	 * которая честно говорит, что предпросмотра нет.
	 *
	 * БЕЗОПАСНОСТЬ. Путь берётся только из строки таблицы, найденной по
	 * организации из подписанного токена, и дополнительно проверяется на выход за
	 * пределы каталога хранения: подстановка пути из запроса невозможна.
	 */
	app.get(
		"/api/imaging/studies/:id/file",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			if (!(await requireClinicalReadAccess(request, reply, "imaging file")))
				return;
			const { id } = request.params as { id: string };
			const orgId = getImagingOrganizationId(request, reply);
			if (!orgId) return;

			/*
			 * ПОЧЕМУ ЗДЕСЬ ЯВНЫЙ withTenantCtx (и config.tenantTxSelfManaged выше).
			 * Тело ответа — поток файла снимка: рентген это мегабайты, том КЛКТ —
			 * сотни мегабайт, и время передачи задаёт клиент. Автоматическая обёртка
			 * из server.ts держала бы транзакцию и соединение из пула на всё это время.
			 */
			const study = await withTenantCtx(orgId, () =>
				getImagingStudyById(orgId, id),
			);
			if (!study) return sendImagingStudyNotFound(reply);

			const storagePath =
				typeof study.storagePath === "string" ? study.storagePath.trim() : "";
			if (!storagePath) {
				return reply.code(404).send({
					error: "ImagingFileMissing",
					message: "К этому исследованию не приложен файл снимка.",
				});
			}

			// Security: resolve file within tenant storage jail or sanitized workstation path
			let resolved: string;
			try {
				resolved = LocalPacsStorageService.validateAndResolveLocalFilePath(orgId, storagePath);
			} catch (err) {
				if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
					request.log.warn({ orgId, storagePath, err }, "Imaging storage access denied");
					return reply.code(403).send({
						error: "ImagingStorageAccessDenied",
						message: "Файл снимка находится за пределами разрешенного хранилища клиники.",
					});
				}
				return reply.code(400).send({
					error: "InvalidPath",
					message: "Недопустимый путь к файлу снимка.",
				});
			}

			try {
				await access(resolved);
			} catch (err) {
				request.log.error({ err }, "Failed to access imaging file on disk");
				return reply.code(404).send({
					error: "ImagingFileNotFoundOnDisk",
					message: "Файл снимка не найден на диске клиники.",
				});
			}

			const browserMime = browserRenderableImageMimeType(resolved);
			const query = (request.query || {}) as { raw?: string; download?: string };
			const isDownload = query.download === "true" || query.raw === "true";

			if (browserMime && !isDownload) {
				reply.type(browserMime);
				return reply.send(createReadStream(resolved));
			}

			const ext = path.extname(resolved).toLowerCase();
			if (isDicomOrRadiographFile(resolved) || ext === ".dcm" || ext === ".dicom" || ext === ".ima" || isDownload) {
				const mime = ext === ".dcm" || ext === ".dicom" || ext === ".ima" ? "application/dicom" : (browserMime || "application/octet-stream");
				reply.type(mime);
				reply.header("Content-Disposition", isDownload ? `attachment; filename="${path.basename(resolved)}"` : `inline; filename="${path.basename(resolved)}"`);
				return reply.send(createReadStream(resolved));
			}

			return reply.code(415).send({
				error: "ImagingPreviewUnsupported",
				message:
					"Этот формат браузер показать не может. Откройте снимок в просмотрщике DICOM.",
			});
		},
	);

	const updateImagingStudyBodySchema = z.object({
		title: z.string().trim().min(1).max(180).optional(),
		toothCode: z.string().trim().max(50).nullable().optional(),
		region: z.string().trim().max(120).nullable().optional(),
		kind: z
			.enum([
				"periapical",
				"bitewing",
				"opg",
				"ceph",
				"cbct",
				"photo",
				"other",
			])
			.optional(),
		visitId: z.string().uuid().nullable().optional(),
		status: z.enum(["available", "needs_review", "failed"]).optional(),
		aiSummary: z.string().trim().max(2000).nullable().optional(),
	});


	app.patch("/api/imaging/studies/:id", async (request, reply) => {
		const orgId = getImagingOrganizationId(request, reply);
		if (!orgId) return reply;
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging study update",
			))
		)
			return reply;
		const { id } = request.params as { id: string };
		const parsed = updateImagingStudyBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры обновления снимка",
				issues: parsed.error.issues,
			});
		}
		const study = await updateImagingStudyInDb(orgId, id, parsed.data);
		if (!study) return sendImagingStudyNotFound(reply);
		return reply.send(imagingStudySchema.parse(study));
	});
}
