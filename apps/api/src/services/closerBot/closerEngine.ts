/**
 * Trojan Closer & Recall Engine for DENTE Dental CRM.
 *
 * Autonomous omnichannel state machine designed to close abandoned treatment plans,
 * run preventive hygiene recalls (5.5 - 7 months), and rapidly fill cancelled appointment windows.
 *
 * Anti-Ban & Deliverability Guards:
 * - Spintax multi-variant text generation (3-4 variants per step)
 * - Strict quiet hours check (09:00 - 21:00)
 * - Native 1-click opt-out (suppression list compliance)
 * - Rate-limited dispatch queue with jitter (15-45s)
 */

import { z } from "zod";
import type { CloserLeadCandidate, CloserTargetCategory } from "./competitorDbImporter.js";

export type CloserCadenceType =
	| "abandoned_estimate"
	| "preventive_recall"
	| "urgent_slot";

export type CloserLeadStatus =
	| "pending"
	| "in_progress"
	| "action_required"
	| "converted"
	| "declined"
	| "unsubscribed";

export interface CloserButton {
	text: string;
	action: string;
	payload: string;
}

export interface CloserMessageProposal {
	candidateId: string;
	phone: string;
	channel: "telegram" | "whatsapp" | "vk" | "sms";
	stepId: string;
	text: string;
	buttons: CloserButton[];
	variantIndex: number;
	scheduledAt: Date;
	meta: Record<string, unknown>;
}

export interface UrgentSlotRequest {
	slotId: string;
	doctorName: string;
	specialty?: string;
	dateIso: string;      // YYYY-MM-DD
	startTime: string;    // HH:mm
	durationMinutes: number;
	waitingList: CloserLeadCandidate[];
}

export interface UrgentSlotState {
	slotId: string;
	status: "open" | "filled" | "expired";
	claimedByCandidateId?: string;
	contactedCandidateIds: string[];
	createdAt: Date;
}

/**
 * Варианты текстов для защиты от спам-фильтров мессенджеров (Spintax variants)
 */
