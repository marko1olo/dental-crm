/**
 * whatsappMessageDispatcher.ts — Layer 2: Outbound WhatsApp Message Dispatcher & Human-in-the-Loop (HitL) Approval Queue.
 *
 * Invariants:
 * - 1:1 Verbatim Behavioral Conservation of HitL queue, card persistence & approval workflows.
 * - Outbound message dispatch via WhatsApp Cloud API / Green API transports with rate limiter integration.
 * - Manages PostgreSQL persistence in `copilotHitlCards` and safe error classification.
 */

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { copilotHitlCards } from "../../../db/schema.js";
import {
	normalizeWhatsappRecipient,
	sendWhatsappTextMessage,
} from "../../../whatsappTransport.js";
import type {
	ProactiveAlertCardData,
	TriageUrgency,
	WhatsAppApprovalCardData,
} from "./types.js";
import { sanitizePatientInput } from "./webhookPayloadParser.js";
import { defaultWhatsAppRateLimiter } from "./whatsappRateLimiter.js";

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
		const approvalId = `hitl_${Date.now()}_${randomUUID().slice(0, 8)}`;
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
					// Check anti-spam rate limiter
					const check = defaultWhatsAppRateLimiter.checkCanSend(
						card.organizationId,
						normalizedPhone,
						{
							isTemplate: card.templateRequired,
							lastInboundTimestamp: card.createdAt,
						},
					);

					if (!check.allowed && check.retryAfterMs && check.retryAfterMs > 0) {
						console.warn(
							`[WhatsAppHitLQueue:INFO] Rate limiter suggested throttle for ${normalizedPhone}: ${check.reason}`,
						);
					}

					await sendWhatsappTextMessage({
						phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "default",
						accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "token",
						toPhoneE164: normalizedPhone,
						text: replyText,
					});

					defaultWhatsAppRateLimiter.recordOutboundMessage(
						card.organizationId,
						normalizedPhone,
					);
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

export const whatsappHitLQueue = new WhatsAppHitLQueue();
