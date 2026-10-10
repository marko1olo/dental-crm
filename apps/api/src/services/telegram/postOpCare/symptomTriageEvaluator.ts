/**
 * symptomTriageEvaluator.ts
 *
 * Маршрутизатор симптомов, триаж красных флагов и эскалация хирургических осложнений
 * для пайплайна послеоперационного теле-мониторинга DENTE.
 */

import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	communicationTasks,
	denteTelegramChatLinks,
} from "../../../db/schema.js";
import {
	TelegramEmergencyEscalationService,
} from "../TelegramEmergencyEscalationService.js";
import type { TriageScreenResult } from "../TelegramInteractiveTriageService.js";
import {
	TelegramRedFlagDetector,
} from "../TelegramRedFlagDetector.js";
import {
	get3HoursOkScreen,
	get3HoursPainMildScreen,
	get3HoursScreen,
	getDay1NormalScoreScreen,
	getDay1Screen,
	getDay3OkScreen,
	getDay3PainScreen,
	getDay3Screen,
	getDay7OkScreen,
	getDay7Screen,
	getEmergencyMemoScreen,
	getTherapeuticCheckupScreen,
	getTherapyHighBiteScreen,
	getTherapyOkScreen,
	getTherapyPainScreen,
} from "./careTemplates.js";
import {
	type HandlePostOpCallbackParams,
	isUuid,
	type SymptomTriageEvaluationResult,
} from "./types.js";

export type ScreenResolvers = {
	get3HoursScreen?: (surgeryTitle?: string) => TriageScreenResult;
	getDay1Screen?: (surgeryTitle?: string) => TriageScreenResult;
	getDay3Screen?: (surgeryTitle?: string) => TriageScreenResult;
	getDay7Screen?: (surgeryTitle?: string) => TriageScreenResult;
	getEmergencyMemoScreen?: () => TriageScreenResult;
	getTherapeuticCheckupScreen?: () => TriageScreenResult;
};

/**
 * Оценивает callback-запрос послеоперационного опроса:
 * распознает красные флаги, при необходимости инициирует аварийную эскалацию
 * и формирует целевой экран интерфейса.
 */
export async function evaluatePostOpSymptomCallback(
	params: HandlePostOpCallbackParams,
	resolvers?: ScreenResolvers,
): Promise<SymptomTriageEvaluationResult> {
	const {
		callbackData,
		chatFingerprint,
		chatId,
		botToken,
		organizationId,
		clinicId,
	} = params;

	if (!callbackData.startsWith("postop:")) {
		return { targetScreen: null, isEmergency: false };
	}

	const resolve3Hours = resolvers?.get3HoursScreen ?? get3HoursScreen;
	const resolveDay1 = resolvers?.getDay1Screen ?? getDay1Screen;
	const resolveDay3 = resolvers?.getDay3Screen ?? getDay3Screen;
	const resolveDay7 = resolvers?.getDay7Screen ?? getDay7Screen;
	const resolveMemo = resolvers?.getEmergencyMemoScreen ?? getEmergencyMemoScreen;
	const resolveTherapy = resolvers?.getTherapeuticCheckupScreen ?? getTherapeuticCheckupScreen;

	let targetScreen: TriageScreenResult | null = null;
	let isEmergency = false;

	// 0. Терапевтический опрос через 24 часа
	if (callbackData === "postop:therapy:screen") {
		targetScreen = resolveTherapy();
	} else if (callbackData === "postop:therapy:ok") {
		targetScreen = getTherapyOkScreen();
	} else if (callbackData === "postop:therapy:high_bite") {
		if (organizationId && isUuid(organizationId)) {
			void withTenantCtx(organizationId, async (tx) => {
				const [link] = await tx
					.select({ subjectId: denteTelegramChatLinks.subjectId })
					.from(denteTelegramChatLinks)
					.where(
						and(
							eq(denteTelegramChatLinks.organizationId, organizationId),
							eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
							eq(denteTelegramChatLinks.subjectType, "patient"),
						),
					)
					.limit(1);

				if (link?.subjectId && isUuid(link.subjectId)) {
					const validClinicId = isUuid(clinicId) ? clinicId : null;
					await tx.insert(communicationTasks).values({
						organizationId,
						clinicId: validClinicId,
						patientId: link.subjectId,
						assignedRole: "reception",
						channel: "telegram" as const,
						intent: "general" as const,
						status: "queued" as const,
						priority: "high" as const,
						dueAt: new Date(),
						title: "⚠️ Завышение пломбы по прикусу (требуется коррекция)",
						body: "Пациент сообщил в 24ч опросе о завышении пломбы при накусывании. Требуется связаться и записать на бесплатную коррекцию прикуса.",
						workflowCode: "HIGH_BITE_ADJUSTMENT",
					});
				}
			}).catch(() => {});
		}

		targetScreen = getTherapyHighBiteScreen();
	} else if (callbackData === "postop:therapy:pain") {
		if (organizationId && isUuid(organizationId)) {
			void withTenantCtx(organizationId, async (tx) => {
				const [link] = await tx
					.select({ subjectId: denteTelegramChatLinks.subjectId })
					.from(denteTelegramChatLinks)
					.where(
						and(
							eq(denteTelegramChatLinks.organizationId, organizationId),
							eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
							eq(denteTelegramChatLinks.subjectType, "patient"),
						),
					)
					.limit(1);

				if (link?.subjectId && isUuid(link.subjectId)) {
					const validClinicId = isUuid(clinicId) ? clinicId : null;
					await tx.insert(communicationTasks).values({
						organizationId,
						clinicId: validClinicId,
						patientId: link.subjectId,
						assignedRole: "head_doctor",
						channel: "telegram" as const,
						intent: "general" as const,
						status: "queued" as const,
						priority: "high" as const,
						dueAt: new Date(),
						title: "💊 Жалоба на боль/чувствительность после лечения",
						body: "Пациент сообщил в 24ч опросе о сохраняющейся боли/чувствительности после терапевтического приёма.",
						workflowCode: "POST_THERAPY_PAIN_ALERT",
					});
				}
			}).catch(() => {});
		}

		targetScreen = getTherapyPainScreen();
	}
	// 1. Памятка чего нельзя делать
	else if (callbackData === "postop:memo_emergency") {
		targetScreen = resolveMemo();
	}
	// 2. Этап 3 часа
	else if (callbackData === "postop:3h:screen") {
		targetScreen = resolve3Hours();
	} else if (callbackData === "postop:3h:ok") {
		targetScreen = get3HoursOkScreen();
	} else if (callbackData === "postop:3h:pain_mild") {
		targetScreen = get3HoursPainMildScreen();
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
		targetScreen = resolveDay1();
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
			targetScreen = getDay1NormalScoreScreen(score);
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
		targetScreen = resolveDay3();
	} else if (callbackData === "postop:day3:ok") {
		targetScreen = getDay3OkScreen();
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
		targetScreen = getDay3PainScreen();
	}
	// 5. Этап День 7
	else if (callbackData === "postop:day7:screen") {
		targetScreen = resolveDay7();
	} else if (callbackData === "postop:day7:ok") {
		targetScreen = getDay7OkScreen();
	}

	return { targetScreen, isEmergency };
}
