/**
 * WhatsApp Business Cloud API routes
 *
 * Connects DENTE to Meta's WhatsApp Business Cloud API.
 * Credentials are stored as hashed secret refs — raw tokens never persisted.
 *
 * Webhook verification follows Meta's standard handshake:
 *   GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *
 * See: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	communicationEvents,
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import { processInboundEvents } from "../services/messengerIngestion.js";
import { wsBroker } from "../services/websocketBroker.js";

const updateWhatsappConfigSchema = z.object({
	phoneNumberId: z.string().trim().max(64).nullable().optional(),
	// Raw access token — hashed and stored as tokenSecretRef, never returned
	accessToken: z.string().trim().max(512).optional(),
	webhookVerifyToken: z.string().trim().max(128).nullable().optional(),
	enabledFeatures: z.array(z.string()).optional(),
	staffRouting: z
		.object({
			defaultUserId: z.string().uuid().nullable(),
			rules: z
				.array(
					z.object({
						intent: z.string(),
						assignToUserId: z.string().uuid().nullable(),
					}),
				)
				.default([]),
		})
		.optional(),
	isActive: z.boolean().optional(),
});

function maskToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

/**
 * Meta App Secret used to verify the `x-hub-signature-256` header on inbound
 * webhook payloads. Stored server-side only via env (never in the DB or client
 * bundle), mirroring the Telegram webhook-secret convention. A per-org column
 * is intentionally avoided: the App Secret belongs to the Meta app, not the
 * clinic, and one DENTE deployment fronts a single Meta app.
 */
