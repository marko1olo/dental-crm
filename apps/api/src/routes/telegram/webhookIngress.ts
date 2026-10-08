import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	denteTelegramWebhookResponseSchema,
	denteTelegramWebhookUpdateSchema,
} from "@dental/shared";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	inMemoryDomainState,
	claimDenteTelegramWebhookUpdate,
	handleDenteTelegramAppointmentCallback,
	recordDenteTelegramWebhookEvent,
	type DomainState,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	sendTelegramPhotoMessage,
	sendTelegramTextMessage,
} from "../../telegramTransport.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import { telegramMultiTenantSupervisor } from "../../services/telegram/TelegramMultiTenantSupervisor.js";
import {
	isDbConnectionError,
	TelegramReferralLoyaltyService,
} from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { TelegramStaffCockpitService } from "../../services/telegram/TelegramStaffCockpitService.js";
import type {
	TelegramRuntimeContext,
	TelegramWebhookReplyPackage,
	UnknownRecord,
} from "./types.js";
import {
	isRecord,
	readableTelegramPayload,
	readableTelegramText,
	parseTelegramRouteBody,
	telegramPhotoFallbackWarning,
	telegramWebhookReplyFailureWarning,
} from "./telegramUtils.js";
import {
	configuredSendTimeoutMs,
	hydrateTelegramDomainState,
	resolveTelegramRuntimeContext,
	telegramSecretHeader,
} from "./telegramRuntimeContext.js";
import {
	chatFingerprint,
	detectUpdateKind,
	extractCallbackData,
	extractCallbackQueryId,
	extractChatInfo,
	extractCommand,
	extractMessageText,
	extractSafeCallbackAction,
	normalizeCommand,
} from "./webhookUpdateParser.js";
import { handleWebhookSpecializedCallbacks } from "./webhookCallbackHandlers.js";
import { handleWebhookMediaAndEmergency } from "./webhookMediaAndEmergency.js";
import { dispatchWebhookMessage } from "./webhookMessageDispatch.js";

export async function sendWebhookSuggestedReply(
	chatId: string | null,
	suggestedReply: TelegramWebhookReplyPackage,
	botToken: string | null,
): Promise<string | null> {
	if (!chatId || !suggestedReply.text?.trim()) return null;
	if (!botToken) return "Ответ Telegram не отправлен: токен бота не настроен.";
	const text = repairMojibakeText(suggestedReply.text);
	const replyMarkup = readableTelegramPayload(suggestedReply.replyMarkup);
	const photoUrl = suggestedReply.photoUrl?.trim();

	if (photoUrl) {
		const photoResult = await sendTelegramPhotoMessage({
			botToken,
			chatId,
			photoUrl,
			caption: text,
			replyMarkup,
			timeoutMs: Math.min(configuredSendTimeoutMs(), 5000),
		});

		if (photoResult.ok) return null;
	}

	const result = await sendTelegramTextMessage({
		botToken,
		chatId,
		text,
		replyMarkup,
		timeoutMs: Math.min(configuredSendTimeoutMs(), 5000),
	});

	if (result.ok) return null;
	return telegramWebhookReplyFailureWarning(result);
}

