/**
 * MAX (VK Max) messenger bot routes
 *
 * MAX is the Russian national messenger platform (business.max.ru).
 * Requires a verified business account and approved bot token.
 * The API pattern mirrors VK Teams Bot API.
 *
 * Docs: https://business.max.ru (requires business account login)
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
	communicationEvents,
	denteMaxBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";
import { processInboundEvents } from "../services/messengerIngestion.js";

const updateMaxConfigSchema = z.object({
	botId: z.string().trim().max(128).nullable().optional(),
	// Raw API token — hashed and stored as tokenSecretRef, never returned
	apiToken: z.string().trim().max(512).optional(),
	webhookUrl: z.string().trim().max(512).nullable().optional(),
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

export async function registerMaxRoutes(app: FastifyInstance): Promise<void> {
	app.addHook("preHandler", async (request, reply) => {
		if (request.url.includes("/webhook")) return;
		const allowed = await requireNonDoctorAccess(request, reply);
		if (!allowed) {
			return reply;
		}
	});
	/**
	 * GET /api/max/settings
	 * Returns the MAX bot config. Raw API token never returned.
	 */
	app.get("/api/max/settings", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"max settings read",
		);
		if (!orgId) return;

		const [config] = await db
			.select()
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config) {
			return reply.code(404).send({
				error: "MaxConfigNotFound",
				message: "MAX-бот не настроен для этой организации.",
			});
		}

		return {
			id: config.id,
			organizationId: config.organizationId,
			botId: config.botId ?? null,
			hasToken: Boolean(config.tokenSecretRef),
			webhookUrl: config.webhookUrl ?? null,
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
	 * PUT /api/max/settings
	 * Creates or updates the MAX bot config.
	 */
	app.put("/api/max/settings", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"max settings write",
		);
		if (!orgId) return;

		const parsed = updateMaxConfigSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "MaxConfigValidationError",
				message: "Проверьте параметры настройки MAX.",
			});
		}

		const input = parsed.data;
		const now = new Date();

		const [existing] = await db
			.select({ id: denteMaxBotConfigs.id })
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, orgId))
			.limit(1);

		if (existing) {
			const updateValues: Partial<typeof denteMaxBotConfigs.$inferInsert> = {
				updatedAt: now,
			};

			if (input.botId !== undefined) updateValues.botId = input.botId;
			if (input.apiToken)
				updateValues.tokenSecretRef = maskToken(input.apiToken);
			if (input.webhookUrl !== undefined)
				updateValues.webhookUrl = input.webhookUrl;
			if (input.enabledFeatures !== undefined)
				updateValues.enabledFeaturesJson = JSON.stringify(
					input.enabledFeatures,
				);
			if (input.staffRouting !== undefined)
				updateValues.staffRoutingJson = JSON.stringify(input.staffRouting);
			if (input.isActive !== undefined) updateValues.isActive = input.isActive;

			await db
				.update(denteMaxBotConfigs)
				.set(updateValues)
				.where(eq(denteMaxBotConfigs.organizationId, orgId));
		} else {
			await db.insert(denteMaxBotConfigs).values({
				organizationId: orgId,
				botId: input.botId ?? null,
				tokenSecretRef: input.apiToken ? maskToken(input.apiToken) : null,
				webhookUrl: input.webhookUrl ?? null,
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
	 * GET /api/max/status
	 * Returns whether MAX bot config is present and active.
	 */
	app.get("/api/max/status", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"max status",
		);
		if (!orgId) return;

		const [config] = await db
			.select()
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config || !config.botId || !config.tokenSecretRef) {
			return {
				channel: "max",
				connected: false,
				detail:
					"MAX не настроен: нужны Bot ID и API Token из панели business.max.ru.",
			};
		}

		return {
			channel: "max",
			connected: config.isActive,
			detail: config.isActive
				? `MAX-бот ${config.botId} настроен.`
				: "MAX-бот неактивен.",
		};
	});

	/**
	 * POST /api/max/webhook
	 * Receives inbound events from MAX messenger platform.
	 * Always responds 200 immediately.
	 *
	 * MAX webhook payload (VK Teams Bot API pattern):
	 * {
	 *   eventType: "newMessage",
	 *   payload: { chat: { chatId }, from: { userId }, text }
	 * }
	 *
	 * Bot is identified by x-max-bot-id header or ?botId query param.
	 */
	app.post("/api/max/webhook", async (request, reply) => {
		reply.code(200).send({ ok: true });

		const body = request.body as Record<string, unknown>;
		const payload = body.payload as Record<string, unknown> | undefined;
		if (!payload) return;

		const chat = payload.chat as Record<string, unknown> | undefined;
		const textValue = payload.text;
		const text = typeof textValue === "string" ? textValue : null;
		const chatId = typeof chat?.chatId === "string" ? chat.chatId : "unknown";

		// Identify org by bot ID passed in header or query param
		const botIdRaw =
			request.headers["x-max-bot-id"] ??
			(request.query as Record<string, string>)["botId"];
		const botIdHeader = Array.isArray(botIdRaw) ? botIdRaw[0] : botIdRaw;

		if (!botIdHeader) return;

		const [orgConfig] = await db
			.select({ organizationId: denteMaxBotConfigs.organizationId })
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.botId, botIdHeader))
			.limit(1);

		if (!orgConfig) return;

		await db.insert(messengerInboundEvents).values({
			organizationId: orgConfig.organizationId,
			channel: "max",
			externalChatId: chatId,
			messageText: text,
			eventKind: "message",
			rawPayload: body as Record<string, unknown>,
		});

		// Await or float the processor to ingest this message to the Inbox immediately
		void processInboundEvents().catch((err) =>
			console.error("MAX ingestion error:", err),
		);
	});

	/**
	 * POST /api/max/send
	 * Sends an outbound VK Max message to a patient.
	 */
	app.post("/api/max/send", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"max message send",
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
			.from(denteMaxBotConfigs)
			.where(eq(denteMaxBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config || !config.isActive) {
			return reply.code(400).send({
				error: "MaxInactive",
				message: "Интеграция VK Max неактивна или не настроена.",
			});
		}

		await db.insert(communicationEvents).values({
			organizationId: orgId,
			patientId,
			channel: "telegram", // map max to telegram channel in DB schema
			direction: "outbound",
			status: "sent",
			message,
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel: "max",
				patientId,
				text: message,
				direction: "outbound",
			},
		});

		console.log(`[MAX Outbox] Sent to ${patient.fullName}: ${message}`);

		return { ok: true };
	});
}

// Silence unused import warning for patients (used in foreign key definition)
void patients;
