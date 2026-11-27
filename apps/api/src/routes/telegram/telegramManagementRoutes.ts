import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
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
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	buildDenteTelegramChatLinkList,
	revokeDenteTelegramChatLink,
	toDenteTelegramChatLinkPublic,
} from "../../telegram/chatLinks.js";
import {
	buildDenteTelegramLinkCodeList, buildDenteTelegramOutbox,
	createDenteTelegramLinkCode, denteTelegramOutboxDeliveryReceipts,
	getDenteTelegramBotSettings, renderDenteTelegramMessagePreview,
	revokeDenteTelegramChatLink as revokeLegacyInMemoryTelegramChatLink,
	updateDenteTelegramBotSettings, applyLoadedTelegramBotSettings,
} from "./telegramCanonicalStore.js";
import { getRequestIdentity } from "../../security/identity.js";
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
	persistTelegramBotSettingsToDatabase,
	loadTelegramBotSettingsFromDatabase,
} from "./telegramRuntimeContext.js";
import {
	deliverTelegramOutboxParts,
	executeTelegramOutboxSend,
} from "./telegramOutboxDelivery.js";
import { executeDenteTelegramOutboxDueBatch } from "./telegramOutboxWorker.js";

function resolveAuthorizedTelegramQueryScope(
	request: FastifyRequest,
	reply: FastifyReply,
): Record<string, unknown> | null {
	const queryObj =
		request.query && typeof request.query === "object"
			? { ...(request.query as Record<string, unknown>) }
			: {};
	const identity = getRequestIdentity(request);
	if (identity.verified && identity.organizationId) {
		const requestedOrg =
			typeof queryObj.organizationId === "string"
				? queryObj.organizationId.trim()
				: "";
		if (requestedOrg && requestedOrg !== identity.organizationId) {
			void reply.code(403).send({
				error: "TelegramCrossTenantDenied",
				message: "Запрещён доступ к данным Telegram другой организации.",
			});
			return null;
		}
		queryObj.organizationId = identity.organizationId;
	}
	return queryObj;
}

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

export function registerTelegramSettingsRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	const telegramMutationSchema = {
		description: "Telegram settings mutation with mandatory RFC 9562 Idempotency-Key",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				organizationid: { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	};
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/telegram",
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
		method: "PUT",
		path: "/api/settings/telegram",
		permission: "public",
		schema: telegramMutationSchema,
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
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
			const identity = getRequestIdentity(request);
			let input: UpdateDenteTelegramBotSettingsInput = parsedInput.value;
			if (identity.verified && identity.organizationId) {
				if (
					input.organizationId &&
					input.organizationId !== identity.organizationId
				) {
					return reply.code(403).send({
						error: "TelegramCrossTenantDenied",
						message: "Запрещено изменять настройки Telegram другой организации.",
					});
				}
				input = {
					...input,
					organizationId: identity.organizationId,
				};
			}
			let savedOrgId: string | null = null;
			try {
				const updated = updateDenteTelegramBotSettings(input);
				savedOrgId = updated.organizationId;
				await persistTelegramBotSettingsToDatabase(updated);
			} catch (settingsError) {
				return reply.code(400).send({
					error: "TelegramSettingsValidationFailed",
					message: readableTelegramSettingsValidationMessage(settingsError),
				});
			}
			return await buildStatus(savedOrgId);
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/feature-plan",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const identity = getRequestIdentity(request);
			return buildFeaturePlan(
				getDenteTelegramBotSettings(identity.organizationId ?? null),
			);
		},
	});
}

