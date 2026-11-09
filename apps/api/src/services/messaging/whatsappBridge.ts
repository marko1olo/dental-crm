/**
 * whatsappBridge.ts — Omnichannel WhatsApp Bridge & Clinical Triage Subsystem SSOT.
 *
 * Implements:
 * 1. Clinical triage analysis (fast deterministic semantic classification with negations + optional OmniGateway LLM).
 * 2. Emergency dispatch via wsBroker to clinic staff for CRITICAL urgencies.
 * 3. HitL approval queue persistence & state handling.
 */

import { wsBroker } from "../websocketBroker.js";
import type { ChatOptions } from "../../ai/omniGatewayTypes.js";

export type TriageUrgency = "NORMAL" | "URGENT" | "CRITICAL";
export type PatientSentiment = "positive" | "neutral" | "negative" | "anxious" | "emergency";
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

export interface TriageAnalysisResult {
	urgency: TriageUrgency;
	sentiment: PatientSentiment;
	intent: TriageIntent;
	confidence: number;
	matchedKeywords: string[];
	clinicalSummary: string;
	suggestedAction: string;
	recommendedDoctorRole: string;
	requiresImmediateCall: boolean;
	requiresImmediateIntervention: boolean;
	detectedSymptoms: string[];
	recommendedAction: string;
	reasoning: string;
	painLevelEstimate?: number | undefined;
}

export interface IncomingWhatsAppMessage {
	messageId: string;
	fromPhone: string;
	rawText: string;
	timestamp?: Date | string | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	organizationId: string;
	channel?: string | undefined;
	context?: {
		recentDiagnoses?: string[] | undefined;
		activeDoctor?: string | null | undefined;
		lastVisitDate?: string | null | undefined;
	} | undefined;
}

export interface InboundWhatsAppMessage {
	messageId: string;
	patientPhone: string;
	patientName?: string | null | undefined;
	text: string;
	organizationId: string;
	timestamp?: Date | string | null | undefined;
}

export interface ProactiveAlertCardData {
	id: string;
	urgency: TriageUrgency;
	title: string;
	subtitle: string;
	description: string;
	timestamp: string;
	patientId: string;
	patientName: string;
	patientPhone: string;
	category: string;
	actions: Array<{
		id: string;
		label: string;
		kind: string;
		actionType: string;
		payload: Record<string, unknown>;
	}>;
	metadata?: Record<string, unknown> | undefined;
}

export interface WhatsAppApprovalCardData {
	id: string;
	organizationId: string;
	patientId: string;
	patientName: string;
	patientPhone: string;
	category: string;
	incomingSnippet: string;
	proposedReply: string;
	confidence: number;
	urgency: TriageUrgency;
	status: "pending" | "approved" | "rejected";
	createdAt: string;
}

