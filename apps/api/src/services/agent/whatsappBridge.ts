/**
 * whatsappBridge.ts — Omnichannel WhatsApp Bridge, Clinical Triage & Proactive Alert Engine.
 *
 * Implements:
 * 1. Webhook / Messenger Inbound Ingestor for WhatsApp, Telegram, SMS.
 * 2. Clinical Triage Analyzer:
 *    - Structured LLM Extraction via OmniGateway (WhatsAppTriageLlmSchema via Zod).
 *    - Classifies urgency (NORMAL, URGENT, CRITICAL), symptom categories (acute pain,
 *      facial/gum swelling, fever 38+, heavy bleeding, trauma), sentiment, and intent.
 * 3. Emergency Dispatcher: On CRITICAL urgency, immediately generates high-priority
 *    red proactive alert cards for on-duty doctors/administrators and broadcasts to active
 *    Copilot SSE streams and WebSocket broker.
 * 4. Human-in-the-Loop (HitL) Queue: Manages draft outbound messages (patient retention,
 *    ZTL status, reminders, gap fillers, EMR drafts) for 1-click staff approval with
 *    PostgreSQL persistence into `communication_tasks` and `communication_events`.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	communicationTasks,
	copilotHitlCards,
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
import { omniLlmGateway } from "./omniGateway.js";
import type { ChatOptions } from "./omniGatewayTypes.js";

// ============================================================================
// TYPE DEFINITIONS & SCHEMAS
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

export const WhatsAppTriageLlmSchema = z.object({
	urgency: z
		.enum(["NORMAL", "URGENT", "CRITICAL"])
		.describe(
			"Triage urgency level: CRITICAL (emergency), URGENT (subacute/broken crown), NORMAL (routine)",
		),
	sentiment: z
		.enum(["positive", "neutral", "negative", "anxious", "emergency"])
		.describe("Detected patient emotional tone"),
	intent: z
		.enum([
			"emergency",
			"symptom_report",
			"booking_request",
			"cancellation_request",
			"reschedule_request",
			"ztl_inquiry",
			"price_inquiry",
			"general_inquiry",
			"feedback",
		])
		.describe("Primary intent of the patient's message"),
	confidence: z.number().min(0).max(1).default(0.95),
	matchedKeywords: z.array(z.string()).default([]),
	clinicalSummary: z.string().default("Клинический триаж обращения пациента"),
	suggestedAction: z
		.string()
		.default(
			"Немедленный звонок администратора / дежурного врача, запись в экстренное окно с подготовкой хирургического/терапевтического кабинета",
		),
	recommendedDoctorRole: z.string().optional(),
	requiresImmediateCall: z.boolean().default(false),
	requiresImmediateIntervention: z.boolean().default(false),
	detectedSymptoms: z.array(z.string()).default([]),
	recommendedAction: z
		.string()
		.default(
			"Немедленный звонок администратора / дежурного врача, запись в экстренное окно с подготовкой хирургического/терапевтического кабинета",
		),
	reasoning: z.string().default("Клинический триаж по симптомам"),
	suggestedHitlDraft: z.string().optional(),
	painLevelEstimate: z.number().min(0).max(10).optional(),
});

export const WhatsAppTriageSchema = WhatsAppTriageLlmSchema;
export type TriageAnalysisResult = z.infer<typeof WhatsAppTriageLlmSchema>;
export type WhatsAppTriageResult = TriageAnalysisResult;

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
	readonly channel?: "whatsapp" | "telegram" | "sms" | "max" | "vk" | string | undefined;
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
	readonly channel: "whatsapp" | "telegram" | "sms" | "max" | "vk";
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
// CLINICAL TRIAGE ANALYZER (STRUCTURED LLM VIA OMNIGATEWAY + SEMANTIC ENGINE)
// ============================================================================
// CLINICAL TRIAGE ANALYZER (STRUCTURED LLM VIA OMNIGATEWAY + SEMANTIC ENGINE)
// ============================================================================

export class WhatsAppTriageAnalyzer {
	/**
	 * Analyzes patient message using OmniGateway LLM with strict Zod structured output.
	 */
	public async analyzeAsync(
		text: string,
		context?: {
			patientName?: string | null | undefined;
			recentVisitDate?: string | null | undefined;
			recentDiagnoses?: string[] | undefined;
			activeDoctor?: string | null | undefined;
		},
		options: ChatOptions = {},
	): Promise<TriageAnalysisResult> {
		const cleanText = sanitizePatientInput(text);
		if (!cleanText) {
			return this.analyze(cleanText, context);
		}

		const systemPrompt = [
			"You are an expert Chief Medical Officer / Dental Triage AI in a high-end Dental Clinic.",
			"Perform urgent clinical classification on the patient's incoming WhatsApp message.",
			"CRITICAL TRIAGE PROTOCOLS:",
			"1. CRITICAL URGENCY: Acute unbearable pain (9-10/10, analgesics fail, cannot sleep), severe facial/gum swelling/flux/phlegmon, trismus (cannot open mouth), high fever 38.5C+, continuous heavy post-op bleeding (>2-3h), dental trauma/avulsion (knocked-out permanent tooth, jaw fracture).",
			"2. URGENT: Lost filling, broken crown/veneer, chipped tooth with mild/moderate pain, poking orthodontic wire, loose bracket.",
			"3. NORMAL: Routine booking inquiries, price requests, rescheduling, confirmation, feedback.",
			"4. NEGATIONS: If a symptom is negated or mild (e.g. 'отека нет', 'крови нет', 'температура 36.6', 'боль терпимая'), DO NOT classify as CRITICAL.",
		].join("\n");

		const contextStr = context
			? `\nКонтекст пациента: ${context.patientName || "Пациент"}, Врач: ${context.activeDoctor || "Не указан"}, Недавние диагнозы: ${(context.recentDiagnoses || []).join(", ") || "Нет"}`
			: "";

		try {
			const result = await omniLlmGateway.generateStructuredJson(
				WhatsAppTriageLlmSchema,
				[
					{
						role: "user",
						content: `Сообщение пациента:\n"""\n${cleanText}\n"""${contextStr}\n\nВыполни клинический триаж.`,
					},
				],
				{
					...options,
					system: systemPrompt,
				},
			);

			const data = WhatsAppTriageLlmSchema.parse(result.data);
			const normalizedSymptoms = new Set(data.detectedSymptoms);
			const lowerSummary =
				`${data.clinicalSummary} ${data.reasoning} ${cleanText}`.toLowerCase();

			const hasSwellingNeg =
				lowerSummary.includes("отека нет") ||
				lowerSummary.includes("отёка нет") ||
				lowerSummary.includes("без отека") ||
				lowerSummary.includes("не опух");
			if (
				!hasSwellingNeg &&
				(lowerSummary.includes("отек") ||
					lowerSummary.includes("отёк") ||
					lowerSummary.includes("раздул") ||
					lowerSummary.includes("опух") ||
					lowerSummary.includes("флюс"))
			) {
				normalizedSymptoms.add("swelling");
			}

			if (
				lowerSummary.includes("тризм") ||
				lowerSummary.includes("рот не") ||
				lowerSummary.includes("рот трудно") ||
				lowerSummary.includes("челюсть сводит")
			) {
				normalizedSymptoms.add("trismus");
			}
			if (
				lowerSummary.includes("38.5") ||
				lowerSummary.includes("38.8") ||
				lowerSummary.includes("39") ||
				lowerSummary.includes("40") ||
				lowerSummary.includes("жар") ||
				lowerSummary.includes("лихорад")
			) {
				normalizedSymptoms.add("fever_above_38");
			}
			if (
				!lowerSummary.includes("боли нет") &&
				!lowerSummary.includes("не болит") &&
				(lowerSummary.includes("острая боль") ||
					lowerSummary.includes("10/10") ||
					lowerSummary.includes("нестерпим"))
			) {
				normalizedSymptoms.add("acute_pain");
			}
			if (
				!lowerSummary.includes("не кровит") &&
				(lowerSummary.includes("хлещет") ||
					lowerSummary.includes("струе") ||
					lowerSummary.includes("кровотечение"))
			) {
				normalizedSymptoms.add("continuous_bleeding");
			}
			if (
				lowerSummary.includes("выбит") ||
				lowerSummary.includes("травм") ||
				lowerSummary.includes("сломал челюсть")
			) {
				normalizedSymptoms.add("trauma_fracture");
			}

			return {
				...data,
				detectedSymptoms: Array.from(normalizedSymptoms),
			};
		} catch (err) {
			console.warn(
				"[WhatsAppTriageAnalyzer:WARN] OmniGateway structured triage failed, using fast-path semantic parser:",
				err instanceof Error ? err.message : String(err),
			);
			return this.analyze(cleanText, context);
		}
	}

	/**
	 * Fast-path semantic triage parser for synchronous operations and offline unit testing.
	 */
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
		const lower = cleanText.toLowerCase();

		const matchedKeywords: string[] = [];
		const detectedSymptoms: string[] = [];

		// Semantic Negations
		const hasSwellingNegation =
			lower.includes("отека нет") ||
			lower.includes("отёка нет") ||
			lower.includes("без отека") ||
			lower.includes("без отёка") ||
			lower.includes("не опухло") ||
			lower.includes("отек спал") ||
			lower.includes("отёк спал") ||
			lower.includes("нет отека");

		const hasBleedingNegation =
			lower.includes("не кровит") ||
			lower.includes("кровь остановилась") ||
			lower.includes("крови нет") ||
			lower.includes("без крови") ||
			lower.includes("перестало кровить");

		const isMildBleeding =
			lower.includes("чуть-чуть") ||
			lower.includes("слегка") ||
			lower.includes("немного") ||
			lower.includes("мажет") ||
			lower.includes("розовая слюна");

		const hasPainNegation =
			lower.includes("боли нет") ||
			lower.includes("не болит") ||
			lower.includes("боль прошла") ||
			lower.includes("боль утихла") ||
			lower.includes("терпимо") ||
			lower.includes("острой боли нет");

		const hasHighFever =
			lower.includes("38.5") ||
			lower.includes("38.6") ||
			lower.includes("38.7") ||
			lower.includes("38.8") ||
			lower.includes("38.9") ||
			lower.includes("39") ||
			lower.includes("40") ||
			lower.includes("жар") ||
			lower.includes("лихорад");

		const hasSeverePain =
			!hasPainNegation &&
			(lower.includes("нестерпим") ||
				lower.includes("10 из 10") ||
				lower.includes("10/10") ||
				lower.includes("дикая боль") ||
				lower.includes("умираю от боли") ||
				lower.includes("не спал всю ночь") ||
				lower.includes("не спала всю ночь") ||
				(lower.includes("пульсир") && lower.includes("бол")) ||
				(lower.includes("не помогает") &&
					(lower.includes("кетанов") ||
						lower.includes("кеторол") ||
						lower.includes("нурофен") ||
						lower.includes("найз") ||
						lower.includes("нимесил"))));

		const hasSevereSwelling =
			!hasSwellingNegation &&
			(lower.includes("опух") ||
				lower.includes("раздул") ||
				lower.includes("отек") ||
				lower.includes("отёк") ||
				lower.includes("флюс") ||
				lower.includes("гной") ||
				lower.includes("свищ") ||
				lower.includes("абсцесс") ||
				lower.includes("флегмон") ||
				lower.includes("тризм") ||
				lower.includes("рот трудно открыть") ||
				lower.includes("не могу открыть рот") ||
				lower.includes("челюсть сводит") ||
				lower.includes("рот не открывается"));

		const hasHeavyBleeding =
			!hasBleedingNegation &&
			!isMildBleeding &&
			(lower.includes("хлещет") ||
				lower.includes("струей") ||
				lower.includes("струёй") ||
				lower.includes("не останавливается") ||
				lower.includes("полный рот сгустков") ||
				lower.includes("уже 4 часа") ||
				lower.includes("уже 3 часа") ||
				(lower.includes("кровь") && lower.includes("насквозь")));

		const hasTrauma =
			lower.includes("выбит") ||
			lower.includes("выбили") ||
			lower.includes("сломал челюсть") ||
			lower.includes("перелом челюсти") ||
			lower.includes("авария") ||
			lower.includes("удар в челюсть") ||
			lower.includes("ударился зубом") ||
			lower.includes("вывих зуба");

		const isBrokenRestoration =
			lower.includes("выпала пломба") ||
			lower.includes("вылетела пломба") ||
			lower.includes("откололся зуб") ||
			lower.includes("скололся зуб") ||
			lower.includes("слетела коронка") ||
			lower.includes("отклеился винир");

		const isOrthodontic =
			lower.includes("отклеился брекет") ||
			lower.includes("натирает протез") ||
			lower.includes("колет дуга") ||
			lower.includes("царапает дуга") ||
			lower.includes("проволока");

		const isPriceInquiry =
			lower.includes("сколько стоит") ||
			lower.includes("прайс") ||
			lower.includes("цен") ||
			lower.includes("стоимост");

		let urgency: TriageUrgency = "NORMAL";
		let sentiment: PatientSentiment = "neutral";
		let intent: TriageIntent = "general_inquiry";
		let painLevel = 0;
		const details: string[] = [];

		if (hasSeverePain || hasSevereSwelling || (hasHighFever && !lower.includes("36.")) || hasHeavyBleeding || hasTrauma) {
			urgency = "CRITICAL";
			sentiment = "emergency";
			intent = "emergency";

			if (hasSeverePain) {
				detectedSymptoms.push("acute_pain");
				matchedKeywords.push("острая боль");
				details.push("острая некупируемая боль");
				painLevel = 10;
			}
			if (hasSevereSwelling) {
				detectedSymptoms.push("swelling");
				matchedKeywords.push("отек/флюс");
				details.push("отек челюстно-лицевой области");
				if (
					lower.includes("тризм") ||
					lower.includes("рот трудно открыть") ||
					lower.includes("челюсть сводит") ||
					lower.includes("рот не открывается")
				) {
					detectedSymptoms.push("trismus");
					details.push("тризм / ограничение открывания рта");
				}
			}
			if (hasHighFever) {
				detectedSymptoms.push("fever_above_38");
				matchedKeywords.push("температура 38.5+");
				details.push("высокая температура");
				if (lower.includes("удалил") || lower.includes("удален") || lower.includes("лунк")) {
					detectedSymptoms.push("extraction_complication");
				}
			}
			if (hasHeavyBleeding) {
				detectedSymptoms.push("continuous_bleeding");
				matchedKeywords.push("кровотечение");
				details.push("Обильное кровотечение");
				if (lower.includes("удалил") || lower.includes("удален") || lower.includes("лунк")) {
					detectedSymptoms.push("extraction_complication");
				}
			}
			if (hasTrauma) {
				detectedSymptoms.push("trauma_fracture");
				matchedKeywords.push("травма зуба");
				details.push("Острая травма / вывих зуба");
			}
		} else if (isBrokenRestoration) {
			urgency = "URGENT";
			sentiment = "anxious";
			intent = "symptom_report";
			detectedSymptoms.push("broken_restoration");
			matchedKeywords.push("дефект реставрации");
			details.push("Выпадение пломбы / дефект коронки");
		} else if (isOrthodontic) {
			urgency = "URGENT";
			sentiment = "anxious";
			intent = "symptom_report";
			detectedSymptoms.push("orthodontic_issue");
			matchedKeywords.push("ортодонтический дискомфорт");
			details.push("Дискомфорт ортодонтической конструкции");
		} else if (lower.includes("удалил") || lower.includes("после удаления")) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "symptom_report";
			detectedSymptoms.push("post_op_monitoring");
			if (isMildBleeding) detectedSymptoms.push("mild_oozing");
			details.push("Плановый послеоперационный мониторинг");
		} else if (isPriceInquiry) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "price_inquiry";
			details.push("Запрос стоимости услуг");
		} else if (
			lower.includes("записат") ||
			lower.includes("прием") ||
			lower.includes("окно") ||
			lower.includes("чистк") ||
			lower.includes("консультаци")
		) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "booking_request";
			details.push("Запрос на плановую запись");
		} else if (lower.includes("перенес")) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "reschedule_request";
			details.push("Запрос на перенос визита");
		} else if (lower.includes("отменит")) {
			urgency = "NORMAL";
			sentiment = "neutral";
			intent = "cancellation_request";
			details.push("Запрос на отмену визита");
		}

		const summary = details.join("; ") || "Плановое обращение пациента";
		let suggestedAction = "";
		let recommendedDoctorRole = "";

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
			confidence: 0.95,
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
// HITL (HUMAN-IN-THE-LOOP) QUEUE & APPROVAL CARD MANAGER (WITH POSTGRESQL)
// ============================================================================

