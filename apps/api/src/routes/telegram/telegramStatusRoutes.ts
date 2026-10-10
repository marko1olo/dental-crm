import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { db } from "../../db/client.js";
import { denteTelegramBotConfigs } from "../../db/schema.js";
import {
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { telegramMultiTenantSupervisor } from "../../services/telegram/TelegramMultiTenantSupervisor.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";
import type { PostOpSurveyInput, TelegramBotPresetId } from "@dental/shared";
import { getDenteTelegramBotSettings } from "../../services/telegram/telegramLegacyMemoryStore.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";
import {
	TELEGRAM_BOT_PRESETS,
	TelegramBotPresetsEngine,
} from "../../services/telegram/TelegramBotPresets.js";
import {
	isRecord,
	parseTelegramClinicScopeQuery,
	parseTelegramRouteBody,
	sendTelegramValidationError,
} from "./telegramUtils.js";
import {
	hydrateTelegramDomainState,
	requireTelegramControlPlaneAccess,
	resolveTelegramRuntimeContext,
} from "./telegramRuntimeContext.js";
import {
	buildFeaturePlan,
	buildStatus,
} from "./telegramStatusService.js";

export function registerTelegramStatusRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	/**
	 * Healthcheck эндпоинт для VPS хостинга, systemd, Caddy и Docker-compose мониторинга.
	 */
	app.get("/api/telegram/health", async () => {
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
	});

	/**
	 * Сводка High-Density Telegram Supervisor: мониторинг памяти, активных ботов, RPS и latency.
	 */
	app.get(
		"/api/telegram/supervisor/status",
		telegramControlPlaneRouteOptions,
		async () => {
			return {
				ok: true,
				supervisor: telegramMultiTenantSupervisor.getSupervisorStatus(),
			};
		},
	);

	/**
	 * Горячий перезапуск конкретного бота в супервизоре.
	 */
	app.post<{ Params: { botId: string } }>(
		"/api/telegram/supervisor/bots/:botId/reload",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const botId = request.params.botId?.trim();
			if (!botId) {
				return reply.code(400).send({
					ok: false,
					error: "BotIdRequired",
					message: "Параметр botId обязателен.",
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
	);

	/**
	 * Проверка здоровья конкретного бота и вебхука через Telegram Bot API.
	 */
	app.get<{ Params: { botId: string } }>(
		"/api/telegram/supervisor/bots/:botId/health",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const botId = request.params.botId?.trim();
			if (!botId) {
				return reply.code(400).send({
					ok: false,
					error: "BotIdRequired",
					message: "Параметр botId обязателен.",
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
	);

	/**
	 * Проверка токена Telegram-бота через getMe.
	 */
	app.post<{ Body: { token: string } }>(
		"/api/telegram/bot/verify",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const token = request.body?.token?.trim();
			if (!token) {
				return reply.code(400).send({
					ok: false,
					error: "TokenRequired",
					message: "Не указан токен Telegram бота.",
				});
			}
			const result = await TelegramBotHostingService.verifyBotToken(token);
			return reply.code(result.ok ? 200 : 400).send(result);
		},
	);

	/**
	 * Регистрация и настройка Webhook для бота через setWebhook.
	 */
	app.post<{ Body: { token: string; webhookUrl: string; secretToken?: string } }>(
		"/api/telegram/bot/setup-webhook",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const { token, webhookUrl, secretToken } = request.body || {};
			if (!token || !webhookUrl) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationFailed",
					message: "Требуются token и webhookUrl.",
				});
			}
			const result = await TelegramBotHostingService.setupWebhook({
				botToken: token,
				webhookUrl,
				secretToken: secretToken || null,
			});
			return reply.code(result.ok ? 200 : 502).send(result);
		},
	);

	/**
	 * Каталог 5 клинических пресетов ботов (DENTE Bot Archetypes).
	 */
	app.get(
		"/api/telegram/presets",
		telegramControlPlaneRouteOptions,
		async () => {
			return {
				ok: true,
				presets: TelegramBotPresetsEngine.listPresets(),
			};
		},
	);

	/**
	 * Получить метаданные и экраны конкретного пресета бота.
	 */
	app.get<{ Params: { presetId: string } }>(
		"/api/telegram/presets/:presetId",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const presetId = request.params.presetId as TelegramBotPresetId;
			if (!(presetId in TELEGRAM_BOT_PRESETS)) {
				return reply.code(404).send({
					ok: false,
					error: "PresetNotFound",
					message: `Пресет с ID "${request.params.presetId}" не найден в каталоге.`,
				});
			}
			const preset = TelegramBotPresetsEngine.getPreset(presetId);
			return {
				ok: true,
				preset,
			};
		},
	);

	/**
	 * Пошаговая инструкция онбординга @BotFather для главврача / администратора клиники.
	 */
	app.get<{ Querystring: { presetId?: string } }>(
		"/api/telegram/onboarding-guide",
		telegramControlPlaneRouteOptions,
		async (request) => {
			const presetId = (request.query?.presetId as TelegramBotPresetId) || "universal_clinic";
			const guideMarkdown = TelegramBotPresetsEngine.getBotFatherGuideMarkdown(presetId);
			return {
				ok: true,
				presetId,
				guideMarkdown,
			};
		},
	);

	/**
	 * Автоматическое применение пресета к Telegram-боту клиники:
	 * 1. Проверяет токен (getMe)
	 * 2. Устанавливает команды пресета (setMyCommands)
	 * 3. Устанавливает описание (setMyDescription)
	 * 4. Устанавливает краткое описание (setMyShortDescription)
	 * 5. Настраивает Webhook при наличии webhookUrl
	 */
	app.post<{
		Body: {
			organizationId?: string;
			presetId: string;
			botToken: string;
			webhookUrl?: string;
			secretToken?: string;
		};
	}>(
		"/api/telegram/bot/apply-preset",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const { presetId, botToken, webhookUrl, secretToken } = request.body || {};
			if (!botToken?.trim() || !presetId?.trim()) {
				return reply.code(400).send({
					ok: false,
					error: "ValidationFailed",
					message: "Необходимо передать botToken и presetId.",
				});
			}

			const targetPresetId = presetId as TelegramBotPresetId;
			if (!(targetPresetId in TELEGRAM_BOT_PRESETS)) {
				return reply.code(400).send({
					ok: false,
					error: "InvalidPreset",
					message: `Неизвестный архетип бота: ${presetId}. Доступные: ${Object.keys(TELEGRAM_BOT_PRESETS).join(", ")}.`,
				});
			}

			const runtimeResult = resolveTelegramRuntimeContext();
			const organizationId =
				request.body?.organizationId ||
				(runtimeResult.ok ? runtimeResult.context.organizationId : "default");

			const result = await TelegramBotHostingService.applyPresetToBot({
				organizationId,
				presetId: targetPresetId,
				botToken: botToken.trim(),
				webhookUrl: webhookUrl?.trim() || null,
				secretToken: secretToken?.trim() || null,
			});

			return reply.code(result.ok ? 200 : 400).send(result);
		},
	);

	/**
	 * Клиническая оценка послеоперационного опроса (Day 1 / Day 3).
	 * При выявлении критических симптомов (боль >= 4, температура >38°C, кровотечение)
	 * формирует срочный алерт врачу.
	 */
	app.post<{
		Body: {
			day: number;
			painScore: number;
			hasFever?: boolean;
			hasHeavyBleeding?: boolean;
			hasSevereSwelling?: boolean;
			patientId?: string;
			organizationId?: string;
		};
	}>(
		"/api/telegram/surveys/evaluate-post-op",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const body = request.body;
			if (!body || (body.day !== 1 && body.day !== 3) || typeof body.painScore !== "number") {
				return reply.code(400).send({
					ok: false,
					error: "ValidationFailed",
					message: "Требуются day (1 или 3) и painScore (от 1 до 5).",
				});
			}

			const surveyInput: PostOpSurveyInput = {
				day: body.day as 1 | 3,
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
	);

	app.get(
		"/api/telegram/status",
		telegramControlPlaneRouteOptions,
		async () => await buildStatus(),
	);

	app.get<{ Params: { organizationId: string } }>(
		"/api/telegram/status/:organizationId",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const runtimeResult = resolveTelegramRuntimeContext(
				request.params.organizationId,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			return await buildStatus(request.params.organizationId);
		},
	);

	app.get<{ Params: { organizationId: string; botConfigId: string } }>(
		"/api/telegram/status/:organizationId/:botConfigId",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const runtimeResult = resolveTelegramRuntimeContext(
				request.params.organizationId,
				request.params.botConfigId,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			return await buildStatus(
				request.params.organizationId,
				request.params.botConfigId,
			);
		},
	);
}
