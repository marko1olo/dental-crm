import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { db } from "../../db/client.js";
import { denteTelegramBotConfigs } from "../../db/schema.js";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { TelegramTokenVault } from "../../services/telegram/TelegramTokenVault.js";
import { TelegramBotHostingService } from "../../services/telegram/TelegramBotHostingService.js";
import { TelegramAccountService } from "../../services/telegram/TelegramAccountService.js";
import {
	parseTelegramRouteBody,
	sendTelegramValidationError,
} from "./telegramUtils.js";
import {
	configuredBotToken,
	configuredWebhookSecret,
	hydrateTelegramDomainState,
	requireTelegramControlPlaneAccess,
	resolveTelegramRuntimeContext,
} from "./telegramRuntimeContext.js";

export function registerTelegramConnectionHubRoutes(app: FastifyInstance) {
	/**
	 * =========================================================================
	 * TELEGRAM BOT: Подключение и проверка токена BotFather
	 * =========================================================================
	 */

	/**
	 * POST /api/telegram/bot/connect
	 * Валидация токена бота, AES-256-GCM шифрование с orgId AAD, сохранение и установка webhook / commands.
	 */
	app.post("/api/telegram/bot/connect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"telegram bot connect",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			token: z.string().trim().min(5, "Токен бота обязателен"),
			webhookUrl: z.string().trim().url().optional().nullable(),
			clinicId: z.string().uuid().optional().nullable(),
			botConfigId: z.string().trim().optional(),
		});

		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Некорректные параметры подключения бота.",
			});
		}

		const result = await TelegramBotHostingService.connectBot({
			organizationId: orgId,
			botToken: parsed.data.token,
			webhookBaseUrl: parsed.data.webhookUrl || null,
			clinicId: parsed.data.clinicId || null,
			botConfigId: parsed.data.botConfigId || "default",
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "BotConnectionFailed",
				message: result.error || "Не удалось подключить Telegram-бота.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			bot: result.bot,
			message: "Telegram-бот успешно подключен и верифицирован.",
		});
	});

	/**
	 * GET /api/telegram/bot/status
	 * Получение текущего состояния подключения бота клиники.
	 */
	app.get("/api/telegram/bot/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram bot status",
		);
		if (!orgId) return;

		const status = await TelegramBotHostingService.getBotStatus({
			organizationId: orgId,
		});

		return reply.code(200).send(status);
	});

	/**
	 * POST /api/telegram/bot/disconnect
	 * Отключение бота клиники.
	 */
	app.post("/api/telegram/bot/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"telegram bot disconnect",
		);
		if (!orgId) return;

		const res = await TelegramBotHostingService.disconnectBot({
			organizationId: orgId,
		});

		return reply.code(200).send({
			ok: true,
			disconnected: true,
			message: "Telegram-бот успешно отключен.",
		});
	});

	/**
	 * POST /api/telegram/bot/test
	 * Проверка связи бота с Telegram Bot API и статуса вебхука.
	 */
	app.post("/api/telegram/bot/test", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram bot test",
		);
		if (!orgId) return;

		const bodySchema = z.object({
			token: z.string().trim().optional(),
		});
		const parsed = bodySchema.safeParse(request.body || {});

		const res = await TelegramBotHostingService.testBotConnection({
			organizationId: orgId,
			botToken: (parsed.success && parsed.data.token) ? parsed.data.token : null,
		});

		if (!res.ok) {
			return reply.code(400).send({
				ok: false,
				error: "BotTestFailed",
				message: res.error || "Ошибка тестирования Telegram-бота.",
				details: res,
			});
		}

		return reply.code(200).send({
			ok: true,
			message: "Связь с Telegram Bot API установлена успешно.",
			details: res,
		});
	});

	/**
	 * =========================================================================
	 * TELEGRAM PERSONAL ACCOUNT (MTProto): Вход врача / админа по телефону и QR
	 * =========================================================================
	 */

	/**
	 * POST /api/telegram/account/request-code
	 * Отправка 5-значного проверочного кода на номер телефона (+7...).
	 */
	app.post("/api/telegram/account/request-code", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account request-code",
		);
		if (!orgId) return;

		const schema = z.object({
			phone: z.string().trim().min(5, "Укажите номер телефона"),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Укажите корректный номер телефона.",
			});
		}

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const result = await TelegramAccountService.requestCode({
			organizationId: orgId,
			phone: parsed.data.phone,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "RequestCodeFailed",
				message: result.error || "Не удалось отправить код подтверждения.",
			});
		}

		return reply.code(200).send({
			ok: true,
			phoneCodeHash: result.phoneCodeHash,
			timeoutSeconds: result.timeoutSeconds,
			formattedPhone: result.formattedPhone,
			testCode: result.testCode,
			message: `Код подтверждения отправлен на номер ${result.formattedPhone}.`,
		});
	});

	/**
	 * POST /api/telegram/account/verify-code
	 * Проверка кода. Если требуется 2FA, возвращает requires2fa: true.
	 */
	app.post("/api/telegram/account/verify-code", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account verify-code",
		);
		if (!orgId) return;

		const schema = z.object({
			phone: z.string().trim().min(5, "Укажите номер телефона"),
			phoneCodeHash: z.string().trim().min(1, "phoneCodeHash обязателен"),
			code: z.string().trim().min(3, "Укажите код из Telegram"),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Некорректные параметры верификации.",
			});
		}

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const result = await TelegramAccountService.verifyCode({
			organizationId: orgId,
			phone: parsed.data.phone,
			phoneCodeHash: parsed.data.phoneCodeHash,
			code: parsed.data.code,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "VerificationFailed",
				message: result.error || "Неверный код подтверждения.",
			});
		}

		if (result.requires2fa) {
			return reply.code(200).send({
				ok: true,
				connected: false,
				requires2fa: true,
				message: "Учетная запись защищена облачным паролем 2FA. Введите пароль.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			requires2fa: false,
			account: result.account,
			message: "Аккаунт Telegram успешно подключен.",
		});
	});

	/**
	 * POST /api/telegram/account/verify-2fa
	 * Ввод пароля двухфакторной аутентификации (облачный пароль MTProto).
	 */
	app.post("/api/telegram/account/verify-2fa", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account verify-2fa",
		);
		if (!orgId) return;

		const schema = z.object({
			phone: z.string().trim().min(5, "Укажите номер телефона"),
			password: z.string().trim().min(1, "Укажите пароль 2FA"),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: parsed.error.errors[0]?.message || "Укажите пароль двухфакторной аутентификации.",
			});
		}

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const result = await TelegramAccountService.verify2fa({
			organizationId: orgId,
			phone: parsed.data.phone,
			password: parsed.data.password,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "2FaFailed",
				message: result.error || "Неверный облачный пароль Telegram.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			account: result.account,
			message: "Двухфакторная аутентификация пройдена. Аккаунт подключен.",
		});
	});

	/**
	 * POST /api/telegram/account/request-qr
	 * Генерация QR-кода для мгновенной авторизации через мобильный Telegram.
	 */
	app.post("/api/telegram/account/request-qr", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account request-qr",
		);
		if (!orgId) return;

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const qr = await TelegramAccountService.requestQr({
			organizationId: orgId,
			userId,
			clinicId,
		});

		return reply.code(200).send({
			ok: true,
			token: qr.token,
			qrPayload: qr.qrPayload,
			qrSvg: qr.qrSvg,
			expiresIn: qr.expiresIn,
		});
	});

	/**
	 * POST /api/telegram/account/confirm-qr
	 * Подтверждение сканирования QR-кода (симуляция или успешный callback от приложения).
	 */
	app.post("/api/telegram/account/confirm-qr", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account confirm-qr",
		);
		if (!orgId) return;

		const schema = z.object({
			token: z.string().trim().min(1, "Токен QR обязателен"),
			phone: z.string().trim().optional(),
		});

		const parsed = schema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				ok: false,
				error: "ValidationError",
				message: "Некорректный токен QR.",
			});
		}

		const userId = (request.headers["x-user-id"] as string) || null;
		const clinicId = (request.headers["x-clinic-id"] as string) || null;

		const result = await TelegramAccountService.confirmQr({
			organizationId: orgId,
			token: parsed.data.token,
			phone: parsed.data.phone ?? null,
			userId,
			clinicId,
		});

		if (!result.ok) {
			return reply.code(400).send({
				ok: false,
				error: "QrConfirmFailed",
				message: result.error || "Не удалось подтвердить авторизацию по QR-коду.",
			});
		}

		return reply.code(200).send({
			ok: true,
			connected: true,
			account: result.account,
			message: "Авторизация по QR-коду успешно завершена.",
		});
	});

	/**
	 * GET /api/telegram/account/status
	 * Получение текущего состояния личного аккаунта врача / администратора.
	 */
	app.get("/api/telegram/account/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telegram account status",
		);
		if (!orgId) return;

		const phone = (request.query as Record<string, string | undefined>)?.phone;
		const status = await TelegramAccountService.getAccountStatus({
			organizationId: orgId,
			phone: phone ?? null,
		});

		return reply.code(200).send(status);
	});

	/**
	 * POST /api/telegram/account/disconnect
	 * Отключение личного аккаунта Telegram.
	 */
	app.post("/api/telegram/account/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"telegram account disconnect",
		);
		if (!orgId) return;

		const body = request.body as { phone?: string } | undefined;
		await TelegramAccountService.disconnectAccount({
			organizationId: orgId,
			phone: body?.phone ?? null,
		});

		return reply.code(200).send({
			ok: true,
			disconnected: true,
			message: "Личный аккаунт Telegram успешно отключен.",
		});
	});
}
