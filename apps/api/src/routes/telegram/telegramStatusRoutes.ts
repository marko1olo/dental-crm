import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	definePublicRoute,
	defineStreamRoute,
} from "../../core/routeFactories.js";
import { getRequestIdentity } from "../../security/identity.js";
import { telegramMultiTenantSupervisor } from "../../services/telegram/TelegramMultiTenantSupervisor.js";
import type { PostOpSurveyInput, TelegramBotPresetId } from "@dental/shared";
import {
	applyLoadedTelegramBotSettings,
	getDenteTelegramBotSettings,
} from "./telegramCanonicalStore.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";
import {
	TELEGRAM_BOT_PRESETS,
	TelegramBotPresetsEngine,
} from "../../services/telegram/TelegramBotPresets.js";
import {
	loadTelegramBotSettingsFromDatabase,
	resolveTelegramRuntimeContext,
} from "./telegramRuntimeContext.js";
import {
	buildStatus,
} from "./telegramStatusService.js";

const verifyBotTokenBodySchema = z
	.object({ token: z.string().trim().min(1) })
	.strict();

const setupWebhookBodySchema = z
	.object({
		token: z.string().trim().min(1),
		webhookUrl: z.string().trim().url(),
		secretToken: z.string().trim().optional(),
	})
	.strict();

const applyPresetBodySchema = z
	.object({
		organizationId: z.string().uuid().optional(),
		presetId: z.string().trim().min(1),
		botToken: z.string().trim().min(1),
		webhookUrl: z.string().trim().url().optional(),
		secretToken: z.string().trim().optional(),
	})
	.strict();

const evaluatePostOpSurveyBodySchema = z
	.object({
		day: z.union([z.literal(1), z.literal(3)]),
		painScore: z.number().finite(),
		hasFever: z.boolean().optional(),
		hasHeavyBleeding: z.boolean().optional(),
		hasSevereSwelling: z.boolean().optional(),
		patientId: z.string().uuid().optional(),
		organizationId: z.string().uuid().optional(),
	})
	.strict();