export function registerTelegramOutboxRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/outbox",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const scopedQuery = resolveAuthorizedTelegramQueryScope(request, reply);
			if (!scopedQuery) return;
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				scopedQuery,
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
				parseTelegramOutboxQuery(scopedQuery),
				runtimeResult.runtime.runtimeScope,
				domainState,
			);
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/outbox/:itemId/send",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const parsedInput = parseTelegramRouteBody(
				denteTelegramOutboxSendRequestSchema,
				request.body ?? {},
			);
			if (!parsedInput.ok) return sendTelegramValidationError(reply);
			const scopedQuery = resolveAuthorizedTelegramQueryScope(request, reply);
			if (!scopedQuery) return;
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				scopedQuery,
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
			const { itemId } = request.params as { itemId: string };
			const result = await executeTelegramOutboxSend(
				itemId,
				parsedInput.value,
				runtimeResult.runtime,
				domainState,
			);
			return reply.code(result.statusCode).send(result.body);
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/outbox/send-due",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const input = parseTelegramOutboxSendDueInput(request.body ?? {});
			if (!input)
				return sendTelegramValidationError(
					reply,
					"TelegramOutboxDueValidationFailed",
				);
			const scopedQuery = resolveAuthorizedTelegramQueryScope(request, reply);
			if (!scopedQuery) return;
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				scopedQuery,
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
	});
}

export function registerTelegramLinkRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/link-codes",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const parsedInput = parseTelegramRouteBody(
				createDenteTelegramLinkCodeSchema,
				request.body,
			);
			if (!parsedInput.ok) return sendTelegramValidationError(reply);
			const input = parsedInput.value;
			const identity = getRequestIdentity(request);
			if (
				identity.verified &&
				identity.organizationId &&
				input.organizationId &&
				input.organizationId !== identity.organizationId
			) {
				return reply.code(403).send({
					error: "TelegramCrossTenantDenied",
					message: "Запрещено создавать код привязки для другой организации.",
				});
			}
			const requestedOrganizationId =
				identity.verified && identity.organizationId
					? identity.organizationId
					: (input.organizationId ??
						(input.botConfigId ? (input.clinicId ?? null) : null));
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
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/link-codes",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const scopedQuery = resolveAuthorizedTelegramQueryScope(request, reply);
			if (!scopedQuery) return;
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				scopedQuery,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const runtime = runtimeResult.runtime.context;
			return buildDenteTelegramLinkCodeList({
				...parseTelegramLinkCodeListQuery(scopedQuery),
				organizationId: runtime.organizationId,
				clinicId: runtime.clinicId,
				botConfigId: runtime.botConfigId,
			});
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/chat-links",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const scopedQuery = resolveAuthorizedTelegramQueryScope(request, reply);
			if (!scopedQuery) return;
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				scopedQuery,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const runtime = runtimeResult.runtime.context;
			return await buildDenteTelegramChatLinkList({
				...parseTelegramChatLinkListQuery(scopedQuery),
				organizationId: runtime.organizationId,
				clinicId: runtime.clinicId,
				botConfigId: runtime.botConfigId,
			});
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/chat-links/:linkId/revoke",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const scopedQuery = resolveAuthorizedTelegramQueryScope(request, reply);
			if (!scopedQuery) return;
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				scopedQuery,
			);
			if (!runtimeResult.ok) {
				return reply.code(runtimeResult.statusCode).send({
					error: runtimeResult.error,
					message: runtimeResult.message,
				});
			}
			const runtime = runtimeResult.runtime.context;
			const { linkId } = request.params as { linkId: string };
			const revoked = await revokeDenteTelegramChatLink(
				{
					organizationId: runtime.organizationId,
					clinicId: runtime.clinicId,
					botConfigId: runtime.botConfigId,
				},
				linkId,
			);
			// Копия в памяти снимается второй и её результат ни на что не влияет: пока
			// очередь отправки читает массив процесса, оставить там активную связку
			// значило бы продолжать писать в отключённый чат.
			revokeLegacyInMemoryTelegramChatLink(linkId, {
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
			return denteTelegramChatLinkPublicSchema.parse(
				toDenteTelegramChatLinkPublic(revoked),
			);
		},
	});
}

export function registerTelegramPreviewRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/messages/preview",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const scopedQuery = resolveAuthorizedTelegramQueryScope(request, reply);
			if (!scopedQuery) return;
			const runtimeResult = resolveTelegramOutboxRuntimeScopeFromQuery(
				scopedQuery,
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
	});
}

