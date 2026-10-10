/**
 * postOpPipelineCore.ts
 *
 * Ядро пайплайна послеоперационного теле-мониторинга DENTE:
 * регистрация 4-этапных планов ухода, планирование задач в БД,
 * идемпотентный триггер опросов и обработка Telegram-коллбэков.
 */

import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	communicationTasks,
	visits,
} from "../../../db/schema.js";
import {
	editTelegramMessageText,
	sendTelegramTextMessage,
} from "../../../telegramTransport.js";
import type { TriageScreenResult } from "../TelegramInteractiveTriageService.js";
import {
	COMPLEX_SURGERY_PATTERNS,
	get3HoursScreen,
	getDay1Screen,
	getDay3Screen,
	getDay7Screen,
	getEmergencyMemoScreen,
	getTherapeuticCheckupScreen,
} from "./careTemplates.js";
import { evaluatePostOpSymptomCallback } from "./symptomTriageEvaluator.js";
import {
	type HandlePostOpCallbackParams,
	type HandlePostOpCallbackResult,
	isUuid,
	type PostOpCarePlan,
	type PostOpStageItem,
	type SchedulePostOpCareParams,
	type SchedulePostVisitSurveyParams,
	type SchedulePostVisitSurveyResult,
} from "./types.js";

// In-memory хранилище активных планов теле-ухода (с поддержкой персистентности в communicationTasks)
const activeCarePlans = new Map<string, PostOpCarePlan>();
const scheduledVisitIds = new Set<string>();

export class TelegramPostOpCarePipeline {
	/**
	 * Ключевые слова и паттерны сложных хирургических манипуляций в амбулаторной стоматологии.
	 */
	static readonly COMPLEX_SURGERY_PATTERNS: ReadonlyArray<RegExp> = COMPLEX_SURGERY_PATTERNS;

	/**
	 * Проверяет, относится ли процедура/услуга к сложным операциям, требующим теле-ухода.
	 */
	static isComplexSurgery(servicesOrTitle: string | string[]): boolean {
		const titles = Array.isArray(servicesOrTitle) ? servicesOrTitle : [servicesOrTitle];
		return titles.some((title) => {
			if (!title || typeof title !== "string") return false;
			return this.COMPLEX_SURGERY_PATTERNS.some((pattern) => pattern.test(title));
		});
	}

	/**
	 * Создает и регистрирует 4-этапный план теле-ухода после сложной хирургической операции.
	 */
	static schedulePostOpCareForVisit(params: SchedulePostOpCareParams): PostOpCarePlan {
		const surgeryCompletedAt = params.surgeryCompletedAt || Date.now();
		const planId = `plan_${params.visitId}_${Date.now()}`;

		const stages: PostOpStageItem[] = [
			{
				stage: "3_hours",
				dueAt: surgeryCompletedAt + 3 * 3600 * 1000, // +3 часа
				status: "pending",
			},
			{
				stage: "day_1",
				dueAt: surgeryCompletedAt + 24 * 3600 * 1000, // +24 часа
				status: "pending",
			},
			{
				stage: "day_3",
				dueAt: surgeryCompletedAt + 72 * 3600 * 1000, // +72 часа
				status: "pending",
			},
			{
				stage: "day_7",
				dueAt: surgeryCompletedAt + 7 * 24 * 3600 * 1000, // +7 дней
				status: "pending",
			},
		];

		const plan: PostOpCarePlan = {
			id: planId,
			organizationId: params.organizationId,
			clinicId: params.clinicId ?? null,
			visitId: params.visitId,
			patientId: params.patientId,
			doctorId: params.doctorId ?? null,
			chatFingerprint: params.chatFingerprint ?? null,
			telegramChatId: params.telegramChatId ?? null,
			surgeryTitle: params.surgeryTitle,
			surgeryCompletedAt,
			stages,
			createdAt: Date.now(),
		};

		activeCarePlans.set(planId, plan);

		// Асинхронная фиксация в communicationTasks первой точки контакта
		void withTenantCtx(params.organizationId, async (tx) => {
			if (!isUuid(params.organizationId) || !isUuid(params.patientId)) {
				return;
			}
			let validVisitId: string | null = null;
			if (params.visitId && isUuid(params.visitId)) {
				const [vRow] = await tx
					.select({ id: visits.id })
					.from(visits)
					.where(and(eq(visits.organizationId, params.organizationId), eq(visits.id, params.visitId)))
					.limit(1);
				if (vRow) validVisitId = vRow.id;
			}

			const validClinicId = isUuid(params.clinicId) ? params.clinicId : null;

			await tx.insert(communicationTasks).values({
				organizationId: params.organizationId,
				clinicId: validClinicId,
				patientId: params.patientId,
				visitId: validVisitId,
				assignedRole: "reception",
				channel: "telegram" as const,
				intent: "post_visit_instruction" as const,
				status: "scheduled" as const,
				priority: "normal" as const,
				dueAt: new Date(stages[0]!.dueAt),
				title: `Теле-уход: 3 часа после (${params.surgeryTitle})`,
				body: `Запланирован 4-этапный теле-мониторинг после операции: ${params.surgeryTitle}. Этап 1: через 3 часа.`,
				workflowCode: "POST_OP_CARE_PIPELINE",
			});
		}).catch((err) => {
			console.warn("[TelegramPostOpCarePipeline] Ошибка сохранения задачи в БД:", err);
		});

		return plan;
	}

