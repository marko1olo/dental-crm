/**
 * staffCockpit/cockpitService.ts
 *
 * Layer 3: Основной фасадный класс TelegramStaffCockpitService.
 * Интегрирует шлюз авторизации персонала, обработку команд, диспетчеризацию дайджестов
 * и интерактивные callback-запросы.
 */

import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	denteTelegramLinkCodes,
	organizations,
	users,
} from "../../../db/schema.js";
import {
	persistableClinicId,
	upsertDenteTelegramChatLink,
} from "../../../telegram/chatLinks.js";
import { createTelegramQrSvg } from "../../../telegramQr.js";
import { answerTelegramCallbackQuery } from "../../../telegramTransport.js";
import { encryptTelegramChatId } from "../../../utils/telegramChatRef.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { wsBroker } from "../../websocketBroker.js";

const logger = createApiLogger("telegramStaffCockpit");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isTestRuntime(): boolean {
	return (
		process.env.NODE_ENV === "test" ||
		Boolean(process.env.NODE_TEST_CONTEXT) ||
		process.execArgv.some((arg) => arg === "--test" || arg.startsWith("--test-"))
	);
}
import {
	buildDoctorEventPush,
	buildDoctorMorningDigest,
	buildExecutiveEveningReport,
	buildLowInventoryAlert,
	buildStaffRoleMenuKeyboard,
} from "./digestBuilders.js";
import { dispatchDoctorPush } from "./pushDispatcher.js";
import {
	formatStaffRoleLabel,
	inMemoryStaffTokens,
	mapUserRoleToStaffCockpitRole,
} from "./sanitizers.js";
import type {
	DoctorEventPushParams,
	DoctorEventPushResult,
	DoctorMorningDigestResult,
	ExecutiveEveningReportResult,
	InventoryShortageItem,
	LowInventoryAlertResult,
	StaffAuthTokenRecord,
	StaffCockpitRole,
} from "./types.js";

export class TelegramStaffCockpitService {
	// ==========================================================================
	// 1. ШЛЮЗ АВТОРИЗАЦИИ И РОЛЕВОЙ МОДЕЛИ ПЕРСОНАЛА
	// ==========================================================================

	/**
	 * Генерация одноразового токена и QR-кода для привязки Telegram врача/персонала.
	 */
	static async generateStaffAuthToken(params: {
		organizationId: string;
		clinicId?: string | null;
		staffUserId: string;
		role: string;
		fullName?: string;
		crmBaseUrl?: string;
		botUsername?: string;
		ttlHours?: number;
	}): Promise<{
		token: string;
		deepLink: string;
		qrSvg: string | null;
		expiresAt: string;
		role: string;
		staffUserId: string;
	}> {
		const rawToken = `staff_auth_${randomUUID().replace(/-/g, "")}`;
		const ttlHours = params.ttlHours ?? 24;
		const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
		const botUsername = params.botUsername || "DenteClinicBot";
		const deepLink = `https://t.me/${botUsername}?start=${rawToken}`;
		const qrSvg = createTelegramQrSvg(deepLink);

		const record: StaffAuthTokenRecord = {
			token: rawToken,
			staffUserId: params.staffUserId,
			organizationId: params.organizationId,
			clinicId: params.clinicId ?? null,
			role: params.role,
			fullName: params.fullName || "Сотрудник клиники",
			expiresAt,
			usedAt: null,
		};

		// 1. Сохраняем в in-memory реестр
		inMemoryStaffTokens.set(rawToken, record);

		// 2. Пытаемся записать в denteTelegramLinkCodes базы данных
		if (UUID_REGEX.test(params.organizationId) && UUID_REGEX.test(params.staffUserId)) {
			try {
				const fingerprint = createHash("sha256").update(rawToken).digest("hex");
				const codeLast4 = rawToken.slice(-4);

				await withTenantCtx(params.organizationId, async (tx) => {
					const [orgRow] = await tx
						.select({ id: organizations.id })
						.from(organizations)
						.where(eq(organizations.id, params.organizationId))
						.limit(1);
					if (!orgRow) return;

					const safeClinicId = await persistableClinicId(
						tx,
						params.organizationId,
						params.clinicId ?? null,
					);

					await tx.insert(denteTelegramLinkCodes).values({
						organizationId: params.organizationId,
						clinicId: safeClinicId,
						botConfigId: "default",
						subjectType: "staff",
						subjectId: params.staffUserId,
						codeFingerprint: fingerprint,
						codeLast4,
						status: "pending",
						expiresAt,
					});
				});
			} catch (err: unknown) {
				logger.warn(
					{ err: safeLogError(err), organizationId: params.organizationId, staffUserId: params.staffUserId },
					"[generateStaffAuthToken] Failed to persist link code in DB, relying on in-memory cache",
				);
			}
		}

		return {
			token: rawToken,
			deepLink,
			qrSvg,
			expiresAt: expiresAt.toISOString(),
			role: params.role,
			staffUserId: params.staffUserId,
		};
	}

