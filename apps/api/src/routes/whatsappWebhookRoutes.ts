/**
 * whatsappWebhookRoutes.ts — Webhook endpoints for Meta WhatsApp Business Cloud API.
 *
 * Canonical unified router for Meta Webhooks.
 * Supports both canonical endpoint `/api/whatsapp/webhook` and compatibility alias `/api/v1/webhooks/whatsapp`.
 * Handles Meta webhook handshake (GET) and inbound event ingestion (POST) with HMAC-SHA256 signature
 * verification, DLR delivery receipts, message deduplication, and automated interactive button reply processing.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { namedDevelopmentModeActive } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import {
	applyReceipts,
	parseWhatsappStatuses,
} from "../services/communications/deliveryReceipts.js";
import { processInboundEvents } from "../services/messengerIngestion.js";
import {
	parseIncomingAction,
	processAppointmentCancellation,
	processAppointmentConfirmation,
	processRecallBooking,
	processRecallSnooze,
	type ParsedWebhookAction,
} from "../services/messaging/whatsappInteractiveActions.js";

export {
	parseIncomingAction,
	processAppointmentCancellation,
	processAppointmentConfirmation,
	processRecallBooking,
	processRecallSnooze,
	type ParsedWebhookAction,
};

const DEFAULT_VERIFY_TOKEN =
	process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "dente_whatsapp_verify_token";

/**
 * Meta App Secret used to verify the `x-hub-signature-256` header on inbound
 * webhook payloads. Stored server-side only via env (never in the DB or client
 * bundle).
 */