	/**
	 * Автоматическое планирование послеоперационного триажа или регулярного контроля после завершения визита.
	 * Для хирургических манипуляций — 4-этапный CITO-пайплайн (3 часа, День 1, День 3, День 7).
	 * Для терапевтических приемов — 24-часовой авто-опрос самочувствия.
	 * Гарантирует идемпотентность: повторный вызов для того же визита не создает дубликатов задач.
	 */
	static async schedulePostVisitSurveyIfNeeded(
		params: SchedulePostVisitSurveyParams,
	): Promise<SchedulePostVisitSurveyResult> {
		// 1. Быстрая проверка идемпотентности в памяти (на уровне визита)
		if (scheduledVisitIds.has(params.visitId) || TelegramPostOpCarePipeline.getPlanByVisitId(params.visitId)) {
			return {
				isSurgery: TelegramPostOpCarePipeline.getPlanByVisitId(params.visitId) !== undefined,
				scheduled: false,
				planId: TelegramPostOpCarePipeline.getPlanByVisitId(params.visitId)?.id,
			};
		}

		return withTenantCtx(params.organizationId, async (tx) => {
			const hasValidOrg = isUuid(params.organizationId);
			const hasValidVisit = isUuid(params.visitId);
			const hasValidPatient = isUuid(params.patientId);

			// 1. Идемпотентность в базе: проверяем, нет ли уже назначенной задачи опроса после этого визита
			if (hasValidOrg && hasValidVisit) {
				const [existingTask] = await tx
					.select({ id: communicationTasks.id })
					.from(communicationTasks)
					.where(
						and(
							eq(communicationTasks.organizationId, params.organizationId),
							eq(communicationTasks.visitId, params.visitId),
							eq(communicationTasks.intent, "post_visit_instruction"),
						),
					)
					.limit(1);

				if (existingTask) {
					scheduledVisitIds.add(params.visitId);
					return { isSurgery: false, scheduled: false, taskId: existingTask.id };
				}
			}

			// 2. Клиническая классификация (хирургия vs терапия/гигиена/ортопедия)
			const clinicalNarrative = [
				params.treatmentPlan,
				params.diagnosis,
				params.complaint,
				params.objectiveStatus,
				params.doctorSummary,
			].filter(Boolean) as string[];

			const isSurgery = TelegramPostOpCarePipeline.isComplexSurgery(clinicalNarrative);

			if (isSurgery) {
				const surgeryTitle =
					params.treatmentPlan ||
					params.diagnosis ||
					"Хирургическая операция";

				const plan = TelegramPostOpCarePipeline.schedulePostOpCareForVisit({
					organizationId: params.organizationId,
					clinicId: params.clinicId,
					visitId: params.visitId,
					patientId: params.patientId,
					doctorId: params.doctorId,
					surgeryTitle,
				});

				scheduledVisitIds.add(params.visitId);
				return { isSurgery: true, scheduled: true, planId: plan.id };
			}

			// 3. Терапевтический / общий прием: постановка 24-часового авто-опроса самочувствия
			if (!hasValidOrg || !hasValidPatient) {
				scheduledVisitIds.add(params.visitId);
				return { isSurgery: false, scheduled: true, taskId: null };
			}

			let validVisitId: string | null = null;
			if (hasValidVisit) {
				const [vRow] = await tx
					.select({ id: visits.id })
					.from(visits)
					.where(and(eq(visits.organizationId, params.organizationId), eq(visits.id, params.visitId)))
					.limit(1);
				if (vRow) validVisitId = vRow.id;
			}

			let validAppointmentId: string | null = null;
			if (isUuid(params.appointmentId)) {
				const [aRow] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(and(eq(appointments.organizationId, params.organizationId), eq(appointments.id, params.appointmentId)))
					.limit(1);
				if (aRow) validAppointmentId = aRow.id;
			}

			const validClinicId = isUuid(params.clinicId) ? params.clinicId : null;

			const [createdTask] = await tx
				.insert(communicationTasks)
				.values({
					organizationId: params.organizationId,
					clinicId: validClinicId,
					patientId: params.patientId,
					visitId: validVisitId,
					appointmentId: validAppointmentId,
					assignedRole: "reception",
					channel: "telegram" as const,
					intent: "post_visit_instruction" as const,
					status: "scheduled" as const,
					priority: "normal" as const,
					dueAt: new Date(Date.now() + 24 * 3600 * 1000), // +24 часа
					title: "Контроль самочувствия через 24 часа",
					body: "Автоматический опрос самочувствия через 24 часа после приёма: контроль боли, отёка и комфорта после лечения.",
					workflowCode: "POST_VISIT_CHECKUP",
				})
				.returning({ id: communicationTasks.id });

			scheduledVisitIds.add(params.visitId);
			return { isSurgery: false, scheduled: true, taskId: createdTask?.id ?? null };
		});
	}

