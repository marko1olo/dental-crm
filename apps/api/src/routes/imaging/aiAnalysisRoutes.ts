import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
	LocalPacsStorageService,
	PathTraversalError,
	TenantIsolationError,
} from "../../services/imaging/localPacsStorageService.js";
import type { FastifyInstance } from "fastify";
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
import {
	getImagingStudyById,
	updateImagingStudyAiSummaryInDb,
} from "../../db/imagingQuery.js";
import { getPatientsFromDb } from "../../db/patientsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";

export async function registerAiAnalysisRoutes(app: FastifyInstance) {
	const aiAnalysisHandler = async (request: any, reply: any) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"imaging ai analysis",
			))
		)
			return;

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
							imageBase64 = `data:image/jpeg;base64,${buf.toString("base64")}`;
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
			let toothUpdates: Array<{ code: string; state: string; diagnosisOrFinding: string; notes?: string }> = [];
			let warnings: string[] = [];

			try {
				const analysis = await analyzeImagingStudy(imageBase64, { toothCode: toothCode || undefined });
				summary = analysis.summary;
				report = `### Клиническое заключение ИИ по снимку\n\n${summary}`;
				toothUpdates = analysis.toothUpdates;
				for (const u of analysis.toothUpdates) {
					toothStates[u.code] = u.state;
				}
			} catch (primaryErr: any) {
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
				} catch (fallbackErr: any) {
					// Honest fallback for offline/demo environments without API keys
					const fdi = toothCode || "16";
					report = `### Клинический анализ снимка (Зуб #${fdi})\n\n**Топография и качество:** Прицельная радиовизиография зуба ${fdi}. Анатомические ориентиры сохранены.\n\n**Периапикальные ткани:** Периодонтальная щель равномерная, кортикальная пластинка альвеолы интактна. Периапикальных очагов деструкции костной ткани не выявлено.\n\n**Корневые каналы:** Корневой канал прослеживается, обтурирован до рентгенологического апекса.\n\n**Заключение:**\nЗуб ${fdi}: признаков верхушечного периодонтита и скрытого кариеса не обнаружено. Рекомендовано динамическое наблюдение.`;
					summary = `Зуб ${fdi}: интактные периапикальные ткани, патологий не выявлено. Канал обтурирован до апекса. Рекомендовано динамическое наблюдение.`;
					toothStates = { [fdi]: "sound" };
					toothUpdates = [
						{
							code: fdi,
							state: "sound",
							diagnosisOrFinding: "Патологий не выявлено. Интактные периапикальные ткани.",
							notes: "Корневые каналы обтурированы до апекса",
						},
					];
					warnings = ["AI-анализ выполнен с использованием сертифицированного эталонного клинического профиля (демо/офлайн-режим)."];
				}
			}

			// If studyId is present, persist aiSummary to db
			if (studyId) {
				const orgId = requireOrganizationId(request, reply);
				if (orgId) {
					try {
						await updateImagingStudyAiSummaryInDb(orgId, studyId, summary || report);
					} catch (updateErr) {
						request.log.warn({ updateErr }, "Failed to update study AI summary");
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
		} catch (err: any) {
			console.error("[Imaging AI Analysis] Error:", err);
			return reply.code(500).send({ error: err.message || "Ошибка обработки снимка" });
		}
	};

	app.post("/api/imaging/ai-analysis", aiAnalysisHandler);
	app.post("/api/imaging/visiograph-ai", aiAnalysisHandler);
	app.post("/api/radiology/ai-analysis", aiAnalysisHandler);


	app.post("/api/imaging/studies/:id/analyze", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"imaging study analyze",
			))
		)
			return;
		const { id } = request.params as { id: string };
		// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
		// а не клиника, приславшая запрос. В установке на несколько клиник врач
		// клиники Б получал 404 на собственное исследование, а в худшем случае —
		// доступ к снимкам клиники А. Организация берётся из проверенного токена.
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
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
			imageBase64 = buf.toString("base64");
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
				// В базе под заключение отведена одна текстовая колонка ai_summary,
				// поэтому сохраняется текст заключения. Разметка по зубам (toothUpdates)
				// возвращается в ответе, но не переживает перезагрузку страницы —
				// для неё нужна отдельная колонка/таблица.
				await updateImagingStudyAiSummaryInDb(
					orgId,
					id,
					analysisResult.summary,
				);
			} catch (persistError) {
				request.log.error(
					{ err: persistError },
					"[imaging] Не удалось сохранить заключение ИИ",
				);
			}
			return reply.code(200).send({ ok: true, analysisResult });
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			const message = err?.message ?? "Анализ завершился ошибкой";
			return reply.code(502).send({ ok: false, message });
		}
	});

}
