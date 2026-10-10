/**
 * whatsappModules/connectionHubRoutes.ts — Connection Hub, QR Auth, WABA & Settings Routes.
 *
 * Manages WhatsApp bot configuration, AES-256 token encryption via OmnichannelTokenVault,
 * QR-code pairing sessions, and Meta Graph API WABA credentials.
 */

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { denteWhatsappBotConfigs } from "../../db/schema.js";
import { OmnichannelTokenVault } from "../../services/bots/OmnichannelTokenVault.js";
import { WhatsappConnectionHubService } from "../../services/messaging/whatsappConnectionHub.js";
import {
	qrSessionStartSchema,
	qrSimulateAuthSchema,
	updateWhatsappConfigSchema,
	wabaConnectSchema,
	wabaTestSchema,
} from "./types.js";

export function maskToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex").slice(0, 12);
}

export function parseJsonSafe<T>(value: string, fallback: T): T {
	try {
		return JSON.parse(value) as T;
	} catch (err) {
		console.error("[Dente] parseJsonSafe failed:", err);
		return fallback;
	}
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

			await db
				.update(denteWhatsappBotConfigs)
				.set(updateValues)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId));
		} else {
			await db.insert(denteWhatsappBotConfigs).values({
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
	 * =========================================================================
	 * WhatsApp QR Hub: Подключение рабочего номера клиники через QR-код
	 * =========================================================================
	 */

	/**
	 * POST /api/whatsapp/qr/session/start
	 * Инициализация или перезапуск сессии привязки рабочего номера через QR или Pairing Code.
	 */
	app.post("/api/whatsapp/qr/session/start", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"whatsapp qr session start",
		);
		if (!orgId) return;

		const parsed = qrSessionStartSchema.safeParse(request.body || {});
		const input = parsed.success ? parsed.data : {};

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
	});

	/**
	 * GET /api/whatsapp/qr/session/status
	 * Получение статуса привязки QR-кода и времени до экспирации.
	 */
	app.get("/api/whatsapp/qr/session/status", async (request, reply) => {
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
	});

	/**
	 * POST /api/whatsapp/qr/session/disconnect
	 * Отвязка рабочего номера клиники.
	 */
	app.post("/api/whatsapp/qr/session/disconnect", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"whatsapp qr disconnect",
		);
		if (!orgId) return;

		WhatsappConnectionHubService.disconnectQrSession(orgId);

		return {
			ok: true,
			status: "disconnected",
			message: "Устройство отвязано от клиники.",
		};
	});

	/**
	 * POST /api/whatsapp/qr/session/simulate-auth
	 * Тестовая / Демо авторизация для мгновенной верификации и E2E тестов.
	 */
	app.post("/api/whatsapp/qr/session/simulate-auth", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"whatsapp qr simulate auth",
		);
		if (!orgId) return;

		const parsed = qrSimulateAuthSchema.safeParse(request.body || {});
		const data = parsed.success
			? parsed.data
			: {
					phone: "+7 (999) 123-45-67",
					deviceModel: "Рабочий iPhone клиники",
				};

		const session = WhatsappConnectionHubService.simulateAuthenticate(
			orgId,
			data.phone,
			data.deviceModel,
		);

		return {
			ok: true,
			status: session.status,
			connectedPhone: session.connectedPhone,
			connectedAt: session.connectedAt,
			deviceModel: session.deviceModel,
		};
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
	app.post("/api/whatsapp/waba/connect", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"whatsapp waba connect",
		);
		if (!orgId) return;

		const parsed = wabaConnectSchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "WabaValidationError",
				message:
					parsed.error.errors[0]?.message ||
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
	});

	/**
	 * POST /api/whatsapp/waba/test
	 * Проверка связи с Meta Graph API.
	 */
	app.post("/api/whatsapp/waba/test", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"whatsapp waba test",
		);
		if (!orgId) return;

		const parsed = wabaTestSchema.safeParse(request.body || {});
		let phoneNumberId = parsed.success ? parsed.data.phoneNumberId : undefined;
		let accessToken = parsed.success ? parsed.data.accessToken : undefined;

		// Если параметры не переданы в теле, берем сохраненные из базы
		if (!phoneNumberId || !accessToken) {
			const [config] = await db
				.select()
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
				.limit(1);

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
	});

	/**
	 * GET /api/whatsapp/waba/status
	 * Текущий статус подписки на вебхуки и подключения WABA.
	 */
	app.get("/api/whatsapp/waba/status", async (request, reply) => {
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
	});
}