function configuredWhatsappAppSecret(): string | null {
	const raw = process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET;
	const trimmed = typeof raw === "string" ? raw.trim() : "";
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Verifies Meta's `x-hub-signature-256` header: HMAC-SHA256 of the raw request
 * body keyed by the App Secret, hex-encoded and prefixed with `sha256=`.
 * Uses a constant-time comparison to avoid leaking the signature via timing.
 */
function isValidWhatsappSignature(
	rawBody: Buffer | string,
	signatureHeader: string | null,
	appSecret: string,
): boolean {
	if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
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

function parseJsonSafe<T>(value: string, fallback: T): T {
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

export async function registerWhatsappRoutes(
	app: FastifyInstance,
): Promise<void> {
	app.addHook("preHandler", async (request, reply) => {
		if (request.url.includes("/webhook")) return;
		const allowed = await requireNonDoctorAccess(request, reply);
		if (!allowed) {
			return reply;
		}
	});
	/**
	 * GET /api/whatsapp/settings
	 * Returns the WhatsApp bot config. Raw token never returned.
	 */
	app.get("/api/whatsapp/settings", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"whatsapp settings read",
		);
		if (!orgId) return;

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config) {
			return reply.code(404).send({
				error: "WhatsappConfigNotFound",
				message: "WhatsApp-бот не настроен для этой организации.",
			});
		}

		return {
			id: config.id,
			organizationId: config.organizationId,
			phoneNumberId: config.phoneNumberId ?? null,
			hasToken: Boolean(config.tokenSecretRef),
			webhookVerifyToken: config.webhookVerifyToken ?? null,
			enabledFeatures: parseJsonSafe<string[]>(config.enabledFeaturesJson, []),
			staffRouting: parseJsonSafe(config.staffRoutingJson, {
				defaultUserId: null,
				rules: [],
			}),
			isActive: config.isActive,
			updatedAt: config.updatedAt.toISOString(),
		};
	});

	/**
	 * PUT /api/whatsapp/settings
	 * Creates or updates the WhatsApp bot config.
	 * If accessToken is provided, it is hashed and stored as tokenSecretRef.
	 */
	app.put("/api/whatsapp/settings", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"whatsapp settings write",
		);
		if (!orgId) return;

		const parsed = updateWhatsappConfigSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "WhatsappConfigValidationError",
				message: "Проверьте параметры настройки WhatsApp.",
			});
		}

		const input = parsed.data;
		const now = new Date();

		const [existing] = await db
			.select({ id: denteWhatsappBotConfigs.id })
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		if (existing) {
			const updateValues: Partial<typeof denteWhatsappBotConfigs.$inferInsert> =
				{ updatedAt: now };

			if (input.phoneNumberId !== undefined)
				updateValues.phoneNumberId = input.phoneNumberId;
			if (input.accessToken)
				updateValues.tokenSecretRef = maskToken(input.accessToken);
			if (input.webhookVerifyToken !== undefined)
				updateValues.webhookVerifyToken = input.webhookVerifyToken;
			if (input.enabledFeatures !== undefined)
				updateValues.enabledFeaturesJson = JSON.stringify(
					input.enabledFeatures,
				);
			if (input.staffRouting !== undefined)
				updateValues.staffRoutingJson = JSON.stringify(input.staffRouting);
			if (input.isActive !== undefined) updateValues.isActive = input.isActive;

			await db
				.update(denteWhatsappBotConfigs)
				.set(updateValues)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId));
		} else {
			await db.insert(denteWhatsappBotConfigs).values({
				organizationId: orgId,
				phoneNumberId: input.phoneNumberId ?? null,
				tokenSecretRef: input.accessToken ? maskToken(input.accessToken) : null,
				webhookVerifyToken: input.webhookVerifyToken ?? null,
				enabledFeaturesJson: JSON.stringify(input.enabledFeatures ?? []),
				staffRoutingJson: JSON.stringify(
					input.staffRouting ?? { defaultUserId: null, rules: [] },
				),
				isActive: input.isActive ?? false,
			});
		}

		return reply.code(200).send({ ok: true });
	});

	/**
	 * GET /api/whatsapp/status
	 * Checks whether the bot config is present and active.
	 */
	app.get("/api/whatsapp/status", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"whatsapp status",
		);
		if (!orgId) return;

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config || !config.phoneNumberId || !config.tokenSecretRef) {
			return {
				channel: "whatsapp",
				connected: false,
				detail: "WhatsApp не настроен: нужны Phone Number ID и Access Token.",
			};
		}

		return {
			channel: "whatsapp",
			connected: config.isActive,
			detail: config.isActive
				? `Phone Number ID ${config.phoneNumberId} настроен.`
				: "WhatsApp-бот неактивен.",
		};
	});

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
			return reply.code(400).send({ error: "BadWebhookRequest" });
		}

		const [config] = await db
			.select({
				webhookVerifyToken: denteWhatsappBotConfigs.webhookVerifyToken,
			})
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.webhookVerifyToken, token))
			.limit(1);

		if (!config) {
			return reply.code(403).send({ error: "WebhookTokenMismatch" });
		}

		return reply.code(200).send(challenge);
	});

	/**
	 * POST /api/whatsapp/webhook
	 * Receives inbound WhatsApp events from Meta.
	 *
	 * Registered in an encapsulated plugin scope so we can attach a buffer-based
	 * JSON content-type parser that preserves the raw request bytes. Meta signs
	 * the raw body with the App Secret (`x-hub-signature-256`), so the signature
	 * must be checked against the exact bytes received — not a re-serialized
	 * object. The parser is scoped here and does NOT affect any other route.
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
				// Without an App Secret we cannot authenticate the sender. Refuse to
				// ingest in production; allow (with a warning) in development so local
				// webhook testing works without Meta credentials.
				if (process.env.NODE_ENV === "production") {
					return reply.code(503).send({
						error: "WhatsappAppSecretRequired",
						message:
							"WHATSAPP_APP_SECRET не настроен — приём вебхуков WhatsApp отключён.",
					});
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
					return reply.code(401).send({
						error: "WhatsappSignatureMismatch",
						message: "Подпись вебхука WhatsApp недействительна.",
					});
				}
			}

			// Acknowledge immediately — Meta retries on non-200. Process async below.
			reply.code(200).send({ received: true });

			const body = request.body as Record<string, unknown>;
			const entries = Array.isArray(body.entry) ? body.entry : [];

			for (const entry of entries) {
				const e = entry as Record<string, unknown>;
				const changes = Array.isArray(e.changes)
					? (e.changes as unknown[])
					: [];

				for (const change of changes) {
					const c = change as Record<string, unknown>;
					const value = c.value as Record<string, unknown> | undefined;
					if (!value) continue;

					const metadata = value.metadata as
						| Record<string, unknown>
						| undefined;
					const phoneNumberId =
						typeof metadata?.phone_number_id === "string"
							? metadata.phone_number_id
							: null;
					if (!phoneNumberId) continue;

					const [orgConfig] = await db
						.select({ organizationId: denteWhatsappBotConfigs.organizationId })
						.from(denteWhatsappBotConfigs)
						.where(eq(denteWhatsappBotConfigs.phoneNumberId, phoneNumberId))
						.limit(1);

					if (!orgConfig) continue;

					const messages = Array.isArray(value.messages)
						? (value.messages as unknown[])
						: [];

					for (const msg of messages) {
						const m = msg as Record<string, unknown>;
						const fromId = typeof m.from === "string" ? m.from : "unknown";
						const textObj = m.text as Record<string, unknown> | undefined;
						const textBody =
							typeof textObj?.body === "string" ? textObj.body : null;

						await db.insert(messengerInboundEvents).values({
							organizationId: orgConfig.organizationId,
							channel: "whatsapp",
							externalChatId: fromId,
							messageText: textBody,
							eventKind: "message",
							rawPayload: m as Record<string, unknown>,
						});
					}
				}
			}

			// Float the processor to ingest this message to the Inbox immediately
			void processInboundEvents().catch((err) =>
				console.error("Whatsapp ingestion error:", err),
			);
		});
	});

	/**
	 * POST /api/whatsapp/send
	 * Sends an outbound WhatsApp message to a patient.
	 */
	app.post("/api/whatsapp/send", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"whatsapp message send",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			patientId: z.string().uuid(),
			message: z.string().min(1),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Укажите ID пациента и текст сообщения.",
			});
		}

		const { patientId, message } = parsed.data;

		const [patient] = await db
			.select()
			.from(patients)
			.where(eq(patients.id, patientId))
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден.",
			});
		}

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config || !config.isActive) {
			return reply.code(400).send({
				error: "WhatsappInactive",
				message: "Интеграция WhatsApp неактивна или не настроена.",
			});
		}

		await db.insert(communicationEvents).values({
			organizationId: orgId,
			patientId,
			channel: "whatsapp",
			direction: "outbound",
			status: "sent",
			message,
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel: "whatsapp",
				patientId,
				text: message,
				direction: "outbound",
			},
		});

		console.log(
			`[WhatsApp Outbox] Sent to ${patient.phone || patient.fullName}: ${message}`,
		);

		return { ok: true };
	});
}