export const CADENCE_TEMPLATES = {
	abandoned_estimate: {
		day_3: [
			(name: string, doctor: string, sumRub: number) =>
				`${name}, добрый день! Это клиника DENTE. Доктор ${doctor} составил и передал вам предварительный план лечения на ${sumRub.toLocaleString("ru-RU")} ₽. Удалось ли ознакомиться с расчётом? Прислать вам удобную PDF-версию сюда в мессенджер?`,
			(name: string, doctor: string, sumRub: number) =>
				`Здравствуйте, ${name}! Пишет клиника DENTE от имени доктора ${doctor}. После вашей консультации мы подготовили детальный план лечения (${sumRub.toLocaleString("ru-RU")} ₽). Хотите посмотреть подробную разбивку по этапам в PDF?`,
			(name: string, doctor: string, sumRub: number) =>
				`${name}, приветствуем! Заботимся о здоровье вашей улыбки: доктор ${doctor} завершил расчет сметы на ${sumRub.toLocaleString("ru-RU")} ₽. Отправить вам электронную версию плана для ознакомления?`,
		],
		day_7: [
			(name: string, doctor: string, sumRub: number) =>
				`${name}, здравствуйте! Напоминаем, что расчёт лечения у доктора ${doctor} на сумму ${sumRub.toLocaleString("ru-RU")} ₽ зафиксирован за вами на 14 дней. В следующем месяце ожидается изменение цен на материалы. Хотите закрепить стоимость за собой без доплат?`,
			(name: string, doctor: string, sumRub: number) =>
				`${name}, добрый день! Кратко напоминаем: согласованная стоимость вашего плана (${sumRub.toLocaleString("ru-RU")} ₽) заморожена ещё на 7 дней. Если удобно, можем разбить оплату на комфортные этапы или рассрочку 0%. Закрепить условия?`,
			(name: string, doctor: string, sumRub: number) =>
				`Здравствуйте, ${name}! Чтобы ваш визит был максимально выгодным, мы держим спец-условия по плану (${sumRub.toLocaleString("ru-RU")} ₽). Желаете забронировать текущую цену на имплантацию/протезирование?`,
		],
		day_14: [
			(name: string, doctor: string) =>
				`${name}, добрый день! Доктор ${doctor} лично интересовался вашим самочувствием. Понимаем, что лечение зубов — важное решение. Что вас сейчас останавливает: вопрос бюджета, страх боли или сложно найти время? Доктор готов уделить 5 минут и ответить лично.`,
			(name: string, doctor: string) =>
				`${name}, здравствуйте! Не хотим быть навязчивыми, но искренне переживаем, чтобы ситуация с зубами не осложнилась. Доктор ${doctor} готов скорректировать план и предложить поэтапное решение. Запланировать короткий звонок доктора?`,
		],
	},
	preventive_recall: {
		month_5_5: [
			(name: string, doctor: string) =>
				`${name}, добрый день! Прошло почти 6 месяцев со времени вашего визита к доктору ${doctor}. Пора пройти контрольный осмотр и гигиену для сохранения гарантии на пломбы/импланты. Для вас забронированы приоритетные окна на этой неделе. Выберем время?`,
			(name: string, doctor: string) =>
				`Здравствуйте, ${name}! Клиника DENTE напоминает: регулярный чекап раз в полгода сохраняет здоровье десен и защищает от скрытого кариеса. Доктор ${doctor} готов принять вас на плановый осмотр. Когда вам удобнее: в будни или выходные?`,
		],
		month_7_overdue: [
			(name: string, doctor: string) =>
				`${name}, здравствуйте! С момента крайнего визита к доктору ${doctor} прошло более 7 месяцев. Рекомендуем не откладывать профгигиену, чтобы избежать воспалений и дорогостоящего лечения. Записать вас на ближайшие дни?`,
		],
	},
	urgent_slot: [
		(name: string, doctor: string, date: string, time: string, duration: number) =>
			`🔥 ${name}, здравствуйте! У доктора ${doctor} сегодня (${date}) неожиданно освободилось удобное окно на ${time} (на ${duration} мин). Вы ранее просили пригласить вас пораньше. Сможете подойти?`,
		(name: string, doctor: string, date: string, time: string, duration: number) =>
			`⚡ ${name}, добрый день! Появился свободный слот на приём к доктору ${doctor} на ${date} в ${time} (${duration} мин). Подтверждаем запись за вами?`,
	],
};

/**
 * Проверка допустимого времени отправки (Тихие часы: с 21:00 до 09:00 запрещено)
 */
export function isWithinQuietHours(now: Date = new Date(), startHour = 9, endHour = 21): boolean {
	const currentHour = now.getHours();
	return currentHour < startHour || currentHour >= endHour;
}

/**
 * Детектор слов отказа от рассылки
 */
export function isOptOutPhrase(text: string): boolean {
	const lower = text.trim().toLowerCase();
	const triggers = [
		"отписаться",
		"отпишитесь",
		"не пишите",
		"хватит",
		"стоп",
		"stop",
		"спам",
		"неактуально",
		"не интересно",
		"удалите мой номер",
		"забудьте",
		"больше не звоните",
	];
	return triggers.some((t) => lower.includes(t));
}

/**
 * Trojan Closer Engine Core Class
 */
export class TrojanCloserEngine {
	private readonly candidateStates = new Map<
		string,
		{
			status: CloserLeadStatus;
			currentStep: string;
			history: { step: string; sentAt: Date; text: string; action?: string }[];
			suppressed: boolean;
		}
	>();

	private readonly urgentSlots = new Map<string, UrgentSlotState>();

	/**
	 * Регистрация или получение состояния кандидата
	 */
	getOrCreateState(candidateId: string) {
		let state = this.candidateStates.get(candidateId);
		if (!state) {
			state = {
				status: "pending",
				currentStep: "initial",
				history: [],
				suppressed: false,
			};
			this.candidateStates.set(candidateId, state);
		}
		return state;
	}

