/**
 * whatsappBridgeCoordinator.ts — Layer 3/4: WhatsApp Omnichannel Bridge Coordinator.
 *
 * Invariants:
 * - Coordinates Clinical Triage Analyzer, HitL Approval Queue, WebSocket Broker and Copilot SSE Streams.
 * - 1:1 Verbatim Behavioral Conservation of inbound message handling & emergency alert broadcasting.
 */

import { wsBroker } from "../../websocketBroker.js";
import {
	type CopilotStreamManager,
	defaultCopilotStreamManager,
} from "../copilotService.js";
import {
	WhatsAppTriageAnalyzer,
	whatsappTriageAnalyzer,
} from "./clinicalTriageAnalyzer.js";
import { defaultPatientContextResolver } from "./patientContextResolver.js";
import type {
	InboundWhatsAppMessage,
	IncomingWhatsAppMessage,
	ProactiveAlertCardData,
	TriageAnalysisResult,
	WhatsAppApprovalCardData,
} from "./types.js";
import { sanitizePatientInput } from "./webhookPayloadParser.js";
import {
	WhatsAppHitLQueue,
	whatsappHitLQueue,
} from "./whatsappMessageDispatcher.js";

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
			options?.triageAnalyzer ?? whatsappTriageAnalyzer;
		this.hitlQueue = options?.hitlQueue ?? whatsappHitLQueue;
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

		// Resolve patient context from database if not already provided
		const enrichedMessage = await defaultPatientContextResolver.enrichInboundMessage(message);

		// Clinical triage analysis
		const triageResult = await this.triageAnalyzer.analyzeAsync(
			cleanText,
			enrichedMessage.context ? {
				patientName: enrichedMessage.patientName,
				recentVisitDate: enrichedMessage.context.lastVisitDate,
				recentDiagnoses: enrichedMessage.context.recentDiagnoses,
				activeDoctor: enrichedMessage.context.activeDoctor,
			} : undefined,
		);

		let alertCard: ProactiveAlertCardData | undefined;
		let hitlCard: WhatsAppApprovalCardData | undefined;
		let proactiveCardCreated = false;
		let hitlCardCreated = false;

		const patientName = enrichedMessage.patientName || "Пациент";
		const patientPhone = enrichedMessage.fromPhone;
		const patientId = enrichedMessage.patientId || `anon_${enrichedMessage.fromPhone}`;

		if (triageResult.urgency === "CRITICAL") {
			alertCard = {
				id: `alert_emergency_${enrichedMessage.messageId}_${Date.now()}`,
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
				metadata: { organizationId: enrichedMessage.organizationId },
			};

			this.hitlQueue.createProactiveAlert(alertCard, enrichedMessage.organizationId);
			proactiveCardCreated = true;

			// Broadcast to Copilot SSE and WebSocket broker
			try {
				this.streamManager.broadcastProactiveAlert(enrichedMessage.organizationId, alertCard);
				wsBroker.broadcastToOrganization(enrichedMessage.organizationId, {
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
			organizationId: enrichedMessage.organizationId,
			patientId,
			patientName,
			patientPhone,
			category,
			incomingSnippet: cleanText,
			proposedReply: draftReply,
			confidence: triageResult.confidence,
			urgency: triageResult.urgency,
			messageTimestamp: enrichedMessage.timestamp ? new Date(enrichedMessage.timestamp).toISOString() : undefined,
		});
		hitlCardCreated = true;

		return {
			messageId: enrichedMessage.messageId,
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
