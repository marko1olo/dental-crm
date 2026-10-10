import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	createDenteTelegramLinkCodeSchema, denteTelegramChatLinkPublicSchema,
	denteTelegramChatLinkStatusSchema, denteTelegramLinkCodeStatusSchema,
	denteTelegramMessagePreviewRequestSchema, denteTelegramOutboxDeliveryStatusSchema,
	denteTelegramOutboxSendDueResponseSchema, denteTelegramOutboxSendRequestSchema,
	denteTelegramOutboxSendResponseSchema, denteTelegramSubjectTypeSchema,
	denteTelegramTemplateKindSchema, updateDenteTelegramBotSettingsSchema,
	type UpdateDenteTelegramBotSettingsInput,
} from "@dental/shared";
import {
	requireResolvedOrganizationId, requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import {
	buildDenteTelegramChatLinkList, revokeDenteTelegramChatLink,
} from "../../telegram/chatLinks.js";
import {
	buildDenteTelegramLinkCodeList, buildDenteTelegramOutbox,
	createDenteTelegramLinkCode, denteTelegramOutboxDeliveryReceipts,
	getDenteTelegramBotSettings, renderDenteTelegramMessagePreview,
	revokeDenteTelegramChatLink as revokeLegacyInMemoryTelegramChatLink,
	updateDenteTelegramBotSettings,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	TelegramBotBillingService,
	TELEGRAM_BOT_SAAS_TIERS,
	type TelegramBotSaasTierId,
} from "../../services/telegram/TelegramBotBillingService.js";
import {
	firstTelegramQueryValue,
	parseTelegramChatLinkListQuery,
	parseTelegramLinkCodeListQuery,
	parseTelegramOutboxQuery,
	parseTelegramOutboxSendDueInput,
	parseTelegramRouteBody,
	readableTelegramSettingsSchemaMessage,
	readableTelegramSettingsValidationMessage,
	sendTelegramValidationError,
	telegramLinkCodeRejection,
	telegramMessagePreviewRejection,
} from "./telegramUtils.js";
import {
	buildStatus,
	buildFeaturePlan,
} from "./telegramStatusService.js";
import {
	telegramChatLinkNotFoundMessage,
} from "./types.js";
import {
	hydrateTelegramDomainState,
	resolveTelegramOutboxRuntimeScopeFromQuery,
	resolveTelegramRuntimeContext,
} from "./telegramRuntimeContext.js";
import {
	deliverTelegramOutboxParts,
	executeTelegramOutboxSend,
} from "./telegramOutboxDelivery.js";
import { executeDenteTelegramOutboxDueBatch } from "./telegramOutboxWorker.js";

export function registerTelegramSettingsRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	app.get(
		"/api/settings/telegram",
		telegramControlPlaneRouteOptions,
		async () => await buildStatus(),
	);

	app.put(
		"/api/settings/telegram",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const parsedInput = parseTelegramRouteBody(
				updateDenteTelegramBotSettingsSchema,
				request.body,
			);
			if (!parsedInput.ok) {
				const schemaResult = updateDenteTelegramBotSettingsSchema.safeParse(
					request.body,
				);
				const issueCount = schemaResult.success
					? 0
					: schemaResult.error.issues.length;
				return reply.code(400).send({
					error: "TelegramSettingsValidationFailed",
					message:
						schemaResult.success || issueCount !== 1
							? parsedInput.message
							: readableTelegramSettingsSchemaMessage(schemaResult.error),
				});
			}
			const input: UpdateDenteTelegramBotSettingsInput = parsedInput.value;
			try {
				updateDenteTelegramBotSettings(input);
			} catch (settingsError) {
				return reply.code(400).send({
					error: "TelegramSettingsValidationFailed",
					message: readableTelegramSettingsValidationMessage(settingsError),
				});
			}
			return await buildStatus();
		},
	);

	app.get(
		"/api/telegram/feature-plan",
		telegramControlPlaneRouteOptions,
		async () => buildFeaturePlan(getDenteTelegramBotSettings()),
	);
}

