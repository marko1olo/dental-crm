/**
 * whatsappWebhookRoutes.ts — Webhook endpoints for Meta WhatsApp Business Cloud API.
 *
 * Extracted from whatsapp.ts to satisfy Mandate 8b (file length <= 800 lines).
 * Handles Meta webhook handshake (GET) and inbound event ingestion (POST).
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { namedDevelopmentModeActive } from "../accessGuard.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	denteWhatsappBotConfigs,
	messengerInboundEvents,
} from "../db/schema.js";
import {
	applyReceipts,
	parseWhatsappStatuses,
} from "../services/communications/deliveryReceipts.js";
import { processInboundEvents } from "../services/messengerIngestion.js";

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

	// Compare over fixed-length SHA-256 digests of both hex strings so
	// timingSafeEqual never throws on a length mismatch.
	const providedDigest = createHash("sha256")
		.update(provided.toLowerCase())
		.digest();
	const expectedDigest = createHash("sha256").update(expected).digest();
	return timingSafeEqual(providedDigest, expectedDigest);
}

/** Точная проверка пути вебхука (без учёта query-строки). */
export function isWebhookPath(url: string): boolean {
	const pathname = (url.split("?")[0] ?? "").replace(/\/+$/, "");
	return pathname.endsWith("/webhook");
}

export async function registerWhatsappWebhookRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * GET /api/whatsapp/webhook
	 * Meta webhook verification handshake (subscribe mode).
	 */
	app.get("/api/whatsapp/webhook", async (request, reply) => {
		const query = request.query as Record<string, string>;
		const mode = query["hub.mode"];
		const token = query["hub.verify_token"];
		const challenge = query["hub.challenge"];

		if (mode !== "subscribe" || !token || !challenge) {
			reply.code(400);
			return { error: "BadWebhookRequest" };
		}

		/*
		 * ОПЕРАЦИЯ «ДО АРЕНДАТОРА». Рукопожатие присылает Meta: токена клиники в
		 * нём нет и быть не может, а организация станет известна только из
		 * найденной строки — ищем по самому проверочному токену. Под FORCE RLS
		 * запрос без контекста отдавал ноль строк, и подписка на вебхук
		 * ОТКЛОНЯЛАСЬ ВСЕГДА. Обход накрывает ровно этот SELECT одной колонки.
		 */
		const [config] = await withSuperuserBypass(async (tx) =>
			tx
				.select({
					webhookVerifyToken: denteWhatsappBotConfigs.webhookVerifyToken,
				})
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.webhookVerifyToken, token))
				.limit(1),
		);

		if (!config) {
			reply.code(403);
			return { error: "WebhookTokenMismatch" };
		}

		/*
		 * Эхо рукопожатия: тело здесь — голая строка hub.challenge, которую Meta
		 * сверяет побайтно.
		 */
		return reply.code(200).send(challenge);
	});

	/**
	 * POST /api/whatsapp/webhook
	 * Receives inbound WhatsApp events from Meta.
	 *
	 * Registered in an encapsulated plugin scope so we can attach a buffer-based
	 * JSON content-type parser that preserves the raw request bytes. Meta signs
	 * the raw body with the App Secret (`x-hub-signature-256`), so the signature
	 * must be checked against the exact bytes received.
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

		webhookScope.post("/api/whatsapp/webhook", async (request, reply) => {
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
				console.warn(
					"[WhatsApp] WHATSAPP_APP_SECRET не задан: подпись вебхука не проверяется (только dev).",
				);
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

			/*
			 * Acknowledge immediately — Meta retries on non-200. Process async
			 * below. Shape-guard AFTER send so null/non-object body cannot
			 * TypeError on body.entry once the client already got 200.
			 */
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
							.select({
								organizationId: denteWhatsappBotConfigs.organizationId,
							})
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
									`Whatsapp: квитанций без своего сообщения в очереди: ${report.unmatched} (сообщение отправлено не через журнал?)`,
								);
							}
						} catch (receiptError) {
							console.error("Whatsapp: квитанции не применены:", receiptError);
						}
					}

					const messages = Array.isArray(value.messages)
						? (value.messages as unknown[])
						: [];

					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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

							newEvents.push({
								organizationId: inboundOrganizationId,
								channel: "whatsapp" as const,
								externalId: msgId,
								externalChatId: fromId,
								messageText: resolvedBody,
								eventKind: "message" as const,
								rawPayload: m as Record<string, unknown>,
							});
						}

						if (newEvents.length > 0) {
							await tx.insert(messengerInboundEvents).values(newEvents);
						}
					});
				}
			}

			// Float the processor to ingest this message to the Inbox immediately
			void processInboundEvents().catch((err) =>
				console.error("Whatsapp ingestion error:", err),
			);
		});
	});
}
