import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	clinics,
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteVkBotConfigs,
	denteWhatsappBotConfigs,
	organizations,
} from "../db/schema.js";
import { BotSourceExporter } from "../services/bots/BotSourceExporter.js";
import { OmnichannelBotEngine, omnichannelBotEngine } from "../services/bots/OmnichannelBotEngine.js";
import { OmnichannelTokenVault } from "../services/bots/OmnichannelTokenVault.js";
import type { BotChannel, BotInboundMessage } from "../services/bots/types.js";

const saveBotConfigSchema = z.object({
	channel: z.enum(["telegram", "vk", "whatsapp", "max"]),
	botConfigId: z.string().trim().default("default"),
	clinicId: z.string().uuid().nullable().optional(),
	token: z.string().trim().optional(),
	secretKey: z.string().trim().optional(),
	confirmationCode: z.string().trim().optional(),
	groupId: z.string().trim().optional(),
	phoneNumberId: z.string().trim().optional(),
	provider: z.enum(["cloud_api", "green_api"]).optional(),
	greenApiInstanceId: z.string().trim().optional(),
	greenApiToken: z.string().trim().optional(),
	maxBotId: z.string().trim().optional(),
	isActive: z.boolean().default(true),
	enabledPlugins: z.array(z.string()).optional(),
});