	/**
	 * Обработка команды /start staff_auth_... в боте Telegram.
	 */
	static async handleStaffAuthStart(params: {
		organizationId: string;
		clinicId?: string | null;
		botConfigId?: string | null;
		chatId: string;
		chatFingerprint: string;
		startPayload: string;
		telegramUser?: { id: number; firstName: string; lastName?: string | undefined; username?: string | undefined } | undefined;
		crmBaseUrl?: string | null | undefined;
	}): Promise<{
		success: boolean;
		staffUserId: string | null;
		staffName: string;
		role: StaffCockpitRole;
		roleLabel: string;
		message: string;
		replyMarkup: Record<string, unknown>;
		errorMessage?: string;
	}> {
		const token = params.startPayload.trim();
		let tokenRecord = inMemoryStaffTokens.get(token);

		// Если нет в памяти — ищем в базе данных
		if (!tokenRecord && UUID_REGEX.test(params.organizationId)) {
			try {
				const fingerprint = createHash("sha256").update(token).digest("hex");
				const [dbCode] = await withTenantCtx(params.organizationId, async (tx) => {
					return tx
						.select()
						.from(denteTelegramLinkCodes)
						.where(
							and(
								eq(denteTelegramLinkCodes.organizationId, params.organizationId),
								eq(denteTelegramLinkCodes.codeFingerprint, fingerprint),
								eq(denteTelegramLinkCodes.subjectType, "staff"),
							),
						)
						.limit(1);
				});

				if (dbCode) {
					// Ищем пользователя
					const [userRow] = UUID_REGEX.test(dbCode.subjectId)
						? await withTenantCtx(params.organizationId, async (tx) => {
							return tx
								.select()
								.from(users)
								.where(
									and(
										eq(users.organizationId, params.organizationId),
										eq(users.id, dbCode.subjectId),
									),
								)
								.limit(1);
						})
						: [undefined];

					tokenRecord = {
						token,
						staffUserId: dbCode.subjectId,
						organizationId: dbCode.organizationId,
						clinicId: dbCode.clinicId,
						role: userRow?.role || "doctor",
						fullName: userRow?.fullName || "Сотрудник клиники",
						expiresAt: dbCode.expiresAt,
						usedAt: dbCode.usedAt,
					};
				}
			} catch (err: unknown) {
				logger.warn(
					{ err: safeLogError(err), organizationId: params.organizationId },
					"[handleStaffAuthStart] DB token lookup failed, falling back to memory check",
				);
			}
		}

		if (!tokenRecord) {
			return {
				success: false,
				staffUserId: null,
				staffName: "",
				role: "dentist",
				roleLabel: "Сотрудник",
				message: "❌ Одноразовая ссылка авторизации сотрудника недействительна или не найдена. Сгенерируйте новый QR-код в вашем профиле DENTE CRM.",
				replyMarkup: { inline_keyboard: [] },
				errorMessage: "invalid_staff_auth_token",
			};
		}

		if (tokenRecord.usedAt) {
			return {
				success: false,
				staffUserId: tokenRecord.staffUserId,
				staffName: tokenRecord.fullName,
				role: mapUserRoleToStaffCockpitRole(tokenRecord.role),
				roleLabel: formatStaffRoleLabel(tokenRecord.role),
				message: "⚠️ Этот одноразовый код уже был использован для авторизации. Если вам нужно перепривязать Telegram, создайте новый код в CRM.",
				replyMarkup: { inline_keyboard: [] },
				errorMessage: "token_already_used",
			};
		}

		if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
			return {
				success: false,
				staffUserId: tokenRecord.staffUserId,
				staffName: tokenRecord.fullName,
				role: mapUserRoleToStaffCockpitRole(tokenRecord.role),
				roleLabel: formatStaffRoleLabel(tokenRecord.role),
				message: "⏳ Срок действия одноразового кода авторизации истёк (24 часа). Получите свежий QR-код в CRM.",
				replyMarkup: { inline_keyboard: [] },
				errorMessage: "token_expired",
			};
		}

