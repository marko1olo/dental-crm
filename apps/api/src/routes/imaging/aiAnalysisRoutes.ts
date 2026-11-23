import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
	LocalPacsStorageService,
	PathTraversalError,
	TenantIsolationError,
} from "../../services/imaging/localPacsStorageService.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	parseImagingPayload,
	sendImagingStudyNotFound,
	sendImagingStudyScopeError,
} from "./imagingHelpers.js";
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
import { getPatientsFromDb } from "../../db/patientsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import { parseDicomFirstFramePixel } from "./previewModules/firstFramePixelParser.js";

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

		const body = (request.body && typeof request.body === "object" ? request.body : {}) as {
			imageBase64?: unknown;
			toothCode?: unknown;
			patientId?: unknown;
			visitId?: unknown;
			studyId?: unknown;
		};

		let imageBase64 = typeof body.imageBase64 === "string" && body.imageBase64.trim() ? body.imageBase64 : "";
		const toothCode = typeof body.toothCode === "string" && body.toothCode.trim() ? body.toothCode.trim() : null;
		const patientId = typeof body.patientId === "string" && body.patientId.trim() ? body.patientId.trim() : null;
		const visitId = typeof body.visitId === "string" && body.visitId.trim() ? body.visitId.trim() : null;
		const studyId = typeof body.studyId === "string" && body.studyId.trim() ? body.studyId.trim() : null;

		// If imageBase64 is not provided directly, try to load it from studyId if present
		if (!imageBase64 && studyId) {
			const orgId = requireOrganizationId(request, reply);
			if (orgId) {
				const study = await getImagingStudyById(orgId, studyId);
				if (study?.storagePath) {
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
				if (orgId) {
					try {
						await updateImagingStudyAiSummaryInDb(orgId, studyId, summary || report);
						if (patientId && toothUpdates.length > 0) {
							await saveImagingAiAnnotationsForStudy(orgId, studyId, patientId, toothUpdates);
						}
					} catch (updateErr) {
						request.log.warn({ updateErr }, "Failed to update study AI summary or annotations");
					}
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
			const message = err instanceof Error ? err.message : "Ошибка обработки снимка";
			return reply.code(500).send({ error: message });
		}
	};

	app.post("/api/imaging/ai-analysis", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return aiAnalysisHandler(request, reply);
	});
	app.post("/api/imaging/visiograph-ai", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return aiAnalysisHandler(request, reply);
	});
	app.post("/api/radiology/ai-analysis", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return aiAnalysisHandler(request, reply);
	});


	app.post("/api/imaging/studies/:id/analyze", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging study analyze",
			))
		)
			return;
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

		const { id } = request.params as { id: string };
		const study = await getImagingStudyById(orgId, id);
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
			// БЫЛО: результат записывался в поля объекта в памяти и умирал вместе
			// с запросом — при повторном открытии заключение исчезало, а платный
			// вызов модели выполнялся заново. Функция сохранения была импортирована,
			// но не вызывалась ни разу.
			try {
				await updateImagingStudyAiSummaryInDb(
					orgId,
					id,
					analysisResult.summary,
				);
				if (study.patientId && Array.isArray(analysisResult.toothUpdates) && analysisResult.toothUpdates.length > 0) {
					await saveImagingAiAnnotationsForStudy(
						orgId,
						id,
						study.patientId,
						analysisResult.toothUpdates,
					);
				}
			} catch (persistError) {
				request.log.error(
					{ err: persistError },
					"[imaging] Не удалось сохранить заключение ИИ и аннотации",
				);
			}
			return reply.code(200).send({ ok: true, analysisResult });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Анализ завершился ошибкой";
			return reply.code(502).send({ ok: false, message });
		}
	});

}
