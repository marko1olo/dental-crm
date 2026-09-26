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
	app.post("/api/imaging/visiograph-ai", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"visiograph ai analysis",
			))
		)
			return;
		// БЫЛО: bare cast `request.body as { imageBase64?: string }` — null body
		// не падал из-за body?., но форма не проверялась (как у соседних imaging
		// маршрутов через parseImagingPayload). Missing imageBase64 message сохранён.
		const parsed = parseImagingPayload(
			{
				safeParse: (value: unknown) => {
					if (!value || typeof value !== "object" || Array.isArray(value)) {
						return { success: false as const };
					}
					const imageBase64 = (value as { imageBase64?: unknown }).imageBase64;
					if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
						return { success: false as const };
					}
					return { success: true as const, data: { imageBase64 } };
				},
			},
			request.body,
			"Missing imageBase64",
		);
		if (!parsed.ok) {
			return reply.code(400).send({ error: "Missing imageBase64" });
		}
		try {
			const result = await analyzeVisiographImage(parsed.data.imageBase64);
			return reply.send(result);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			console.error("[Visiograph AI] Error:", err);
			return reply.code(500).send({ error: err.message });
		}
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