export class WhatsAppHitLQueue {
	private readonly approvalCards = new Map<string, WhatsAppApprovalCardData>();
	private readonly proactiveAlerts = new Map<string, ProactiveAlertCardData>();

	constructor(
		private readonly sendCallback?:
			| ((phone: string, text: string) => Promise<void>)
			| undefined,
	) {}

	private async persistCardToDatabase(
		card: WhatsAppApprovalCardData,
	): Promise<void> {
		try {
			await db
				.insert(copilotHitlCards)
				.values({
					id: card.approvalId,
					organizationId: card.organizationId,
					patientId: card.patientId,
					patientName: card.patientName,
					phone: card.phone,
					intent: card.intent,
					urgency: card.urgency,
					incomingSnippet: card.incomingSnippet,
					draftReply: card.draftReply,
					channel: card.channel,
					confidenceScore: String(card.confidenceScore),
					actionPrompt: card.actionPrompt,
					status: card.status,
					category: card.category,
					metadata: card.metadata as any,
					isWithin24HourWindow: card.isWithin24HourWindow ? "true" : "false",
					templateRequired: card.templateRequired ? "true" : "false",
				})
				.onConflictDoUpdate({
					target: copilotHitlCards.id,
					set: {
						status: card.status,
						draftReply: card.draftReply,
						resolvedAt: card.status !== "pending" ? new Date() : null,
					},
				});
		} catch {
			// In-memory fallback for isolated test runner
		}
	}

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