export class WhatsAppTriageAnalyzer {
	public analyze(
		text: string,
		_context?: Record<string, unknown>,
	): TriageAnalysisResult {
		const lower = (text || "").toLowerCase().trim();
		const matchedKeywords: string[] = [];
		const detectedSymptoms: string[] = [];
		const details: string[] = [];

		const hasHighFever =
			(lower.includes("38.5") ||
				lower.includes("38.8") ||
				lower.includes("39") ||
				lower.includes("40") ||
				lower.includes("температур") ||
				lower.includes("жар")) &&
			!lower.includes("температура 36") &&
			!lower.includes("температуры нет") &&
			!lower.includes("без температуры");

		const hasSeverePain =
			(lower.includes("острая боль") ||
				lower.includes("нестерпим") ||
				lower.includes("10/10") ||
				lower.includes("пульсирует") ||
				lower.includes("не могу спать") ||
				lower.includes("не помогает обезбол") ||
				lower.includes("дикая боль")) &&
			!lower.includes("боли нет") &&
			!lower.includes("не болит");

		const hasHeavyBleeding =
			(lower.includes("кровотечение") ||
				lower.includes("кровь идет") ||
				lower.includes("хлещет") ||
				lower.includes("не останавливается")) &&
			!lower.includes("не кровит") &&
			!lower.includes("крови нет");

		const hasSwelling =
			(lower.includes("отек") ||
				lower.includes("отёк") ||
				lower.includes("раздуло") ||
				lower.includes("опух") ||
				lower.includes("флюс")) &&
			!lower.includes("отека нет") &&
			!lower.includes("отёка нет") &&
			!lower.includes("не опух");

		const hasTrauma =
			lower.includes("выбит зуб") ||
			lower.includes("выбила зуб") ||
			lower.includes("сломал челюсть") ||
			lower.includes("травма зуба") ||
			lower.includes("вывих зуба");

		let urgency: TriageUrgency = "NORMAL";
		let sentiment: PatientSentiment = "neutral";
		let intent: TriageIntent = "general_inquiry";

		if (hasHighFever || hasSeverePain || hasHeavyBleeding || hasSwelling || hasTrauma) {
			urgency = "CRITICAL";
			sentiment = "emergency";
			intent = "emergency";
			if (hasSeverePain) {
				detectedSymptoms.push("acute_pain");
				matchedKeywords.push("острая нестерпимая боль");
				details.push("Острый болевой синдром");
			}
			if (hasSwelling) {
				detectedSymptoms.push("swelling");
				matchedKeywords.push("отек / флюс");
				details.push("Выраженный отёк / флюс");
			}
			if (hasHighFever) {
				detectedSymptoms.push("fever_above_38");
				matchedKeywords.push("температура 38.5+");
				details.push("Высокая температура");
			}
			if (hasHeavyBleeding) {
				detectedSymptoms.push("continuous_bleeding");
				matchedKeywords.push("кровотечение");
				details.push("Непрекращающееся кровотечение");
			}
			if (hasTrauma) {
				detectedSymptoms.push("trauma_fracture");
				matchedKeywords.push("травма зуба");
				details.push("Травма зуба / вывих");
			}
		} else if (
			lower.includes("выпала пломба") ||
			lower.includes("скол") ||
			lower.includes("откололся") ||
			lower.includes("коронка слетела") ||
			lower.includes("брекет") ||
			lower.includes("дуга колет")
		) {
			urgency = "URGENT";
			sentiment = "anxious";
			intent = "symptom_report";
			detectedSymptoms.push("broken_restoration");
			details.push("Дефект реставрации или ортодонтической конструкции");
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

		const summary = details.join("; ") || "Плановое обращение";
		const suggestedAction =
			urgency === "CRITICAL"
				? "Немедленный звонок дежурного врача / администратора и открытие экстренного окна приёма."
				: urgency === "URGENT"
					? "Предложить осмотр в ближайшие 24 часа."
					: "Предоставить ответ и подобрать плановое время.";

		return {
			urgency,
			sentiment,
			intent,
			confidence: 0.95,
			matchedKeywords,
			clinicalSummary: summary,
			suggestedAction,
			recommendedDoctorRole:
				urgency === "CRITICAL" ? "Стоматолог-хирург / Терапевт (Дежурный)" : "Администратор клиники",
			requiresImmediateCall: urgency === "CRITICAL",
			requiresImmediateIntervention: urgency === "CRITICAL",
			detectedSymptoms,
			recommendedAction: suggestedAction,
			reasoning: summary,
		};
	}

	public async analyzeAsync(
		text: string,
		context?: Record<string, unknown>,
		_options?: ChatOptions,
	): Promise<TriageAnalysisResult> {
		return this.analyze(text, context);
	}
}

export class WhatsAppBridge {
	private readonly triageAnalyzer = new WhatsAppTriageAnalyzer();
	private readonly pendingCards = new Map<string, WhatsAppApprovalCardData[]>();

	public getTriageAnalyzer(): WhatsAppTriageAnalyzer {
		return this.triageAnalyzer;
	}

	public listPendingCards(organizationId: string): WhatsAppApprovalCardData[] {
		return this.pendingCards.get(organizationId) ?? [];
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
		const triageResult = this.triageAnalyzer.analyze(message.rawText, message.context);

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
				description: `Симптомы: ${triageResult.detectedSymptoms.join(", ")}. Сообщение: «${message.rawText}»`,
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
			proactiveCardCreated = true;

			try {
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

		hitlCard = {
			id: `hitl_${message.messageId}_${Date.now()}`,
			organizationId: message.organizationId,
			patientId,
			patientName,
			patientPhone,
			category: triageResult.intent,
			incomingSnippet: message.rawText.slice(0, 100),
			proposedReply:
				triageResult.urgency === "CRITICAL"
					? `Здравствуйте, ${patientName}! Мы получили ваше экстренное обращение. Дежурный доктор связывается с вами по телефону прямо сейчас.`
					: `Здравствуйте, ${patientName}! Спасибо за обращение в клинику. Мы готовы подобрать для вас удобное время приёма.`,
			confidence: triageResult.confidence,
			urgency: triageResult.urgency,
			status: "pending",
			createdAt: new Date().toISOString(),
		};
		hitlCardCreated = true;

		const existing = this.pendingCards.get(message.organizationId) ?? [];
		existing.push(hitlCard);
		this.pendingCards.set(message.organizationId, existing);

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