export async function handleWebhook(
	request: FastifyRequest<{
		Params: { organizationId?: string; botConfigId?: string; botTokenHash?: string };
	}>,
	reply: FastifyReply,
) {
	let targetOrgId = request.params.organizationId ?? null;
	let targetBotConfigId = request.params.botConfigId ?? null;

	const botTokenHash = request.params.botTokenHash;
	if (botTokenHash) {
		const supervisorBot = telegramMultiTenantSupervisor.getBotByTokenHash(botTokenHash);
		if (!supervisorBot) {
			return reply.code(404).send({
				ok: false,
				error: "TelegramTenantNotFound",
				message: "Бот не найден в реестре Multi-Tenant Supervisor по token hash.",
			});
		}
		targetOrgId = supervisorBot.organizationId;
		targetBotConfigId = supervisorBot.botConfigId;
	}

	const runtimeResult = resolveTelegramRuntimeContext(
		targetOrgId,
		targetBotConfigId,
	);
	if (!runtimeResult.ok) {
		return reply.code(runtimeResult.statusCode).send({
			ok: false,
			error: runtimeResult.error,
			message: runtimeResult.message,
		});
	}
	const runtime = runtimeResult.context;
	const settings = runtime.settings;
	const expectedSecret = runtime.webhookSecret;
	const providedSecret =
		stringFromUnknown(request.headers[telegramSecretHeader]) ?? null;

	// Webhook — единственный маршрут Telegram, открытый в интернет без охраны
	// (`registerTelegramWebhookRoutes`, отдельно от панели управления). Секрет
	// `x-telegram-bot-api-secret-token` — ЕДИНСТВЕННОЕ доказательство, что update
	// пришёл от Telegram, а не от постороннего: без него кто угодно может прислать
	// фальшивое сообщение от имени пациента, израсходовать код привязки чата и
	// привязать СВОЙ чат к чужой карте — то есть начать получать напоминания о
	// приёмах чужого человека.
	//
	// БЫЛО: `!expectedSecret && process.env.NODE_ENV === "production"` — требование
	// секрета включалось ТОЛЬКО в явном production. Тот же промах, что в остальных
	// четырёх местах, но с обратной стороны: `apps/api/package.json` объявляет
	// `"start": "node dist/server.js"` и NODE_ENV не задаёт, поэтому у заказчика
	// условие ЛОЖНО, проверка молчала, и незаданный DENTE_TELEGRAM_WEBHOOK_SECRET
	// не вызывал ни отказа, ни жалобы: `expectedSecret` пуст → сравнение ниже
	// пропускается целиком → update принимался от кого угодно.
	//
	// СТАЛО: отсутствие секрета допустимо только в НАЗВАННОМ режиме разработки
	// (`development`/`test`). Пустой или незнакомый NODE_ENV теперь трактуется как
	// бой и требует секрет. Разработку это не ломает: локальный прогон и тесты
	// задают NODE_ENV=development/test, а `telegramChatLinkPersists.test.ts` вдобавок
	// выставляет DENTE_TELEGRAM_WEBHOOK_SECRET.
	//
	// ВЕРНУТЬ «КАК БЫЛО» — значит снова принимать анонимные update у заказчика.
	// Правильный способ поднять webhook в бою — задать DENTE_TELEGRAM_WEBHOOK_SECRET
	// и тот же секрет отдать Telegram при setWebhook.
	if (!expectedSecret && !namedDevelopmentModeActive()) {
		return reply.code(503).send({
			ok: false,
			error: "TelegramWebhookSecretRequired",
		});
	}

	if (
		expectedSecret &&
		!timingSafeSecretEqual(providedSecret, expectedSecret)
	) {
		return reply.code(401).send({
			ok: false,
			error: "TelegramWebhookSecretMismatch",
		});
	}

	// Если бот отслеживается в TelegramMultiTenantSupervisor, проверяем Rate Limiter (Token Bucket flood protection)
	const supervisorBot = botTokenHash
		? telegramMultiTenantSupervisor.getBotByTokenHash(botTokenHash)
		: telegramMultiTenantSupervisor.getBotByOrg(runtime.organizationId, runtime.botConfigId);
	if (supervisorBot) {
		if (!supervisorBot.rateLimiter.tryConsume(1)) {
			supervisorBot.metrics.rateLimitedUpdates++;
			return reply.code(429).send({
				ok: false,
				error: "TelegramRateLimitExceeded",
				message: "Превышен лимит запросов к боту клиники (Flood Protection).",
			});
		}
		supervisorBot.lastActiveAt = new Date();
		supervisorBot.slidingRps.record();
	}

	// Ответы бота («когда мой приём», подтверждение записи) строятся по
	// расписанию клиники. Без этой загрузки пациент получал бы ответ по
	// демонстрационным данным. Загрузка идёт ПОСЛЕ проверки секрета, чтобы
	// посторонний запрос не мог заставить сервер читать базу.

	const executeWebhook = async (domainState: DomainState) => {
		if (settings.mode === "disabled") {
			return denteTelegramWebhookResponseSchema.parse(
				readableTelegramPayload({
					ok: true,
					duplicate: false,
					action: "ignored_telegram_disabled",
					suggestedReply: null,
					warnings: [
						"Telegram отключен в настройках клиники; update не обработан, код привязки не использован.",
					],
				}),
			);
		}

		const parsedUpdate = parseTelegramRouteBody(
			denteTelegramWebhookUpdateSchema,
			request.body,
		);
		if (!parsedUpdate.ok) {
			return reply.code(400).send({
				ok: false,
				error: "TelegramWebhookValidationFailed",
				message: parsedUpdate.message,
			});
		}
		const update = parsedUpdate.value as UnknownRecord & { update_id: number };
		if (
			hasDenteTelegramWebhookUpdate(
				update.update_id,
				runtime.organizationId,
				runtime.botConfigId,
			)
		) {
			return denteTelegramWebhookResponseSchema.parse({
				ok: true,
				duplicate: true,
				action: "ignored_duplicate_update",
				suggestedReply: null,
				warnings: [],
				event: null,
			});
		}

		const updateKind = detectUpdateKind(update);
		const callbackData = extractCallbackData(update);
		const callbackAction = extractSafeCallbackAction(update);
		const callbackQueryId = extractCallbackQueryId(update);
		const command =
			extractCommand(update) ??
			(callbackData?.startsWith("d1.")
				? "/callback:appointment"
				: callbackAction
					? `/callback:${callbackAction.replace("dente:", "")}`
					: null);
		const chatInfo = extractChatInfo(update);
		const chatId = chatInfo?.id ?? null;
		const chatType = chatInfo?.type ?? null;
		const messageText = extractMessageText(update);
		const suppressPublicChatReply = Boolean(chatType && chatType !== "private");
		const chatHash = chatFingerprint(chatId, runtime.organizationId);
		const webhookClaim = claimDenteTelegramWebhookUpdate({
			updateId: update.update_id,
			organizationId: runtime.organizationId,
			botConfigId: runtime.botConfigId,
			chatFingerprint: chatHash,
			updateKind,
			command,
		});
		if (!webhookClaim.claimed) {
			return denteTelegramWebhookResponseSchema.parse({
				ok: true,
				duplicate: true,
				action: "ignored_duplicate_update",
				suggestedReply: null,
				warnings: [],
				event: null,
			});
		}
		const appointmentCallbackResult = handleDenteTelegramAppointmentCallback({
			callbackData,
			chatFingerprint: chatHash,
			organizationId: runtime.organizationId,
			clinicId: runtime.clinicId,
			botConfigId: runtime.botConfigId,
			state: domainState,
		});

		// Приём рефералов / друзей по deep link: /start ref_...
		if (
			messageText &&
			/^\/start\s+ref_/i.test(messageText.trim()) &&
			chatId
		) {
			const startPayload = messageText.trim().replace(/^\/start\s+/i, "");
			const fromUser =
				isRecord(update.message) && isRecord(update.message.from)
					? (update.message.from as Record<string, unknown>)
					: undefined;
			const refereeProfile = fromUser
				? {
						fullName: [fromUser.first_name, fromUser.last_name]
							.filter(Boolean)
							.map(String)
							.join(" "),
						username:
							typeof fromUser.username === "string"
								? fromUser.username
								: undefined,
					}
				: undefined;

			const referralResult =
				await TelegramReferralLoyaltyService.processReferralStart(
					runtime.organizationId,
					chatId,
					startPayload,
					refereeProfile,
				);

			const event = recordDenteTelegramWebhookEvent({
				updateId: update.update_id,
				organizationId: runtime.organizationId,
				botConfigId: runtime.botConfigId,
				chatFingerprint: chatHash,
				updateKind,
				command: "/start",
				status: referralResult.success ? "processed" : "rejected",
				action: "telegram_referral_start_handled",
				warnings: referralResult.errorMessage ? [referralResult.errorMessage] : [],
			});

			const webAppUrl =
				referralResult.webAppUrl ||
				`${runtime.settings.patientPortalBaseUrl || "https://dente.clinic"}/#/portal/tgapp/${runtime.organizationId}?patientId=${referralResult.refereePatientId || ""}`;

			const replyMarkup = {
				inline_keyboard: [
					[
						{
							text: "📱 Открыть Карманную клинику",
							web_app: { url: webAppUrl },
						},
					],
					[
						{
							text: "📅 Записаться на приём со скидкой",
							callback_data: "dente:schedule",
						},
					],
				],
			};

			if (chatId && runtime.botToken) {
				await sendTelegramTextMessage({
					botToken: runtime.botToken,
					chatId,
					text: referralResult.welcomeMessage,
					replyMarkup,
				}).catch(() => {});
			}

			return denteTelegramWebhookResponseSchema.parse(
				readableTelegramPayload({
					ok: true,
					duplicate: false,
					action: "telegram_referral_start_handled",
					suggestedReply: readableTelegramText(referralResult.welcomeMessage),
					suggestedReplyMarkup: readableTelegramPayload(replyMarkup),
					suggestedPhotoUrl: null,
					warnings: referralResult.errorMessage ? [referralResult.errorMessage] : [],
					event,
				}),
			);
		}

		// Шлюз авторизации персонала клиники по одноразовому QR / deep link: /start staff_auth_...
		if (
			messageText &&
			/^\/start\s+staff_auth_/i.test(messageText.trim()) &&
			chatId
		) {
			const startPayload = messageText.trim().replace(/^\/start\s+/i, "");
			const fromUser =
				isRecord(update.message) && isRecord(update.message.from)
					? (update.message.from as Record<string, unknown>)
					: undefined;
			const telegramUser = fromUser
				? {
						id: typeof fromUser.id === "number" ? fromUser.id : 0,
						firstName: String(fromUser.first_name || ""),
						lastName: typeof fromUser.last_name === "string" ? fromUser.last_name : undefined,
						username: typeof fromUser.username === "string" ? fromUser.username : undefined,
					}
				: undefined;

			const staffAuthResult =
				await TelegramStaffCockpitService.handleStaffAuthStart({
					organizationId: runtime.organizationId,
					clinicId: runtime.clinicId,
					botConfigId: runtime.botConfigId,
					chatId,
					chatFingerprint: chatHash || "",
					startPayload,
					telegramUser,
					crmBaseUrl: runtime.settings.patientPortalBaseUrl ?? undefined,
				});

			const event = recordDenteTelegramWebhookEvent({
				updateId: update.update_id,
				organizationId: runtime.organizationId,
				botConfigId: runtime.botConfigId,
				chatFingerprint: chatHash,
				updateKind,
				command: "/start",
				status: staffAuthResult.success ? "processed" : "rejected",
				action: "telegram_staff_auth_handled",
				warnings: staffAuthResult.errorMessage ? [staffAuthResult.errorMessage] : [],
			});

			if (chatId && runtime.botToken) {
				await sendTelegramTextMessage({
					botToken: runtime.botToken,
					chatId,
					text: staffAuthResult.message,
					replyMarkup: staffAuthResult.replyMarkup,
					timeoutMs: 3000,
				}).catch(() => {});
			}

			return denteTelegramWebhookResponseSchema.parse(
				readableTelegramPayload({
					ok: true,
					duplicate: false,
					action: "telegram_staff_auth_handled",
					suggestedReply: readableTelegramText(staffAuthResult.message),
					suggestedReplyMarkup: readableTelegramPayload(staffAuthResult.replyMarkup),
					suggestedPhotoUrl: null,
					warnings: staffAuthResult.errorMessage ? [staffAuthResult.errorMessage] : [],
					event,
				}),
			);
		}
		// Specialized callbacks (nps, intercom_ack, cockpit, preset_nav, postop, triage, closer)
		const specializedCallbackResponse = await handleWebhookSpecializedCallbacks({
			request,
			runtime,
			settings,
			callbackData,
			callbackQueryId,
			chatHash,
			chatId,
			update,
			updateKind,
		warnings,
		});
		if (specializedCallbackResponse) {
			return specializedCallbackResponse;
		}

		// Media intake & emergency detection
		const mediaOrEmergencyResponse = await handleWebhookMediaAndEmergency({
			runtime,
			update,
			updateKind,
			messageText,
			command,
			chatHash,
			chatId,
			warnings,
		});
		if (mediaOrEmergencyResponse) {
			return mediaOrEmergencyResponse;
		}

		// General command, link code, and dispatch flow
		return await dispatchWebhookMessage({
			request,
			runtime,
			settings,
			update,
			updateKind,
			messageText,
			command,
			callbackAction,
			callbackQueryId,
			chatHash,
			chatId,
			chatType,
			suppressPublicChatReply,
			supervisorBot,
			appointmentCallbackResult,
			webhookClaim,
		domainState,
		expectedSecret,
		sendWebhookSuggestedReply,
		});
	};

	try {
		return await withTenantCtx(runtime.organizationId, async () => {
			const domainState = await hydrateTelegramDomainState(
				request,
				runtime.organizationId,
			);
			return await executeWebhook(domainState);
		});
	} catch (err) {
		if (
			isDbConnectionError(err) &&
			(process.env.NODE_ENV === "test" || !process.env.DATABASE_URL)
		) {
			return await executeWebhook(inMemoryDomainState);
		}
		throw err;
	}
}

export async function registerTelegramWebhookRoutes(app: FastifyInstance) {
	const options = { bodyLimit: 256 * 1024 };
	app.post("/api/telegram/webhook", options, handleWebhook);
	app.post(
		"/api/telegram/webhook/:organizationId/:botConfigId",
		options,
		handleWebhook,
	);
	app.post("/api/telegram/webhook/:organizationId", options, handleWebhook);
	app.post("/api/telegram/webhook/token/:botTokenHash", options, handleWebhook);
}