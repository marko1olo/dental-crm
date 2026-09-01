/**
 * whatsappBridge.ts — Omnichannel WhatsApp Bridge, Clinical Triage & Proactive Alert Engine.
 *
 * Implements:
 * 1. Webhook / Messenger Inbound Ingestor for WhatsApp, Telegram, SMS.
 * 2. Clinical Triage Analyzer: Classifies urgency (NORMAL, URGENT, CRITICAL),
 *    symptom categories (acute pain, facial/gum swelling, fever 38+, heavy bleeding, trauma),
 *    sentiment, and intent.
 * 3. Emergency Dispatcher: On CRITICAL urgency, immediately generates high-priority
 *    red proactive alert cards for on-duty doctors/administrators and broadcasts to active
 *    Copilot SSE streams and WebSocket broker.
 * 4. Human-in-the-Loop (HitL) Queue: Manages draft outbound messages (patient retention,
 *    ZTL status, reminders, gap fillers, EMR drafts) for 1-click staff approval.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	communicationTasks,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import {
	normalizeWhatsappRecipient,
	sendWhatsappTextMessage,
} from "../../whatsappTransport.js";
import { wsBroker } from "../websocketBroker.js";
import {
	type CopilotStreamManager,
	defaultCopilotStreamManager,
} from "./copilotService.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TriageUrgency = "NORMAL" | "URGENT" | "CRITICAL";

export type PatientSentiment =
	| "positive"
	| "neutral"
	| "negative"
	| "anxious"
	| "emergency";

export type TriageIntent =
	| "emergency"
	| "symptom_report"
	| "booking_request"
	| "cancellation_request"
	| "reschedule_request"
	| "ztl_inquiry"
	| "price_inquiry"
	| "general_inquiry"
	| "feedback";

export type ProactiveCardCategory =
	| "whatsapp_emergency"
	| "ztl_status"
	| "retention"
	| "gap_filler"
	| "emr_draft"
	| "clinical_alert"
	| "general_message";

export interface TriageAnalysisResult {
	readonly urgency: TriageUrgency;
	readonly sentiment: PatientSentiment;
	readonly intent: TriageIntent;
	readonly confidence: number;
	readonly matchedKeywords: string[];
	readonly clinicalSummary: string;
	readonly suggestedAction: string;
	readonly recommendedDoctorRole?: string | undefined;
	readonly requiresImmediateCall: boolean;
	readonly requiresImmediateIntervention: boolean;
	readonly detectedSymptoms: string[];
	readonly recommendedAction: string;
	readonly reasoning: string;
	readonly painLevelEstimate?: number | undefined; // 0-10 scale
}

export interface InboundWhatsAppMessage {
	readonly messageId: string;
	readonly organizationId: string;
	readonly patientPhone: string;
	readonly patientName?: string | null | undefined;
	readonly text: string;
	readonly timestamp?: string | undefined;
}

export interface IncomingWhatsAppMessage {
	readonly messageId: string;
	readonly fromPhone: string;
	readonly rawText: string;
	readonly timestamp?: Date | string | number | undefined;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly organizationId: string;
	readonly clinicId?: string | null | undefined;
	readonly mediaUrls?: string[] | undefined;
	readonly buttonPayload?: string | null | undefined;
	readonly context?:
		| {
				readonly activeDoctor?: string | null | undefined;
				readonly recentDiagnoses?: string[] | undefined;
				readonly recentTreatment?: string | null | undefined;
				readonly lastVisitDate?: string | null | undefined;
		  }
		| undefined;
}

export interface ProactiveAlertAction {
	readonly id: string;
	readonly label: string;
	readonly kind: "primary" | "secondary" | "danger";
	readonly prompt?: string | undefined;
	readonly actionType?: string | undefined;
	readonly payload?: Record<string, unknown> | undefined;
}

export interface ProactiveAlertCardData {
	readonly id: string;
	readonly urgency: TriageUrgency;
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly description: string;
	readonly timestamp: string;
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly category: ProactiveCardCategory;
	readonly actions: ProactiveAlertAction[];
	readonly data?: Record<string, unknown> | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
}

export interface WhatsAppApprovalCardData {
	readonly approvalId: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly phone: string;
	readonly intent: string;
	readonly urgency: TriageUrgency;
	readonly incomingSnippet: string;
	readonly draftReply: string;
	readonly proposedReply?: string | undefined;
	readonly channel: "whatsapp" | "telegram" | "sms";
	readonly confidenceScore: number;
	readonly actionPrompt?: string | undefined;
	readonly createdAt: string;
	status: "pending" | "approved" | "rejected" | "sent";
	readonly category?: string | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
	/** Meta WABA 24-hour service window policy compliance */
	readonly isWithin24HourWindow?: boolean | undefined;
	readonly templateRequired?: boolean | undefined;
}

export interface ZtlAlertCardData {
	readonly orderId: string;
	readonly orderNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly labName: string;
	readonly prosthesisType: string;
	readonly tooth?: string | number;
	readonly status: "in_transit" | "ready" | "delayed" | "quality_check";
	readonly etaDate?: string;
	readonly warning?: string;
	readonly actionPrompt?: string;
}

export interface EmrDraftCardData {
	readonly draftId: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly visitDate: string;
	readonly tooth?: string | number;
	readonly diagnosis: string;
	readonly icd10?: string;
	readonly proposedDiary: string;
	readonly actionPrompt?: string;
}

export interface GapFillerPatientOption {
	readonly id: string;
	readonly name: string;
	readonly phone: string;
	readonly reason: string;
	readonly priorityScore: number;
	readonly matchScore: number;
}

export interface GapFillerCardData {
	readonly gapId: string;
	readonly doctorName: string;
	readonly cabinet?: string;
	readonly date: string;
	readonly timeRange: string;
	readonly suggestedPatients: GapFillerPatientOption[];
	readonly actionPrompt?: string;
}

export interface RetentionSamplePatient {
	readonly id: string;
	readonly name: string;
	readonly lastVisitMonthsAgo: number;
	readonly recommendedTreatment: string;
}

export interface RetentionSummaryCardData {
	readonly summaryId: string;
	readonly cohortName: string;
	readonly atRiskCount: number;
	readonly potentialRevenueRub: number;
	readonly suggestedCampaign: string;
	readonly samplePatients: RetentionSamplePatient[];
	readonly actionPrompt?: string;
}

export function sanitizePatientInput(text: string): string {
	if (!text) return "";
	return text
		.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
		.replace(
			/(?:system:|<<sys>>|\[inst\]|assistant:|user:|prompt\s*injection)/gi,
			"",
		)
		.replace(/```[\s\S]*?```/g, "")
		.replace(/<[^>]*>?/gm, "")
		.replace(/\s+/g, " ")
		.trim();
}