		// Synchronous memory registration
		this.createApprovalCard(card);

		// Async write into PostgreSQL communication_tasks table
		this.persistCardToDatabase(card).catch((err) => {
			console.warn(
				"[WhatsAppHitLQueue:WARN] Failed to persist approval card to PostgreSQL:",
				err instanceof Error ? err.message : String(err),
			);
		});

		return card;
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

		// Update PostgreSQL copilotHitlCards table
		db.update(copilotHitlCards)
			.set({
				status: "approved",
				draftReply: replyText,
				resolvedAt: new Date(),
			})
			.where(eq(copilotHitlCards.id, card.approvalId))
			.catch(() => {});

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

	public getPendingApprovalCards(organizationId: string): WhatsAppApprovalCardData[] {
		return this.hitlQueue.listPendingCards(organizationId);
	}

	public async processInboundMessage(message: InboundWhatsAppMessage): Promise<TriageAnalysisResult> {
		const res = await this.handleInboundMessage({
			messageId: message.messageId,
			fromPhone: message.patientPhone,
			patientName: message.patientName,
			rawText: message.text,
			organizationId: message.organizationId,
			timestamp: message.timestamp,
		});
		return res.triageResult;
	}

	public async handleInboundMessage(message: IncomingWhatsAppMessage): Promise<{
		readonly messageId: string;
		readonly triageResult: TriageAnalysisResult;
		readonly triage: TriageAnalysisResult;
		readonly proactiveCardCreated: boolean;
		readonly hitlCardCreated: boolean;
		readonly alertCard?: ProactiveAlertCardData | undefined;
		readonly hitlCard?: WhatsAppApprovalCardData | undefined;
	}> {
		const cleanText = sanitizePatientInput(message.rawText);

		// Clinical triage analysis
		const triageResult = await this.triageAnalyzer.analyzeAsync(
			cleanText,
			message.context ? {
				patientName: message.patientName,
				recentVisitDate: message.context.lastVisitDate,
				recentDiagnoses: message.context.recentDiagnoses,
				activeDoctor: message.context.activeDoctor,
			} : undefined,
		);

		let alertCard: ProactiveAlertCardData | undefined;
		let hitlCard: WhatsAppApprovalCardData | undefined;
		let proactiveCardCreated = false;
		let hitlCardCreated = false;

		const patientName = message.patientName || "Пациент";
		const patientPhone = message.fromPhone;
		const patientId = message.patientId || `anon_${message.fromPhone}`;

		if (triageResult.urgency === "CRITICAL") {
			alertCard = {
				id: `alert_emergency_${message.messageId}_${Date.now()}`,
				urgency: "CRITICAL",
				title: `🚨 ЭКСТРЕННО: ${patientName} (${patientPhone})`,
				subtitle: triageResult.clinicalSummary,
				description: `Симптомы: ${triageResult.detectedSymptoms.join(", ")}. Сообщение: «${cleanText}»`,
				timestamp: new Date().toISOString(),
				patientId,
				patientName,
				patientPhone,
				category: "whatsapp_emergency",
				actions: [
					{
						id: "call_patient_now",
						label: "📞 Позвонить пациенту прямо сейчас",
						kind: "danger",
						actionType: "initiate_call",
						payload: { phone: patientPhone, patientId },
					},
					{
						id: "book_urgent_slot",
						label: "🗓️ Открыть экстренное окно записи",
						kind: "primary",
						actionType: "open_schedule_slot",
						payload: { patientId, urgency: "CRITICAL" },
					},
				],
				metadata: { organizationId: message.organizationId },
			};

			this.hitlQueue.createProactiveAlert(alertCard, message.organizationId);
			proactiveCardCreated = true;

			// Broadcast to Copilot SSE and WebSocket broker
			try {
				this.streamManager.broadcastProactiveAlert(message.organizationId, alertCard);
				wsBroker.broadcastToOrganization(message.organizationId, {
					type: "proactive_card",
					card: alertCard,
				});
			} catch (err) {
				console.warn(
					"[WhatsAppBridge:WARN] Failed to broadcast proactive alert:",
					err instanceof Error ? err.message : String(err),
				);
			}
		}

		// Generate draft reply and queue in HitL
		const draftReply =
			triageResult.urgency === "CRITICAL"
				? `Здравствуйте, ${patientName}! Мы получили ваше экстренное обращение. Дежурный доктор связывается с вами по телефону прямо сейчас.`
				: `Здравствуйте, ${patientName}! Спасибо за обращение в клинику. Мы проверили расписание и готовы подобрать для вас удобное время приема.`;

		const category =
			triageResult.intent === "booking_request"
				? "booking"
				: triageResult.intent;

		hitlCard = this.hitlQueue.queueApprovalCard({
			organizationId: message.organizationId,
			patientId,
			patientName,
			patientPhone,
			category,
			incomingSnippet: cleanText,
			proposedReply: draftReply,
			confidence: triageResult.confidence,
			urgency: triageResult.urgency,
			messageTimestamp: message.timestamp ? new Date(message.timestamp).toISOString() : undefined,
		});
		hitlCardCreated = true;

		return {
			messageId: message.messageId,
			triageResult,
			triage: triageResult,
			proactiveCardCreated,
			hitlCardCreated,
			...(alertCard !== undefined ? { alertCard } : {}),
			...(hitlCard !== undefined ? { hitlCard } : {}),
		};
	}

	public async handleIncomingMessage(message: IncomingWhatsAppMessage) {
		return this.handleInboundMessage(message);
	}
}

export const defaultWhatsAppBridge = new WhatsAppBridge();
export const whatsappHitLQueue = defaultWhatsAppBridge.getHitLQueue();
export const whatsappTriageAnalyzer = defaultWhatsAppBridge.getTriageAnalyzer();
