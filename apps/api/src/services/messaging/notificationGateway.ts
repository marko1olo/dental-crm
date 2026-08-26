/**
 * Notification & Communication Gateway
 *
 * Coordinates multi-channel dispatch, outbox queuing, 24h Meta session window gating,
 * patient phone resolution, delivery receipt tracking, and inbound message ingestion.
 */

import { and, eq, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	communicationOutbox,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import { wsBroker } from "../websocketBroker.js";
import { channelRegistry } from "./channelRegistry.js";
import { RecallStateMachine } from "./recallStateMachine.js";
import { templateEngine } from "./templateEngine.js";
import type {
	Channel,
	DeliveryReceiptEvent,
	InboundWebhookEvent,
	InteractiveActionPayload,
	InteractiveButton,
	MessageKind,
	OutboundMessage,
	SendStatus,
	SupportedLocale,
} from "./types.js";
import { defaultWhatsappAdapter } from "./whatsappKapsoAdapter.js";

// Ensure default WhatsApp adapter is registered in channelRegistry
channelRegistry.register(defaultWhatsappAdapter);

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const BACKOFF_CAP_SECONDS = 3600;

export function calculateBackoffSeconds(attempts: number): number {
	return Math.min(60 * Math.pow(2, Math.max(0, attempts - 1)), BACKOFF_CAP_SECONDS);
}

export function isSessionWindowOpen(lastInboundAt: Date | string | null | undefined): boolean {
	if (!lastInboundAt) return false;
	const dateObj = typeof lastInboundAt === "string" ? new Date(lastInboundAt) : lastInboundAt;
	if (isNaN(dateObj.getTime())) return false;
	return Date.now() - dateObj.getTime() < SESSION_WINDOW_MS;
}

export interface EnqueueNotificationOptions {
	organizationId: string;
	clinicId?: string | null;
	patientId?: string | null;
	recipientAddress?: string | null;
	channel?: Channel;
	templateKey: string;
	locale?: SupportedLocale | string;
	context?: Record<string, unknown>;
	messageKind?: MessageKind;
	bodyText?: string | null;
	buttons?: InteractiveButton[];
	dedupeKey?: string | null;
	forceSend?: boolean;
	taskId?: string | null;
	templateId?: string | null;
	lastInboundAt?: Date | null;
}

export interface EnqueueResult {
	queued: boolean;
	outboxId?: string | undefined;
	status: SendStatus;
	reason?: string | undefined;
}

export class NotificationGateway {
	/**
	 * Resolves a patient in an organization by phone number (exact or last 9 digits).
	 */
	public static async resolvePatientByPhone(
		organizationId: string,
		phone: string,
	): Promise<{ id: string; fullName: string; phone: string | null } | null> {
		const rawDigits = phone.replace(/\D/g, "");
		if (rawDigits.length < 6) return null;

		// Exact match
		const [exact] = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
			})
			.from(patients)
			.where(and(eq(patients.organizationId, organizationId), eq(patients.phone, phone)))
			.limit(1);

		if (exact) return exact;

		// Suffix match (e.g. last 9-10 digits)
		const suffix = rawDigits.slice(-9);
		const candidates = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
			})
			.from(patients)
			.where(and(eq(patients.organizationId, organizationId), sql`${patients.phone} IS NOT NULL`))
			.limit(50);

		for (const cand of candidates) {
			const candDigits = (cand.phone || "").replace(/\D/g, "");
			if (candDigits.endsWith(suffix) || suffix.endsWith(candDigits)) {
				return cand;
			}
		}

		return null;
	}

	/**
	 * Enqueue a message into the durable communication outbox.
	 */
	public static async enqueue(options: EnqueueNotificationOptions): Promise<EnqueueResult> {
		const {
			organizationId,
			clinicId,
			patientId,
			templateKey,
			locale = "ru",
			context = {},
			messageKind = "template",
			forceSend = false,
			dedupeKey,
		} = options;

		// Idempotency dedupe check
		if (dedupeKey) {
			const [existing] = await db
				.select({ id: communicationOutbox.id })
				.from(communicationOutbox)
				.where(
					and(
						eq(communicationOutbox.organizationId, organizationId),
						eq(communicationOutbox.dedupeKey, dedupeKey),
					),
				)
				.limit(1);

			if (existing) {
				return {
					queued: false,
					outboxId: existing.id,
					status: "skipped",
					reason: "duplicate_dedupe_key",
				};
			}
		}

		// Check patient details
		let targetPatient: { id: string; phone: string | null; fullName: string } | null = null;
		if (patientId) {
			const [p] = await db
				.select({
					id: patients.id,
					phone: patients.phone,
					fullName: patients.fullName,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
				.limit(1);
			targetPatient = p ?? null;
		}

		const resolvedAddress = options.recipientAddress || targetPatient?.phone;
		if (!resolvedAddress) {
			return {
				queued: false,
				status: "skipped",
				reason: "missing_recipient_address",
			};
		}

		const targetChannel = options.channel || "whatsapp";

		// Session-window gating for free-form replies on WhatsApp
		if (targetChannel === "whatsapp" && messageKind === "session" && !forceSend) {
			const windowOpen = isSessionWindowOpen(options.lastInboundAt);
			if (!windowOpen) {
				return {
					queued: false,
					status: "skipped",
					reason: "whatsapp_session_window_closed",
				};
			}
		}

		// Adapter resolution
		const adapter = channelRegistry.getForChannel(targetChannel);
		if (!adapter) {
			return {
				queued: false,
				status: "skipped",
				reason: `no_adapter_registered_for_${targetChannel}`,
			};
		}

		const isSupported = await adapter.supports(organizationId);
		if (!isSupported && !forceSend) {
			return {
				queued: false,
				status: "skipped",
				reason: `channel_${targetChannel}_not_configured`,
			};
		}

		// Render template content
		let subject: string | null = null;
		let bodyText: string;

		if (messageKind === "session" && options.bodyText) {
			bodyText = options.bodyText;
		} else {
			const rendered = templateEngine.render(templateKey, locale, {
				...context,
				patient_name: targetPatient?.fullName || context.patient_name || "",
			});
			subject = rendered.subject;
			bodyText = rendered.bodyText;
		}

		const generatedDedupeKey = dedupeKey || `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

		const [inserted] = await db
			.insert(communicationOutbox)
			.values({
				organizationId,
				clinicId: clinicId ?? null,
				patientId: patientId ?? null,
				taskId: options.taskId ?? null,
				templateId: options.templateId ?? null,
				channel: targetChannel,
				intent: "general",
				scope: "service",
				recipientAddress: resolvedAddress,
				subject,
				body: bodyText,
				status: "queued",
				attempts: 0,
				maxAttempts: 5,
				dedupeKey: generatedDedupeKey,
				scheduledAt: new Date(),
				nextAttemptAt: new Date(),
			})
			.returning({ id: communicationOutbox.id });

		const res: EnqueueResult = {
			queued: true,
			status: "queued",
		};
		if (inserted?.id) {
			res.outboxId = inserted.id;
		}
		return res;
	}

	/**
	 * Dispatches pending outbox rows with retry and exponential backoff.
	 */
	public static async dispatchOutbox(limit = 20): Promise<{ processed: number; sent: number; failed: number }> {
		const now = new Date();

		const rows = await db
			.select()
			.from(communicationOutbox)
			.where(
				and(
					or(eq(communicationOutbox.status, "queued"), eq(communicationOutbox.status, "failed")),
					lte(communicationOutbox.nextAttemptAt, now),
					sql`${communicationOutbox.attempts} < ${communicationOutbox.maxAttempts}`,
				),
			)
			.limit(limit);

		let sentCount = 0;
		let failedCount = 0;

		for (const row of rows) {
			const adapter = channelRegistry.getForChannel(row.channel);
			if (!adapter) {
				await db
					.update(communicationOutbox)
					.set({
						status: "failed",
						lastErrorMessage: `No adapter for channel ${row.channel}`,
						updatedAt: new Date(),
					})
					.where(eq(communicationOutbox.id, row.id));
				failedCount++;
				continue;
			}

			const outboundMsg: OutboundMessage = {
				channel: row.channel as Channel,
				toAddress: row.recipientAddress,
				organizationId: row.organizationId,
				templateKey: row.intent || "general",
				subject: row.subject,
				bodyText: row.body,
				patientId: row.patientId,
			};

			const result = await adapter.send(outboundMsg);

			if (result.status === "sent") {
				await db
					.update(communicationOutbox)
					.set({
						status: "sent",
						sentAt: result.sentAt || new Date(),
						providerMessageId: result.providerMessageId || null,
						lastErrorMessage: null,
						attempts: row.attempts + 1,
						updatedAt: new Date(),
					})
					.where(eq(communicationOutbox.id, row.id));

				// Log event
				if (row.patientId) {
					await db.insert(communicationEvents).values({
						organizationId: row.organizationId,
						patientId: row.patientId,
						channel: row.channel,
						direction: "outbound",
						status: "sent",
						message: row.body,
					});
				}

				sentCount++;
			} else {
				const nextAttempts = row.attempts + 1;
				const backoffSec = calculateBackoffSeconds(nextAttempts);
				const nextAttempt = new Date(Date.now() + backoffSec * 1000);

				await db
					.update(communicationOutbox)
					.set({
						status: "failed",
						attempts: nextAttempts,
						nextAttemptAt: nextAttempt,
						lastErrorMessage: result.errorMessage || "Send failure",
						updatedAt: new Date(),
					})
					.where(eq(communicationOutbox.id, row.id));

				failedCount++;
			}
		}

		return {
			processed: rows.length,
			sent: sentCount,
			failed: failedCount,
		};
	}

	/**
	 * Records a delivery receipt (delivered / read / failed).
	 */
	public static async recordDeliveryReceipt(
		event: DeliveryReceiptEvent,
	): Promise<{ updated: boolean; outboxId?: string | undefined }> {
		const [row] = await db
			.select()
			.from(communicationOutbox)
			.where(
				and(
					eq(communicationOutbox.organizationId, event.organizationId),
					eq(communicationOutbox.providerMessageId, event.providerMessageId),
				),
			)
			.limit(1);

		if (!row) return { updated: false };

		const outboxStatus: "delivered" | "failed" = event.status === "failed" ? "failed" : "delivered";

		await db
			.update(communicationOutbox)
			.set({
				status: outboxStatus,
				deliveredAt: event.status === "delivered" || event.status === "read" ? event.timestamp : row.deliveredAt,
				receiptDetail: event.errorMessage ? String(event.errorMessage) : null,
				updatedAt: new Date(),
			})
			.where(eq(communicationOutbox.id, row.id));

		return { updated: true, outboxId: row.id };
	}

	/**
	 * Ingests an inbound patient reply, updates 24h session window, and triggers recall state machine.
	 */
	public static async recordInboundReply(
		event: InboundWebhookEvent,
	): Promise<{ ingested: boolean; eventId?: string | undefined; patientId?: string | null | undefined }> {
		// Dedup check on providerMessageId
		if (event.providerMessageId) {
			const [dup] = await db
				.select({ id: messengerInboundEvents.id })
				.from(messengerInboundEvents)
				.where(
					and(
						eq(messengerInboundEvents.organizationId, event.organizationId),
						eq(messengerInboundEvents.externalId, event.providerMessageId),
					),
				)
				.limit(1);

			if (dup) return { ingested: false, eventId: dup.id };
		}

		// Resolve patient if needed
		let patientId = event.patientId ?? null;
		if (!patientId) {
			const resolved = await NotificationGateway.resolvePatientByPhone(
				event.organizationId,
				event.fromAddress,
			);
			patientId = resolved?.id ?? null;
		}

		// Ingest into messengerInboundEvents
		const [inbound] = await db
			.insert(messengerInboundEvents)
			.values({
				organizationId: event.organizationId,
				channel: event.channel,
				externalId: event.providerMessageId,
				externalChatId: event.fromAddress,
				patientId,
				messageText: event.bodyText,
				eventKind: event.interactivePayload ? "command" : "message",
				rawPayload: event.rawPayload || {},
			})
			.returning({ id: messengerInboundEvents.id });

		// Ingest into communicationEvents
		if (patientId) {
			await db.insert(communicationEvents).values({
				organizationId: event.organizationId,
				patientId,
				channel: event.channel,
				direction: "inbound",
				status: "delivered",
				message: event.bodyText,
			});
		}

		// Notify WebSockets
		wsBroker.broadcastToOrganization(event.organizationId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel: event.channel,
				patientId,
				from: event.fromAddress,
				text: event.bodyText,
				occurredAt: event.occurredAt.toISOString(),
			},
		});

		const result: { ingested: boolean; eventId?: string; patientId?: string | null } = {
			ingested: true,
			patientId,
		};
		if (inbound?.id) {
			result.eventId = inbound.id;
		}
		return result;
	}
}
