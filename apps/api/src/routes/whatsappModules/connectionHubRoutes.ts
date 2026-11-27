/**
 * whatsappModules/connectionHubRoutes.ts — Connection Hub, QR Auth, WABA & Settings Routes.
 *
 * Manages WhatsApp bot configuration, AES-256 token encryption via OmnichannelTokenVault,
 * QR-code pairing sessions, and Meta Graph API WABA credentials.
 */

import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { denteWhatsappBotConfigs } from "../../db/schema.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import { WhatsappConnectionHubService } from "../../services/messaging/whatsappConnectionHub.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	qrSessionStartSchema,
	updateWhatsappConfigSchema,
	wabaConnectSchema,
	wabaTestSchema,
} from "./types.js";

export function maskToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

export function parseJsonSafe<T>(
	value: unknown,
	fallback: T,
	logger?: { error: (obj: unknown, msg?: string) => void },
): T {
	if (value === null || value === undefined) {
		return fallback;
	}
	if (typeof value === "object") {
		return value as T;
	}
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch (err) {
			logger?.error({ err }, "[Dente] parseJsonSafe failed");
			return fallback;
		}
	}
	return fallback;
}

/**
 * Registers WhatsApp connection hub, QR pairing, WABA Cloud API, and settings routes.
 */