export function registerTelegramOutboxRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	app.get<{ Querystring: Record<string, unknown> }>(
		"/api/telegram/outbox",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				request.query,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const domainState = await hydrateTelegramDomainState(
				request,
				runtimeResult.runtime.context.organizationId,
			);
			return buildDenteTelegramOutbox(
				parseTelegramOutboxQuery(request.query),
				runtimeResult.runtime.runtimeScope,
				domainState,
			);
		},
	);

	app.post<{
		Params: { itemId: string };
		Querystring: Record<string, unknown>;
	}>(
		"/api/telegram/outbox/:itemId/send",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const parsedInput = parseTelegramRouteBody(
				denteTelegramOutboxSendRequestSchema,
				request.body ?? {},
			);
			if (!parsedInput.ok) return sendTelegramValidationError(reply);
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				request.query,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const domainState = await hydrateTelegramDomainState(
				request,
				runtimeResult.runtime.context.organizationId,
			);
			const result = await executeTelegramOutboxSend(
				request.params.itemId,
				parsedInput.value,
				runtimeResult.runtime,
				domainState,
			);
			return reply.code(result.statusCode).send(result.body);
		},
	);

	app.post<{ Querystring: Record<string, unknown> }>(
		"/api/telegram/outbox/send-due",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const input = parseTelegramOutboxSendDueInput(request.body ?? {});
			if (!input)
				return sendTelegramValidationError(
					reply,
					"TelegramOutboxDueValidationFailed",
				);
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				request.query,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const domainState = await hydrateTelegramDomainState(
				request,
				runtimeResult.runtime.context.organizationId,
			);
			const response = await executeDenteTelegramOutboxDueBatch(
				input,
				runtimeResult.runtime,
				domainState,
			);
			return reply
				.code(
					response.failedCount > 0
						? 502
						: response.blockedCount > 0
							? 409
							: 200,
				)
				.send(response);
		},
	);
}

export function registerTelegramLinkRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	app.post(
		"/api/telegram/link-codes",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const parsedInput = parseTelegramRouteBody(
				createDenteTelegramLinkCodeSchema,
				request.body,
			);
			if (!parsedInput.ok) return sendTelegramValidationError(reply);
			const input = parsedInput.value;
			const requestedOrganizationId =
				input.organizationId ??
				(input.botConfigId ? (input.clinicId ?? null) : null);
			const runtimeResult = resolveTelegramRuntimeContext(
				requestedOrganizationId,
				input.botConfigId ?? null,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const runtime = runtimeResult.context;
			const settings = runtime.settings;
			const requestedClinicId = input.clinicId?.trim() || null;
			if (requestedClinicId && requestedClinicId !== runtime.clinicId) {
				return reply.code(409).send({
					error: "TelegramLinkCodeScopeInvalid",
					message: "Код привязки Telegram относится к другой клинике.",
				});
			}
			if (
				settings.mode === "disabled" ||
				!settings.enabledFeatures.includes("patient_linking")
			) {
				return reply.code(409).send({
					error: "TelegramLinkingDisabled",
					message: "Привязка Telegram отключена в настройках клиники.",
				});
			}
			try {
				return createDenteTelegramLinkCode({
					...input,
					organizationId: runtime.organizationId,
					clinicId: input.clinicId ?? runtime.clinicId,
					botConfigId: runtime.botConfigId,
					botUsername: runtime.botUsername,
				});
			} catch (linkCodeError) {
				const rejection = telegramLinkCodeRejection(linkCodeError);
				return reply.code(409).send({
					error: rejection.error,
					reason: rejection.reason,
					message: rejection.message,
				});
			}
		},
	);

	app.get<{ Querystring: Record<string, unknown> }>(
		"/api/telegram/link-codes",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				request.query,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const runtime = runtimeResult.runtime.context;
			return buildDenteTelegramLinkCodeList({
				...parseTelegramLinkCodeListQuery(request.query),
				organizationId: runtime.organizationId,
				clinicId: runtime.clinicId,
				botConfigId: runtime.botConfigId,
			});
		},
	);

	app.get<{ Querystring: Record<string, unknown> }>(
		"/api/telegram/chat-links",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				request.query,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const runtime = runtimeResult.runtime.context;
			return await buildDenteTelegramChatLinkList({
				...parseTelegramChatLinkListQuery(request.query),
				organizationId: runtime.organizationId,
				clinicId: runtime.clinicId,
				botConfigId: runtime.botConfigId,
			});
		},
	);

	app.post<{
		Params: { linkId: string };
		Querystring: Record<string, unknown>;
	}>(
		"/api/telegram/chat-links/:linkId/revoke",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				request.query,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const runtime = runtimeResult.runtime.context;
			const revoked = await revokeDenteTelegramChatLink(
				{
					organizationId: runtime.organizationId,
					clinicId: runtime.clinicId,
					botConfigId: runtime.botConfigId,
				},
				request.params.linkId,
			);
			// Копия в памяти снимается второй и её результат ни на что не влияет: пока
			// очередь отправки читает массив процесса, оставить там активную связку
			// значило бы продолжать писать в отключённый чат.
			revokeLegacyInMemoryTelegramChatLink(request.params.linkId, {
				organizationId: runtime.organizationId,
				clinicId: runtime.clinicId,
				botConfigId: runtime.botConfigId,
			});
			if (!revoked) {
				return reply.code(404).send({
					error: "TelegramChatLinkNotFound",
					message: telegramChatLinkNotFoundMessage,
				});
			}
			return denteTelegramChatLinkPublicSchema.parse(revoked);
		},
	);
}