// ============================================================================
// CLINICAL TRIAGE ANALYZER (HYBRID SEMANTIC NEGATION & NLP RULES)
// ============================================================================

export class WhatsAppTriageAnalyzer {
	// 1. Acute / Severe Pain (Острая боль, пульсация, неэффективность анальгетиков)
	private static readonly CRITICAL_PAIN_PATTERNS = [
		/(?:остр(?:ая|ую|ой|ые|ых)?|нестерпим(?:ая|ую|ой|о)?|сильн(?:ейшая|ая|ую|ой)?|адск(?:ая|ую|ой)?|невыносим(?:ая|ую|о)?|жутк(?:ая|ую|о)?)\s+(?:бол(?:ь|и|ью)|прострел|ломот)/i,
		/(?:бол(?:ит|ят)|ломит|пульсирует|стреляет|д[её]ргает|раскалывается)\s+(?:зуб|челюст|десн|вис|ух|ноч|всю\s+ночь|дико|невыносимо)/i,
		/(?:зуб|челюсть|десна)\s+(?:болит\s+дико|раскалывается|пульсирует|стреляет|д[её]ргает)/i,
		/(?:кетанов|найз|нурофен|нимесил|анальгин|пенталгин|ибупрофен|кеторол|кетарол|дексалгин|обезбол(?:ивающее|ивающие)?)\s+(?:не\s+(?:помога(?:ет|ют)?|действу(?:ет|ют)?|снима(?:ет|ют)?|бер(?:ет|ут)?)|бесполезн)/i,
		/(?:спать|уснуть|лежать)\s+(?:не\s+мог(?:у|ла|ли)?|невозможно|всю\s+ночь\s+не\s+спал(?:а)?)/i,
		/(?:10\s*из\s*10|10\/10|9\/10|дикая\s+боль|умираю\s+от\s+боли|на\s+стенку\s+лезу)/i,
	];

	// 2. Facial / Jaw / Gum Swelling (Отек, флюс, свищ, асимметрия, тризм)
	private static readonly CRITICAL_SWELLING_PATTERNS = [
		/(?:от[её]к(?:ла|ло|ли|а)?|опух(?:ла|ло|ли|а)?|раздул(?:о|а|и)?|надул(?:о|а|и)?|припух(?:ла|ло|ли)?)\s+(?:щек(?:а|у|и)|лиц(?:о|а)|десн(?:а|у|ы)|губ(?:а|у|ы)|подбородок|глаз|ше(?:я|ю)|горл(?:о|а))/i,
		/(?:щек(?:а|у|и)|лиц(?:о|а)|десн(?:а|у|ы)|губ(?:а|у|ы)|подбородок|глаз)\s+(?:опух(?:ла|ло|ли)?|раздул(?:о|а|и)?|разнесло|надул(?:о|а|и)?|разбух(?:ла|ло|ли)?)/i,
		/(?:флюс|свищ|нарыв|гной(?:ник|ит|ится)?|абсцесс|периостит|флегмон(?:а)?|тризм|инфильтрат)/i,
		/(?:не\s+могу\s+(?:открыть|разинуть)\s+рот|челюсть\s+не\s+открывается|рот\s+трудно\s+открыть|глаз\s+(?:заплыл|закрылся|заплывает))/i,
		/(?:опухоль\s+на\s+десне|шарик\s+с\s+гноем|вытекает\s+гной|гнойные\s+выделения)/i,
	];

	// 3. High Fever (Температура 38+)
	private static readonly CRITICAL_FEVER_PATTERNS = [
		/(?:температур(?:а|у|ой)?|жар|градусник)\s*(?:38[.,][5-9]|39|40|\d{2}[.,]\d)/i,
		/(?:38[.,][5-9]|39[.,][0-9]|40[.,][0-9]|39\s*градус(?:ов|а)?|40\s*градус(?:ов|а)?)/i,
		/(?:лихорад(?:ит|ка)|тряс[её]т|сильный\s+озноб|высокая\s+температура)/i,
	];

	// 4. Heavy / Continuous Bleeding (Кровотечение, струя, не останавливается)
	private static readonly CRITICAL_BLEEDING_PATTERNS = [
		/(?:обильн(?:ое|ого|ым)|сильн(?:ое|ого|ым)|не\s+останавлива(?:ется|ющееся))\s+(?:кровотечен(?:ие|ия|ием)|кров(?:ь|отечение))/i,
		/(?:кровь|кровит).*(?:хлещет|стру[её]й|не\s+останавлива(?:ется)?|полный\s+рот|заливает|сочится\s+сильно|третий\s+час|уже\s+\d+\s+час|сгустк)/i,
		/(?:выпал|отош[её]л|вымылся)\s+(?:кровяной\s+)?сгусток/i,
		/(?:после\s+удаления|удалили\s+зуб).*(?:кров(?:ь|ит|отечение)|не\s+сворачивается)/i,
	];

	// 5. Dental Trauma / Fracture (Выбит зуб, перелом челюсти)
	private static readonly CRITICAL_TRAUMA_PATTERNS = [
		/(?:выбит(?:а|о|ы)?|выбил(?:и)?|вывих(?:нул)?|сломал(?:и)?|расколол(?:и)?).*(?:зуб|челюст|корен)/i,
		/(?:травм(?:а|у|е)|удар(?:ил|или|ился)?|авари(?:я|ю)|падени(?:е|я)|упал(?:а)?).*(?:зуб|челюст|лиц|подбородок)/i,
	];

	// 6. Urgent / Moderate Restoration, Crown or Subacute Issues
	private static readonly URGENT_PATTERNS = [
		/(?:выпал(?:а)?|вылетел(?:а)?|отколол(?:ся|ась)?|сколол(?:ся|ась)?|сломал(?:ась|ся)?|треснул(?:а|ся)?).*(?:пломб(?:а|у)|коронк(?:а|у)|мост(?:ик)?|винир|зуб|протез|стенк(?:а|у))/i,
		/(?:слетел(?:а)?|отклеил(?:ась|ся)?|отвалил(?:ась|ся)?|расцементировал(?:ась|ся)?).*(?:коронк(?:а|у)|мост|брекет|замок|винир|формирователь)/i,
		/(?:натира(?:ет)?|царапа(?:ет)?|давит|колет|режет).*(?:протез|дуг(?:а|у)|край|проволок(?:а|у)|зуб)/i,
		/(?:ноет|поднывает|потягивает|чувствительн(?:ость|ый)|реагирует).*(?:зуб|на\s+холодное|на\s+горячее|на\s+сладкое|при\s+накусывании)/i,
		/(?:десна\s+кровоточит|воспалилась\s+десна|кровоточивость\s+десен|десна\s+покраснела)/i,
		/(?:после\s+(?:операции|имплантации|удаления)\s+(?:тянет|болит\s+терпимо|небольшой\s+дискомфорт|разошлись\s+швы))/i,
	];