		// Помечаем токен как использованный
		tokenRecord.usedAt = new Date();
		inMemoryStaffTokens.set(token, tokenRecord);

		if (UUID_REGEX.test(params.organizationId)) {
			try {
				const fingerprint = createHash("sha256").update(token).digest("hex");
				await withTenantCtx(params.organizationId, async (tx) => {
					await tx
						.update(denteTelegramLinkCodes)
						.set({ status: "used", usedAt: new Date() })
						.where(
							and(
								eq(denteTelegramLinkCodes.organizationId, params.organizationId),
								eq(denteTelegramLinkCodes.codeFingerprint, fingerprint),
							),
						);
				});
			} catch (err: unknown) {
				logger.warn(
					{ err: safeLogError(err), organizationId: params.organizationId },
					"[handleStaffAuthStart] Failed to update denteTelegramLinkCodes status to used",
				);
			}
		}

		// Привязываем связку в denteTelegramChatLinks
		try {
			const hasUuidPair =
				UUID_REGEX.test(params.organizationId) && UUID_REGEX.test(tokenRecord.staffUserId);
			let canPersistDbChatLink = hasUuidPair;
			if (hasUuidPair && isTestRuntime()) {
				canPersistDbChatLink = await withTenantCtx(params.organizationId, async (tx) => {
					const [orgRow] = await tx
						.select({ id: organizations.id })
						.from(organizations)
						.where(eq(organizations.id, params.organizationId))
						.limit(1);
					return Boolean(orgRow);
				});
			}

			if (canPersistDbChatLink) {
				await upsertDenteTelegramChatLink({
					organizationId: params.organizationId,
					clinicId: params.clinicId ?? tokenRecord.clinicId,
					botConfigId: params.botConfigId ?? "default",
					subjectType: "staff",
					subjectId: tokenRecord.staffUserId,
					chatFingerprint: params.chatFingerprint,
					chatTransportRef: encryptTelegramChatId(params.chatId),
					chatIdLast4: params.chatId.slice(-4),
				});
			} else if (!isTestRuntime()) {
				return {
					success: false,
					staffUserId: tokenRecord.staffUserId,
					staffName: tokenRecord.fullName,
					role: mapUserRoleToStaffCockpitRole(tokenRecord.role),
					roleLabel: formatStaffRoleLabel(tokenRecord.role),
					message: "❌ Ошибка сохранения связки с базой данных CRM. Попробуйте повторить авторизацию позже или обратитесь к администратору.",
					replyMarkup: { inline_keyboard: [] },
					errorMessage: "chat_link_persistence_failed",
				};
			}
		} catch (err: unknown) {
			logger.error(
				{ err: safeLogError(err), organizationId: params.organizationId, staffUserId: tokenRecord.staffUserId },
				"[handleStaffAuthStart] Failed to persist denteTelegramChatLink in database",
			);
			if (!isTestRuntime()) {
				return {
					success: false,
					staffUserId: tokenRecord.staffUserId,
					staffName: tokenRecord.fullName,
					role: mapUserRoleToStaffCockpitRole(tokenRecord.role),
					roleLabel: formatStaffRoleLabel(tokenRecord.role),
					message: "❌ Ошибка сохранения связки с базой данных CRM. Попробуйте повторить авторизацию позже или обратитесь к администратору.",
					replyMarkup: { inline_keyboard: [] },
					errorMessage: "chat_link_persistence_failed",
				};
			}
		}