export function registerTelegramPreviewRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	app.post<{ Querystring: Record<string, unknown> }>(
		"/api/telegram/messages/preview",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				request.query,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const parsedInput = parseTelegramRouteBody(
				denteTelegramMessagePreviewRequestSchema,
				request.body,
			);
			if (!parsedInput.ok) return sendTelegramValidationError(reply);
			const input = parsedInput.value;
			try {
				return renderDenteTelegramMessagePreview(
					input,
					runtimeResult.runtime.context.settings,
				);
			} catch (previewError) {
				const rejection = telegramMessagePreviewRejection(previewError);
				return reply.code(404).send({
					error: "TelegramMessagePreviewNotFound",
					reason: rejection.reason,
					message: rejection.message,
				});
			}
		},
	);
}

export function registerTelegramBillingRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	// 1. Каталог B2B SaaS-тарифов сервиса Telegram-ботов
	app.get(
		"/api/telegram/billing/plans",
		telegramControlPlaneRouteOptions,
		async () => {
			return {
				plans: Object.values(TELEGRAM_BOT_SAAS_TIERS),
				tiers: TELEGRAM_BOT_SAAS_TIERS,
				defaultPlanId: "free",
				currency: "RUB",
			};
		},
	);

	// 2. Статистика использования квоты сообщений текущей клиники
	app.get<{ Querystring: { organizationId?: string } }>(
		"/api/telegram/billing/usage",
		telegramControlPlaneRouteOptions,
		async (request) => {
			const requestedOrgId = request.query?.organizationId?.trim();
			const runtimeResult = resolveTelegramRuntimeContext(requestedOrgId);
			const organizationId = runtimeResult.ok
				? runtimeResult.context.organizationId
				: (requestedOrgId || "default");

			const usage = TelegramBotBillingService.getBillingUsage(organizationId);
			return usage;
		},
	);

	// 3. Смена тарифного плана клиники
	app.post<{
		Body: {
			planId: TelegramBotSaasTierId;
			organizationId?: string;
		};
	}>(
		"/api/telegram/billing/change-plan",
		telegramControlPlaneRouteOptions,
		async (request, reply) => {
			const body = request.body;
			if (!body || typeof body !== "object") {
				return reply.code(400).send({
					error: "TelegramBillingInvalidInput",
					message: "Необходимо передать тело запроса с параметром planId.",
				});
			}

			const targetPlanId = body.planId;
			if (!targetPlanId || !TELEGRAM_BOT_SAAS_TIERS[targetPlanId]) {
				return reply.code(400).send({
					error: "TelegramBillingInvalidPlan",
					message: `Недопустимый тарифный план '${String(targetPlanId)}'. Доступны: free, pro, enterprise.`,
				});
			}

			const requestedOrgId = body.organizationId?.trim();
			const runtimeResult = resolveTelegramRuntimeContext(requestedOrgId);
			const organizationId = runtimeResult.ok
				? runtimeResult.context.organizationId
				: (requestedOrgId || "default");

			const updated = TelegramBotBillingService.changePlan({
				organizationId,
				newPlanId: targetPlanId,
			});

			return reply.code(200).send({
				success: true,
				message: `Тарифный план успешно изменен на ${updated.plan.nameRu}`,
				usage: updated,
			});
		},
	);
}