	// 7. Normal Inquiries / Routine Workflow
	private static readonly NORMAL_PATTERNS = [
		/(?:записат(?:ься|и)?|хочу\s+на\s+при[её]м|свободное\s+время|есть\s+ли\s+окно|консультаци(?:я|ю))/i,
		/(?:скольк(?:о)?\s+стоит|прайс|цена|стоимость|расценки)/i,
		/(?:подтвержда(?:ю|ем)?|буд(?:у|ем)|прид(?:у|ем)|да,\s+буду)/i,
		/(?:перенес(?:ти|ите)?|отменит(?:ь|е)?|не\s+смог(?:у|ем)?)/i,
		/(?:готов(?:а|о|ы)?\s+(?:коронк|протез|капп|анализ|снимок|кт)|зтл|лаборатори)/i,
		/(?:спасибо|благодар(?:ю|им)|до\s+свидания|хорошего\s+дня)/i,
	];

	public analyze(
		text: string,
		context?:
			| {
					patientName?: string | null | undefined;
					recentVisitDate?: string | null | undefined;
					recentDiagnoses?: string[] | undefined;
					activeDoctor?: string | null | undefined;
			  }
			| undefined,
	): TriageAnalysisResult {
		const rawClean = (text || "").trim();
		const cleanText = sanitizePatientInput(rawClean);
		const matchedKeywords: string[] = [];
		const detectedSymptoms: string[] = [];

		let criticalScore = 0;
		let urgentScore = 0;
		let normalScore = 0;

		let painLevel = 0;
		const clinicalDetails: string[] = [];

		// ========================================================================
		// 1. SEMANTIC NEGATION & MILD SEVERITY DETECTIONS
		// ========================================================================

		// A. Swelling Negation (e.g. "отека нет", "нет отека", "без отека", "не опухло")
		const hasSwellingNegation =
			/(?:нет|без|никакого|отсутствует|не\s+(?:опух|раздул|надул|заплыл|увеличил|наблюда))\s+.*(?:отек|отёк|флюс|припухл|свищ|опухол)/i.test(
				cleanText,
			) ||
			/(?:отек(?:а)?|отёк(?:а)?|припухлост(?:и)?|флюс(?:а)?|нарыв(?:а)?)\s+(?:нет|отсутствует|спал(?:а)?|прош[её]л|не\s+наблюдается|не\s+вижу|минимальн|небольш)/i.test(
				cleanText,
			);

		// B. Bleeding Negation & Mild/Controlled Bleeding
		const hasBleedingNegation =
			/(?:не\s+кровит|кровь\s+остановилась|крови\s+нет|без\s+крови|не\s+идет\s+кровь|перестало\s+кровить)/i.test(
				cleanText,
			);
		const isMildBleeding =
			/(?:кровит|сочится|подкравливает|розовеет|мажет)\s+(?:не\s+сильно|чуть-чуть|слегка|немного|чуть|едва|капель)/i.test(
				cleanText,
			) ||
			/(?:не\s+сильно|чуть-чуть|слегка|немного|чуть)\s+(?:кровит|сочится|подкравливает)/i.test(
				cleanText,
			) ||
			/(?:розов(?:ая|ую)\s+слюн(?:а|у)|слюн(?:а|у)\s+с\s+прожилками)/i.test(
				cleanText,
			);

		// C. Pain Negation & Mild/Controlled Pain
		const hasPainNegation =
			/(?:но\s+)?(?:остр(?:ой|ая)|сильн(?:ой|ая)|адск(?:ой|ая)|нестерпим(?:ой|ая))\s+бол(?:и|ь)\s+(?:нет|отсутствует|прошла)/i.test(
				cleanText,
			) ||
			/(?:нет|без|не\s+(?:чувствую|испытываю|болит))\s+.*(?:остр|сильн|адск|нестерпим).*(?:бол|прострел)/i.test(
				cleanText,
			) ||
			/(?:не\s+болит|боли\s+нет|боль\s+(?:терпимая|прошла|утихла|ноющая|небольшая)|терпимо|обезбол(?:ивающее)?\s+помог)/i.test(
				cleanText,
			);

		// D. Temperature Analysis (Subfebrile < 38.0°C vs Critical High Fever >= 38.5°C)
		const isNormalOrSubfebrile =
			/(?:температур(?:а|у)?\s*(?:36[.,]\d|37[.,][0-4]|в\s*норме|нет|нормальная)|36[.,]\d|37[.,][0-4]\s*градус)/i.test(
				cleanText,
			);
		const hasHighFever =
			/(?:температур(?:а|у)?\s*(?:38[.,][5-9]|39|40)|38[.,][5-9]|39[.,]\d|40[.,]\d|жар|лихорад)/i.test(
				cleanText,
			);

		// E. Obvious Immediate Emergency Gateway
		const isObviousCritical =
			/(?:умираю\s+от\s+боли|10\/10|10\s*из\s*10|на\s+стенку\s+лезу|дикая\s+боль|выбит\s+зуб|выбили\s+зуб|сломал\s+челюсть|перелом\s+челюсти|хлещет\s+кровь|не\s+могу\s+открыть\s+рот|тризм|флегмона)/i.test(
				cleanText,
			);

		// ========================================================================
		// 2. CRITICAL CONDITION EVALUATION
		// ========================================================================

		// Check 1: Severe Pain
		if (!hasPainNegation) {
			for (const pattern of WhatsAppTriageAnalyzer.CRITICAL_PAIN_PATTERNS) {
				const m = cleanText.match(pattern);
				if (m) {
					criticalScore += 35;
					matchedKeywords.push(m[0]);
					clinicalDetails.push("Острая некупируемая боль");
					detectedSymptoms.push("acute_pain");
					painLevel = Math.max(painLevel, 9);
				}
			}
		}

		// Check 2: Swelling / Abscess / Trismus
		if (!hasSwellingNegation) {
			for (const pattern of WhatsAppTriageAnalyzer.CRITICAL_SWELLING_PATTERNS) {
				const m = cleanText.match(pattern);
				if (m) {
					criticalScore += 40;
					matchedKeywords.push(m[0]);
					clinicalDetails.push(
						"Выраженный отёк / отек / подозрение на периостит/флегмону",
					);
					detectedSymptoms.push("swelling");
					if (
						/(?:тризм|рот\s+(?:не|трудно)\s+открыть|не\s+могу\s+открыть\s+рот|челюсть\s+сводит)/i.test(
							cleanText,
						)
					) {
						detectedSymptoms.push("trismus");
						clinicalDetails.push("Ограничение открывания рта (тризм)");
					}
				}
			}
		}

		// Check 3: High Fever
		if (hasHighFever && !isNormalOrSubfebrile) {
			for (const pattern of WhatsAppTriageAnalyzer.CRITICAL_FEVER_PATTERNS) {
				const m = cleanText.match(pattern);
				if (m) {
					criticalScore += 30;
					matchedKeywords.push(m[0]);
					clinicalDetails.push("Гипертермия (температура 38.5°C+)");
					detectedSymptoms.push("fever_above_38");
					if (/(?:удалил|удален|лунк)/i.test(cleanText)) {
						detectedSymptoms.push("extraction_complication");
					}
				}
			}
		}

		// Check 4: Bleeding (Only heavy continuous bleeding is critical)
		if (!hasBleedingNegation && !isMildBleeding) {
			for (const pattern of WhatsAppTriageAnalyzer.CRITICAL_BLEEDING_PATTERNS) {
				const m = cleanText.match(pattern);
				if (m) {
					criticalScore += 40;
					matchedKeywords.push(m[0]);
					clinicalDetails.push("Продолжающееся обильное кровотечение");
					detectedSymptoms.push("continuous_bleeding");
					if (/(?:удалил|удален|лунк)/i.test(cleanText)) {
						detectedSymptoms.push("extraction_complication");
					}
				}
			}
		}

		// Check 5: Trauma
		for (const pattern of WhatsAppTriageAnalyzer.CRITICAL_TRAUMA_PATTERNS) {
			const m = cleanText.match(pattern);
			if (m) {
				criticalScore += 35;
				matchedKeywords.push(m[0]);
				clinicalDetails.push("Острая травма зубочелюстной системы");
				detectedSymptoms.push("trauma_fracture");
			}
		}

		// Subfebrile post-extraction or mild bleeding tracking (not critical)
		if (
			isNormalOrSubfebrile ||
			isMildBleeding ||
			hasSwellingNegation ||
			hasBleedingNegation
		) {
			if (/(?:удалил|удален|лунк|операци)/i.test(cleanText)) {
				detectedSymptoms.push("post_op_monitoring");
				if (isMildBleeding) detectedSymptoms.push("mild_oozing");
				if (isNormalOrSubfebrile) detectedSymptoms.push("subfebrile_temp");
				urgentScore += 15;
			}
		}

		// Check 6: Urgent issues
		for (const pattern of WhatsAppTriageAnalyzer.URGENT_PATTERNS) {
			const m = cleanText.match(pattern);
			if (m) {
				urgentScore += 25;
				matchedKeywords.push(m[0]);
				if (
					!clinicalDetails.includes(
						"Дефект реставрации/ортопедии/умеренная боль",
					)
				) {
					clinicalDetails.push("Дефект реставрации/ортопедии/умеренная боль");
				}
				if (/(?:пломб|коронк|стенк|винир|сколол|отколол)/i.test(cleanText)) {
					detectedSymptoms.push("broken_restoration");
				}
				if (/(?:брекет|дуг|колет|проволок)/i.test(cleanText)) {
					detectedSymptoms.push("orthodontic_issue");
				}
				if (painLevel === 0) painLevel = 5;
			}
		}

		// Check 7: Normal queries
		for (const pattern of WhatsAppTriageAnalyzer.NORMAL_PATTERNS) {
			const m = cleanText.match(pattern);
			if (m) {
				normalScore += 20;
				matchedKeywords.push(m[0]);
			}
		}

		// Explicit critical gateway boost
		if (isObviousCritical && !hasPainNegation) {
			criticalScore = Math.max(criticalScore, 40);
		}

		// Determine Urgency Level
		let urgency: TriageUrgency = "NORMAL";
		let sentiment: PatientSentiment = "neutral";
		let intent: TriageIntent = "general_inquiry";
		let confidence = 0.85;

		if (criticalScore >= 30) {
			urgency = "CRITICAL";
			sentiment = "emergency";
			intent = "emergency";
			confidence = Math.min(0.99, 0.7 + criticalScore / 100);
		} else if (urgentScore >= 20) {
			urgency = "URGENT";
			sentiment = "anxious";
			intent = "symptom_report";
			confidence = Math.min(0.95, 0.65 + urgentScore / 100);
		} else {
			urgency = "NORMAL";
			if (
				cleanText.includes("спасибо") ||
				cleanText.includes("благодар") ||
				cleanText.includes("отлично")
			) {
				sentiment = "positive";
				intent = "feedback";
			} else if (cleanText.includes("перенес") || cleanText.includes("отмен")) {
				sentiment = "neutral";
				intent = cleanText.includes("перенес")
					? "reschedule_request"
					: "cancellation_request";
			} else if (
				cleanText.includes("скольк") ||
				cleanText.includes("стоим") ||
				cleanText.includes("цена") ||
				cleanText.includes("прайс")
			) {
				sentiment = "neutral";
				intent = "price_inquiry";
			} else if (
				cleanText.includes("запис") ||
				cleanText.includes("прием") ||
				cleanText.includes("приём") ||
				cleanText.includes("чистк")
			) {
				sentiment = "neutral";
				intent = "booking_request";
			} else if (
				cleanText.includes("готов") ||
				cleanText.includes("зтл") ||
				cleanText.includes("лаборатор")
			) {
				sentiment = "neutral";
				intent = "ztl_inquiry";
			} else {
				sentiment = "neutral";
				intent = "general_inquiry";
			}
			confidence = 0.9;
		}

		// Clinical summary & Suggested Action
		const uniqueDetails = Array.from(new Set(clinicalDetails));
		let summary = "";
		if (uniqueDetails.length > 0) {
			summary = uniqueDetails.join(" • ");
		} else if (detectedSymptoms.includes("post_op_monitoring")) {
			summary =
				"Постэкстракционный период (субфебрилитет, умеренное подкравливание, без выраженного отёка)";
		} else if (urgency === "CRITICAL") {
			summary = "Острая стоматологическая симптоматика";
		} else if (urgency === "URGENT") {
			summary = "Требуется осмотр врача в ближайшие 24 часа";
		} else {
			summary = "Плановое обращение пациента";
		}

		let suggestedAction = "";
		let recommendedDoctorRole: string | undefined;

		if (urgency === "CRITICAL") {
			suggestedAction =
				"Немедленный звонок администратора / дежурного врача, запись в экстренное окно с подготовкой хирургического/терапевтического кабинета";
			recommendedDoctorRole = "Стоматолог-хирург / Терапевт (Дежурный)";
		} else if (urgency === "URGENT") {
			suggestedAction =
				"Предложить запись на осмотр в день обращения или завтра в первой половине дня.";
			recommendedDoctorRole = "Стоматолог-терапевт / Ортопед";
		} else {
			suggestedAction =
				"Предоставить стандартный вежливый ответ клиники и согласовать удобное время визита.";
			recommendedDoctorRole = "Администратор клиники";
		}

		return {
			urgency,
			sentiment,
			intent,
			confidence,
			matchedKeywords: Array.from(new Set(matchedKeywords)),
			clinicalSummary: summary,
			suggestedAction,
			recommendedDoctorRole,
			requiresImmediateCall: urgency === "CRITICAL",
			requiresImmediateIntervention: urgency === "CRITICAL",
			detectedSymptoms: Array.from(new Set(detectedSymptoms)),
			recommendedAction: suggestedAction,
			reasoning: summary,
			painLevelEstimate: painLevel > 0 ? painLevel : undefined,
		};
	}
}