export function configuredWhatsappAppSecret(): string | null {
	const raw = process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET;
	const trimmed = typeof raw === "string" ? raw.trim() : "";
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Verifies Meta's `x-hub-signature-256` header: HMAC-SHA256 of the raw request
 * body keyed by the App Secret, hex-encoded and prefixed with `sha256=`.
 * Uses a constant-time comparison to avoid leaking the signature via timing.
 */
export function isValidWhatsappSignature(
	rawBody: Buffer | string,
	signatureHeader: string | null,
	appSecret: string,
): boolean {
	if (!signatureHeader?.startsWith("sha256=")) return false;
	const provided = signatureHeader.slice("sha256=".length).trim();
	if (!/^[0-9a-f]+$/i.test(provided)) return false;

	const expected = createHmac("sha256", appSecret)
		.update(rawBody)
		.digest("hex");

	const providedDigest = createHash("sha256")
		.update(provided.toLowerCase())
		.digest();
	const expectedDigest = createHash("sha256").update(expected).digest();
	return timingSafeEqual(providedDigest, expectedDigest);
}

/** Точная проверка пути вебхука (без учёта query-строки). */
export function isWebhookPath(url: string): boolean {
	const pathname = (url.split("?")[0] ?? "").replace(/\/+$/, "");
	return (
		pathname.endsWith("/webhook") ||
		pathname.endsWith("/webhooks/whatsapp") ||
		pathname === "/api/whatsapp/webhook" ||
		pathname === "/api/v1/webhooks/whatsapp"
	);
}

const registeredApps = new WeakSet<FastifyInstance>();

export async function registerWhatsappWebhookRoutes(
	app: FastifyInstance,
): Promise<void> {
	// Guard against duplicate plugin registrations on the same Fastify instance
	if (registeredApps.has(app)) {
		return;
	}
	registeredApps.add(app);

	const webhookPaths = [
		"/api/whatsapp/webhook",
		"/api/v1/webhooks/whatsapp",
	] as const;

	/**
	 * Handshake verification handler (GET).
	 */
	const handleHandshake = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const query = request.query as Record<string, string>;
		const mode = query["hub.mode"];
		const token = query["hub.verify_token"];
		const challenge = query["hub.challenge"];

		if (mode !== "subscribe" || !token || !challenge) {
			reply.code(400);
			return { error: "BadWebhookRequest" };
		}

		let isMatched = token === DEFAULT_VERIFY_TOKEN;
		if (!isMatched) {
			try {
				const [config] = await withSuperuserBypass(async (tx) =>
					tx
						.select({
							webhookVerifyToken: denteWhatsappBotConfigs.webhookVerifyToken,
						})
						.from(denteWhatsappBotConfigs)
						.where(eq(denteWhatsappBotConfigs.webhookVerifyToken, token))
						.limit(1),
				);
				if (config) {
					isMatched = true;
				}
			} catch {
				// DB connection offline
			}
		}

		if (!isMatched) {
			reply.code(403);
			return {
				error: "Forbidden",
				message: "Invalid webhook verification token or mode.",
			};
		}

		reply.header("Content-Type", "text/plain");
		return reply.code(200).send(challenge);
	};

	for (const path of webhookPaths) {
		app.get(path, { config: { tenantTxSelfManaged: true } }, handleHandshake);
	}

	/**
	 * POST Inbound Events Webhook Scope.
	 */
	await app.register(async (webhookScope) => {
		webhookScope.addContentTypeParser(
			"application/json",
			{ parseAs: "buffer" },
			(request, body, done) => {
				(request as unknown as { rawBody?: Buffer }).rawBody = body as Buffer;
				try {
					const text = (body as Buffer).toString("utf8");
					done(null, text.length > 0 ? JSON.parse(text) : {});
				} catch (err) {
					done(err as Error, undefined);
				}
			},
		);

		const handleInboundPost = async (
			request: FastifyRequest,
			reply: FastifyReply,
		) => {
			const appSecret = configuredWhatsappAppSecret();

			if (!appSecret) {
				if (!namedDevelopmentModeActive()) {
					request.log.error(
						{ requiredEnv: ["WHATSAPP_APP_SECRET"] },
						"Вебхук WhatsApp отклонён: секрет приложения не задан в окружении сервера",
					);
					reply.code(503);
					return {
						error: "WhatsappAppSecretRequired",
						message:
							"Приём сообщений WhatsApp на этом сервере не настроен: секрет приложения не задан, и подпись вебхука проверить нечем.",
					};
				}
			} else {
				const rawBody =
					(request as unknown as { rawBody?: Buffer }).rawBody ??
					Buffer.from(
						typeof request.body === "string"
							? request.body
							: JSON.stringify(request.body ?? {}),
						"utf8",
					);
				const signature =
					(request.headers["x-hub-signature-256"] as string | undefined) ??
					null;

				if (!isValidWhatsappSignature(rawBody, signature, appSecret)) {
					reply.code(401);
					return {
						error: "WhatsappSignatureMismatch",
						message: "Подпись вебхука WhatsApp недействительна.",
					};
				}
			}

			// Immediate ACK to Meta
			reply.code(200).send({ received: true });

			if (
				!request.body ||
				typeof request.body !== "object" ||
				Array.isArray(request.body)
			) {
				return;
			}
			const body = request.body as Record<string, unknown>;
			const entries = Array.isArray(body.entry) ? body.entry : [];

			for (const entry of entries) {
				if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
					continue;
				}
				const e = entry as Record<string, unknown>;
				const changes = Array.isArray(e.changes)
					? (e.changes as unknown[])
					: [];

				for (const change of changes) {
					if (!change || typeof change !== "object" || Array.isArray(change)) {
						continue;
					}
					const c = change as Record<string, unknown>;
					const valueRaw = c.value;
					if (
						!valueRaw ||
						typeof valueRaw !== "object" ||
						Array.isArray(valueRaw)
					) {
						continue;
					}
					const value = valueRaw as Record<string, unknown>;

					const metadataRaw = value.metadata;
					const metadata =
						metadataRaw &&
						typeof metadataRaw === "object" &&
						!Array.isArray(metadataRaw)
							? (metadataRaw as Record<string, unknown>)
							: undefined;
					const phoneNumberId =
						typeof metadata?.phone_number_id === "string"
							? metadata.phone_number_id
							: null;
					if (!phoneNumberId) continue;

					const [orgConfig] = await withSuperuserBypass(async (tx) =>
						tx
							.select()
							.from(denteWhatsappBotConfigs)
							.where(eq(denteWhatsappBotConfigs.phoneNumberId, phoneNumberId))
							.limit(1),
					);

					if (!orgConfig) continue;
					const inboundOrganizationId = orgConfig.organizationId;

					const receipts = parseWhatsappStatuses(value.statuses);
					if (receipts.length > 0) {
						try {
							const report = await applyReceipts(receipts);
							if (report.unmatched > 0) {
								console.warn(
									`Whatsapp: квитанций без своего сообщения в очереди: ${report.unmatched}`,
								);
							}
						} catch (receiptError) {
							console.error("Whatsapp: квитанции не применены:", receiptError);
						}
					}

					const messages = Array.isArray(value.messages)
						? (value.messages as unknown[])
						: [];

					// biome-ignore lint/suspicious/noExplicitAny: tenant batch insertion
					const newEvents: any[] = [];
					await withTenantCtx(inboundOrganizationId, async (tx) => {
						for (const msg of messages) {
							if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
								continue;
							}
							const m = msg as Record<string, unknown>;
							const fromId = typeof m.from === "string" ? m.from : "unknown";
							const textRaw = m.text;
							const textObj =
								textRaw &&
								typeof textRaw === "object" &&
								!Array.isArray(textRaw)
									? (textRaw as Record<string, unknown>)
									: undefined;
							const textBody =
								typeof textObj?.body === "string" ? textObj.body : null;

							const interactiveRaw = m.interactive as
								| Record<string, unknown>
								| undefined;
							const buttonReply = interactiveRaw?.button_reply as
								| { id?: string; title?: string }
								| undefined;

							let resolvedBody = textBody;
							const msgType = typeof m.type === "string" ? m.type : null;
							if (!resolvedBody && msgType) {
								if (msgType === "image") {
									const img = m.image as Record<string, unknown> | undefined;
									const caption =
										typeof img?.caption === "string" && img.caption.trim()
											? ` (${img.caption.trim()})`
											: "";
									resolvedBody = `[Фото]${caption}`;
								} else if (msgType === "document") {
									const doc = m.document as Record<string, unknown> | undefined;
									const filename =
										typeof doc?.filename === "string" && doc.filename.trim()
											? ` ${doc.filename.trim()}`
											: "";
									const caption =
										typeof doc?.caption === "string" && doc.caption.trim()
											? ` (${doc.caption.trim()})`
											: "";
									resolvedBody = `[Документ${filename}]${caption}`;
								} else if (msgType === "audio" || msgType === "voice") {
									resolvedBody = "[Голосовое сообщение / Аудио]";
								} else if (msgType === "video") {
									const vid = m.video as Record<string, unknown> | undefined;
									const caption =
										typeof vid?.caption === "string" && vid.caption.trim()
											? ` (${vid.caption.trim()})`
											: "";
									resolvedBody = `[Видео]${caption}`;
								} else if (msgType === "sticker") {
									resolvedBody = "[Стикер]";
								} else if (msgType === "location") {
									resolvedBody = "[Геолокация]";
								} else if (msgType === "contacts") {
									resolvedBody = "[Контактная карточка]";
								} else if (buttonReply?.title) {
									resolvedBody = buttonReply.title;
								}
							}

							const rawTs =
								typeof m.timestamp === "number"
									? m.timestamp
									: typeof m.timestamp === "string"
										? Number.parseInt(m.timestamp, 10)
										: Number.NaN;
							if (!Number.isNaN(rawTs) && rawTs > 0) {
								const msgTsSec =
									rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
								const nowSec = Math.floor(Date.now() / 1000);
								if (Math.abs(nowSec - msgTsSec) > 300) {
									request.log.warn(
										{ msgTsSec, nowSec },
										"WhatsApp webhook message timestamp drift > 300s, skipping ingestion",
									);
									continue;
								}
							}

							const msgId =
								typeof m.id === "string" && m.id.trim().length > 0
									? m.id.trim()
									: null;

							if (msgId) {
								const existing = await tx
									.select({ id: messengerInboundEvents.id })
									.from(messengerInboundEvents)
									.where(
										and(
											eq(
												messengerInboundEvents.organizationId,
												inboundOrganizationId,
											),
											eq(messengerInboundEvents.externalId, msgId),
										),
									)
									.limit(1);
								if (existing.length > 0) {
									request.log.info(
										{ msgId, inboundOrganizationId },
										"WhatsApp message already ingested (replay skipped)",
									);
									continue;
								}
							}

							// Resolve patient by phone number
							const cleanDigits = fromId.replace(/\D/g, "");
							const suffix = cleanDigits.slice(-9);

							let patientRecord:
								| { id: string; fullName: string; phone: string | null }
								| null = null;
							if (suffix.length >= 7) {
								const [foundPatient] = await tx
									.select({
										id: patients.id,
										fullName: patients.fullName,
										phone: patients.phone,
									})
									.from(patients)
									.where(
										and(
											eq(patients.organizationId, inboundOrganizationId),
											sql`REPLACE(REPLACE(REPLACE(COALESCE(${patients.phone}, ''), '-', ''), ' ', ''), '+', '') LIKE '%' || ${suffix}`,
										),
									)
									.limit(1);
								if (foundPatient) {
									patientRecord = foundPatient;
								}
							}

							const action = parseIncomingAction(
								buttonReply?.id,
								buttonReply?.title || resolvedBody || "",
								fromId,
								msgId || "unknown",
								rawTs ? new Date(rawTs * 1000) : new Date(),
							);

							// Process interactive appointment or recall action if matched
							if (patientRecord) {
								if (action.type === "confirm_appointment") {
									await processAppointmentConfirmation(
										inboundOrganizationId,
										patientRecord,
										action,
										orgConfig,
									);
								} else if (action.type === "cancel_appointment") {
									await processAppointmentCancellation(
										inboundOrganizationId,
										patientRecord,
										action,
										orgConfig,
									);
								} else if (action.type === "recall_book") {
									await processRecallBooking(
										inboundOrganizationId,
										patientRecord,
										action,
										orgConfig,
									);
								} else if (action.type === "recall_snooze") {
									await processRecallSnooze(
										inboundOrganizationId,
										patientRecord,
										action,
										orgConfig,
									);
								}
							}

							newEvents.push({
								organizationId: inboundOrganizationId,
								channel: "whatsapp" as const,
								externalId: msgId,
								externalChatId: fromId,
								patientId: patientRecord?.id ?? null,
								messageText: resolvedBody,
								eventKind: buttonReply?.id ? "command" : "message",
								rawPayload: m as Record<string, unknown>,
							});
						}

						if (newEvents.length > 0) {
							await tx.insert(messengerInboundEvents).values(newEvents);
						}
					});
				}
			}

			// Trigger async processor to ingest into CRM Inbox
			void processInboundEvents().catch((err) =>
				console.error("Whatsapp ingestion error:", err),
			);
		};

		for (const path of webhookPaths) {
			webhookScope.post(
				path,
				{ config: { tenantTxSelfManaged: true } },
				handleInboundPost,
			);
		}
	});
}
