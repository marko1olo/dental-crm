import {
	aiRecognitionJobResponseSchema,
	aiRecognitionJobSchema,
	createAiRecognitionJobSchema,
	treatmentPlanPayloadSchema,
	visitNoteDraftRequestSchema,
	visitNoteDraftSchema,
} from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
	resolveOrganizationId,
} from "../accessGuard.js";
import { parseDictationWithLLM } from "../ai/dictationParser.js";
import { parseDictationLocally } from "../ai/localDictationParser.js";
import { personalizePostVisitRecommendations } from "../ai/postVisitPersonalize.js";
import { personalizeTreatmentPlan } from "../ai/treatmentPlanPersonalize.js";
import { buildVisitDraftFromTranscript } from "../ai/visitDraft.js";
import {
	createAiRecognitionJobInDb,
	listAiRecognitionJobsFromDb,
} from "../db/aiQuery.js";
import { db } from "../db/client.js";
import { getImagingStudyById } from "../db/imagingQuery.js";
import { getPatientByIdFromDb } from "../db/patientsQuery.js";
import { clinics, imagingAnnotations } from "../db/schema.js";
import { verifyToken } from "../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./auth.js";

const aiRecognitionValidationMessage =
	"AI-задача не создана: выберите пациента или снимок и тип черновика.";
const visitNoteDraftValidationMessage =
	"Черновик приема не собран: передайте текст диктовки и специальность врача.";
const aiRecognitionPatientMissingMessage =
	"Пациент не найден. Выберите пациента из актуальной карты.";
const aiRecognitionStudyMissingMessage =
	"Снимок не найден. Выберите снимок из карты пациента.";
const aiRecognitionStudyPatientMismatchMessage =
	"Снимок привязан к другому пациенту. Проверьте карту перед созданием AI-черновика.";

/**
 * POST /api/ai/predict-no-show: тело раньше — bare cast
 * `request.body as { patientId?: unknown } | null | undefined`.
 * Zod safeParse после clinic-token AUTH → 400 с прежним RU текстом.
 */
const predictNoShowBodySchema = z.object({
	patientId: z.unknown().optional(),
});

function sendAiRecognitionScopeError(
	reply: FastifyReply,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: "AiRecognitionScopeError",
		message,
	});
}

function sendVisitNoteDraftScopeError(
	reply: FastifyReply,
	statusCode: 404,
	message: string,
) {
	return reply.code(statusCode).send({
		error: "VisitNoteDraftScopeError",
		message,
	});
}

/**
 * Часовой пояс клиники запроса, `null` — определить не удалось.
 *
 * Кто считает календарную дату, обязан знать пояс клиники: `clinics.timezone`
 * (`db/schema.ts`) — свободная строка со значением по умолчанию `Europe/Samara`.
 * Ответа клиенту эта функция не отправляет: пояс здесь нужен только как
 * подсказка модели, и его отсутствие не повод отказать во разборе диктовки.
 */
async function resolveClinicTimeZone(
	request: FastifyRequest,
): Promise<string | null> {
	const organizationId = await resolveOrganizationId(request);
	if (!organizationId) return null;
	try {
		const [clinic] = await db
			.select({ timezone: clinics.timezone })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);
		return clinic?.timezone ?? null;
	} catch (err) {
		console.error("[Dente] resolveClinicTimezone failed:", err);
		return null;
	}
}