// ============================================================================
// HITL (HUMAN-IN-THE-LOOP) QUEUE & APPROVAL CARD MANAGER
// ============================================================================

export class WhatsAppHitLQueue {
	private readonly approvalCards = new Map<string, WhatsAppApprovalCardData>();
	private readonly proactiveAlerts = new Map<string, ProactiveAlertCardData>();

	constructor(
		private readonly sendCallback?:
			| ((phone: string, text: string) => Promise<void>)
			| undefined,
	) {}

	public queueApprovalCard(options: {
		organizationId: string;
		patientId: string;
		patientName: string;
		patientPhone: string;
		category?: string | undefined;
		incomingSnippet: string;
		proposedReply: string;
		confidence?: number | undefined;
		urgency?: TriageUrgency | undefined;
		messageTimestamp?: string | undefined;
	}): WhatsAppApprovalCardData {
		const approvalId = `hitl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		const msgTime = options.messageTimestamp
			? new Date(options.messageTimestamp).getTime()
			: Date.now();
		const isWithin24HourWindow = Date.now() - msgTime <= 24 * 60 * 60 * 1000;
		const templateRequired =
			!isWithin24HourWindow ||
			options.category === "retention" ||
			options.category === "gap_filler";

		const card: WhatsAppApprovalCardData = {
			approvalId,
			organizationId: options.organizationId,
			patientId: options.patientId,
			patientName: options.patientName,
			phone: options.patientPhone,
			intent: options.category || "general",
			urgency: options.urgency || "NORMAL",
			incomingSnippet: sanitizePatientInput(options.incomingSnippet),
			draftReply: options.proposedReply,
			proposedReply: options.proposedReply,
			channel: "whatsapp",
			confidenceScore: options.confidence ?? 0.9,
			createdAt: new Date().toISOString(),
			status: "pending",
			...(options.category ? { category: options.category } : {}),
			isWithin24HourWindow,
			templateRequired,
		};
		return this.createApprovalCard(card);
	}

	public getPendingCards(organizationId: string): WhatsAppApprovalCardData[] {
		return this.listPendingCards(organizationId);
	}

	public createApprovalCard(
		cardData: WhatsAppApprovalCardData,
	): WhatsAppApprovalCardData {
		this.approvalCards.set(cardData.approvalId, cardData);
		return cardData;
	}

	public getApprovalCard(
		approvalId: string,
		organizationId?: string,
	): WhatsAppApprovalCardData | undefined {
		const card = this.approvalCards.get(approvalId);
		if (!card) return undefined;
		if (organizationId && card.organizationId !== organizationId) {
			return undefined;
		}
		return card;
	}

	public async approveCard(
		approvalId: string,
		organizationIdOrReply?: string,
		optionsOrModifiedReply?:
			| {
					modifiedReply?: string | undefined;
					sendNow?: boolean | undefined;
			  }
			| string,
	): Promise<
		WhatsAppApprovalCardData & {
			success?: boolean;
			card?: WhatsAppApprovalCardData;
			sent?: boolean;
			error?: string;
		}
	> {
		let organizationId: string | undefined;
		let modifiedReply: string | undefined;
		let sendNow = true;

		if (
			typeof optionsOrModifiedReply === "object" &&
			optionsOrModifiedReply !== null
		) {
			organizationId = organizationIdOrReply;
			modifiedReply = optionsOrModifiedReply.modifiedReply;
			if (optionsOrModifiedReply.sendNow !== undefined) {
				sendNow = optionsOrModifiedReply.sendNow;
			}
		} else if (typeof optionsOrModifiedReply === "string") {
			organizationId = organizationIdOrReply;
			modifiedReply = optionsOrModifiedReply;
		} else {
			// Called as (approvalId, modifiedReply)
			modifiedReply = organizationIdOrReply;
		}

		const card = this.getApprovalCard(approvalId, organizationId);
		if (!card) {
			throw new Error(
				`Карточка согласования ${approvalId} не найдена или не принадлежит клинике`,
			);
		}

		card.status = "approved";
		const replyText = (modifiedReply ?? card.draftReply).trim();

		let sent = false;
		if (this.sendCallback) {
			await this.sendCallback(card.phone, replyText);
			sent = true;
		} else if (sendNow && card.phone) {
			try {
				const normalizedPhone = normalizeWhatsappRecipient(card.phone);
				if (normalizedPhone) {
					await sendWhatsappTextMessage({
						phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "default",
						accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "token",
						toPhoneE164: normalizedPhone,
						text: replyText,
					});
					card.status = "sent";
					sent = true;
				}
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : String(err);
				return Object.assign(card, {
					success: true,
					card,
					sent: false,
					error: `Карточка одобрена, но ошибка отправки WhatsApp: ${errMsg}`,
				});
			}
		}

		return Object.assign(card, { success: true, card, sent });
	}

	public async rejectCard(
		approvalId: string,
		organizationIdOrReason?: string | undefined,
		maybeReason?: string | undefined,
	): Promise<
		WhatsAppApprovalCardData & {
			success?: boolean | undefined;
			card?: WhatsAppApprovalCardData | undefined;
			rejectionReason?: string | undefined;
		}
	> {
		let organizationId: string | undefined;
		let reason: string | undefined;

		if (maybeReason !== undefined) {
			organizationId = organizationIdOrReason;
			reason = maybeReason;
		} else {
			reason = organizationIdOrReason;
		}

		const card = this.getApprovalCard(approvalId, organizationId);
		if (!card) {
			throw new Error(
				`Карточка согласования ${approvalId} не найдена или не принадлежит клинике`,
			);
		}

		card.status = "rejected";
		if (reason) {
			(card as { rejectionReason?: string }).rejectionReason = reason;
		}

		return Object.assign(card, {
			success: true,
			card,
			...(reason ? { rejectionReason: reason } : {}),
		});
	}

	public listPendingCards(organizationId: string): WhatsAppApprovalCardData[] {
		const results: WhatsAppApprovalCardData[] = [];
		for (const card of this.approvalCards.values()) {
			if (card.organizationId === organizationId && card.status === "pending") {
				results.push(card);
			}
		}
		return results.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}

	public createProactiveAlert(
		alertData: ProactiveAlertCardData,
		organizationId: string,
	): ProactiveAlertCardData {
		this.proactiveAlerts.set(alertData.id, alertData);
		return alertData;
	}

	public listProactiveAlerts(organizationId: string): ProactiveAlertCardData[] {
		const results: ProactiveAlertCardData[] = [];
		for (const alert of this.proactiveAlerts.values()) {
			const alertOrg =
				(alert.data?.organizationId as string) ||
				(alert.metadata?.organizationId as string);
			if (!alertOrg || alertOrg === organizationId) {
				results.push(alert);
			}
		}
		return results.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);
	}

	public dismissProactiveAlert(alertId: string): boolean {
		return this.proactiveAlerts.delete(alertId);
	}
}

// ============================================================================
// OMNICHANNEL WHATSAPP BRIDGE SERVICE (SINGLETON)
// ============================================================================

export class WhatsAppBridge {
	private readonly triageAnalyzer: WhatsAppTriageAnalyzer;
	private readonly hitlQueue: WhatsAppHitLQueue;
	private readonly streamManager: CopilotStreamManager;

	constructor(options?: {
		triageAnalyzer?: WhatsAppTriageAnalyzer;
		hitlQueue?: WhatsAppHitLQueue;
		streamManager?: CopilotStreamManager;
	}) {
		this.triageAnalyzer =
			options?.triageAnalyzer ?? new WhatsAppTriageAnalyzer();
		this.hitlQueue = options?.hitlQueue ?? new WhatsAppHitLQueue();
		this.streamManager = options?.streamManager ?? defaultCopilotStreamManager;
	}

	public getTriageAnalyzer(): WhatsAppTriageAnalyzer {
		return this.triageAnalyzer;
	}

	public getHitLQueue(): WhatsAppHitLQueue {
		return this.hitlQueue;
	}

	public getStreamManager(): CopilotStreamManager {
		return this.streamManager;
	}

	/**
	 * Main processing pipeline for incoming WhatsApp webhook messages.
	 */
	public async handleIncomingMessage(
		message: IncomingWhatsAppMessage,
	): Promise<{
		triage: TriageAnalysisResult;
		alertCard?: ProactiveAlertCardData | undefined;
		approvalCard?: WhatsAppApprovalCardData | undefined;
	}> {
		const organizationId = message.organizationId;
		const rawText = sanitizePatientInput(message.rawText || "");
		const msgTime = message.timestamp
			? new Date(message.timestamp).getTime()
			: Date.now();
		const isWithin24HourWindow = Date.now() - msgTime <= 24 * 60 * 60 * 1000;
		const templateRequired = !isWithin24HourWindow;

		// 1. Run Clinical Triage
		const triageOpts: {
			patientName?: string | null;
			recentDiagnoses?: string[];
			activeDoctor?: string | null;
			recentVisitDate?: string | null;
		} = {};
		if (message.patientName !== undefined)
			triageOpts.patientName = message.patientName;
		if (message.context?.recentDiagnoses)
			triageOpts.recentDiagnoses = message.context.recentDiagnoses;
		if (message.context?.activeDoctor !== undefined)
			triageOpts.activeDoctor = message.context.activeDoctor;
		if (message.context?.lastVisitDate !== undefined)
			triageOpts.recentVisitDate = message.context.lastVisitDate;
		const triage = this.triageAnalyzer.analyze(rawText, triageOpts);

		let alertCard: ProactiveAlertCardData | undefined;
		let approvalCard: WhatsAppApprovalCardData | undefined;

		// 2. If CRITICAL -> Produce Red Emergency Proactive Alert & Emergency HitL Card
		if (triage.urgency === "CRITICAL") {
			const alertId = `alert_crit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
			const pName = message.patientName || `Пациент (${message.fromPhone})`;

			alertCard = {
				id: alertId,
				urgency: "CRITICAL",
				title: "🚨 Экстренное обращение (Острая боль / Отек / Кровотечение)",
				subtitle: `${pName} • ${triage.clinicalSummary}`,
				description: `Пациент сообщил: "${rawText}". Рекомендация ИИ: ${triage.suggestedAction}`,
				timestamp: new Date().toISOString(),
				patientId: message.patientId ?? null,
				patientName: pName,
				patientPhone: message.fromPhone,
				category: "whatsapp_emergency",
				actions: [
					{
						id: "call_patient",
						label: "📞 Позвонить пациенту",
						kind: "danger",
						actionType: "call_patient",
						payload: {
							phone: message.fromPhone,
							patientId: message.patientId ?? null,
						},
					},
					{
						id: "book_urgent_slot",
						label: "⚡ Записать на острую боль",
						kind: "primary",
						prompt: `Записать пациента ${pName} на ближайшее экстренное окно с острой болью (${triage.clinicalSummary}).`,
						actionType: "book_urgent_slot",
					},
					{
						id: "notify_duty_doctor",
						label: "👨‍⚕️ Передать дежурному врачу",
						kind: "secondary",
						actionType: "notify_duty_doctor",
						payload: {
							summary: triage.clinicalSummary,
							rawText,
							phone: message.fromPhone,
						},
					},
				],
				data: {
					organizationId,
					rawText,
					matchedKeywords: triage.matchedKeywords,
					sentiment: triage.sentiment,
					intent: triage.intent,
					painLevelEstimate: triage.painLevelEstimate,
				},
				metadata: {
					organizationId,
					clinicId: message.clinicId,
					messageId: message.messageId,
				},
			};

			// Save to HitL Queue
			this.hitlQueue.createProactiveAlert(alertCard, organizationId);

			// Also create emergency approval card in HitL queue
			const hitlCritId = `hitl_crit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
			approvalCard = {
				approvalId: hitlCritId,
				organizationId,
				patientId: message.patientId || "emergency_patient",
				patientName: pName,
				phone: message.fromPhone,
				intent: "emergency",
				urgency: "CRITICAL",
				incomingSnippet: rawText.slice(0, 150),
				draftReply: `Здравствуйте, ${pName}! Мы зафиксировали экстренное обращение (${triage.clinicalSummary}). Дежурный врач уже уведомлен и связывается с вами по телефону.`,
				proposedReply: `Здравствуйте, ${pName}! Мы зафиксировали экстренное обращение (${triage.clinicalSummary}). Дежурный врач уже уведомлен и связывается с вами по телефону.`,
				channel: "whatsapp",
				confidenceScore: 0.99,
				actionPrompt: `Срочно связаться с пациентом ${pName} (Острая боль / Отек)`,
				createdAt: new Date().toISOString(),
				status: "pending",
				category: "whatsapp_emergency",
				metadata: { alertId },
				isWithin24HourWindow,
				templateRequired,
			};
			this.hitlQueue.createApprovalCard(approvalCard);

			// Server-Initiated Proactive SSE Broadcast & WebSocket Broadcast
			this.streamManager.broadcastProactiveAlert(organizationId, alertCard);
			wsBroker.broadcastToOrganization(organizationId, {
				type: "proactive_alert",
				data: alertCard,
			});
		} else {
			// 3. If NORMAL or URGENT -> Produce Draft Message for 1-Click HitL Approval
			const approvalId = `hitl_appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
			const pName = message.patientName || "Пациент";

			let draftReply = "";
			if (triage.intent === "booking_request") {
				draftReply = `Здравствуйте, ${pName}! Мы получили вашу заявку на приём. Подскажите, пожалуйста, какое время для вас наиболее удобно — первая или вторая половина дня?`;
			} else if (triage.intent === "ztl_inquiry") {
				draftReply = `Здравствуйте, ${pName}! Ваша ортопедическая работа находится на контроле зуботехнической лаборатории. Администратор уточнит точное время доставки и свяжется с вами в течение 15 минут.`;
			} else if (triage.intent === "price_inquiry") {
				draftReply = `Здравствуйте, ${pName}! Стоимость приёма формируется по клиническому протоколу на консультации. Записать вас на диагностический осмотр?`;
			} else if (triage.intent === "cancellation_request") {
				draftReply = `Здравствуйте, ${pName}! Ваша запись отменена. Желаете подобрать другое удобное время для визита?`;
			} else if (triage.urgency === "URGENT") {
				draftReply = `Здравствуйте, ${pName}! Видим ваше обращение (${triage.clinicalSummary}). Мы готовы принять вас сегодня для осмотра и устранения дискомфорта. Вам удобно подойти к 15:00 или 18:00?`;
			} else {
				draftReply = `Здравствуйте, ${pName}! Спасибо за обращение в клинику DENTE. Мы на связи и готовы помочь по любому вопросу.`;
			}

			approvalCard = {
				approvalId,
				organizationId,
				patientId: message.patientId || "unknown",
				patientName: pName,
				phone: message.fromPhone,
				intent: triage.intent,
				urgency: triage.urgency,
				incomingSnippet: rawText.slice(0, 150),
				draftReply,
				proposedReply: draftReply,
				channel: "whatsapp",
				confidenceScore: triage.confidence,
				actionPrompt: `Отправить пациенту ${pName} согласованный ответ в WhatsApp: "${draftReply}"`,
				createdAt: new Date().toISOString(),
				status: "pending",
				category:
					triage.intent === "booking_request"
						? "booking"
						: triage.intent === "ztl_inquiry"
							? "ztl"
							: "general",
				metadata: {
					messageId: message.messageId,
					clinicalSummary: triage.clinicalSummary,
				},
				isWithin24HourWindow,
				templateRequired,
			};

			this.hitlQueue.createApprovalCard(approvalCard);

			// Broadcast approval card to proactive streams
			const proactiveApprovalAlert: ProactiveAlertCardData = {
				id: `alert_hitl_${approvalId}`,
				urgency: triage.urgency,
				title:
					triage.urgency === "URGENT"
						? "⚠️ Срочное сообщение WhatsApp (Требует ответа)"
						: "💬 Новое входящее сообщение WhatsApp (Черновик готов)",
				subtitle: `${pName} • ${triage.intent}`,
				description: `Пациент: "${rawText.slice(0, 120)}...". Сформирован ответ для утверждения в 1 клик.`,
				timestamp: new Date().toISOString(),
				patientId: message.patientId ?? null,
				patientName: pName,
				patientPhone: message.fromPhone,
				category: "whatsapp_emergency",
				actions: [
					{
						id: "approve_send",
						label: "✅ Одобрить и отправить",
						kind: "primary",
						actionType: "approve_hitl",
						payload: { approvalId },
					},
					{
						id: "reject_draft",
						label: "❌ Отклонить",
						kind: "secondary",
						actionType: "reject_hitl",
						payload: { approvalId },
					},
				],
				data: {
					approvalId,
					approvalCard,
					organizationId,
				},
			};

			this.streamManager.broadcastProactiveAlert(
				organizationId,
				proactiveApprovalAlert,
			);
		}

