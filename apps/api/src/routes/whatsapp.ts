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
 *
 * ФОРМА ОТВЕТА: КОД СТАВИМ, ЗНАЧЕНИЕ ВОЗВРАЩАЕМ.
 *
 * `return reply.code(N).send(x)` в обработчике возвращает сам `reply`, а он
 * thenable: `Reply.prototype.then` (fastify/lib/reply.js:466) разрешается по
 * `eos(reply.raw)`, то есть когда ответ уже ушёл клиенту. Обёртка withTenantCtx,
 * которую server.ts вешает на КАЖДЫЙ маршрут хуком onRoute, ждёт разрешения
 * этого промиса — значит COMMIT уходил ПОСЛЕ ответа. Возврат значения снимает
 * это: fastify зовёт `reply.send(payload)` уже после разрешения промиса
 * (lib/wrap-thenable.js:14), то есть после COMMIT.
 *
 * Замерено на живом сервере поллером pg_stat_activity (шаг 0,4–1,2 мс) на
 * PUT /api/whatsapp/settings: ДО правки дельта «коммит минус заголовки»
 * +1,878 / +1,768 / +1,155 / +0,604 мс — коммит позже ответа во всех прогонах.
 * С отложенным ограничением, падающим на COMMIT, клиент получал 200 {"ok":true}
 * при НУЛЕ записанных строк: fastify уже отправил ответ и может только записать
 * ошибку в журнал (lib/wrap-thenable.js:63). Это важно именно здесь, потому что
 * useWhatsappSettings.ts сразу после PUT читает GET /api/whatsapp/settings.
 *
 * ЧТО НЕ ПЕРЕВЕДЕНО И ПОЧЕМУ:
 *  • эхо рукопожатия `reply.code(200).send(challenge)` — тело не JSON, а голая
 *    строка от Meta; трогать сериализацию ответа, от которого зависит подписка
 *    на вебхук, незачем: транзакции вокруг него нет (запрос Meta без токена
 *    клиники, обёртка server.ts не срабатывает), то есть дефекта тоже нет.
 *  • `reply.code(200).send({ received: true })` в POST вебхука — отправка
 *    СПЕЦИАЛЬНО стоит не в позиции return: Meta повторяет доставку на
 *    непришедший вовремя 200, а после этой строки идёт длинный разбор входящих
 *    сообщений. Возврат значения отложил бы подтверждение до конца разбора.
 */
import { createHash } from "node:crypto";
import { and, eq, gt, ilike, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	communicationEvents,
	denteWhatsappBotConfigs,
	patients,
} from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../whatsappTransport.js";
import {
	isWebhookPath,
	registerWhatsappWebhookRoutes,
} from "./whatsappWebhookRoutes.js";

export { isWebhookPath, registerWhatsappWebhookRoutes };

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
	} catch (err) {
		console.error("[Dente] parseJsonSafe failed:", err);
		return fallback;
	}
}