export async function registerConnectionHubRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * GET /api/whatsapp/settings
	 * Returns the WhatsApp bot config. Raw token never returned.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/whatsapp/settings",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"whatsapp settings read",
			);
			if (!orgId) return;

			const config = await withTenantReadCtx(orgId, async (tx) => {
				const [row] = await tx
					.select()
					.from(denteWhatsappBotConfigs)
					.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
					.limit(1);
				return row ?? null;
			});

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
					config.enabledFeaturesJson,
					[],
					request.log,
				),
				staffRouting: parseJsonSafe(config.staffRoutingJson, {
					defaultUserId: null,
					rules: [],
				}, request.log),
				isActive: config.isActive,
				updatedAt: (config.updatedAt ?? config.createdAt).toISOString(),
			};
		},
	});

	/**
	 * PUT /api/whatsapp/settings
	 * Creates or updates the WhatsApp bot config.
	 * If accessToken is provided, it is hashed and stored as tokenSecretRef.
	 */
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/whatsapp/settings",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"whatsapp settings write",
			);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
				};
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

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

			let encryptedToken: string | null = null;
			if (input.accessToken) {
				encryptedToken = OmnichannelTokenVault.isEncrypted(input.accessToken)
					? input.accessToken
					: OmnichannelTokenVault.encrypt(input.accessToken, orgId);
			}

			let encryptedGreenToken: string | null = null;
			if (input.greenApiToken) {
				encryptedGreenToken = OmnichannelTokenVault.isEncrypted(
					input.greenApiToken,
				)
					? input.greenApiToken
					: OmnichannelTokenVault.encrypt(input.greenApiToken, orgId);
			}

			await withTenantWriteCtx(orgId, async (tx) => {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', 'whatsapp_settings', ${orgId}::text)))`,
				);

				const [existing] = await tx
					.select({ id: denteWhatsappBotConfigs.id })
					.from(denteWhatsappBotConfigs)
					.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
					.limit(1)
					.for("update");

				if (existing) {
					const updateValues: Partial<typeof denteWhatsappBotConfigs.$inferInsert> =
						{ updatedAt: now };

					if (input.phoneNumberId !== undefined)
						updateValues.phoneNumberId = input.phoneNumberId;
					if (encryptedToken) {
						updateValues.accessToken = encryptedToken;
						updateValues.tokenSecretRef = encryptedToken;
					}
					if (encryptedGreenToken) {
						updateValues.greenApiToken = encryptedGreenToken;
					}
					if (input.provider !== undefined) {
						updateValues.provider = input.provider;
					}
					if (input.greenApiInstanceId !== undefined) {
						updateValues.greenApiInstanceId = input.greenApiInstanceId;
					}
					if (input.webhookVerifyToken !== undefined)
						updateValues.webhookVerifyToken = input.webhookVerifyToken;
					if (input.enabledFeatures !== undefined)
						updateValues.enabledFeaturesJson = JSON.stringify(
							input.enabledFeatures,
						);
					if (input.staffRouting !== undefined)
						updateValues.staffRoutingJson = JSON.stringify(input.staffRouting);
					if (input.isActive !== undefined) updateValues.isActive = input.isActive;

					await tx
						.update(denteWhatsappBotConfigs)
						.set(updateValues)
						.where(eq(denteWhatsappBotConfigs.id, existing.id));
				} else {
					await tx.insert(denteWhatsappBotConfigs).values({
						organizationId: orgId,
						phoneNumberId: input.phoneNumberId ?? null,
						provider: input.provider ?? "cloud_api",
						greenApiInstanceId: input.greenApiInstanceId ?? null,
						greenApiToken: encryptedGreenToken,
						accessToken: encryptedToken,
						tokenSecretRef: encryptedToken,
						webhookVerifyToken: input.webhookVerifyToken ?? null,
						enabledFeaturesJson: JSON.stringify(input.enabledFeatures ?? []),
						staffRoutingJson: JSON.stringify(
							input.staffRouting ?? { defaultUserId: null, rules: [] },
						),
						isActive: input.isActive ?? false,
					});
				}
			});

			reply.code(200);
			return { ok: true };
		},
	});

	/**
	 * GET /api/whatsapp/status
	 * Checks whether the bot config is present and active.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/whatsapp/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"whatsapp status",
			);
			if (!orgId) return;

			const config = await withTenantReadCtx(orgId, async (tx) => {
				const [row] = await tx
					.select()
					.from(denteWhatsappBotConfigs)
					.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
					.limit(1);
				return row ?? null;
			});

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
		},
	});

	/**
	 * =========================================================================
	 * WhatsApp QR Hub: Подключение рабочего номера клиники через QR-код
	 * =========================================================================
	 */

	/**
	 * POST /api/whatsapp/qr/session/start
	 * Инициализация или перезапуск сессии привязки рабочего номера через QR или Pairing Code.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/whatsapp/qr/session/start",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"whatsapp qr session start",
			);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
				};
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			const parsed = qrSessionStartSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				reply.code(400);
				return {
					ok: false,
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Некорректные параметры запуска QR-сессии.",
				};
			}
			const input = parsed.data;

			const session = WhatsappConnectionHubService.startQrSession({
				organizationId: orgId,
				...(input.phone ? { pairingPhone: input.phone } : {}),
				...(input.forceRefresh !== undefined
					? { forceRefresh: input.forceRefresh }
					: {}),
			});

			const now = Date.now();
			const secondsLeft = Math.max(
				0,
				Math.ceil((session.expiresAt - now) / 1000),
			);

			return {
				ok: true,
				sessionId: session.sessionId,
				status: session.status,
				qrPayload: session.qrPayload,
				qrSvg: session.qrSvg,
				qrDataUrl: session.qrDataUrl,
				pairingCode: session.pairingCode,
				pairingPhone: session.pairingPhone,
				expiresInSeconds: secondsLeft,
				expiresAt: new Date(session.expiresAt).toISOString(),
			};
		},
	});

	/**
	 * GET /api/whatsapp/qr/session/status
	 * Получение статуса привязки QR-кода и времени до экспирации.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/whatsapp/qr/session/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"whatsapp qr session status",
			);
			if (!orgId) return;

			const status = WhatsappConnectionHubService.getQrSessionStatus(orgId);

			return {
				ok: true,
				...status,
			};
		},
	});

	/**
	 * POST /api/whatsapp/qr/session/disconnect
	 * Отвязка рабочего номера клиники.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/whatsapp/qr/session/disconnect",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"whatsapp qr disconnect",
			);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
				};
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			WhatsappConnectionHubService.disconnectQrSession(orgId);

			return {
				ok: true,
				status: "disconnected",
				message: "Устройство отвязано от клиники.",
			};
		},
	});

	/**
	 * =========================================================================
	 * WhatsApp Business Cloud API (WABA): Официальная интеграция Meta
	 * =========================================================================
	 */

	/**
	 * POST /api/whatsapp/waba/connect
	 * Сохранение Phone Number ID, WABA ID, Access Token и Webhook Verify Token.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/whatsapp/waba/connect",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"whatsapp waba connect",
			);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
				};
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			const parsed = wabaConnectSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.code(400);
				return {
					error: "WabaValidationError",
					message:
						parsed.error.issues[0]?.message ||
						"Проверьте параметры подключения WABA",
				};
			}

			const result = await WhatsappConnectionHubService.connectWaba({
				organizationId: orgId,
				phoneNumberId: parsed.data.phoneNumberId,
				accessToken: parsed.data.accessToken,
				...(parsed.data.wabaAccountId
					? { wabaAccountId: parsed.data.wabaAccountId }
					: {}),
				...(parsed.data.webhookVerifyToken
					? { webhookVerifyToken: parsed.data.webhookVerifyToken }
					: {}),
			});

			return {
				ok: true,
				connected: true,
				id: result.id,
				message: "Параметры WhatsApp Business Cloud API сохранены.",
			};
		},
	});

	/**
	 * POST /api/whatsapp/waba/test
	 * Проверка связи с Meta Graph API.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/whatsapp/waba/test",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"whatsapp waba test",
			);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return {
					error: "ValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
				};
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			const parsed = wabaTestSchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				reply.code(400);
				return {
					ok: false,
					error: "ValidationError",
					message: parsed.error.issues[0]?.message || "Некорректные параметры проверки WABA.",
				};
			}
			let phoneNumberId = parsed.data.phoneNumberId;
			let accessToken = parsed.data.accessToken;

			// Если параметры не переданы в теле, берем сохраненные из базы
			if (!phoneNumberId || !accessToken) {
				const config = await withTenantReadCtx(orgId, async (tx) => {
					const [row] = await tx
						.select()
						.from(denteWhatsappBotConfigs)
						.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
						.limit(1);
					return row ?? null;
				});

				if (!config?.phoneNumberId || !config.tokenSecretRef) {
					reply.code(400);
					return {
						ok: false,
						error: "WabaNotConfigured",
						message:
							"Не заданы Phone Number ID и Access Token. Сначала укажите параметры подключения.",
					};
				}

				phoneNumberId = config.phoneNumberId;
				accessToken = config.tokenSecretRef;
			}

			const testResult = await WhatsappConnectionHubService.testWabaConnection({
				phoneNumberId,
				accessToken,
				organizationId: orgId,
			});

			if (!testResult.ok) {
				reply.code(400);
				return {
					ok: false,
					error: "WabaConnectionFailed",
					errorCode: testResult.errorCode,
					message:
						testResult.errorMessage ||
						"Ошибка проверки связи с Meta Graph API",
				};
			}

			return {
				ok: true,
				verifiedName: testResult.verifiedName,
				displayPhoneNumber: testResult.displayPhoneNumber,
				qualityRating: testResult.qualityRating,
				codeVerificationStatus: testResult.codeVerificationStatus,
				message: "Связь с Meta Graph API успешно подтверждена!",
			};
		},
	});

	/**
	 * GET /api/whatsapp/waba/status
	 * Текущий статус подписки на вебхуки и подключения WABA.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/whatsapp/waba/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"whatsapp waba status",
			);
			if (!orgId) return;

			const origin = `${request.protocol}://${request.hostname}`;
			const status = await WhatsappConnectionHubService.getWabaStatus(
				orgId,
				origin,
			);

			return {
				ok: true,
				...status,
			};
		},
	});
}