		const responseResult: {
			triage: TriageAnalysisResult;
			alertCard?: ProactiveAlertCardData;
			approvalCard?: WhatsAppApprovalCardData;
		} = { triage };
		if (alertCard) responseResult.alertCard = alertCard;
		if (approvalCard) responseResult.approvalCard = approvalCard;

		return responseResult;
	}

	public async processInboundMessage(
		message:
			| IncomingWhatsAppMessage
			| {
					messageId: string;
					organizationId: string;
					patientPhone: string;
					patientName?: string | null | undefined;
					text: string;
					timestamp?: string | undefined;
			  },
	): Promise<TriageAnalysisResult> {
		const fromPhone =
			"fromPhone" in message
				? message.fromPhone
				: (message as { patientPhone: string }).patientPhone;
		const rawText =
			"rawText" in message
				? message.rawText
				: (message as { text: string }).text;
		const normalized: IncomingWhatsAppMessage = {
			messageId: message.messageId,
			organizationId: message.organizationId,
			fromPhone,
			rawText,
			patientName: message.patientName,
			timestamp: message.timestamp,
		};
		const res = await this.handleIncomingMessage(normalized);
		return res.triage;
	}

	public getPendingApprovalCards(
		organizationId: string,
	): WhatsAppApprovalCardData[] {
		return this.hitlQueue.listPendingCards(organizationId);
	}

	/**
	 * Helper to create specialized proactive cards (ZTL, Retention, Gap Filler, EMR Draft).
	 */
	public broadcastZtlAlert(
		organizationId: string,
		ztl: ZtlAlertCardData,
	): ProactiveAlertCardData {
		const alertId = `alert_ztl_${ztl.orderId}_${Date.now()}`;
		const isReady = ztl.status === "ready";

		const card: ProactiveAlertCardData = {
			id: alertId,
			urgency: isReady ? "NORMAL" : "URGENT",
			title: isReady
				? "🦷 Работа из лаборатории (ЗТЛ) готова к установке"
				: `⚠️ Задержка работы ЗТЛ #${ztl.orderNumber}`,
			subtitle: `${ztl.patientName} • Зуб #${ztl.tooth || "N/A"} (${ztl.prosthesisType})`,
			description: isReady
				? `Лаборатория "${ztl.labName}" доставила готовую конструкцию. Записать пациента на примерку/фиксацию в 1 клик?`
				: `Лаборатория "${ztl.labName}" перенесла срок сдачи на ${ztl.etaDate || "уточняется"}. Предупреждение: ${ztl.warning || "Требуется согласование с пациентом"}.`,
			timestamp: new Date().toISOString(),
			patientId: ztl.patientId,
			patientName: ztl.patientName,
			category: "ztl_status",
			actions: isReady
				? [
						{
							id: "book_fitting",
							label: "📅 Записать на примерку",
							kind: "primary",
							prompt: `Записать пациента ${ztl.patientName} на примерку и фиксацию ${ztl.prosthesisType} (зуб #${ztl.tooth || ""}).`,
							actionType: "book_ztl_fitting",
						},
						{
							id: "notify_patient_ztl",
							label: "💬 Уведомить в WhatsApp",
							kind: "secondary",
							prompt: `Отправить пациенту ${ztl.patientName} уведомление в WhatsApp о готовности ${ztl.prosthesisType}.`,
							actionType: "notify_patient_ztl",
						},
					]
				: [
						{
							id: "reschedule_fitting",
							label: "⏳ Перенести приём фиксации",
							kind: "primary",
							prompt: `Перенести прием примерки для пациента ${ztl.patientName} в связи с задержкой ЗТЛ.`,
							actionType: "reschedule_fitting",
						},
					],
			data: { ztl, organizationId },
		};

		this.hitlQueue.createProactiveAlert(card, organizationId);
		defaultCopilotStreamManager.broadcastProactiveAlert(organizationId, card);
		wsBroker.broadcastToOrganization(organizationId, {
			type: "proactive_alert",
			data: card,
		});
		return card;
	}

	public broadcastRetentionSummary(
		organizationId: string,
		retention: RetentionSummaryCardData,
	): ProactiveAlertCardData {
		const alertId = `alert_retention_${retention.summaryId}_${Date.now()}`;
		const card: ProactiveAlertCardData = {
			id: alertId,
			urgency: "NORMAL",
			title: `📊 Удержание пациентов: Когорта "${retention.cohortName}"`,
			subtitle: `${retention.atRiskCount} пациентов без визитов > 6 мес • Потенциал: ${retention.potentialRevenueRub.toLocaleString("ru-RU")} ₽`,
			description: `ИИ выявил группу риска оттока. Рекомендована автоматическая персонализированная кампания "${retention.suggestedCampaign}". Запустить в 1 клик?`,
			timestamp: new Date().toISOString(),
			category: "retention",
			actions: [
				{
					id: "launch_retention_campaign",
					label: "🚀 Запустить кампанию (1 клик)",
					kind: "primary",
					prompt: `Запустить персонализированную кампанию удержания для когорты "${retention.cohortName}" (${retention.atRiskCount} пациентов).`,
					actionType: "launch_retention_campaign",
				},
				{
					id: "view_retention_list",
					label: "📋 Посмотреть список",
					kind: "secondary",
					actionType: "view_retention_list",
				},
			],
			data: { retention, organizationId },
		};

		this.hitlQueue.createProactiveAlert(card, organizationId);
		defaultCopilotStreamManager.broadcastProactiveAlert(organizationId, card);
		wsBroker.broadcastToOrganization(organizationId, {
			type: "proactive_alert",
			data: card,
		});
		return card;
	}

	public broadcastGapFiller(
		organizationId: string,
		gap: GapFillerCardData,
	): ProactiveAlertCardData {
		const alertId = `alert_gap_${gap.gapId}_${Date.now()}`;
		const topPatient = gap.suggestedPatients[0];

		const card: ProactiveAlertCardData = {
			id: alertId,
			urgency: "NORMAL",
			title: `⚡ Заполнение окна в расписании (${gap.date} ${gap.timeRange})`,
			subtitle: `Врач: ${gap.doctorName}${gap.cabinet ? ` • ${gap.cabinet}` : ""} • Найдено кандидатов: ${gap.suggestedPatients.length}`,
			description: topPatient
				? `Освободилось окно. Топ-кандидат: ${topPatient.name} (совпадение ${(topPatient.matchScore * 100).toFixed(0)}%, причина: ${topPatient.reason}). Отправить приглашение в WhatsApp?`
				: `Освободилось окно у врача ${gap.doctorName}. Найдено ${gap.suggestedPatients.length} подходящих пациентов из листа ожидания.`,
			timestamp: new Date().toISOString(),
			category: "gap_filler",
			actions: [
				{
					id: "invite_top_patient",
					label: topPatient
						? `📩 Пригласить ${topPatient.name.split(" ")[0]}`
						: "📩 Пригласить первого кандидата",
					kind: "primary",
					prompt: topPatient
						? `Отправить пациенту ${topPatient.name} приглашение на свободное окно ${gap.date} в ${gap.timeRange} к доктору ${gap.doctorName}.`
						: `Заполнить свободное окно ${gap.date} ${gap.timeRange}.`,
					actionType: "invite_gap_patient",
					payload: { patientId: topPatient?.id, gapId: gap.gapId },
				},
				{
					id: "view_gap_candidates",
					label: "👥 Все кандидаты",
					kind: "secondary",
					actionType: "view_gap_candidates",
				},
			],
			data: { gap, organizationId },
		};

		this.hitlQueue.createProactiveAlert(card, organizationId);
		defaultCopilotStreamManager.broadcastProactiveAlert(organizationId, card);
		wsBroker.broadcastToOrganization(organizationId, {
			type: "proactive_alert",
			data: card,
		});
		return card;
	}
}

export const defaultWhatsAppBridge = new WhatsAppBridge();
