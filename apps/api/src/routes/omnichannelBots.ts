import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	clinics,
	communicationEvents,
	crmLeads,
	denteMaxBotConfigs,
	denteTelegramBotConfigs,
	denteVkBotConfigs,
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	organizations,
	patients,
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

	/**
	 * GET /api/bots/inbox
	 * Список активных диалогов во всех мессенджерах (Telegram, VK, WhatsApp, MAX)
	 * с бейджами каналов, статусом перехвата оператором и привязкой к лидам/пациентам.
	 */
	app.get("/api/bots/inbox", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots inbox read");
		if (!orgId) return;

		// 1. Получаем входящие события мессенджеров за последнее время
		const inboundEvents = await db
			.select()
			.from(messengerInboundEvents)
			.where(eq(messengerInboundEvents.organizationId, orgId))
			.orderBy(desc(messengerInboundEvents.createdAt))
			.limit(200);

		// 2. Получаем исходящие события коммуникаций
		const outboundEvents = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					inArray(communicationEvents.channel, ["telegram", "vk", "whatsapp", "max"]),
				),
			)
			.orderBy(desc(communicationEvents.createdAt))
			.limit(200);

		// 3. Получаем список пациентов клиники с привязками к чатам
		const clinicPatients = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				notes: patients.notes,
			})
			.from(patients)
			.where(eq(patients.organizationId, orgId))
			.limit(300);

		const patientMap = new Map<string, (typeof clinicPatients)[0]>();
		for (const p of clinicPatients) {
			patientMap.set(p.id, p);
		}

		// 4. Получаем список лидов клиники
		const leads = await db
			.select({
				id: crmLeads.id,
				name: crmLeads.name,
				patientName: crmLeads.patientName,
				phone: crmLeads.phone,
				source: crmLeads.source,
				status: crmLeads.status,
				notes: crmLeads.notes,
			})
			.from(crmLeads)
			.where(eq(crmLeads.organizationId, orgId))
			.limit(300);

		// Агрегируем диалоги по ключу: `${channel}:${senderId}`
		interface InboxConversation {
			key: string;
			channel: BotChannel;
			senderId: string;
			senderName: string;
			patientId: string | null;
			patientName: string;
			phone: string | null;
			lastMessage: string;
			lastMessageAt: string;
			lastMessageDirection: "inbound" | "outbound";
			unreadCount: number;
			isIntercepted: boolean;
			interceptedBy: string | null;
			leadId: string | null;
			leadStatus: string | null;
		}

		const convMap = new Map<string, InboxConversation>();

		for (const evt of inboundEvents) {
			const channel = (evt.channel as BotChannel) || "telegram";
			const senderId = evt.externalChatId;
			const key = `${channel}:${senderId}`;

			// Ищем пациента
			const rawPayload = (evt.rawPayload as Record<string, any>) || {};
			const senderName =
				rawPayload.user_name ||
				[rawPayload.from?.first_name, rawPayload.from?.last_name].filter(Boolean).join(" ") ||
				rawPayload.senderData?.senderName ||
				null;

			let matchedPatient = evt.patientId ? patientMap.get(evt.patientId) : undefined;
			if (!matchedPatient) {
				matchedPatient = clinicPatients.find(
					(p) =>
						(p.notes && p.notes.includes(`${channel}:${senderId}`)) ||
						(p.phone && senderId.includes(p.phone.replace(/\D/g, "").slice(-10))),
				);
			}

			// Ищем лид
			const matchedLead = leads.find(
				(l) =>
					(l.notes && l.notes.includes(`${channel}:${senderId}`)) ||
					(l.phone && senderId.includes(l.phone.replace(/\D/g, "").slice(-10))),
			);

			const interceptInfo = omnichannelBotEngine.getChatInterceptInfo(channel, orgId, senderId);

			if (!convMap.has(key)) {
				convMap.set(key, {
					key,
					channel,
					senderId,
					senderName: senderName || matchedPatient?.fullName || `${channel.toUpperCase()} Пациент`,
					patientId: matchedPatient?.id || null,
					patientName: matchedPatient?.fullName || senderName || `${channel.toUpperCase()} Пациент`,
					phone: matchedPatient?.phone || matchedLead?.phone || null,
					lastMessage: evt.messageText || "[Сообщение]",
					lastMessageAt: (evt.createdAt || new Date()).toISOString(),
					lastMessageDirection: "inbound",
					unreadCount: 1,
					isIntercepted: interceptInfo.isIntercepted,
					interceptedBy: interceptInfo.interceptedBy,
					leadId: matchedLead?.id || null,
					leadStatus: matchedLead?.status || null,
				});
			} else {
				const current = convMap.get(key)!;
				current.unreadCount++;
				if (new Date(evt.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
					current.lastMessage = evt.messageText || "[Сообщение]";
					current.lastMessageAt = evt.createdAt.toISOString();
					current.lastMessageDirection = "inbound";
				}
			}
		}

		// Учитываем также исходящие сообщения в последнем сообщении
		for (const out of outboundEvents) {
			const channel = out.channel as BotChannel;
			const p = patientMap.get(out.patientId);
			if (!p) continue;

			const match = p.notes?.match(new RegExp(`${channel}:([a-zA-Z0-9_-]+)`));
			const senderId = match ? match[1] : p.phone ? p.phone.replace(/\D/g, "") : null;
			if (!senderId) continue;

			const key = `${channel}:${senderId}`;
			const interceptInfo = omnichannelBotEngine.getChatInterceptInfo(channel, orgId, senderId);

			if (!convMap.has(key)) {
				convMap.set(key, {
					key,
					channel,
					senderId,
					senderName: p.fullName,
					patientId: p.id,
					patientName: p.fullName,
					phone: p.phone,
					lastMessage: out.message,
					lastMessageAt: (out.createdAt || new Date()).toISOString(),
					lastMessageDirection: "outbound",
					unreadCount: 0,
					isIntercepted: interceptInfo.isIntercepted,
					interceptedBy: interceptInfo.interceptedBy,
					leadId: null,
					leadStatus: null,
				});
			} else {
				const current = convMap.get(key)!;
				if (new Date(out.createdAt).getTime() > new Date(current.lastMessageAt).getTime()) {
					current.lastMessage = out.message;
					current.lastMessageAt = out.createdAt.toISOString();
					current.lastMessageDirection = "outbound";
				}
			}
		}

		// Сортируем диалоги по времени последнего сообщения
		const conversations = Array.from(convMap.values()).sort(
			(a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
		);

		return reply.send({ conversations });
	});

	/**
	 * GET /api/bots/inbox/:senderId/messages
	 * Полная хронологическая история переписки для выбранного контакта.
	 */
	app.get<{
		Params: { senderId: string };
		Querystring: { channel?: string };
	}>("/api/bots/inbox/:senderId/messages", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots inbox messages read");
		if (!orgId) return;

		const { senderId } = request.params;
		const channel = (request.query?.channel as BotChannel) || "telegram";

		// 1. Входящие сообщения
		const inbounds = await db
			.select()
			.from(messengerInboundEvents)
			.where(
				and(
					eq(messengerInboundEvents.organizationId, orgId),
					eq(messengerInboundEvents.externalChatId, senderId),
				),
			)
			.orderBy(desc(messengerInboundEvents.createdAt))
			.limit(100);

		// 2. Ищем пациента для получения исходящих ответов
		const phoneDigits = senderId.replace(/\D/g, "");
		const matchedPatients = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					phoneDigits.length >= 10
						? ilike(patients.phone, `%${phoneDigits.slice(-10)}%`)
						: ilike(patients.notes, `%${channel}:${senderId}%`),
				),
			)
			.limit(1);

		const patient = matchedPatients[0] || null;

		let outbounds: (typeof communicationEvents.$inferSelect)[] = [];
		if (patient) {
			outbounds = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, orgId),
						eq(communicationEvents.patientId, patient.id),
					),
				)
				.orderBy(desc(communicationEvents.createdAt))
				.limit(100);
		}

		// 3. Формируем единый упорядоченный таймлайн
		interface ChatMessageItem {
			id: string;
			channel: string;
			senderId: string;
			direction: "inbound" | "outbound";
			sender: "patient" | "bot" | "operator";
			senderName: string;
			text: string;
			createdAt: string;
		}

		const messages: ChatMessageItem[] = [];

		for (const ib of inbounds) {
			const raw = (ib.rawPayload as Record<string, any>) || {};
			const name =
				raw.user_name ||
				[raw.from?.first_name, raw.from?.last_name].filter(Boolean).join(" ") ||
				patient?.fullName ||
				"Пациент";

			messages.push({
				id: ib.id,
				channel: ib.channel,
				senderId: ib.externalChatId,
				direction: "inbound",
				sender: "patient",
				senderName: name,
				text: ib.messageText || "",
				createdAt: (ib.createdAt || new Date()).toISOString(),
			});
		}

		for (const ob of outbounds) {
			const isOperator = Boolean(ob.actorUserId);
			messages.push({
				id: ob.id,
				channel: ob.channel,
				senderId,
				direction: "outbound",
				sender: isOperator ? "operator" : "bot",
				senderName: isOperator ? "Оператор" : "🤖 Ассистент DENTE",
				text: ob.message,
				createdAt: (ob.createdAt || new Date()).toISOString(),
			});
		}

		messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

		const intercept = omnichannelBotEngine.getChatInterceptInfo(channel, orgId, senderId);

		return reply.send({
			messages,
			patient: patient
				? {
						id: patient.id,
						fullName: patient.fullName,
						phone: patient.phone,
					}
				: null,
			intercept,
		});
	});

	/**
	 * POST /api/bots/send-message
	 * Отправка сообщения оператором пациенту с проверкой 152/323-ФЗ и фиксацией в БД.
	 */
	app.post("/api/bots/send-message", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots send message");
		if (!orgId) return;

		const schema = z.object({
			channel: z.enum(["telegram", "vk", "whatsapp", "max"]),
			senderId: z.string().trim().min(1),
			message: z.string().trim().min(1),
			operatorName: z.string().trim().optional(),
		});

		const parse = schema.safeParse(request.body);
		if (!parse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сообщения оператора.",
				details: parse.error.format(),
			});
		}

		const body = parse.data;
		const operatorName = body.operatorName || (request as any).user?.name || "Оператор клиники";

		const result = await omnichannelBotEngine.sendOperatorMessage({
			channel: body.channel,
			organizationId: orgId,
			senderId: body.senderId,
			message: body.message,
			operatorName,
		});

		if (!result.ok) {
			return reply.code(400).send({
				error: "SendMessageFailed",
				message: result.error || "Ошибка отправки сообщения.",
			});
		}

		// Автоматически перехватываем чат, чтобы бот не перебивал оператора
		omnichannelBotEngine.takeoverChat(body.channel, orgId, body.senderId, operatorName);

		return reply.send({ ok: true, messageId: result.messageId });
	});

	/**
	 * POST /api/bots/chats/:senderId/takeover
	 * Перехват диалога оператором (ставит автоответчик бота на паузу).
	 */
	app.post<{
		Params: { senderId: string };
		Body: { channel: BotChannel; operatorName?: string };
	}>("/api/bots/chats/:senderId/takeover", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots takeover");
		if (!orgId) return;

		const { senderId } = request.params;
		const channel = (request.body?.channel as BotChannel) || "telegram";
		const operatorName = request.body?.operatorName || (request as any).user?.name || "Оператор клиники";

		const result = omnichannelBotEngine.takeoverChat(channel, orgId, senderId, operatorName);
		return reply.send(result);
	});

	/**
	 * POST /api/bots/chats/:senderId/release
	 * Возврат диалога боту (снимает паузу с автоответчика).
	 */
	app.post<{
		Params: { senderId: string };
		Body: { channel: BotChannel };
	}>("/api/bots/chats/:senderId/release", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots release");
		if (!orgId) return;

		const { senderId } = request.params;
		const channel = (request.body?.channel as BotChannel) || "telegram";

		const result = omnichannelBotEngine.releaseChat(channel, orgId, senderId);
		return reply.send(result);
	});

	/**
	 * POST /api/bots/test-incoming
	 * Симуляция входящего сообщения (для тестов, отладки и телефона-симулятора).
	 * Сохраняет сообщение в БД, создает лида/пациента и запускает логику бота.
	 */
	app.post("/api/bots/test-incoming", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "bots test incoming");
		if (!orgId) return;

		const schema = z.object({
			channel: z.enum(["telegram", "vk", "whatsapp", "max"]).default("telegram"),
			senderId: z.string().trim().default(() => `test-${Date.now()}`),
			senderName: z.string().trim().default("Тестовый Пациент"),
			text: z.string().trim().default("Здравствуйте! Хочу записаться на прием"),
			payload: z.string().trim().nullable().optional(),
		});

		const parse = schema.safeParse(request.body || {});
		if (!parse.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры тестового сообщения.",
			});
		}

		const data = parse.data;
		const inbound: BotInboundMessage = {
			channel: data.channel,
			organizationId: orgId,
			botConfigId: "default",
			senderId: data.senderId,
			senderName: data.senderName,
			messageId: `sim-${Date.now()}`,
			text: data.text,
			payload: data.payload || null,
			timestamp: Date.now(),
			rawEvent: { simulated: true, ...data },
		};

		const result = await omnichannelBotEngine.dispatchInboundMessage(inbound);
		return reply.send({ ok: true, result });
	});
}