	/**
	 * Возвращает активный план по идентификатору или visitId.
	 */
	static getPlanByVisitId(visitId: string): PostOpCarePlan | undefined {
		for (const plan of activeCarePlans.values()) {
			if (plan.visitId === visitId) return plan;
		}
		return undefined;
	}

	/**
	 * Экран: Через 3 часа после операции.
	 */
	static get3HoursScreen(surgeryTitle?: string): TriageScreenResult {
		return get3HoursScreen(surgeryTitle);
	}

	/**
	 * Экран: День 1 (контроль отёка, температуры, шкала боли 1-5).
	 */
	static getDay1Screen(surgeryTitle?: string): TriageScreenResult {
		return getDay1Screen(surgeryTitle);
	}

	/**
	 * Экран: День 3 (пик отёка, тревожная кнопка).
	 */
	static getDay3Screen(surgeryTitle?: string): TriageScreenResult {
		return getDay3Screen(surgeryTitle);
	}

	/**
	 * Экран: День 7 (снятие швов и контрольный осмотр).
	 */
	static getDay7Screen(surgeryTitle?: string): TriageScreenResult {
		return getDay7Screen(surgeryTitle);
	}

	/**
	 * Памятка экстренных действий: чего категорически нельзя делать.
	 */
	static getEmergencyMemoScreen(): TriageScreenResult {
		return getEmergencyMemoScreen();
	}

	/**
	 * Экран: Опрос самочувствия через 24 часа после терапевтического приёма.
	 */
	static getTherapeuticCheckupScreen(): TriageScreenResult {
		return getTherapeuticCheckupScreen();
	}

	/**
	 * Обрабатывает callback_data вида `postop:...` в Telegram-боте.
	 */
	static async handlePostOpCallback(
		params: HandlePostOpCallbackParams,
	): Promise<HandlePostOpCallbackResult> {
		const { callbackData, chatId, messageId, botToken } = params;

		if (!callbackData.startsWith("postop:")) {
			return { handled: false };
		}

		const { targetScreen, isEmergency } = await evaluatePostOpSymptomCallback(params, {
			get3HoursScreen: (title) => this.get3HoursScreen(title),
			getDay1Screen: (title) => this.getDay1Screen(title),
			getDay3Screen: (title) => this.getDay3Screen(title),
			getDay7Screen: (title) => this.getDay7Screen(title),
			getEmergencyMemoScreen: () => this.getEmergencyMemoScreen(),
			getTherapeuticCheckupScreen: () => this.getTherapeuticCheckupScreen(),
		});

		if (!targetScreen) {
			return { handled: false };
		}

		// In-Place редактирование сообщения в Telegram
		if (messageId && botToken && chatId) {
			await editTelegramMessageText({
				botToken,
				chatId,
				messageId,
				text: targetScreen.text,
				replyMarkup: targetScreen.replyMarkup,
			}).catch(async () => {
				await sendTelegramTextMessage({
					botToken,
					chatId,
					text: targetScreen.text,
					replyMarkup: targetScreen.replyMarkup,
				}).catch(() => {});
			});
		}

		return { handled: true, screen: targetScreen, isEmergency };
	}
}