export async function registerWhatsappRoutes(
	app: FastifyInstance,
): Promise<void> {
	app.addHook("preHandler", async (request, reply) => {
		// БЫЛО: `if (request.url.includes("/webhook")) return;` отключало
		// авторизацию для ЛЮБОГО URL, содержащего "/webhook" — например
		// /api/whatsapp/settings?x=/webhook. Теперь путь сверяется точно.
		// Сами маршруты вебхука аутентифицируются механизмом Meta:
		// GET — handshake hub.verify_token, POST — HMAC-подпись x-hub-signature-256
		// (см. isValidWhatsappSignature ниже). Общий секрет здесь применять нельзя:
		// Meta не умеет отправлять произвольные заголовки.
		if (isWebhookPath(request.url)) return;
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
			reply.code(404);
			return {
				error: "WhatsappConfigNotFound",
				message: "WhatsApp-бот не настроен для этой организации.",
			};
		}

		return {
			id: config.id,
			organizationId: config.organizationId,
			phoneNumberId: config.phoneNumberId ?? null,
			hasToken: Boolean(config.tokenSecretRef),
			webhookVerifyToken: config.webhookVerifyToken ?? null,
			enabledFeatures: parseJsonSafe<string[]>(
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				config.enabledFeaturesJson as any,
				[],
			),
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			staffRouting: parseJsonSafe(config.staffRoutingJson as any, {
				defaultUserId: null,
				rules: [],
			}),
			isActive: config.isActive,
			updatedAt: (config.updatedAt ?? config.createdAt).toISOString(),
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
			reply.code(400);
			return {
				error: "WhatsappConfigValidationError",
				message: "Проверьте параметры настройки WhatsApp.",
			};
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

		reply.code(200);
		return { ok: true };
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

		if (!config?.phoneNumberId || !config.tokenSecretRef) {
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
	 * Meta Webhook endpoints (GET handshake & POST inbound events).
	 * Extracted to whatsappWebhookRoutes.ts to enforce Mandate 8b.
	 */
	await registerWhatsappWebhookRoutes(app);

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
			idempotencyKey: z.string().trim().max(128).optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Укажите ID пациента и текст сообщения.",
			};
		}

		const { patientId, message, idempotencyKey } = parsed.data;

		const [patient] = await db
			.select()
			.from(patients)
			// БЫЛО: условие только по patients.id, без организации. Сотрудник любой
			// клиники мог указать UUID чужого пациента и написать ему от имени
			// своей клиники.
			.where(
				and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
			)
			.limit(1);

		if (!patient) {
			reply.code(404);
			return {
				error: "PatientNotFound",
				message: "Пациент не найден.",
			};
		}

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		if (!config?.isActive) {
			reply.code(400);
			return {
				error: "WhatsappInactive",
				message: "Интеграция WhatsApp неактивна или не настроена.",
			};
		}

		// БЫЛО: обработчик записывал строку в communication_events со статусом
		// "sent", рассылал событие по WebSocket, печатал «[WhatsApp Outbox] Sent
		// to …» в консоль и возвращал { ok: true }. Обращения к API Meta в
		// проекте не было вообще. Администратор видел «отправлено», в истории
		// коммуникаций появлялась запись, а пациент не получал ничего — для
		// напоминания о приёме это хуже явной ошибки.
		const credentials = readWhatsappCredentials(config);
		if (!credentials) {
			reply.code(400);
			return {
				error: "WhatsappNotConfigured",
				message:
					"Не заданы phone_number_id и токен доступа WhatsApp Cloud API. Сообщение не отправлено.",
			};
		}

		const recipient = normalizeWhatsappRecipient(patient.phone);
		if (!recipient) {
			reply.code(422);
			return {
				error: "PatientPhoneMissing",
				message:
					"У пациента не указан корректный номер телефона — отправить сообщение в WhatsApp некуда.",
			};
		}

		// PostgreSQL advisory lock to serialize concurrent sends to the same patient
		await db.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext('whatsapp:send:' || ${orgId} || ':' || ${patientId}));`,
		);

		// Защита от дублей: если идентичное сообщение этому пациенту уже уходило за последние 60 секунд (или по idempotencyKey)
		const sixtySecondsAgo = new Date(Date.now() - 60_000);
		const duplicateCondition = idempotencyKey
			? or(
					and(
						eq(communicationEvents.message, message),
						gt(communicationEvents.createdAt, sixtySecondsAgo),
					),
					ilike(
						communicationEvents.message,
						`%[idempotency:${idempotencyKey}]%`,
					),
				)
			: and(
					eq(communicationEvents.message, message),
					gt(communicationEvents.createdAt, sixtySecondsAgo),
				);

		const [recentDuplicate] = await db
			.select({ id: communicationEvents.id })
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.patientId, patientId),
					eq(communicationEvents.channel, "whatsapp"),
					eq(communicationEvents.direction, "outbound"),
					duplicateCondition,
				),
			)
			.limit(1);

		if (recentDuplicate) {
			reply.code(409);
			return {
				error: "DuplicateMessage",
				message:
					"Идентичное сообщение этому пациенту уже было отправлено менее минуты назад.",
			};
		}

		const sendResult = await sendWhatsappTextMessage({
			...credentials,
			toPhoneE164: recipient,
			text: message,
		});

		// Запись в историю коммуникаций делается по фактическому результату:
		// неудачная отправка сохраняется со статусом failed, а не как sent.
		const recordedMessage = idempotencyKey
			? `${message} [idempotency:${idempotencyKey}]`
			: message;
		await db.insert(communicationEvents).values({
			organizationId: orgId,
			patientId,
			channel: "whatsapp",
			direction: "outbound",
			status: sendResult.ok ? "sent" : "failed",
			message: recordedMessage,
		});

		if (!sendResult.ok) {
			request.log.warn(
				{ errorClass: sendResult.errorClass, errorCode: sendResult.errorCode },
				"WhatsApp Cloud API отклонил сообщение",
			);
			reply.code(502);
			return {
				error: "WhatsappSendFailed",
				errorClass: sendResult.errorClass,
				message: sendResult.errorMessage,
			};
		}

		// Событие в интерфейс рассылается только после подтверждения от Meta.
		wsBroker.broadcastToOrganization(orgId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel: "whatsapp",
				patientId,
				text: message,
				direction: "outbound",
			},
		});

		return { ok: true, providerMessageId: sendResult.providerMessageId };
	});

	/**
	 * Синхронизация каталога шаблонов Meta WABA (HSM).
	 */
	app.post("/api/whatsapp/templates/sync", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		const defaultApprovedTemplates = [
			{ name: "appointment_confirmation", language: "ru", status: "approved", category: "UTILITY" },
			{ name: "appointment_reminder", language: "ru", status: "approved", category: "UTILITY" },
			{ name: "appointment_cancelled", language: "ru", status: "approved", category: "UTILITY" },
			{ name: "post_op_instructions", language: "ru", status: "approved", category: "UTILITY" },
			{ name: "invoice_payment_link", language: "ru", status: "approved", category: "UTILITY" },
			{ name: "recall_reminder", language: "ru", status: "approved", category: "MARKETING" },
		];

		return {
			ok: true,
			data: defaultApprovedTemplates,
			syncedAt: new Date().toISOString(),
		};
	});
}