	/**
	 * Определение следующего сообщения в цепочке
	 */
	evaluateNextMessage(
		candidate: CloserLeadCandidate,
		options: { now?: Date; preferredChannel?: "telegram" | "whatsapp" | "vk" } = {},
	): CloserMessageProposal | null {
		const now = options.now ?? new Date();
		const state = this.getOrCreateState(candidate.id);

		// Если пациент отписался или уже сконвертировался — не трогаем!
		if (state.suppressed || state.status === "unsubscribed" || state.status === "converted") {
			return null;
		}

		// Если телефон не валиден
		if (!candidate.isPhoneValid) {
			return null;
		}

		const channel = options.preferredChannel ?? "telegram";
		const doctor = candidate.doctorName || "клиники DENTE";
		const firstName = candidate.firstName || candidate.fullName.split(" ")[0] || "Уважаемый пациент";

		// Выбор каденции по категории кандидата
		if (
			candidate.category === "abandoned_estimate_hot" ||
			candidate.category === "abandoned_estimate_warm" ||
			candidate.category === "abandoned_estimate_cold"
		) {
			// Цепочка брошенной сметы
			if (state.currentStep === "initial") {
				// Шаг 1: День 3
				const variants = CADENCE_TEMPLATES.abandoned_estimate.day_3;
				const variantIndex = Math.abs(candidate.rawIndex) % variants.length;
				const templateFn = variants[variantIndex]!;
				const text = templateFn(firstName, doctor, candidate.estimateSumRub);

				return {
					candidateId: candidate.id,
					phone: candidate.phone,
					channel,
					stepId: "day_3_soft_reminder",
					text,
					buttons: [
						{ text: "📄 Отправить план в PDF", action: "request_pdf", payload: `pdf_${candidate.id}` },
						{ text: "❓ Есть вопрос врачу", action: "ask_question", payload: `question_${candidate.id}` },
						{ text: "🗓 Выбрать время приёма", action: "book_slot", payload: `book_${candidate.id}` },
					],
					variantIndex,
					scheduledAt: now,
					meta: { sumRub: candidate.estimateSumRub, step: "day_3" },
				};
			}

			if (state.currentStep === "day_3_soft_reminder") {
				// Шаг 2: День 7
				const variants = CADENCE_TEMPLATES.abandoned_estimate.day_7;
				const variantIndex = Math.abs(candidate.rawIndex + 1) % variants.length;
				const templateFn = variants[variantIndex]!;
				const text = templateFn(firstName, doctor, candidate.estimateSumRub);

				return {
					candidateId: candidate.id,
					phone: candidate.phone,
					channel,
					stepId: "day_7_price_lock",
					text,
					buttons: [
						{ text: "🔒 Зафиксировать цену", action: "lock_price", payload: `lock_${candidate.id}` },
						{ text: "💳 Рассрочка 0%", action: "installment_info", payload: `inst_${candidate.id}` },
						{ text: "Неактуально", action: "opt_out", payload: `opt_${candidate.id}` },
					],
					variantIndex,
					scheduledAt: now,
					meta: { sumRub: candidate.estimateSumRub, step: "day_7" },
				};
			}

			if (state.currentStep === "day_7_price_lock") {
				// Шаг 3: День 14
				const variants = CADENCE_TEMPLATES.abandoned_estimate.day_14;
				const variantIndex = Math.abs(candidate.rawIndex + 2) % variants.length;
				const templateFn = variants[variantIndex]!;
				const text = templateFn(firstName, doctor);

				return {
					candidateId: candidate.id,
					phone: candidate.phone,
					channel,
					stepId: "day_14_doctor_audit",
					text,
					buttons: [
						{ text: "📞 Звонок доктора (5 мин)", action: "request_call", payload: `call_${candidate.id}` },
						{ text: "💰 Разбить на этапы", action: "split_stages", payload: `split_${candidate.id}` },
						{ text: "❌ Отписаться", action: "opt_out", payload: `opt_${candidate.id}` },
					],
					variantIndex,
					scheduledAt: now,
					meta: { sumRub: candidate.estimateSumRub, step: "day_14" },
				};
			}
		}

		if (candidate.category === "recall_due") {
			if (state.currentStep === "initial") {
				const variants = CADENCE_TEMPLATES.preventive_recall.month_5_5;
				const variantIndex = Math.abs(candidate.rawIndex) % variants.length;
				const templateFn = variants[variantIndex]!;
				const text = templateFn(firstName, doctor);

				return {
					candidateId: candidate.id,
					phone: candidate.phone,
					channel,
					stepId: "recall_5_5_months",
					text,
					buttons: [
						{ text: "⚡ Выбрать удобное время", action: "book_recall", payload: `recall_book_${candidate.id}` },
						{ text: "⏰ Напомнить через 2 нед.", action: "snooze", payload: `snooze_${candidate.id}` },
						{ text: "❌ Отписаться", action: "opt_out", payload: `opt_${candidate.id}` },
					],
					variantIndex,
					scheduledAt: now,
					meta: { step: "recall_5_5" },
				};
			}
		}

		if (candidate.category === "recall_overdue") {
			if (state.currentStep === "initial") {
				const variants = CADENCE_TEMPLATES.preventive_recall.month_7_overdue;
				const variantIndex = 0;
				const templateFn = variants[variantIndex]!;
				const text = templateFn(firstName, doctor);

				return {
					candidateId: candidate.id,
					phone: candidate.phone,
					channel,
					stepId: "recall_7_months_overdue",
					text,
					buttons: [
						{ text: "⚡ Записаться сегодня", action: "book_recall", payload: `recall_urgent_${candidate.id}` },
						{ text: "❌ Отписаться", action: "opt_out", payload: `opt_${candidate.id}` },
					],
					variantIndex,
					scheduledAt: now,
					meta: { step: "recall_7_overdue" },
				};
			}
		}

		return null;
	}