export async function registerOmnichannelBotRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/bots/configs
	 * Получение настроек всех ботов клиники (токены отдаются в замаскированном виде).
	 */
	app.get("/api/bots/configs", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots configs read");
		if (!orgId) return;

		const [tgConfigs, vkConfigs, waConfigs, maxConfigs] = await Promise.all([
			db
				.select()
				.from(denteTelegramBotConfigs)
				.where(eq(denteTelegramBotConfigs.organizationId, orgId)),
			db
				.select()
				.from(denteVkBotConfigs)
				.where(eq(denteVkBotConfigs.organizationId, orgId)),
			db
				.select()
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId)),
			db
				.select()
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, orgId)),
		]);

		const tg = tgConfigs[0];
		const vk = vkConfigs[0];
		const wa = waConfigs[0];
		const mx = maxConfigs[0];

		return reply.send({
			telegram: tg
				? {
						id: tg.id,
						botConfigId: tg.botConfigId,
						botUsername: tg.botUsername || tg.ownBotUsername,
						tokenMasked: OmnichannelTokenVault.maskToken(tg.tokenSecretRef),
						mode: tg.mode,
						isActive: tg.mode !== "disabled",
					}
				: null,
			vk: vk
				? {
						id: vk.id,
						botConfigId: vk.botConfigId,
						groupId: vk.groupId,
						tokenMasked: OmnichannelTokenVault.maskToken(vk.groupToken || vk.tokenSecretRef),
						confirmationCode: vk.confirmationCode,
						secretKeyMasked: OmnichannelTokenVault.maskToken(vk.secretKey),
						isActive: vk.isActive ?? vk.isEnabled,
						isEnabled: vk.isEnabled,
					}
				: null,
			whatsapp: wa
				? {
						id: wa.id,
						phoneNumberId: wa.phoneNumberId,
						provider: wa.provider,
						greenApiInstanceId: wa.greenApiInstanceId,
						tokenMasked: OmnichannelTokenVault.maskToken(
							wa.accessToken || wa.tokenSecretRef || wa.greenApiToken,
						),
						isActive: wa.isActive ?? wa.isEnabled,
						isEnabled: wa.isEnabled,
					}
				: null,
			max: mx
				? {
						id: mx.id,
						botId: mx.botId,
						tokenMasked: OmnichannelTokenVault.maskToken(mx.maxBotToken || mx.tokenSecretRef),
						isActive: mx.isActive ?? mx.isEnabled,
						isEnabled: mx.isEnabled,
					}
				: null,
		});
	});

	/**
	 * POST /api/bots/configs
	 * Сохранение / обновление конфигурации бота любого канала в 2 клика с шифрованием AES-256-GCM.
	 */
	app.post("/api/bots/configs", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots config save");
		if (!orgId) return;

		const allowed = await requireNonDoctorAccess(request, reply);
		if (!allowed) return reply;

		const parseResult = saveBotConfigSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры настройки бота.",
				details: parseResult.error.format(),
			});
		}

		const body = parseResult.data;
		let encryptedToken: string | undefined;
		if (body.token && !body.token.includes("****")) {
			encryptedToken = OmnichannelTokenVault.isEncrypted(body.token)
				? body.token
				: OmnichannelTokenVault.encrypt(body.token, orgId);
		}

		let encryptedSecretKey: string | undefined;
		if (body.secretKey && !body.secretKey.includes("****")) {
			encryptedSecretKey = OmnichannelTokenVault.isEncrypted(body.secretKey)
				? body.secretKey
				: OmnichannelTokenVault.encrypt(body.secretKey, orgId);
		}

		let encryptedGreenApiToken: string | undefined;
		if (body.greenApiToken && !body.greenApiToken.includes("****")) {
			encryptedGreenApiToken = OmnichannelTokenVault.isEncrypted(body.greenApiToken)
				? body.greenApiToken
				: OmnichannelTokenVault.encrypt(body.greenApiToken, orgId);
		}

		if (body.channel === "vk") {
			const existing = await db
				.select({ id: denteVkBotConfigs.id })
				.from(denteVkBotConfigs)
				.where(
					and(
						eq(denteVkBotConfigs.organizationId, orgId),
						eq(denteVkBotConfigs.botConfigId, body.botConfigId),
					),
				)
				.limit(1);

			if (existing.length > 0) {
				await db
					.update(denteVkBotConfigs)
					.set({
						clinicId: body.clinicId || null,
						groupId: body.groupId,
						...(encryptedToken ? { groupToken: encryptedToken, tokenSecretRef: encryptedToken } : {}),
						...(encryptedSecretKey ? { secretKey: encryptedSecretKey } : {}),
						...(body.confirmationCode ? { confirmationCode: body.confirmationCode } : {}),
						isActive: body.isActive,
						isEnabled: body.isActive,
						updatedAt: new Date(),
					})
					.where(eq(denteVkBotConfigs.id, existing[0]!.id));
			} else {
				await db.insert(denteVkBotConfigs).values({
					organizationId: orgId,
					clinicId: body.clinicId || null,
					botConfigId: body.botConfigId,
					groupId: body.groupId,
					groupToken: encryptedToken,
					tokenSecretRef: encryptedToken,
					secretKey: encryptedSecretKey,
					confirmationCode: body.confirmationCode,
					isActive: body.isActive,
					isEnabled: body.isActive,
				});
			}
		} else if (body.channel === "whatsapp") {
			const existing = await db
				.select({ id: denteWhatsappBotConfigs.id })
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
				.limit(1);

			if (existing.length > 0) {
				await db
					.update(denteWhatsappBotConfigs)
					.set({
						phoneNumberId: body.phoneNumberId,
						provider: body.provider || "cloud_api",
						greenApiInstanceId: body.greenApiInstanceId,
						...(encryptedGreenApiToken ? { greenApiToken: encryptedGreenApiToken } : {}),
						...(encryptedToken ? { accessToken: encryptedToken, tokenSecretRef: encryptedToken } : {}),
						isActive: body.isActive,
						isEnabled: body.isActive,
						updatedAt: new Date(),
					})
					.where(eq(denteWhatsappBotConfigs.id, existing[0]!.id));
			} else {
				await db.insert(denteWhatsappBotConfigs).values({
					organizationId: orgId,
					phoneNumberId: body.phoneNumberId,
					provider: body.provider || "cloud_api",
					greenApiInstanceId: body.greenApiInstanceId,
					greenApiToken: encryptedGreenApiToken,
					accessToken: encryptedToken,
					tokenSecretRef: encryptedToken,
					isActive: body.isActive,
					isEnabled: body.isActive,
				});
			}
		} else if (body.channel === "telegram") {
			const existing = await db
				.select({ id: denteTelegramBotConfigs.id })
				.from(denteTelegramBotConfigs)
				.where(
					and(
						eq(denteTelegramBotConfigs.organizationId, orgId),
						eq(denteTelegramBotConfigs.botConfigId, body.botConfigId),
					),
				)
				.limit(1);

			if (existing.length > 0) {
				await db
					.update(denteTelegramBotConfigs)
					.set({
						clinicId: body.clinicId || null,
						mode: body.isActive ? "clinic_owned_bot" : "disabled",
						...(encryptedToken ? { tokenSecretRef: encryptedToken } : {}),
						updatedAt: new Date(),
					})
					.where(eq(denteTelegramBotConfigs.id, existing[0]!.id));
			} else {
				await db.insert(denteTelegramBotConfigs).values({
					organizationId: orgId,
					clinicId: body.clinicId || null,
					botConfigId: body.botConfigId,
					mode: body.isActive ? "clinic_owned_bot" : "disabled",
					tokenSecretRef: encryptedToken,
				});
			}
		} else if (body.channel === "max") {
			const existing = await db
				.select({ id: denteMaxBotConfigs.id })
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.organizationId, orgId))
				.limit(1);

			if (existing.length > 0) {
				await db
					.update(denteMaxBotConfigs)
					.set({
						botId: body.maxBotId,
						...(encryptedToken ? { maxBotToken: encryptedToken, tokenSecretRef: encryptedToken } : {}),
						isActive: body.isActive,
						isEnabled: body.isActive,
						updatedAt: new Date(),
					})
					.where(eq(denteMaxBotConfigs.id, existing[0]!.id));
			} else {
				await db.insert(denteMaxBotConfigs).values({
					organizationId: orgId,
					botId: body.maxBotId,
					maxBotToken: encryptedToken,
					tokenSecretRef: encryptedToken,
					isActive: body.isActive,
					isEnabled: body.isActive,
				});
			}
		}

		// Обновляем рантайм в памяти движка
		const runtime = omnichannelBotEngine.registerBot({
			channel: body.channel,
			organizationId: orgId,
			clinicId: body.clinicId ?? null,
			botConfigId: body.botConfigId,
			token: encryptedToken || "encrypted_token",
			secretToken: encryptedSecretKey ?? null,
			isActive: body.isActive,
			enabledPlugins: body.enabledPlugins,
		});

		return reply.send({
			ok: true,
			botId: runtime.botId,
			channel: runtime.channel,
			isActive: runtime.isActive,
			tokenMasked: OmnichannelTokenVault.maskToken(encryptedToken),
		});
	});

	/**
	 * GET /api/bots/:botId/status
	 * Телеметрия, состояние задержек и счетчики сообщений рантайма бота.
	 */
	app.get("/api/bots/:botId/status", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bot status read");
		if (!orgId) return;

		const { botId } = request.params as { botId: string };
		const parts = botId.split(":");
		const channel = (parts[0] || "telegram") as BotChannel;
		const targetOrgId = parts.length >= 3 ? parts[1] : orgId;
		const botConfigId = parts.length >= 3 ? parts[2] : "default";

		if (targetOrgId !== orgId) {
			return reply.code(403).send({
				error: "AccessDenied",
				message: "Доступ к телеметрии бота чужой организации запрещён.",
			});
		}

		const runtime =
			omnichannelBotEngine.getBot(botId) ||
			omnichannelBotEngine.getBotByChannel(channel, orgId, botConfigId);

		if (!runtime) {
			return reply.send({
				botId,
				channel,
				organizationId: orgId,
				isActive: false,
				status: "inactive",
				metrics: {
					totalMessages: 0,
					successMessages: 0,
					failedMessages: 0,
					rateLimitedMessages: 0,
					avgLatencyMs: 0,
					lastLatencyMs: 0,
				},
				memoryEstimatedKb: 2.5,
			});
		}

		return reply.send({
			botId: runtime.botId,
			channel: runtime.channel,
			organizationId: runtime.organizationId,
			isActive: runtime.isActive,
			status: runtime.isActive ? "running" : "stopped",
			enabledPlugins: runtime.enabledPlugins,
			registeredAt: runtime.registeredAt,
			lastActiveAt: runtime.lastActiveAt,
			lastError: runtime.lastError,
			metrics: runtime.metrics,
			memoryEstimatedKb: 2.5,
		});
	});

	/**
	 * GET /api/bots/metrics
	 * Общие метрики движка ботов по всей системе.
	 */
	app.get("/api/bots/metrics", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots engine metrics");
		if (!orgId) return;

		const metrics = omnichannelBotEngine.getEngineMetrics();
		return reply.send(metrics);
	});

	/**
	 * GET /api/bots/:botId/export-source & GET /api/bots/:botId/export-zip
	 * Выгрузка автономного ZIP-архива с исходным кодом демона бота (Node.js/Docker/Systemd).
	 */
	const exportZipHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "export bot source");
		if (!orgId) return;

		const { botId } = request.params as { botId: string };
		const parts = botId.split(":");
		const channel = (parts[0] || "telegram") as BotChannel;
		const targetOrgId = parts.length >= 3 ? parts[1] : orgId;

		if (targetOrgId !== orgId) {
			return reply.code(403).send({
				error: "AccessDenied",
				message: "Нельзя экспортировать исходный код бота чужой организации.",
			});
		}

		let clinicName = "Клиника ДЕНТЕ";
		const orgRecords = await db
			.select({ name: organizations.name })
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		if (orgRecords.length > 0 && orgRecords[0]?.name) {
			clinicName = orgRecords[0].name;
		}

		const zipBuffer = BotSourceExporter.exportStandaloneBotPackage({
			botId,
			organizationId: orgId,
			clinicName,
			channel,
		});

		const safeSlug = clinicName
			.toLowerCase()
			.replace(/[^a-z0-9а-яё]+/gi, "-")
			.slice(0, 25);

		reply.header("Content-Type", "application/zip");
		reply.header(
			"Content-Disposition",
			`attachment; filename="dente-bot-${safeSlug}-${channel}.zip"`,
		);
		reply.header("Content-Length", zipBuffer.length);
		reply.header("Cache-Control", "no-cache, no-store, must-revalidate");

		return reply.send(zipBuffer);
	};

	app.get(
		"/api/bots/:botId/export-source",
		{ config: { tenantTxSelfManaged: true } },
		exportZipHandler,
	);

	app.get(
		"/api/bots/:botId/export-zip",
		{ config: { tenantTxSelfManaged: true } },
		exportZipHandler,
	);

	/**
	 * УНИФИЦИРОВАННЫЙ ВЕБХУК:
	 * GET /api/bots/webhook/:channel/:organizationId (Рукопожатия и валидация)
	 */
	app.get<{
		Params: { channel: string; organizationId: string };
		Querystring: Record<string, string>;
	}>("/api/bots/webhook/:channel/:organizationId", async (request, reply) => {
		const { channel, organizationId } = request.params;
		const query = request.query || {};

		// WhatsApp Webhook Challenge
		if (channel === "whatsapp" && query["hub.mode"] === "subscribe") {
			const challenge = query["hub.challenge"];
			if (challenge) {
				return reply.code(200).send(challenge);
			}
		}

		// VK Callback API GET fallback
		if (channel === "vk" && query.type === "confirmation") {
			const [cfg] = await db
				.select({ confirmationCode: denteVkBotConfigs.confirmationCode })
				.from(denteVkBotConfigs)
				.where(eq(denteVkBotConfigs.organizationId, organizationId))
				.limit(1);

			return reply.code(200).send(cfg?.confirmationCode || process.env.VK_CONFIRMATION_TOKEN || "ok");
		}

		return reply.code(200).send("OK");
	});

	/**
	 * УНИФИЦИРОВАННЫЙ ВЕБХУК:
	 * POST /api/bots/webhook/:channel/:organizationId (Приём входящих событий)
	 */
	app.post<{
		Params: { channel: string; organizationId: string };
		Body: Record<string, unknown>;
	}>("/api/bots/webhook/:channel/:organizationId", async (request, reply) => {
		const { channel, organizationId } = request.params;
		const body = request.body || {};

		if (channel === "vk") {
			if (body.type === "confirmation") {
				const [cfg] = await db
					.select({ confirmationCode: denteVkBotConfigs.confirmationCode })
					.from(denteVkBotConfigs)
					.where(eq(denteVkBotConfigs.organizationId, organizationId))
					.limit(1);

				return reply
					.code(200)
					.send(cfg?.confirmationCode || process.env.VK_CONFIRMATION_TOKEN || "ok");
			}

			if (body.type === "message_new") {
				const msgObj = (body.object as { message?: Record<string, unknown> })?.message;
				if (msgObj) {
					const inbound: BotInboundMessage = {
						channel: "vk",
						organizationId,
						botConfigId: "default",
						senderId: String(msgObj.from_id || ""),
						messageId: String(msgObj.id || body.event_id || ""),
						text: String(msgObj.text || ""),
						payload: typeof msgObj.payload === "string" ? msgObj.payload : null,
						timestamp: Date.now(),
						rawEvent: body,
					};
					await omnichannelBotEngine.dispatchInboundMessage(inbound);
				}
				return reply.code(200).send("ok");
			}

			return reply.code(200).send("ok");
		}

		if (channel === "telegram") {
			const tgBody = body as {
				message?: {
					message_id: number;
					from?: { id: number; first_name?: string; last_name?: string };
					text?: string;
				};
				callback_query?: {
					id: string;
					from?: { id: number; first_name?: string };
					message?: { message_id: number };
					data?: string;
				};
			};

			let inbound: BotInboundMessage | null = null;
			if (tgBody.message) {
				const from = tgBody.message.from;
				inbound = {
					channel: "telegram",
					organizationId,
					botConfigId: "default",
					senderId: String(from?.id || ""),
					senderName: [from?.first_name, from?.last_name].filter(Boolean).join(" "),
					messageId: String(tgBody.message.message_id),
					text: tgBody.message.text || "",
					timestamp: Date.now(),
					rawEvent: body,
				};
			} else if (tgBody.callback_query) {
				const from = tgBody.callback_query.from;
				inbound = {
					channel: "telegram",
					organizationId,
					botConfigId: "default",
					senderId: String(from?.id || ""),
					senderName: from?.first_name || null,
					messageId: String(tgBody.callback_query.message?.message_id || ""),
					text: "",
					payload: tgBody.callback_query.data || null,
					timestamp: Date.now(),
					rawEvent: body,
				};
			}

			if (inbound) {
				await omnichannelBotEngine.dispatchInboundMessage(inbound);
			}

			return reply.code(200).send({ ok: true });
		}

		if (channel === "whatsapp") {
			let inbound: BotInboundMessage | null = null;

			// Green-API format
			if (body.typeWebhook === "incomingMessageReceived") {
				const senderData = body.senderData as { sender?: string; senderName?: string } | undefined;
				const messageData = body.messageData as
					| { textMessageData?: { textMessage?: string } }
					| undefined;

				inbound = {
					channel: "whatsapp",
					organizationId,
					botConfigId: "default",
					senderId: (senderData?.sender || "").replace(/@.*$/, ""),
					senderName: senderData?.senderName || null,
					messageId: String(body.idMessage || ""),
					text: messageData?.textMessageData?.textMessage || "",
					timestamp: Date.now(),
					rawEvent: body,
				};
			}
			// Meta Cloud API format
			else if (Array.isArray(body.entry)) {
				const entry = body.entry[0] as
					| {
							changes?: Array<{
								value?: {
									messages?: Array<{
										id: string;
										from: string;
										text?: { body?: string };
										interactive?: { button_reply?: { id: string } };
									}>;
									contacts?: Array<{ profile?: { name?: string } }>;
								};
							}>;
					  }
					| undefined;

				const msg = entry?.changes?.[0]?.value?.messages?.[0];
				const contact = entry?.changes?.[0]?.value?.contacts?.[0];

				if (msg) {
					inbound = {
						channel: "whatsapp",
						organizationId,
						botConfigId: "default",
						senderId: msg.from,
						senderName: contact?.profile?.name || null,
						messageId: msg.id,
						text: msg.text?.body || "",
						payload: msg.interactive?.button_reply?.id || null,
						timestamp: Date.now(),
						rawEvent: body,
					};
				}
			}

			if (inbound) {
				await omnichannelBotEngine.dispatchInboundMessage(inbound);
			}

			return reply.code(200).send({ received: true });
		}

		if (channel === "max") {
			const inbound: BotInboundMessage = {
				channel: "max",
				organizationId,
				botConfigId: "default",
				senderId: String(body.user_id || body.chat_id || body.sender_id || ""),
				senderName: typeof body.user_name === "string" ? body.user_name : null,
				messageId: typeof body.message_id === "string" ? body.message_id : null,
				text: typeof body.text === "string" ? body.text : "",
				payload: typeof body.payload === "string" ? body.payload : null,
				timestamp: Date.now(),
				rawEvent: body,
			};

			await omnichannelBotEngine.dispatchInboundMessage(inbound);
			return reply.code(200).send({ ok: true });
		}

		return reply.code(200).send({ ok: true });
	});
}