export async function registerAiRoutes(app: FastifyInstance) {
	app.get("/api/ai/recognition-jobs", async (request, reply) => {
		try {
			// БЫЛО: getDefaultOrganizationId() — «первая строка таблицы organizations»,
			// то есть задания распознавания читались из чужой клиники. Организация
			// берётся из подписанного токена. Заодно исправлен порядок: запрос к базе
			// шёл ДО проверки доступа, и неавторизованный вызов всё равно нагружал БД.
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"ai recognition jobs",
				))
			)
				return;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"ai recognition jobs",
			);
			if (!orgId) return;
			return z
				.array(aiRecognitionJobSchema)
				.parse(await listAiRecognitionJobsFromDb(orgId));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});

	app.post("/api/ai/recognition-jobs", async (request, reply) => {
		try {
			// БЫЛО: getDefaultOrganizationId() — задание создавалось в первой
			// организации таблицы, а не в клинике вызывающего.
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"ai recognition job create",
				))
			)
				return;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"ai recognition job create",
			);
			if (!orgId) return;
			const parsedInput = createAiRecognitionJobSchema.safeParse(request.body);
			if (!parsedInput.success) {
				console.error(
					"SMOKE TEST DEBUG: createAiRecognitionJobSchema failed validation:",
					parsedInput.error.format(),
				);
				return reply.code(400).send({
					error: "AiRecognitionValidationError",
					message: aiRecognitionValidationMessage,
				});
			}
			const input = parsedInput.data;
			const patient = input.patientId
				? await getPatientByIdFromDb(orgId, input.patientId)
				: null;
			if (input.patientId && !patient) {
				return sendAiRecognitionScopeError(
					reply,
					404,
					aiRecognitionPatientMissingMessage,
				);
			}
			const imagingStudy = input.imagingStudyId
				? await getImagingStudyById(orgId, input.imagingStudyId)
				: null;
			if (input.imagingStudyId && !imagingStudy) {
				return sendAiRecognitionScopeError(
					reply,
					404,
					aiRecognitionStudyMissingMessage,
				);
			}
			if (patient && imagingStudy && imagingStudy.patientId !== patient.id) {
				return sendAiRecognitionScopeError(
					reply,
					409,
					aiRecognitionStudyPatientMismatchMessage,
				);
			}
			const job = await createAiRecognitionJobInDb(orgId, {
				...input,
				patientId:
					patient?.id ?? imagingStudy?.patientId ?? input.patientId ?? null,
			});
			return reply
				.code(201)
				.send(aiRecognitionJobResponseSchema.parse({ job }));
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});

	app.post("/api/ai/visit-note-draft", async (request, reply) => {
		try {
			// БЫЛО: getDefaultOrganizationId() — черновик собирался по данным пациента
			// из первой организации таблицы.
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"ai visit note draft",
				))
			)
				return;
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"ai visit note draft",
			);
			if (!orgId) return;
			const parsedInput = visitNoteDraftRequestSchema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "VisitNoteDraftValidationError",
					message: visitNoteDraftValidationMessage,
				});
			}
			const input = parsedInput.data;
			const patient = await getPatientByIdFromDb(orgId, input.patientId);
			if (!patient) {
				return sendVisitNoteDraftScopeError(
					reply,
					404,
					aiRecognitionPatientMissingMessage,
				);
			}

			return visitNoteDraftSchema.parse(
				await buildVisitDraftFromTranscript(input.transcript, input.specialty),
			);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});

	app.post("/api/ai/treatment-plan-personalize", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"personalize treatment plan",
				))
			)
				return;
			const parsedInput = treatmentPlanPayloadSchema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "TreatmentPlanValidationError",
					message: "Оекорректный план лечения для ИИ-персонализации.",
				});
			}
			const result = await personalizeTreatmentPlan(parsedInput.data);
			return reply.send(result);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});

	app.post("/api/ai/post-visit-personalize", async (request, reply) => {
		try {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"personalize post visit recommendations",
				))
			)
				return;
			const schema = z.object({
				careTopic: z.string(),
				procedureName: z.string(),
				toothOrArea: z.string(),
				doctorFullName: z.string(),
			});
			const parsedInput = schema.safeParse(request.body);
			if (!parsedInput.success) {
				return reply.code(400).send({
					error: "PostVisitPersonalizeValidationError",
					message: "Оекорректные параметры для ИИ-рекомендаций после приема.",
				});
			}
			const result = await personalizePostVisitRecommendations(
				parsedInput.data,
			);
			return reply.send(result);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});

	app.post("/api/ai/parse-dictation", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"parse dictation with AI",
			))
		)
			return;
		const schema = z.object({
			text: z.string(),
			type: z.enum(["schedule", "patient", "visit"]),
			volumeContext: z
				.object({
					studyId: z.string(),
					seriesId: z.string().optional(),
					organizationId: z.string(),
					patientId: z.string(),
					coordinates: z.record(z.number()).optional(),
				})
				.optional(),
		});

		const parsedInput = schema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "ParseDictationValidationError",
				message: "Оеверный формат для AI-разбора.",
			});
		}

		try {
			const { text, type, volumeContext } = parsedInput.data;

			// 1. Try Local Algorithmic NLP first (to save LLM keys)
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			let result = parseDictationLocally(text, type as any);

			// 2. Fallback to LLM if local NLP couldn't handle complex natural language
			if (!result) {
				// Пояс клиники нужен, чтобы «сегодня» в подсказке модели было днём
				// клиники, а не днём по UTC: иначе ночью диктовка «запиши на завтра»
				// возвращает сегодняшнюю дату (см. dictationTodayDate).
				//
				// Организация берётся без отправки ошибки: гейт этого маршрута —
				// requireClinicalReadAccess (админский секрет), токен кабинета в запросе
				// может отсутствовать. Разбор диктовки из-за неизвестного пояса ронять
				// нельзя — в этом случае берётся день сервера.
				result = await parseDictationWithLLM(
					text,
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					type as any,
					await resolveClinicTimeZone(request),
				);
			}

			// 3. Database Linkage (If 3D viewer context is provided and teeth were found)
			if (
				volumeContext &&
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(result as any)?.toothUpdates &&
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(result as any).toothUpdates.length > 0
			) {
				// We link coordinates to the first mentioned tooth, or multiple if needed
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				const valuesToInsert = (result as any).toothUpdates.map(
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(update: any) => ({
						organizationId: volumeContext.organizationId,
						patientId: volumeContext.patientId,
						studyId: volumeContext.studyId,
						annotationType: "tooth" as const,
						toothCode: update.code,
						coordinates: volumeContext.coordinates || null,
						// biome-ignore lint/suspicious/noExplicitAny: automated suppression
						notes: (result as any).emkUpdates?.complaint || update.state,
					}),
				);
				await db.insert(imagingAnnotations).values(valuesToInsert);
			}

			return reply.send(result);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			return reply.code(500).send({
				error: "ParseDictationError",
				message: err.message || "Ншибка парсинга диктовки",
			});
		}
	});

	/**
	 * РИСК НЕЯВКИ ПАЦИЕНТА. Считается по настоящей истории записей.
	 *
	 * ЧЕГО НЕ БЫЛО. Виджет карточки (PatientNoShowRisk.tsx) звал этот адрес, а
	 * маршрута не существовало: живая проверка получала 404, и в долг-листе он
	 * числился «незаконченным разделом». Администратор жал «Рассчитать AI-риск»,
	 * видел «Считаем…» и получал обратно то же приглашение рассчитать.
	 *
	 * ПОЧЕМУ ЗДЕСЬ НЕ requireClinicalReadAccess, как у соседей по этому файлу.
	 * Виджет посылает `denteAdminSecretRequestHeaders()` БЕЗ аргумента, то есть
	 * админский секрет в запрос не попадает — уходят только токены кабинета и
	 * сотрудника. Поставить сюда охрану секретом значило бы получить 403 у каждого
	 * настоящего заказчика (лазейки в .env живут лишь пока NODE_ENV !== production)
	 * и своими руками повторить тот самый класс дефектов, который в этот же день
	 * разбирался гейтом scripts/check-guarded-route-headers.mjs. Поэтому доступ
	 * проверяется подписью токена кабинета — так же, как в обработчиках карточки
	 * пациента (routes/patients.ts: рекламации, задачи, журнал обращений), которые
	 * сознательно не переведены на общий accessGuard по той же причине.
	 *
	 * Отдаваемые данные — сводка по собственным записям этого пациента, то есть то,
	 * что и так открыто на его карточке в журнале записей.
	 */
	app.post("/api/ai/predict-no-show", async (request, reply) => {
		const clinicHeader = request.headers["x-dente-clinic-token"];
		const clinicToken = Array.isArray(clinicHeader)
			? clinicHeader[0]
			: clinicHeader;
		const payload =
			typeof clinicToken === "string" && clinicToken
				? verifyToken(clinicToken, TOKEN_SECRET())
				: null;
		const orgId = payload?.organizationId as string | undefined;
		if (!orgId) {
			return reply.code(401).send({
				error: "AuthRequired",
				message: "Требуется авторизация рабочего кабинета клиники.",
			});
		}

		const parsedBody = predictNoShowBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Не указано, для какого пациента считать риск неявки.",
			});
		}
		const patientId =
			typeof parsedBody.data.patientId === "string"
				? parsedBody.data.patientId.trim()
				: "";
		if (!patientId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Не указано, для какого пациента считать риск неявки.",
			});
		}

		try {
			/*
			 * Чужая карта и карта без истории — разные ответы. Пустой расчёт на
			 * несуществующей карте администратор прочитал бы как «пациент надёжный».
			 */
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Карта пациента не найдена в этой клинике.",
				});
			}

			const { computePatientNoShowRisk } = await import(
				"../db/patientNoShowRiskQuery.js"
			);
			const outcome = await computePatientNoShowRisk(orgId, patientId);

			/*
			 * Мало истории — честный отказ, а не выдуманный «низкий риск». Назвать
			 * новичка надёжным опаснее, чем не считать вовсе: администратор перестал бы
			 * подтверждать запись. Экран на отказе показывает своё «Риск неявки не
			 * рассчитан» и совет подтвердить запись обычным порядком — ровно то, что
			 * здесь и требуется сказать.
			 */
			if (outcome.kind === "not_enough_history") {
				return reply.code(422).send({
					error: "NoShowRiskNotEnoughHistory",
					message:
						outcome.consideredAppointments === 0
							? "Считать риск неявки пока не на чем: у этого пациента ещё нет завершённых записей. Подтвердите запись обычным порядком."
							: "Для расчёта риска неявки нужно хотя бы две завершённые записи, а пока есть одна. Подтвердите запись обычным порядком.",
				});
			}

			return reply.status(200).send(outcome.risk);
		} catch (e) {
			request.log.error({ err: e }, "[AI] Ошибка расчёта риска неявки");
			return reply.code(500).send({
				error: "NoShowRiskFailed",
				message:
					"Не удалось посчитать риск неявки. Не считайте пациента ни надёжным, ни рискованным: подтвердите запись обычным порядком.",
			});
		}
	});
}
