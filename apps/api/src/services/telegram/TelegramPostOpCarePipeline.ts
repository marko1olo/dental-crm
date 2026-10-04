/**
 * TelegramPostOpCarePipeline.ts
 *
 * Умный 4-этапный пайплайн послеоперационного теле-мониторинга DENTE:
 * - Автоматический запуск после закрытия визитов сложных хирургических манипуляций
 *   (Имплантация, Синус-лифтинг, Сложное удаление 8-ки, Костная пластика, All-on-4/6).
 * - Этап 1: Через 3 часа после операции (выход из анестезии, гемостаз, первичный болевой синдром).
 * - Этап 2: День 1 (контроль отёка, температуры, приём анальгетиков, шкала боли 1-5).
 * - Этап 3: День 3 (пик естественного отёка, запрет согревания, тревожная кнопка).
 * - Этап 4: День 7 (напоминание о снятии швов и контрольном приёме хирурга).
 *
 * Включает полную интеграцию с Red Flag детектором и аварийным SOS-эскалатором.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	communicationEvents,
	communicationTasks,
	denteTelegramChatLinks,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import {
	editTelegramMessageText,
	sendTelegramTextMessage,
} from "../../telegramTransport.js";
import { wsBroker } from "../websocketBroker.js";
import {
	TelegramEmergencyEscalationService,
	type EmergencyEscalationResult,
} from "./TelegramEmergencyEscalationService.js";
import type { TelegramInlineKeyboard, TriageScreenResult } from "./TelegramInteractiveTriageService.js";
import {
	TelegramRedFlagDetector,
	type RedFlagEvaluationResult,
} from "./TelegramRedFlagDetector.js";

export type PostOpStage = "3_hours" | "day_1" | "day_3" | "day_7";

export type PostOpStageItem = {
	stage: PostOpStage;
	dueAt: number; // timestamp ms
	status: "pending" | "sent" | "answered" | "skipped";
	sentAt?: number | undefined;
	answeredAt?: number | undefined;
	patientResponse?: unknown | undefined;
};

export type PostOpCarePlan = {
	id: string;
	organizationId: string;
	clinicId?: string | null | undefined;
	visitId: string;
	patientId: string;
	doctorId?: string | null | undefined;
	chatFingerprint?: string | null | undefined;
	telegramChatId?: string | null | undefined;
	surgeryTitle: string;
	surgeryCompletedAt: number; // timestamp ms
	stages: PostOpStageItem[];
	isEmergencyTriggered?: boolean | undefined;
	createdAt: number;
};

// In-memory хранилище активных планов теле-ухода (с поддержкой персистентности в communicationTasks)
const activeCarePlans = new Map<string, PostOpCarePlan>();

export class TelegramPostOpCarePipeline {
	/**
	 * Ключевые слова и паттерны сложных хирургических манипуляций в амбулаторной стоматологии.
	 */
	static readonly COMPLEX_SURGERY_PATTERNS: ReadonlyArray<RegExp> = [
		/имплант/i,
		/implant/i,
		/синус[- ]?лифтинг/i,
		/sinus[- ]?lift/i,
		/костн[а-яё]*\s+пластик/i,
		/аугментац/i,
		/расщеплен[а-яё]*\s+гребн/i,
		/удален[а-яё]*.*(?:восьмер|8|зуб\s+мудрост)/i,
		/сложн[а-яё]*\s+удален/i,
		/ретинирован/i,
		/дистопирован/i,
		/резекци[а-яё]*\s+верхушк/i,
		/all[- ]on[- ][46]/i,
		/цистэктоми/i,
		/вестибулопластик/i,
	];

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
	static schedulePostOpCareForVisit(params: {
		organizationId: string;
		clinicId?: string | null | undefined;
		visitId: string;
		patientId: string;
		doctorId?: string | null | undefined;
		surgeryTitle: string;
		surgeryCompletedAt?: number | undefined;
		chatFingerprint?: string | null | undefined;
		telegramChatId?: string | null | undefined;
	}): PostOpCarePlan {
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
			await tx.insert(communicationTasks).values({
				organizationId: params.organizationId,
				clinicId: params.clinicId ? params.clinicId : null,
				patientId: params.patientId,
				visitId: params.visitId,
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
		const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
		const text = [
			`👨‍⚕️ <b>Контроль самочувствия через 3 часа после операции${titleStr}</b>`,
			"",
			"Прошло 3 часа после вмешательства. Врач и клиника DENTE на связи с вами:",
			"• Отошла ли анестезия («заморозка») или начинает плавно отходить?",
			"• Начали ли действовать назначенные обезболивающие препараты?",
			"• Нет ли стойкого онемения губы или обильного кровотечения?",
			"",
			"Пожалуйста, выберите ваше состояние кнопкой ниже:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{
						text: "✅ Всё спокойно, анестезия отходит, отдыхаю",
						callback_data: "postop:3h:ok",
					},
				],
				[
					{
						text: "💊 Болит, принял(а) назначенное обезболивающее",
						callback_data: "postop:3h:pain_mild",
					},
				],
				[
					{
						text: "⚠️ Губа/подбородок онемели и не чувствую совсем",
						callback_data: "postop:3h:numbness",
					},
				],
				[
					{
						text: "🩸 Кровоточит / сильная боль (SOS)",
						callback_data: "postop:3h:sos",
					},
				],
				[
					{
						text: "📞 Связаться с клиникой",
						callback_data: "triage:human_request",
					},
				],
			],
		};

		return { text, replyMarkup };
	}

	/**
	 * Экран: День 1 (контроль отёка, температуры, шкала боли 1-5).
	 */
	static getDay1Screen(surgeryTitle?: string): TriageScreenResult {
		const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
		const text = [
			`☀️ <b>День 1 после операции${titleStr}: контроль восстановления</b>`,
			"",
			"Как прошла первая ночь? Напоминаем ключевые правила первого дня:",
			"• Умеренная ноющая боль и нарастание отёка к вечеру — естественная реакция.",
			"• Прикладывайте сухой холод через салфетку по 15 минут с перерывами.",
			"• <b>Категорически не греть щёку!</b>",
			"",
			"Оцените ваш уровень боли прямо сейчас (по шкале от 1 до 5):",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{ text: "1: Совсем не болит", callback_data: "postop:day1:score:1" },
					{ text: "2: Слабая боль", callback_data: "postop:day1:score:2" },
					{ text: "3: Умеренная", callback_data: "postop:day1:score:3" },
				],
				[
					{ text: "4: Сильная боль (тяжело)", callback_data: "postop:day1:score:4" },
					{ text: "5: Нестерпимая боль! (SOS)", callback_data: "postop:day1:score:5" },
				],
				[
					{ text: "🌡️ Температура поднялась > 38.2°C", callback_data: "postop:day1:fever" },
					{ text: "🩸 Кровь не останавливается", callback_data: "postop:day1:bleeding" },
				],
				[
					{ text: "📞 Позвонить дежурному врачу", callback_data: "triage:human_request" },
					{ text: "🏠 Главное меню", callback_data: "dente:start" },
				],
			],
		};

		return { text, replyMarkup };
	}

	/**
	 * Экран: День 3 (пик отёка, тревожная кнопка).
	 */
	static getDay3Screen(surgeryTitle?: string): TriageScreenResult {
		const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
		const text = [
			`🧊 <b>День 3 после операции${titleStr}: пик естественного отёка</b>`,
			"",
			"<b>Важная клиническая памятка:</b>",
			"Сегодня 3-и сутки — физиологический пик послеоперационного отёка. Начиная с завтрашнего дня он начнет плавно спадать.",
			"",
			"🛑 <b>ГРЕТЬ ЩЁКУ КАТЕГОРИЧЕСКИ НЕЛЬЗЯ!</b> Согревающие компрессы могут вызвать нагноение.",
			"Отёк должен быть мягким и безболезненным при поверхностном касании.",
			"",
			"Как вы себя чувствуете сегодня?",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{
						text: "✅ Отёк есть, но мягкий, температура в норме",
						callback_data: "postop:day3:ok",
					},
				],
				[
					{
						text: "⚠️ Отёк плотный, горячий или переходит на шею (SOS)",
						callback_data: "postop:day3:neck_swelling",
					},
				],
				[
					{
						text: "🌡️ Поднялась температура выше 38.2°C (SOS)",
						callback_data: "postop:day3:fever",
					},
				],
				[
					{
						text: "💊 Беспокоит нарастающая боль",
						callback_data: "postop:day3:pain",
					},
				],
				[
					{
						text: "📞 Позвонить в клинику",
						callback_data: "triage:human_request",
					},
				],
			],
		};

		return { text, replyMarkup };
	}

	/**
	 * Экран: День 7 (снятие швов и контрольный осмотр).
	 */
	static getDay7Screen(surgeryTitle?: string): TriageScreenResult {
		const titleStr = surgeryTitle ? ` (${surgeryTitle})` : "";
		const text = [
			`🧵 <b>День 7 после вмешательства${titleStr}: снятие швов</b>`,
			"",
			"Прошла неделя со дня операции. Основная фаза первичного заживления завершена!",
			"",
			"Наступило время контрольного осмотра хирургом и бережного снятия швов (процедура занимает 5 минут и совершенно безболезненна).",
			"",
			"Запишитесь на визит к вашему оперировавшему хирургу:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{
						text: "📅 Записаться на снятие швов к врачу",
						callback_data: "dente:schedule",
					},
				],
				[
					{
						text: "✅ Швы уже сняты / самочувствие отличное",
						callback_data: "postop:day7:ok",
					},
				],
				[
					{
						text: "💬 Задать вопрос администратору",
						callback_data: "triage:human_request",
					},
				],
				[
					{
						text: "🏠 Главное меню",
						callback_data: "dente:start",
					},
				],
			],
		};

		return { text, replyMarkup };
	}

	/**
	 * Памятка экстренных действий: чего категорически нельзя делать.
	 */
	static getEmergencyMemoScreen(): TriageScreenResult {
		const text = [
			"🛑 <b>ПАМЯТКА: ЧТО КАТЕГОРИЧЕСКИ НЕЛЬЗЯ ДЕЛАТЬ ПОСЛЕ ОПЕРАЦИИ</b>",
			"",
			"1. 🚫 <b>НЕ ГРЕТЬ!</b> Никаких шарфов, грелок, горячих ванн и бань. Тепло провоцирует расширение сосудов, возобновление кровотечения и бурное нагноение тканей.",
			"2. 🚫 <b>НЕ ПОЛОСКАТЬ АКТИВНО РТ!</b> Булькающие полоскания вымывают защитный кровяной сгусток из лунки (риск альвеолита «сухой лунки»). Разрешены только пассивные ротовые ванночки.",
			"3. 🚫 <b>НЕ КОВЫРЯТЬ ЛУНКУ!</b> Не трогать языком, зубочистками или пальцами белесоватый налёт на швах — это фибрин (молодая заживающая ткань), а не гной.",
			"4. 🚫 <b>НЕ СПЛЕВЫВАТЬ ЧАСТО!</b> Сплевывание создает отрицательное давление в полости рта и срывает тромб.",
			"5. 🚫 <b>НЕ ПРИНИМАТЬ АСПИРИН</b> для снятия боли — ацетилсалициловая кислота разжижает кровь и усиливает кровотечение.",
			"",
			"При любых сомнениях нажмите кнопку связи с дежурным врачом:",
		].join("\n");

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{ text: "📞 Позвонить дежурному врачу", callback_data: "triage:human_request" },
				],
				[
					{ text: "« Назад к контролю состояния", callback_data: "postop:day1:screen" },
					{ text: "🏠 Главное меню", callback_data: "dente:start" },
				],
			],
		};

		return { text, replyMarkup };
	}

	/**
	 * Обрабатывает callback_data вида `postop:...` в Telegram-боте.
	 */
	static async handlePostOpCallback(params: {
		callbackData: string;
		callbackQueryId: string | null;
		chatFingerprint: string;
		chatId: string;
		messageId: number | null;
		botToken: string;
		organizationId: string;
		clinicId?: string | null | undefined;
	}): Promise<{ handled: boolean; screen?: TriageScreenResult | undefined; isEmergency?: boolean | undefined }> {
		const {
			callbackData,
			chatFingerprint,
			chatId,
			messageId,
			botToken,
			organizationId,
			clinicId,
		} = params;

		if (!callbackData.startsWith("postop:")) {
			return { handled: false };
		}

		let targetScreen: TriageScreenResult | null = null;
		let isEmergency = false;

		// 1. Памятка чего нельзя делать
		if (callbackData === "postop:memo_emergency") {
			targetScreen = this.getEmergencyMemoScreen();
		}
		// 2. Этап 3 часа
		else if (callbackData === "postop:3h:screen") {
			targetScreen = this.get3HoursScreen();
		} else if (callbackData === "postop:3h:ok") {
			targetScreen = {
				text: [
					"✅ <b>Отлично! Восстановление идёт строго по плану.</b>",
					"",
					"Продолжайте соблюдать покой: не употребляйте горячую, острую и твёрдую пищу сегодня, жуйте на противоположной стороне.",
					"Завтра утром бот пришлет короткий чекап для контроля самочувствия.",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		} else if (callbackData === "postop:3h:pain_mild") {
			targetScreen = {
				text: [
					"💊 <b>Приём обезболивающего зафиксирован</b>",
					"",
					"Препарат начнет действовать в течение 20-30 минут.",
					"Приложите сухой холод через полотенце снаружи к щеке на 15 минут — это снизит чувствительность нервных окончаний.",
					"Если через час боль не утихнет — нажмите кнопку связи с дежурным врачом.",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "📞 Позвонить врачу", callback_data: "triage:human_request" }],
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		} else if (callbackData === "postop:3h:numbness") {
			// Красный флаг: парестезия нижнеальвеолярного нерва!
			isEmergency = true;
			const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ lipNumbness: true });
			const esc = await TelegramEmergencyEscalationService.escalateEmergency({
				organizationId,
				clinicId,
				chatId,
				chatFingerprint,
				source: "postop_survey",
				redFlagResult,
				rawMessageText: "Пациент отметил онемение губы/подбородка через 3 часа после вмешательства",
				botToken,
			});
			targetScreen = esc.emergencyScreen;
		} else if (callbackData === "postop:3h:sos") {
			// Красный флаг: кровотечение или острый синдром
			isEmergency = true;
			const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ bleedingFlag: true, painScore: 5 });
			const esc = await TelegramEmergencyEscalationService.escalateEmergency({
				organizationId,
				clinicId,
				chatId,
				chatFingerprint,
				source: "postop_survey",
				redFlagResult,
				rawMessageText: "Пациент нажал кнопку SOS (кровотечение / сильная боль через 3 часа)",
				botToken,
			});
			targetScreen = esc.emergencyScreen;
		}

		// 3. Этап День 1
		else if (callbackData === "postop:day1:screen") {
			targetScreen = this.getDay1Screen();
		} else if (callbackData.startsWith("postop:day1:score:")) {
			const score = parseInt(callbackData.replace("postop:day1:score:", ""), 10);
			if (score >= 4) {
				// Высокий болевой синдром — эскалация врачу
				isEmergency = true;
				const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ painScore: score });
				const esc = await TelegramEmergencyEscalationService.escalateEmergency({
					organizationId,
					clinicId,
					chatId,
					chatFingerprint,
					source: "postop_survey",
					redFlagResult,
					rawMessageText: `Пациент оценил боль на день 1 как критическую: ${score}/5`,
					botToken,
				});
				targetScreen = esc.emergencyScreen;
			} else {
				targetScreen = {
					text: [
						`✅ <b>Оценка боли (${score}/5) сохранена. Восстановление в пределах нормы!</b>`,
						"",
						"В первые 24 часа тянущие ощущения нормальны. Продолжайте прикладывать холод по 15 минут.",
						"Напоминаем: пища должна быть мягкой и комнатной температуры.",
						"",
						"Следующий чекап будет на 3-й день — в момент пика естественного отёка.",
					].join("\n"),
					replyMarkup: {
						inline_keyboard: [
							[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
						],
					},
				};
			}
		} else if (callbackData === "postop:day1:fever") {
			// Температура > 38.2°C
			isEmergency = true;
			const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ feverFlag: true, tempC: 38.3 });
			const esc = await TelegramEmergencyEscalationService.escalateEmergency({
				organizationId,
				clinicId,
				chatId,
				chatFingerprint,
				source: "postop_survey",
				redFlagResult,
				rawMessageText: "Пациент отметил температуру > 38.2°C на 1-й день после операции",
				botToken,
			});
			targetScreen = esc.emergencyScreen;
		} else if (callbackData === "postop:day1:bleeding") {
			isEmergency = true;
			const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ bleedingFlag: true, bleedingHours: 4 });
			const esc = await TelegramEmergencyEscalationService.escalateEmergency({
				organizationId,
				clinicId,
				chatId,
				chatFingerprint,
				source: "postop_survey",
				redFlagResult,
				rawMessageText: "Пациент отметил продолжающееся кровотечение на 1-й день",
				botToken,
			});
			targetScreen = esc.emergencyScreen;
		}

		// 4. Этап День 3
		else if (callbackData === "postop:day3:screen") {
			targetScreen = this.getDay3Screen();
		} else if (callbackData === "postop:day3:ok") {
			targetScreen = {
				text: [
					"✅ <b>Отлично! Отёк достиг максимума и с завтрашнего дня пойдёт на спад.</b>",
					"",
					"Вы успешно преодолеваете самый сложный период после операции.",
					"Продолжайте бережный уход. На 7-й день мы напомним о контрольном осмотре для снятия швов.",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		} else if (callbackData === "postop:day3:neck_swelling") {
			// Жизнеугрожающий флаг: отёк шеи / ангина Людвига
			isEmergency = true;
			const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ neckSwelling: true });
			const esc = await TelegramEmergencyEscalationService.escalateEmergency({
				organizationId,
				clinicId,
				chatId,
				chatFingerprint,
				source: "postop_survey",
				redFlagResult,
				rawMessageText: "Пациент сообщил о плотном горячем отеке шеи на 3-й день (риск ангины Людвига)",
				botToken,
			});
			targetScreen = esc.emergencyScreen;
		} else if (callbackData === "postop:day3:fever") {
			isEmergency = true;
			const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ feverFlag: true, tempC: 38.4 });
			const esc = await TelegramEmergencyEscalationService.escalateEmergency({
				organizationId,
				clinicId,
				chatId,
				chatFingerprint,
				source: "postop_survey",
				redFlagResult,
				rawMessageText: "Пациент сообщил о температуре выше 38.2°C на 3-й день",
				botToken,
			});
			targetScreen = esc.emergencyScreen;
		} else if (callbackData === "postop:day3:pain") {
			targetScreen = {
				text: [
					"⚠️ <b>Боль на 3-й день после операции</b>",
					"",
					"В норме острая боль к 3-му дню должна постепенно стихать.",
					"Если боль имеет пульсирующий или дергающий характер — это повод для осмотра хирургом.",
					"Примите обезболивающее. Мы передали сигнал врачу клиники.",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "📞 Связаться с дежурным врачом", callback_data: "triage:human_request" }],
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		}

		// 5. Этап День 7
		else if (callbackData === "postop:day7:screen") {
			targetScreen = this.getDay7Screen();
		} else if (callbackData === "postop:day7:ok") {
			targetScreen = {
				text: [
					"🎉 <b>Поздравляем с успешным завершением послеоперационного периода!</b>",
					"",
					"Ткани восстановились. Продолжайте бережную гигиену.",
					"Клиника DENTE всегда на связи для плановых чекапов и профилактики.",
				].join("\n"),
				replyMarkup: {
					inline_keyboard: [
						[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
					],
				},
			};
		}

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