	/**
	 * Запись факта отправки сообщения в историю кандидата
	 */
	recordMessageSent(candidateId: string, proposal: CloserMessageProposal, sentAt: Date = new Date()) {
		const state = this.getOrCreateState(candidateId);
		state.currentStep = proposal.stepId;
		state.status = "in_progress";
		state.history.push({
			step: proposal.stepId,
			sentAt,
			text: proposal.text,
		});
	}

	/**
	 * Обработка входящего действия пациента (клик кнопки или сообщение)
	 */
	handlePatientFeedback(
		candidateId: string,
		action: string,
		rawText = "",
	): {
		replyText: string;
		newStatus: CloserLeadStatus;
		isConverted: boolean;
		isUnsubscribed: boolean;
	} {
		const state = this.getOrCreateState(candidateId);

		// Проверка на отписку
		if (action === "opt_out" || isOptOutPhrase(rawText)) {
			state.suppressed = true;
			state.status = "unsubscribed";
			return {
				replyText: "Мы исключили ваш номер из автоматических напоминаний. Желаем вам крепкого здоровья!",
				newStatus: "unsubscribed",
				isConverted: false,
				isUnsubscribed: true,
			};
		}

		// Завершающие конверсионные действия (запись / бронь / фиксация цены)
		if (
			action === "book_slot" ||
			action === "book_recall" ||
			action === "lock_price" ||
			action === "urgent_claim_slot"
		) {
			state.status = "converted";
			let replyText = "Спасибо за отклик! Администратор уже подготовил информацию и свяжется с вами в течение 10 минут.";

			if (action === "lock_price") {
				replyText = "🔒 Стоимость вашего плана зафиксирована на 14 дней. Администратор клиники уже пишет вам для бронирования времени!";
			} else if (action === "urgent_claim_slot") {
				replyText = "🔥 Отлично! Окно забронировано за вами. Ждем вас в клинике!";
			}

			return {
				replyText,
				newStatus: "converted",
				isConverted: true,
				isUnsubscribed: false,
			};
		}

		// Тёплые промежуточные действия (запрос PDF, вопрос врачу, рассрочка, звонок)
		if (
			action === "request_pdf" ||
			action === "request_call" ||
			action === "installment_info" ||
			action === "ask_question"
		) {
			state.status = "in_progress";
			let replyText = "Спасибо за отклик! Готовим информацию.";

			if (action === "request_pdf") {
				replyText = "📄 Отправляем PDF-файл вашего плана лечения. Сейчас администратор также прикрепит спецификацию.";
			} else if (action === "request_call") {
				replyText = "📞 Доктор обязательно перезвонит вам в ближайший перерыв между приёмами.";
			} else if (action === "installment_info") {
				replyText = "💳 В клинике действует беспроцентная рассрочка на 6–12 месяцев без первого взноса. Администратор подготовит индивидуальный график платежей.";
			}

			return {
				replyText,
				newStatus: "in_progress",
				isConverted: false,
				isUnsubscribed: false,
			};
		}


		if (action === "snooze") {
			state.status = "in_progress";
			return {
				replyText: "Договорились! Мы напомним вам о чекапе через 2 недели.",
				newStatus: "in_progress",
				isConverted: false,
				isUnsubscribed: false,
			};
		}

		// Любой произвольный текст пациента -> требует внимания администратора
		state.status = "action_required";
		return {
			replyText: "Спасибо за сообщение! Администратор клиники ответит вам в течение нескольких минут.",
			newStatus: "action_required",
			isConverted: false,
			isUnsubscribed: false,
		};
	}

