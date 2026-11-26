import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
	LocalPacsStorageService,
	PathTraversalError,
	TenantIsolationError,
} from "../../services/imaging/localPacsStorageService.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { sendImagingStudyNotFound } from "./imagingHelpers.js";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { analyzeVisiographImage } from "../../ai/visiograph.js";
import { analyzeImagingStudy } from "../../ai/visionAnalyzer.js";
import type { ToothFindingUpdate } from "../../ai/vision/visionTypes.js";
import {
	getImagingStudyById,
	updateImagingStudyAiSummaryInDb,
} from "../../db/imagingQuery.js";
import { saveImagingAiAnnotationsForStudy } from "../../db/imagingMeasurementsQuery.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import { parseDicomFirstFramePixel } from "./previewModules/firstFramePixelParser.js";

const MAX_AI_BASE64_CHARS = 32 * 1024 * 1024;

export const imagingAiAnalysisBodySchema = z
	.object({
		imageBase64: z.string().max(MAX_AI_BASE64_CHARS).optional().default(""),
		toothCode: z.string().trim().min(1).max(16).optional().nullable(),
		patientId: z.string().uuid().optional().nullable(),
		visitId: z.string().uuid().optional().nullable(),
		studyId: z.string().uuid().optional().nullable(),
		focus: z.enum(["caries", "perio", "endo"]).optional().nullable(),
	})
	.strict();

export type ImagingAiAnalysisBody = z.infer<typeof imagingAiAnalysisBodySchema>;

const studyAnalyzeParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный идентификатор снимка (ожидается UUID)."),
	})
	.strict();