export function registerTelegramBillingRoutes(
	app: FastifyInstance,
	telegramControlPlaneRouteOptions: {
		preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
	},
) {
	// 1. Каталог B2B SaaS-тарифов сервиса Telegram-ботов
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/billing/plans",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			return {
				plans: Object.values(TELEGRAM_BOT_SAAS_TIERS),
				tiers: TELEGRAM_BOT_SAAS_TIERS,
				defaultPlanId: "free",
				currency: "RUB",
			};
		},
	});

	// 2. Статистика использования квоты сообщений текущей клиники
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/telegram/billing/usage",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const identity = getRequestIdentity(request);
			const reqQuery = request.query as { organizationId?: string } | undefined;
			const requestedOrgId = reqQuery?.organizationId?.trim();
			if (
				identity.verified &&
				identity.organizationId &&
				requestedOrgId &&
				requestedOrgId !== identity.organizationId
			) {
				return reply.code(403).send({
					error: "TelegramCrossTenantDenied",
					message: "Запрещён доступ к биллингу другой организации.",
				});
			}
			const effectiveRequestedOrgId =
				identity.verified && identity.organizationId
					? identity.organizationId
					: requestedOrgId;
			const runtimeResult = resolveTelegramRuntimeContext(effectiveRequestedOrgId);
			const organizationId = runtimeResult.ok
				? runtimeResult.context.organizationId
				: effectiveRequestedOrgId;
			if (!organizationId) {
				return reply.code(400).send({
					error: "TelegramBillingOrganizationRequired",
					message: "Не удалось определить организацию для биллинга Telegram-бота.",
				});
			}

			await TelegramBotBillingService.hydrateOrganizationBilling(organizationId);
			const usage = TelegramBotBillingService.getBillingUsage(organizationId);
			return usage;
		},
	});

	const telegramBillingChangePlanSchema = z
		.object({
			planId: z.string().trim().min(1),
			organizationId: z.string().trim().min(1).optional(),
		})
		.strict();

	const isValidTelegramBotSaasTierId = (
		value: string,
	): value is TelegramBotSaasTierId =>
		Object.prototype.hasOwnProperty.call(TELEGRAM_BOT_SAAS_TIERS, value);

	// 3. Смена тарифного плана клиники
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/telegram/billing/change-plan",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (!(await runControlPlanePreHandler(telegramControlPlaneRouteOptions, request, reply))) return;
			const parsedBody = telegramBillingChangePlanSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "TelegramBillingInvalidInput",
					message: "Необходимо передать корректное тело запроса с параметром planId.",
				});
			}

			const targetPlanId = parsedBody.data.planId;
			if (!isValidTelegramBotSaasTierId(targetPlanId)) {
				return reply.code(400).send({
					error: "TelegramBillingInvalidPlan",
					message: `Недопустимый тарифный план '${targetPlanId}'. Доступны: free, pro, enterprise.`,
				});
			}

			const identity = getRequestIdentity(request);
			const requestedOrgId = parsedBody.data.organizationId;
			if (
				identity.verified &&
				identity.organizationId &&
				requestedOrgId &&
				requestedOrgId !== identity.organizationId
			) {
				return reply.code(403).send({
					error: "TelegramCrossTenantDenied",
					message: "Запрещено изменять тарифный план другой организации.",
				});
			}
			const effectiveRequestedOrgId =
				identity.verified && identity.organizationId
					? identity.organizationId
					: requestedOrgId;
			const runtimeResult = resolveTelegramRuntimeContext(effectiveRequestedOrgId);
			const organizationId = runtimeResult.ok
				? runtimeResult.context.organizationId
				: effectiveRequestedOrgId;
			if (!organizationId) {
				return reply.code(400).send({
					error: "TelegramBillingOrganizationRequired",
					message: "Не удалось определить организацию для смены тарифа Telegram-бота.",
				});
			}

			await TelegramBotBillingService.hydrateOrganizationBilling(organizationId);
			const updated = TelegramBotBillingService.changePlan({
				organizationId,
				newPlanId: targetPlanId,
			});
			await TelegramBotBillingService.persistBillingRecord(organizationId);

			return reply.code(200).send({
				success: true,
				message: `Тарифный план успешно изменен на ${updated.plan.nameRu}`,
				usage: updated,
			});
		},
	});
}