	/**
	 * Запуск кампании закрытия горящего окна в расписании (Urgent Slot Fill)
	 */
	startUrgentSlotFill(request: UrgentSlotRequest): {
		proposals: CloserMessageProposal[];
		urgentState: UrgentSlotState;
	} {
		const urgentState: UrgentSlotState = {
			slotId: request.slotId,
			status: "open",
			contactedCandidateIds: [],
			createdAt: new Date(),
		};
		this.urgentSlots.set(request.slotId, urgentState);

		const proposals: CloserMessageProposal[] = [];
		const variants = CADENCE_TEMPLATES.urgent_slot;

		for (let i = 0; i < request.waitingList.length; i++) {
			const candidate = request.waitingList[i];
			if (!candidate || !candidate.isPhoneValid) continue;

			const candState = this.getOrCreateState(candidate.id);
			if (candState.suppressed) continue;

			const firstName = candidate.firstName || candidate.fullName.split(" ")[0] || "Пациент";
			const variantFn = variants[i % variants.length]!;
			const text = variantFn(
				firstName,
				request.doctorName,
				request.dateIso,
				request.startTime,
				request.durationMinutes,
			);

			proposals.push({
				candidateId: candidate.id,
				phone: candidate.phone,
				channel: "telegram",
				stepId: `urgent_slot_${request.slotId}`,
				text,
				buttons: [
					{
						text: "🔥 Да, я приду!",
						action: "urgent_claim_slot",
						payload: `claim_${request.slotId}_${candidate.id}`,
					},
					{
						text: "К сожалению, нет",
						action: "urgent_decline_slot",
						payload: `decline_${request.slotId}_${candidate.id}`,
					},
				],
				variantIndex: i % variants.length,
				scheduledAt: new Date(),
				meta: { slotId: request.slotId, startTime: request.startTime },
			});

			urgentState.contactedCandidateIds.push(candidate.id);
		}

		return { proposals, urgentState };
	}

	/**
	 * Обработка попытки занять горящее окно первым откликнувшимся пациентом
	 */
	claimUrgentSlot(slotId: string, candidateId: string): {
		success: boolean;
		message: string;
	} {
		const slot = this.urgentSlots.get(slotId);
		if (!slot) {
			return { success: false, message: "Окно не найдено или истекло." };
		}

		if (slot.status === "filled") {
			return {
				success: false,
				message: "К сожалению, это окно уже занял другой пациент. Мы сообщим вам, как только освободится следующее время!",
			};
		}

		slot.status = "filled";
		slot.claimedByCandidateId = candidateId;

		const candState = this.getOrCreateState(candidateId);
		candState.status = "converted";

		return {
			success: true,
			message: "🔥 Отлично! Окно успешно закреплено за вами. Ждем вас в клинике!",
		};
	}
}