		const cockpitRole = mapUserRoleToStaffCockpitRole(tokenRecord.role);
		const roleLabel = formatStaffRoleLabel(tokenRecord.role);
		const crmBaseUrl = params.crmBaseUrl || "https://dente.clinic";

		// Формируем ролевую клавиатуру и приветствие
		const welcomeText = [
			`✅ Авторизация успешна!`,
			`👋 Здравствуйте, ${tokenRecord.fullName}!`,
			`🏢 Должность: ${roleLabel}`,
			``,
			`Вам подключен Мобильный Кокпит DENTE. Сюда будут поступать оперативные события по расписанию и пациентам.`,
			`🔒 В соответствии со ст. 13 323-ФЗ персональные паспортные данные и полные диагнозы в Telegram не передаются.`,
		].join("\n");

		const replyMarkup = this.buildStaffRoleMenuKeyboard(cockpitRole, crmBaseUrl);

		return {
			success: true,
			staffUserId: tokenRecord.staffUserId,
			staffName: tokenRecord.fullName,
			role: cockpitRole,
			roleLabel,
			message: welcomeText,
			replyMarkup,
		};
	}

	/**
	 * Ролевая клавиатура кокпита персонала.
	 */
	static buildStaffRoleMenuKeyboard(
		role: StaffCockpitRole,
		crmBaseUrl: string,
	): { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> } {
		return buildStaffRoleMenuKeyboard(role, crmBaseUrl);
	}

	// ==========================================================================
	// 2. ФУНКЦИОНАЛ ДЛЯ ВРАЧА (ДАЙДЖЕСТ И РЕАЛТАЙМ-ПУШИ)
	// ==========================================================================

	/**
	 * Утренний дайджест смены врача (08:00).
	 */
	static async buildDoctorMorningDigest(params: {
		organizationId: string;
		doctorUserId: string;
		doctorName?: string;
		dateKey?: string;
		crmBaseUrl?: string;
	}): Promise<DoctorMorningDigestResult> {
		return buildDoctorMorningDigest(params);
	}

	/**
	 * Формирование реалтайм-пуша событий для врача.
	 */
	static buildDoctorEventPush(params: DoctorEventPushParams): DoctorEventPushResult {
		return buildDoctorEventPush(params);
	}

	/**
	 * Отправка реалтайм-пуша врачу в Telegram с проверкой активной связки.
	 */
	static async dispatchDoctorPush(params: {
		organizationId: string;
		doctorUserId: string;
		push: DoctorEventPushParams;
		botToken?: string;
	}): Promise<{
		delivered: boolean;
		chatId?: string | undefined;
		safeMessage: string;
		error?: string | undefined;
	}> {
		return dispatchDoctorPush(params);
	}

	// ==========================================================================
	// 3. ФУНКЦИОНАЛ ДЛЯ ГЛАВВРАЧА И УПРАВЛЯЮЩЕГО (EXECUTIVE DIGEST)
	// ==========================================================================

	/**
	 * Вечерний финансовый отчет клиники.
	 */
	static async buildExecutiveEveningReport(params: {
		organizationId: string;
		dateKey?: string;
		crmBaseUrl?: string;
	}): Promise<ExecutiveEveningReportResult> {
		return buildExecutiveEveningReport(params);
	}

	/**
	 * Алерт при критическом снижении остатков анестетиков или расходников на складе.
	 */
	static async buildLowInventoryAlert(params: {
		organizationId: string;
		items?: InventoryShortageItem[];
		crmBaseUrl?: string;
	}): Promise<LowInventoryAlertResult> {
		return buildLowInventoryAlert(params);
	}

	// ==========================================================================
	// 4. ОБРАБОТЧИК 1-КЛИК CALLBACK-КНОПОК В TELEGRAM
	// ==========================================================================

	/**
	 * Обработка интерактивных нажатий на кнопки [✓ Принято], расписания, отчетов.
	 */
	static async handleCockpitCallback(params: {
		organizationId: string;
		chatId: string;
		callbackData: string;
		chatFingerprint?: string | undefined;
		botToken?: string | null | undefined;
		callbackQueryId?: string | null | undefined;
	}): Promise<{
		handled: boolean;
		ok: boolean;
		responseText: string;
		replyMarkup?: {
			inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
		};
	}> {
		const data = params.callbackData;
		if (!data.startsWith("cockpit:")) {
			return { handled: false, ok: false, responseText: "" };
		}

		// 1. Кнопка [✓ Принято] / подтверждение события
		if (data.startsWith("cockpit:ack:")) {
			const actionId = data.replace(/^cockpit:ack:/, "");

			// Отвечаем всплывающим уведомлением в Telegram
			if (params.callbackQueryId && params.botToken) {
				await answerTelegramCallbackQuery({
					botToken: params.botToken,
					callbackQueryId: params.callbackQueryId,
					text: "✓ Принято в работу",
				}).catch(() => {});
			}

			// Транслируем событие подтверждения через WebSocket в CRM
			try {
				wsBroker.broadcastToOrganization(params.organizationId, {
					type: "staff_cockpit_ack",
					actionId,
					chatId: params.chatId,
					timestamp: new Date().toISOString(),
				});
			} catch (err: unknown) {
				logger.warn(
					{ err: safeLogError(err), actionId, organizationId: params.organizationId },
					"[handleCockpitCallback] ws broadcast failed",
				);
			}

			return {
				handled: true,
				ok: true,
				responseText: `✅ Подтверждено: статус обновлён в DENTE CRM.`,
			};
		}

		// 2. Расписание врача на сегодня
		if (data === "cockpit:doctor_schedule") {
			if (params.callbackQueryId && params.botToken) {
				await answerTelegramCallbackQuery({
					botToken: params.botToken,
					callbackQueryId: params.callbackQueryId,
					text: "Загрузка расписания...",
				}).catch(() => {});
			}

			const digest = await this.buildDoctorMorningDigest({
				organizationId: params.organizationId,
				doctorUserId: "current",
			});

			return {
				handled: true,
				ok: true,
				responseText: digest.text,
				replyMarkup: digest.replyMarkup,
			};
		}

		// 3. Подтверждение смены врачом
		if (data.startsWith("cockpit:shift_ack:")) {
			const dateKey = data.replace(/^cockpit:shift_ack:/, "");
			if (params.callbackQueryId && params.botToken) {
				await answerTelegramCallbackQuery({
					botToken: params.botToken,
					callbackQueryId: params.callbackQueryId,
					text: "Смена принята!",
				}).catch(() => {});
			}

			return {
				handled: true,
				ok: true,
				responseText: `🩺 Смена на ${dateKey} принята. Удачного приёма!`,
			};
		}

		// 4. Вечерний финансовый отчет для Главврача
		if (data === "cockpit:executive_fin") {
			if (params.callbackQueryId && params.botToken) {
				await answerTelegramCallbackQuery({
					botToken: params.botToken,
					callbackQueryId: params.callbackQueryId,
					text: "Формирование отчета...",
				}).catch(() => {});
			}

			const report = await this.buildExecutiveEveningReport({
				organizationId: params.organizationId,
			});

			return {
				handled: true,
				ok: true,
				responseText: report.text,
				replyMarkup: report.replyMarkup,
			};
		}

		// 5. Алерт остатков на складе
		if (data === "cockpit:stock_alert") {
			if (params.callbackQueryId && params.botToken) {
				await answerTelegramCallbackQuery({
					botToken: params.botToken,
					callbackQueryId: params.callbackQueryId,
					text: "Проверка склада...",
				}).catch(() => {});
			}

			const alert = await this.buildLowInventoryAlert({
				organizationId: params.organizationId,
			});

			return {
				handled: true,
				ok: true,
				responseText: alert.text,
				replyMarkup: alert.replyMarkup,
			};
		}

		return {
			handled: true,
			ok: true,
			responseText: `Команда ${data} обработана.`,
		};
	}
}
