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
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	namedDevelopmentModeActive,
	requireNonDoctorAccess,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	communicationEvents,
	denteWhatsappBotConfigs,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import {
	applyReceipts,
	parseWhatsappStatuses,
} from "../services/communications/deliveryReceipts.js";
import { processInboundEvents } from "../services/messengerIngestion.js";
import { wsBroker } from "../services/websocketBroker.js";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../whatsappTransport.js";

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

/** Точная проверка пути вебхука (без учёта query-строки). */
function isWebhookPath(url: string): boolean {
	const pathname = (url.split("?")[0] ?? "").replace(/\/+$/, "");
	return pathname.endsWith("/webhook");
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
				config.enabledFeaturesJson as any,
				[],
			),
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
			reply.code(400);
			return { error: "BadWebhookRequest" };
		}

		/*
		 * ОПЕРАЦИЯ «ДО АРЕНДАТОРА». Рукопожатие присылает Meta: токена клиники в
		 * нём нет и быть не может, а организация станет известна только из
		 * найденной строки — ищем по самому проверочному токену. Под FORCE RLS
		 * запрос без контекста отдавал ноль строк, и подписка на вебхук
		 * ОТКЛОНЯЛАСЬ ВСЕГДА: WhatsApp клиники нельзя было подключить вовсе.
		 * Обход накрывает ровно этот SELECT одной колонки.
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
		 * ЭХО РУКОПОЖАТИЯ ОСТАЁТСЯ НА reply.send И ЭТО НАМЕРЕННО. Тело здесь —
		 * не JSON, а голая строка hub.challenge, которую Meta сверяет побайтно.
		 * Переводить нечего: обёртки-транзакции вокруг этого обработчика нет
		 * (запрос приходит от Meta без токена клиники, request.tenantId не
		 * выставлен), значит и откладывать COMMIT здесь нечему.
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
				/*
				 * БЕЗ App Secret ОТПРАВИТЕЛЯ ПРОВЕРИТЬ НЕЧЕМ.
				 *
				 * БЫЛО: `if (process.env.NODE_ENV === "production")` — отказ включался
				 * ТОЛЬКО в явно названном production, иначе управление шло дальше и
				 * ingest принимался с одним console.warn. `apps/api/package.json`
				 * объявляет `"start": "node dist/server.js"` и NODE_ENV не задаёт, ни
				 * один Dockerfile тоже: у заказчика NODE_ENV ПУСТ, условие ложно, и
				 * этот вебхук — открытый в интернет публичный маршрут — принимал любой
				 * POST от кого угодно без подписи. Кто угодно мог вбрасывать «входящие
				 * сообщения пациентов» в омниканальный ящик клиники и заводить по ним
				 * записи. Измерено зондом: при пустом NODE_ENV ответ 200, при
				 * NODE_ENV=staging тоже 200.
				 *
				 * СТАЛО: приём без подписи разрешён, только если ЯВНО НАЗВАН режим
				 * разработки (`development`/`test`) — `namedDevelopmentModeActive()` из
				 * accessGuard.ts, тот же самый предикат, что охраняет клинические
				 * маршруты и вебхук Telegram. Пустой, незаданный или незнакомый
				 * NODE_ENV («staging», «prod», опечатка) режимом разработки не
				 * считается, и ingest в нём требует App Secret. Ошибка в имени режима
				 * теперь закрывает вебхук, а не открывает его.
				 *
				 * ТОМУ, КТО ЧЕРЕЗ ПОЛГОДА ЗАХОЧЕТ «ВЕРНУТЬ КАК БЫЛО». Симптом будет
				 * такой: «WhatsApp перестал доставлять сообщения, вебхук отвечает 503
				 * WhatsappAppSecretRequired». Раньше он отвечал 200 не потому, что был
				 * настроен, а потому, что проверка подписи была выключена пустым
				 * окружением. Правильный выход один: задать WHATSAPP_APP_SECRET (или
				 * META_APP_SECRET) в окружении сервера — тогда заработает настоящая
				 * проверка x-hub-signature-256 в ветке else. Для локальной отладки без
				 * учётных данных Meta выставьте NODE_ENV=development. Возврат к
				 * `=== "production"` в любом виде снова откроет публичный вебхук
				 * медицинской системы всему интернету.
				 */
				if (!namedDevelopmentModeActive()) {
					// Имя переменной окружения ушло из тела ответа в журнал сервера:
					// маршрут публичный, и его ответ читает кто угодно. Настройщику
					// имя нужно, и оно есть — в журнале, а не в ответе наружу.
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
			 * TypeError on body.entry (cast-after-200) once the client already
			 * got 200.
			 *
			 * ЭТА ОТПРАВКА НАМЕРЕННО НЕ В ПОЗИЦИИ return И В ЗНАЧЕНИЕ НЕ
			 * ПЕРЕВОДИТСЯ. Ниже идёт полный разбор входящих сообщений с записями
			 * в базу; вернуть значение отсюда значило бы отложить подтверждение
			 * до конца этого разбора, а Meta на задержку отвечает повторной
			 * доставкой. Отложенного COMMIT здесь нет: запрос приходит от Meta
			 * без токена клиники, обёртка server.ts этот обработчик не
			 * оборачивает, а каждая вставка ниже открывает собственную
			 * транзакцию withTenantCtx и фиксируется сама.
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

					/*
					 * ОПЕРАЦИЯ «ДО АРЕНДАТОРА»: событие прислала Meta, и чья это
					 * клиника, известно только по номеру отправляющего аккаунта.
					 * Без контекста запрос отдавал ноль строк, срабатывало
					 * `continue` ниже — и КАЖДОЕ входящее сообщение WhatsApp
					 * молча выбрасывалось. Обход накрывает ровно этот SELECT
					 * одной колонки; всё, что делается дальше, идёт под
					 * контекстом найденной клиники.
					 */
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

					/*
					 * Квитанции доставки. Раньше value.statuses отбрасывался молча, и
					 * сообщение, ушедшее в WhatsApp, навсегда оставалось «отправлено»:
					 * доставлено оно, прочитано или отвергнуто — в журнале не
					 * отличалось, хотя для SMS это работало. Организация в
					 * applyReceipts не передаётся: она берётся из найденной строки
					 * очереди, иначе чужой вебхук мог бы менять статусы другой клиники.
					 */
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
							// Квитанция не должна ломать разбор входящих сообщений: пациент
							// написал в чат, и это важнее, чем обновление статуса.
							console.error("Whatsapp: квитанции не применены:", receiptError);
						}
					}

					const messages = Array.isArray(value.messages)
						? (value.messages as unknown[])
						: [];

					for (const msg of messages) {
						if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
							continue;
						}
						const m = msg as Record<string, unknown>;
						const fromId = typeof m.from === "string" ? m.from : "unknown";
						const textRaw = m.text;
						const textObj =
							textRaw && typeof textRaw === "object" && !Array.isArray(textRaw)
								? (textRaw as Record<string, unknown>)
								: undefined;
						const textBody =
							typeof textObj?.body === "string" ? textObj.body : null;

						// Клиника уже известна из настроек бота, найденных выше, —
						// вставка идёт под её контекстом. Без него `INSERT` не
						// «возвращал ноль строк», а падал с 42501: в WITH CHECK
						// политики messenger_inbound_events обхода нет.
						await withTenantCtx(inboundOrganizationId, async (tx) => {
							await tx.insert(messengerInboundEvents).values({
								organizationId: inboundOrganizationId,
								channel: "whatsapp",
								externalChatId: fromId,
								messageText: textBody,
								eventKind: "message",
								rawPayload: m as Record<string, unknown>,
							});
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
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Укажите ID пациента и текст сообщения.",
			};
		}

		const { patientId, message } = parsed.data;

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

		if (!config || !config.isActive) {
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

		const sendResult = await sendWhatsappTextMessage({
			...credentials,
			toPhoneE164: recipient,
			text: message,
		});

		// Запись в историю коммуникаций делается по фактическому результату:
		// неудачная отправка сохраняется со статусом failed, а не как sent.
		await db.insert(communicationEvents).values({
			organizationId: orgId,
			patientId,
			channel: "whatsapp",
			direction: "outbound",
			status: sendResult.ok ? "sent" : "failed",
			message,
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
}