async function runControlPlanePreHandler(
	options: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<boolean> {
	await options.preHandler(request, reply);
	return !reply.sent;
}

export function registerTelegramStatusRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	/**
	 * Healthcheck эндпоинт для VPS хостинга, systemd, Caddy и Docker-compose мониторинга.
	 */
	definePublicRoute(app, {
		method: "GET",
		path: "/api/telegram/health",
		handler: async () => {
			const settings = getDenteTelegramBotSettings();
			const runtimeResult = resolveTelegramRuntimeContext();
			const isReady = runtimeResult.ok && settings.mode !== "disabled";
			return {
				status: isReady ? "healthy" : "degraded",
				mode: settings.mode,
				tokenConfigured: runtimeResult.ok ? runtimeResult.context.tokenConfigured : false,
				webhookReady: runtimeResult.ok ? runtimeResult.context.webhookReady : false,
				botUsername: runtimeResult.ok ? runtimeResult.context.botUsername : null,
				timestamp: new Date().toISOString(),
				service: "dente-telegram-bot-hosting",
				version: "2.4.0",
			};
		},
	});

	/**
	 * Сводка High-Density Telegram Supervisor: мониторинг памяти, активных ботов, RPS и latency.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/supervisor/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const identity = getRequestIdentity(request);
			const scopedOrgId =
				identity.verified && identity.organizationId
					? identity.organizationId
					: undefined;
			return {
				ok: true,
				supervisor: scopedOrgId
					? {
							...telegramMultiTenantSupervisor.getSupervisorStatus(),
							tenantBotsCount: telegramMultiTenantSupervisor.listBots(scopedOrgId).length,
						}
					: telegramMultiTenantSupervisor.getSupervisorStatus(),
			};
		},
	});

	/**
	 * Горячий перезапуск конкретного бота в супервизоре.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/supervisor/bots/:botId/reload",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const reqParams = request.params as { botId?: string };
			const botId = reqParams.botId?.trim();
			if (!botId) {
				return reply.code(400).send({
					ok: false,
					error: "BotIdRequired",
					message: "Параметр botId обязателен.",
				});
			}
			const identity = getRequestIdentity(request);
			const existingBot = telegramMultiTenantSupervisor.getBot(botId);
			if (
				existingBot &&
				identity.verified &&
				identity.organizationId &&
				existingBot.organizationId !== identity.organizationId
			) {
				return reply.code(403).send({
					ok: false,
					error: "TelegramCrossTenantDenied",
					message: "Запрещено управлять ботом другой организации.",
				});
			}
			try {
				const runtime = await telegramMultiTenantSupervisor.reloadBot(botId);
				return {
					ok: true,
					bot: {
						botId: runtime.botId,
						organizationId: runtime.organizationId,
						botConfigId: runtime.botConfigId,
						status: runtime.status,
						mode: runtime.mode,
						webhookUrl: runtime.webhookUrl,
					},
				};
			} catch (err: unknown) {
				return reply.code(404).send({
					ok: false,
					error: "BotReloadFailed",
					message: err instanceof Error ? err.message : String(err),
				});
			}
		},
	});

	/**
	 * Проверка здоровья конкретного бота и вебхука через Telegram Bot API.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/supervisor/bots/:botId/health",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const reqParams = request.params as { botId?: string };
			const botId = reqParams.botId?.trim();
			if (!botId) {
				return reply.code(400).send({
					ok: false,
					error: "BotIdRequired",
					message: "Параметр botId обязателен.",
				});
			}
			const identity = getRequestIdentity(request);
			const existingBot = telegramMultiTenantSupervisor.getBot(botId);
			if (
				existingBot &&
				identity.verified &&
				identity.organizationId &&
				existingBot.organizationId !== identity.organizationId
			) {
				return reply.code(403).send({
					ok: false,
					error: "TelegramCrossTenantDenied",
					message: "Запрещён просмотр статуса бота другой организации.",
				});
			}
			try {
				const health = await telegramMultiTenantSupervisor.checkBotHealth(botId);
				return {
					ok: true,
					health,
				};
			} catch (err: unknown) {
				return reply.code(404).send({
					ok: false,
					error: "BotNotFound",
					message: err instanceof Error ? err.message : String(err),
				});
			}
		},
	});

	/**
	 * Проверка токена Telegram-бота через getMe.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/bot/verify",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const parsed = verifyBotTokenBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "TokenRequired",
					message: "Не указан токен Telegram бота.",
					details: parsed.error.issues,
				});
			}
			const result = await TelegramBotHostingService.verifyBotToken(parsed.data.token);
			return reply.code(result.ok ? 200 : 400).send(result);
		},
	});

	/**
	 * Регистрация и настройка Webhook для бота через setWebhook.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/bot/setup-webhook",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const parsed = setupWebhookBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationFailed",
					message: "Требуются корректные token и webhookUrl.",
					details: parsed.error.issues,
				});
			}
			const result = await TelegramBotHostingService.setupWebhook({
				botToken: parsed.data.token,
				webhookUrl: parsed.data.webhookUrl,
				secretToken: parsed.data.secretToken || null,
			});
			return reply.code(result.ok ? 200 : 502).send(result);
		},
	});

	/**
	 * Каталог 5 клинических пресетов ботов (DENTE Bot Archetypes).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/presets",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			return {
				ok: true,
				presets: TelegramBotPresetsEngine.listPresets(),
			};
		},
	});

	/**
	 * Получить метаданные и экраны конкретного пресета бота.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/presets/:presetId",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const reqParams = request.params as { presetId: string };
			const presetId = reqParams.presetId as TelegramBotPresetId;
			if (!(presetId in TELEGRAM_BOT_PRESETS)) {
				return reply.code(404).send({
					ok: false,
					error: "PresetNotFound",
					message: `Пресет с ID "${reqParams.presetId}" не найден в каталоге.`,
				});
			}
			const preset = TelegramBotPresetsEngine.getPreset(presetId);
			return {
				ok: true,
				preset,
			};
		},
	});

	/**
	 * Пошаговая инструкция онбординга @BotFather для главврача / администратора клиники.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/onboarding-guide",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const reqQuery = request.query as { presetId?: string } | undefined;
			const presetId = (reqQuery?.presetId as TelegramBotPresetId) || "universal_clinic";
			const guideMarkdown = TelegramBotPresetsEngine.getBotFatherGuideMarkdown(presetId);
			return {
				ok: true,
				presetId,
				guideMarkdown,
			};
		},
	});

	/**
	 * Автоматическое применение пресета к Telegram-боту клиники:
	 * 1. Проверяет токен (getMe)
	 * 2. Устанавливает команды пресета (setMyCommands)
	 * 3. Устанавливает описание (setMyDescription)
	 * 4. Устанавливает краткое описание (setMyShortDescription)
	 * 5. Настраивает Webhook при наличии webhookUrl
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/bot/apply-preset",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const parsed = applyPresetBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationFailed",
					message: "Необходимо передать корректные botToken и presetId.",
					details: parsed.error.issues,
				});
			}
			const { presetId, botToken, webhookUrl, secretToken, organizationId: requestedOrgId } =
				parsed.data;

			const targetPresetId = presetId as TelegramBotPresetId;
			if (!(targetPresetId in TELEGRAM_BOT_PRESETS)) {
				return reply.code(400).send({
					ok: false,
					error: "InvalidPreset",
					message: `Неизвестный архетип бота: ${presetId}. Доступные: ${Object.keys(TELEGRAM_BOT_PRESETS).join(", ")}.`,
				});
			}

			const identity = getRequestIdentity(request);
			if (
				identity.verified &&
				identity.organizationId &&
				requestedOrgId &&
				requestedOrgId !== identity.organizationId
			) {
				return reply.code(403).send({
					ok: false,
					error: "TelegramCrossTenantDenied",
					message: "Запрещено применять пресет к боту другой организации.",
				});
			}
			const effectiveOrgId =
				identity.verified && identity.organizationId
					? identity.organizationId
					: requestedOrgId;
			const runtimeResult = resolveTelegramRuntimeContext(effectiveOrgId);
			const organizationId = runtimeResult.ok
				? runtimeResult.context.organizationId
				: (effectiveOrgId || "default");

			const result = await TelegramBotHostingService.applyPresetToBot({
				organizationId,
				presetId: targetPresetId,
				botToken,
				webhookUrl: webhookUrl || null,
				secretToken: secretToken || null,
			});

			return reply.code(result.ok ? 200 : 400).send(result);
		},
	});

	/**
	 * Клиническая оценка послеоперационного опроса (Day 1 / Day 3).
	 * При выявлении критических симптомов (боль >= 4, температура >38°C, кровотечение)
	 * формирует срочный алерт врачу.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/surveys/evaluate-post-op",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const parsed = evaluatePostOpSurveyBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationFailed",
					message: "Требуются day (1 или 3) и painScore (от 1 до 5).",
					details: parsed.error.issues,
				});
			}
			const body = parsed.data;

			const surveyInput: PostOpSurveyInput = {
				day: body.day,
				painScore: Math.max(1, Math.min(5, Math.round(body.painScore))),
				hasFever: Boolean(body.hasFever),
				hasHeavyBleeding: Boolean(body.hasHeavyBleeding),
				hasSevereSwelling: Boolean(body.hasSevereSwelling),
			};
			if (body.patientId) surveyInput.patientId = body.patientId;
			if (body.organizationId) surveyInput.organizationId = body.organizationId;

			const result = TelegramBotPresetsEngine.evaluatePostOpSurvey(surveyInput);
			return reply.send({
				ok: true,
				survey: surveyInput,
				evaluation: result,
			});
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const identity = getRequestIdentity(request);
			if (identity.organizationId) {
				const loaded = await loadTelegramBotSettingsFromDatabase(
					identity.organizationId,
				);
				if (loaded) {
					applyLoadedTelegramBotSettings(loaded);
					return await buildStatus(identity.organizationId);
				}
				if (resolveTelegramRuntimeContext(identity.organizationId).ok) {
					return await buildStatus(identity.organizationId);
				}
			}
			return await buildStatus();
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/status/:organizationId",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const reqParams = request.params as { organizationId: string };
			const identity = getRequestIdentity(request);
			if (
				identity.verified &&
				identity.organizationId &&
				reqParams.organizationId !== identity.organizationId
			) {
				return reply.code(403).send({
					error: "TelegramCrossTenantDenied",
					message: "Запрещён доступ к статусу Telegram другой организации.",
				});
			}
			const loaded = await loadTelegramBotSettingsFromDatabase(
				reqParams.organizationId,
			);
			if (loaded) {
				applyLoadedTelegramBotSettings(loaded);
			}
			const runtimeResult = resolveTelegramRuntimeContext(
				reqParams.organizationId,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			return await buildStatus(reqParams.organizationId);
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/status/:organizationId/:botConfigId",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const reqParams = request.params as { organizationId: string; botConfigId: string };
			const identity = getRequestIdentity(request);
			if (
				identity.verified &&
				identity.organizationId &&
				reqParams.organizationId !== identity.organizationId
			) {
				return reply.code(403).send({
					error: "TelegramCrossTenantDenied",
					message: "Запрещён доступ к статусу Telegram другой организации.",
				});
			}
			const loaded = await loadTelegramBotSettingsFromDatabase(
				reqParams.organizationId,
			);
			if (loaded) {
				applyLoadedTelegramBotSettings(loaded);
			}
			const runtimeResult = resolveTelegramRuntimeContext(
				reqParams.organizationId,
				reqParams.botConfigId,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			return await buildStatus(
				reqParams.organizationId,
				reqParams.botConfigId,
			);
		},
	});
}