function convertBufferToVisionDataUrl(buf: Buffer, filePath?: string): string {
	const isJpeg =
		buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
	const isPng =
		buf.length > 4 &&
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47;
	if (isJpeg) {
		return `data:image/jpeg;base64,${buf.toString("base64")}`;
	}
	if (isPng) {
		return `data:image/png;base64,${buf.toString("base64")}`;
	}

	const isDicom =
		(buf.length >= 132 && buf.toString("latin1", 128, 132) === "DICM") ||
		(filePath ? /\.dcm$/i.test(filePath) : false);

	if (isDicom) {
		const parsed = parseDicomFirstFramePixel(buf, 1024);
		if (parsed.status === "ready" && parsed.imageDataUrl) {
			return parsed.imageDataUrl;
		}
		throw new Error(
			"Не удалось декодировать срез DICOM для ИИ-анализа. Формат требует конвертации или внешнего просмотрщика.",
		);
	}

	return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

export async function registerAiAnalysisRoutes(app: FastifyInstance) {
	const aiAnalysisHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging ai analysis",
			))
		)
			return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.imaging.read",
				role: staffRole,
				message: `Отказ в доступе к ИИ-анализу снимков: ${evalAccess.reason}`,
			});
		}

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

		if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
			return reply.code(400).send({
				error: "Missing imageBase64",
				message: "Missing imageBase64 or valid studyId",
			});
		}

		const parseResult = imagingAiAnalysisBodySchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса ИИ-анализа снимка",
				details: parseResult.error.flatten(),
			});
		}

		const body = parseResult.data;
		let imageBase64 = body.imageBase64.trim();
		const toothCode = body.toothCode?.trim() ?? null;
		const patientId = body.patientId?.trim() ?? null;
		const studyId = body.studyId?.trim() ?? null;

		let loadedStudyPatientId: string | null = null;
		if (studyId) {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const study = await withTenantCtx(orgId, (tx) => getImagingStudyById(orgId, studyId, tx));
			if (!study) {
				return sendImagingStudyNotFound(reply);
			}
			if (patientId && study.patientId && study.patientId !== patientId) {
				return reply.code(409).send({
					error: "StudyPatientMismatch",
					message: "Указанное исследование принадлежит другому пациенту.",
				});
			}
			loadedStudyPatientId = study.patientId ?? null;
			if (!imageBase64 && study.storagePath) {
				try {
					const resolved = LocalPacsStorageService.validateAndResolveLocalFilePath(orgId, study.storagePath);
					if (existsSync(resolved)) {
						const buf = await readFile(resolved);
						imageBase64 = convertBufferToVisionDataUrl(buf, resolved);
					}
				} catch (readErr) {
					request.log.warn({ readErr, studyId }, "Could not read study storage file for AI analysis");
				}
			}
		}

		if (!imageBase64) {
			return reply.code(400).send({ error: "Missing imageBase64", message: "Missing imageBase64 or valid studyId" });
		}

		try {
			// First attempt deep analysis via visionAnalyzer (CLAHE + Pass-1/Pass-2)
			let report = "";
			let summary = "";
			let toothStates: Record<string, string> = {};
			let toothUpdates: ToothFindingUpdate[] = [];
			let warnings: string[] = [];

			try {
				const analysis = await analyzeImagingStudy(imageBase64, { toothCode: toothCode || undefined });
				summary = analysis.summary;
				report = `### Клиническое заключение ИИ по снимку\n\n${summary}`;
				toothUpdates = analysis.toothUpdates;
				for (const u of analysis.toothUpdates) {
					toothStates[u.code] = u.state;
				}
			} catch (primaryErr: unknown) {
				// Secondary attempt: analyzeVisiographImage
				try {
					const visioRes = await analyzeVisiographImage(imageBase64);
					report = visioRes.report;
					summary = visioRes.report.slice(0, 300);
					toothStates = visioRes.toothStates;
					warnings = visioRes.warnings;
					for (const [code, state] of Object.entries(toothStates)) {
						toothUpdates.push({
							code,
							state,
							diagnosisOrFinding: state === "sound" ? "Норма" : `Выявлено изменение: ${state}`,
						});
					}
				} catch (fallbackErr: unknown) {
					request.log.warn({ primaryErr, fallbackErr }, "AI analysis models unavailable");
					return reply.code(503).send({
						ok: false,
						error: "AI_ANALYSIS_FAILED",
						message: "Сервис искусственного интеллекта временно недоступен или ключи API не настроены. Повторите попытку позже.",
					});
				}
			}

			// If studyId is present, persist aiSummary and toothUpdates annotations to db
			if (studyId) {
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;
				await withTenantCtx(orgId, (tx) =>
					updateImagingStudyAiSummaryInDb(orgId, studyId, summary || report, tx),
				);
				const targetPatientId = patientId ?? loadedStudyPatientId;
				if (targetPatientId && toothUpdates.length > 0) {
					await saveImagingAiAnnotationsForStudy(orgId, studyId, targetPatientId, toothUpdates);
				}
			}

			return reply.send({
				ok: true,
				report,
				summary,
				toothStates,
				toothUpdates,
				warnings,
			});
		} catch (err: unknown) {
			request.log.error({ err }, "Imaging AI analysis failed");
			return reply.code(500).send({
				error: "AiAnalysisFailed",
				message: "Ошибка обработки ИИ-анализа снимка.",
			});
		}
	};

	app.post(
		"/api/imaging/ai-analysis",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			// organizationId tenant context & Idempotency-Key validation
			return aiAnalysisHandler(request, reply);
		},
	);


	app.post(
		"/api/imaging/studies/:id/analyze",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging study analyze",
			))
		)
			return;
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? (process.env.DENTAL_STATE_PERSISTENCE === "off" ? "doctor" : null);
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.imaging.write",
				role: staffRole,
				message: `Отказ в запуске ИИ-анализа снимка: ${evalAccess.reason}`,
			});
		}

		const orgId = requireOrganizationId(request, reply);
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

		const paramsParsed = studyAnalyzeParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор снимка (ожидается UUID).",
			});
		}
		const { id } = paramsParsed.data;
		const study = await withTenantCtx(orgId, (tx) => getImagingStudyById(orgId, id, tx));
		if (!study) return sendImagingStudyNotFound(reply);

		// БЫЛО: если файл снимка отсутствовал или не читался, в модель отправлялся
		// ПУСТОЙ БЕЛЫЙ ПИКСЕЛЬ 1×1, а результат возвращался как ok:true вместе с
		// предложениями по изменению зубной формулы. Врач получал уверенное
		// заключение по снимку, который никто не открывал, и не мог отличить его
		// от настоящего: блок catch превращал ошибку доступа к файлу в «анализ».
		if (!study.storagePath) {
			return reply.code(422).send({
				ok: false,
				error: "ImagingFileMissing",
				message:
					"У исследования не указан файл снимка. Анализ невозможен — загрузите изображение.",
			});
		}
		let resolvedStoragePath: string;
		try {
			resolvedStoragePath = LocalPacsStorageService.validateAndResolveLocalFilePath(orgId, study.storagePath);
		} catch (err) {
			if (err instanceof PathTraversalError || err instanceof TenantIsolationError) {
				return reply.code(403).send({
					ok: false,
					error: "ImagingStorageAccessDenied",
					message: "Файл снимка находится за пределами разрешенного хранилища клиники.",
				});
			}
			return reply.code(400).send({
				ok: false,
				error: "InvalidPath",
				message: "Недопустимый путь к файлу снимка.",
			});
		}

		if (!existsSync(resolvedStoragePath)) {
			return reply.code(422).send({
				ok: false,
				error: "ImagingFileNotFound",
				message:
					"Файл снимка не найден на диске. Проверьте, что хранилище подключено, и повторите загрузку.",
			});
		}

		// Ограничение размера: раньше файл любого объёма целиком читался в память
		// и переводился в base64 (×1,33). Объёмный КЛКТ-том выедал память сервера,
		// а на очень больших файлах падало само преобразование в строку —
		// и падение уходило в тот самый блок с белым пикселем.
		const maxAnalyzableBytes = Number(
			process.env.DENTE_AI_IMAGE_MAX_BYTES ?? 24 * 1024 * 1024,
		);
		let imageBase64: string;
		try {
			const fileSizeBytes = statSync(resolvedStoragePath).size;
			if (fileSizeBytes > maxAnalyzableBytes) {
				return reply.code(413).send({
					ok: false,
					error: "ImagingFileTooLarge",
					message: `Файл снимка слишком велик для анализа (${Math.round(fileSizeBytes / 1024 / 1024)} МБ, предел ${Math.round(maxAnalyzableBytes / 1024 / 1024)} МБ). Используйте отдельный кадр вместо полного тома.`,
				});
			}
			const buf = await readFile(resolvedStoragePath);
			imageBase64 = convertBufferToVisionDataUrl(buf, resolvedStoragePath);
		} catch (readError) {
			request.log.error(
				{ err: readError, storagePath: resolvedStoragePath },
				"[imaging] Не удалось прочитать файл снимка",
			);
			return reply.code(422).send({
				ok: false,
				error: "ImagingFileUnreadable",
				message:
					"Файл снимка не читается: нет прав доступа или файл повреждён. Анализ не выполнялся.",
			});
		}

		try {
			const analysisResult = await analyzeImagingStudy(imageBase64);
			await withTenantCtx(orgId, (tx) =>
				updateImagingStudyAiSummaryInDb(orgId, id, analysisResult.summary, tx),
			);
			if (study.patientId && Array.isArray(analysisResult.toothUpdates) && analysisResult.toothUpdates.length > 0) {
				await saveImagingAiAnnotationsForStudy(
					orgId,
					id,
					study.patientId,
					analysisResult.toothUpdates,
				);
			}
			return reply.code(200).send({ ok: true, analysisResult });
		} catch (err: unknown) {
			request.log.error({ err, studyId: id }, "[imaging] Ошибка анализа снимка или сохранения заключения ИИ");
			return reply.code(502).send({ ok: false, message: "Не удалось завершить или сохранить ИИ-анализ снимка." });
		}
	});

}
