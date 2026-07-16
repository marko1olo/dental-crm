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
import { createHash } from "node:crypto";
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
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import { processInboundEvents } from "../services/messengerIngestion.js";

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
	 * Always responds 200 immediately — processes async.
	 */
	app.post("/api/whatsapp/webhook", async (request, reply) => {
		reply.code(200).send({ received: true });

		const body = request.body as Record<string, unknown>;
		const entries = Array.isArray(body.entry) ? body.entry : [];

		for (const entry of entries) {
			const e = entry as Record<string, unknown>;
			const changes = Array.isArray(e.changes) ? (e.changes as unknown[]) : [];

			for (const change of changes) {
				const c = change as Record<string, unknown>;
				const value = c.value as Record<string, unknown> | undefined;
				if (!value) continue;

				const metadata = value.metadata as Record<string, unknown> | undefined;
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

		// Await or float the processor to ingest this message to the Inbox immediately
		void processInboundEvents().catch((err) =>
			console.error("Whatsapp ingestion error:", err),
		);
	});
}

// Silence unused import warning for patients (used in foreign key definition)
void patients;
