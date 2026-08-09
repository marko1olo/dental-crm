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
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	denteMaxBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";
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

function parseJsonSafe<T>(value: unknown, fallback: T): T {
	if (!value) return fallback;
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch (err) {
			console.error("[Dente] parseJsonSafe failed:", err);
			return fallback;
		}
	}
	return value as T;
}

/** Точная проверка пути вебхука (без учёта query-строки). */
function isWebhookPath(url: string): boolean {
	const pathname = (url.split("?")[0] ?? "").replace(/\/+$/, "");
	return pathname.endsWith("/webhook");
}

export async function registerMaxRoutes(app: FastifyInstance): Promise<void> {
	app.addHook("preHandler", async (request, reply) => {
		// БЫЛО: `if (request.url.includes("/webhook")) return;` полностью
		// отключало авторизацию для любого URL, содержащего "/webhook" —
		// включая, например, /api/max/settings?x=/webhook. Теперь путь
		// вебхука проверяется точно и защищён общим секретом канала.
		if (isWebhookPath(request.url)) {
			if (
				!verifyWebhookSecret(request, reply, {
					channel: "max",
					secretEnvNames: ["MAX_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
				})
			) {
				return reply;
			}
			return;
		}
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
			updatedAt: (config.updatedAt ?? new Date()).toISOString(),
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

		if (!config?.botId || !config.tokenSecretRef) {
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
		// Always ACK first — MAX retries on non-200. Shape-guard AFTER send so a
		// null/non-object body cannot TypeError on body.payload (cast-after-200).
		reply.code(200).send({ ok: true });

		if (
			!request.body ||
			typeof request.body !== "object" ||
			Array.isArray(request.body)
		) {
			return;
		}
		const body = request.body as Record<string, unknown>;
		const payloadRaw = body.payload;
		if (
			!payloadRaw ||
			typeof payloadRaw !== "object" ||
			Array.isArray(payloadRaw)
		) {
			return;
		}
		const payload = payloadRaw as Record<string, unknown>;

		const chatRaw = payload.chat;
		const chat =
			chatRaw && typeof chatRaw === "object" && !Array.isArray(chatRaw)
				? (chatRaw as Record<string, unknown>)
				: undefined;
		const textValue = payload.text;
		const text = typeof textValue === "string" ? textValue : null;
		const chatId = typeof chat?.chatId === "string" ? chat.chatId : "unknown";

		const rawTs =
			typeof payload.timestamp === "number"
				? payload.timestamp
				: typeof payload.timestamp === "string"
					? Number.parseInt(payload.timestamp, 10)
					: typeof body.timestamp === "number"
						? body.timestamp
						: typeof body.timestamp === "string"
							? Number.parseInt(body.timestamp, 10)
							: Number.NaN;
		if (!Number.isNaN(rawTs) && rawTs > 0) {
			const msgTsSec = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
			const nowSec = Math.floor(Date.now() / 1000);
			if (Math.abs(nowSec - msgTsSec) > 300) {
				request.log.warn(
					{ msgTsSec, nowSec },
					"MAX webhook timestamp drift > 300s, skipping ingestion",
				);
				return;
			}
		}

		const msgIdRaw =
			payload.msgId ??
			payload.msg_id ??
			payload.messageId ??
			body.msgId ??
			body.eventId ??
			body.event_id;
		const msgId =
			typeof msgIdRaw === "string" || typeof msgIdRaw === "number"
				? String(msgIdRaw).trim()
				: null;

		// Identify org by bot ID passed in header or query param
		const botIdRaw =
			request.headers["x-max-bot-id"] ??
			(request.query as Record<string, string>).botId;
		const botIdHeader = Array.isArray(botIdRaw) ? botIdRaw[0] : botIdRaw;

		if (!botIdHeader) return;

		/*
		 * ОПЕРАЦИЯ «ДО АРЕНДАТОРА»: событие прислал MAX, токена клиники в
		 * вебхуке нет, и чья это клиника — известно только по идентификатору
		 * бота. Под FORCE RLS запрос без контекста отдавал ноль строк,
		 * срабатывал `return` ниже, и КАЖДОЕ входящее сообщение MAX молча
		 * пропадало. Обход накрывает ровно этот SELECT одной колонки.
		 */
		const [orgConfig] = await withSuperuserBypass(async (tx) =>
			tx
				.select({ organizationId: denteMaxBotConfigs.organizationId })
				.from(denteMaxBotConfigs)
				.where(eq(denteMaxBotConfigs.botId, botIdHeader))
				.limit(1),
		);

		if (!orgConfig) return;

		// Клиника известна из найденных настроек бота — вставка идёт под её
		// контекстом. Без него `INSERT` падал с 42501, а ответ 200 отправлялся
		// раньше (выше по обработчику), поэтому MAX не повторял событие и оно
		// терялось окончательно.
		const inboundOrganizationId = orgConfig.organizationId;
		await withTenantCtx(inboundOrganizationId, async (tx) => {
			if (msgId) {
				const existing = await tx
					.select({ id: messengerInboundEvents.id })
					.from(messengerInboundEvents)
					.where(
						and(
							eq(messengerInboundEvents.organizationId, inboundOrganizationId),
							eq(messengerInboundEvents.externalId, msgId),
						),
					)
					.limit(1);
				if (existing.length > 0) {
					request.log.info(
						{ msgId, inboundOrganizationId },
						"MAX message already ingested (replay skipped)",
					);
					return;
				}
			}

			await tx.insert(messengerInboundEvents).values({
				organizationId: inboundOrganizationId,
				channel: "max",
				externalId: msgId,
				externalChatId: chatId,
				messageText: text,
				eventKind: "message",
				rawPayload: body as Record<string, unknown>,
			});
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

		// biome-ignore lint/correctness/noUnusedVariables: automated suppression
		const { patientId, message } = parsed.data;

		const [patient] = await db
			.select()
			.from(patients)
			// БЫЛО: условие только по patients.id, без организации. Сотрудник любой
			// клиники мог указать UUID чужого пациента.
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
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

		if (!config?.isActive) {
			return reply.code(400).send({
				error: "MaxInactive",
				message: "Интеграция VK Max неактивна или не настроена.",
			});
		}

		// БЫЛО: обработчик писал строку в communication_events со статусом "sent",
		// рассылал событие по WebSocket, печатал «[MAX Outbox] Sent to …» и
		// возвращал { ok: true }. Обращения к API мессенджера не было. Отправка
		// выглядела успешной, пациент не получал ничего.
		//
		// Транспорт MAX здесь не реализован: публично проверяемого контракта Bot
		// API у business.max.ru нет (документация за входом в бизнес-аккаунт), а
		// выдумывать адреса и формат запроса — это ровно та же подделка, только
		// уровнем ниже. Пока транспорт не написан, обработчик честно отвечает
		// 501: интерфейс покажет ошибку вместо ложного «отправлено».
		//
		// Когда контракт появится: добавить maxTransport.ts по образцу
		// whatsappTransport.ts, записывать communication_events со статусом по
		// фактическому результату (channel: "max" — значение добавлено в
		// перечисление миграцией 0120) и рассылать событие только после
		// подтверждения от провайдера.
		request.log.warn(
			{ organizationId: orgId, patientId },
			"Запрошена отправка в MAX, транспорт не реализован",
		);
		return reply.code(501).send({
			error: "MaxSendNotImplemented",
			message:
				"Отправка сообщений в MAX пока не реализована: нет транспорта к Bot API. Сообщение НЕ отправлено — воспользуйтесь другим каналом.",
		});
	});
}

// Silence unused import warning for patients (used in foreign key definition)
void patients;
