import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { denteTelegramBotConfigs } from "../../../db/schema.js";
import { TelegramBotPresetsEngine } from "../TelegramBotPresets.js";
import { TelegramTokenCrypto } from "./tokenCrypto.js";
import { TelegramWebhookLifecycle } from "./webhookLifecycle.js";
import { TelegramBotInstancePool } from "./botInstancePool.js";
import {
	CLINICAL_CARE_INSTRUCTIONS,
	getClinicalCareInstruction,
} from "./clinicalCareInstructions.js";
import { TelegramStaffScheduleFormatter } from "./staffScheduleFormatter.js";
import { TelegramIntercomStaffNotifier } from "./intercomStaffNotifier.js";
import {
	DEFAULT_PATIENT_BOT_COMMANDS,
	type ApplyPresetParams,
	type ApplyPresetResult,
	type BuildScheduleParams,
	type BuildScheduleResult,
	type ClinicalCareInstruction,
	type ConnectBotParams,
	type ConnectBotResult,
	type DisconnectBotParams,
	type DisconnectBotResult,
	type DispatchIntercomParams,
	type DispatchIntercomResult,
	type GetBotStatusParams,
	type GetBotStatusResult,
	type HandleIntercomAckParams,
	type HandleIntercomAckResult,
	type SetupWebhookParams,
	type SetupWebhookResult,
	type TelegramBotCommandItem,
	type TelegramBotMeResult,
	type TelegramWebhookInfoResult,
	type TestBotConnectionParams,
	type TestBotConnectionResult,
} from "./types.js";

/**
 * Основное ядро хостинга и управления Telegram-ботами клиники DENTE (Layer 3).
 * Координирует работу с БД, вебхуками, пресетами и рантайм-пулом ботов.
 */
export class TelegramHostingCoreService {
	/**
	 * Валидация токена бота через Telegram Bot API (getMe).
	 */
	static async verifyBotToken(
		botToken: string,
		timeoutMs = 7000,
	): Promise<TelegramBotMeResult> {
		return TelegramWebhookLifecycle.verifyBotToken(botToken, timeoutMs);
	}

	/**
	 * Регистрация Webhook в Telegram Bot API (setWebhook).
	 */
	static async setupWebhook(
		params: SetupWebhookParams,
	): Promise<SetupWebhookResult> {
		return TelegramWebhookLifecycle.setupWebhook(params);
	}

	/**
	 * Получение текущего состояния Webhook (getWebhookInfo).
	 */
	static async getWebhookInfo(
		botToken: string,
		timeoutMs = 7000,
	): Promise<TelegramWebhookInfoResult> {
		return TelegramWebhookLifecycle.getWebhookInfo(botToken, timeoutMs);
	}

	/**
	 * Настройка стандартного меню команд в интерфейсе Telegram (setMyCommands).
	 */
	static async setBotCommands(
		botToken: string,
		commands: TelegramBotCommandItem[] = DEFAULT_PATIENT_BOT_COMMANDS,
		timeoutMs = 7000,
	): Promise<boolean> {
		return TelegramWebhookLifecycle.setBotCommands(botToken, commands, timeoutMs);
	}

	/**
	 * Настройка описания бота в Telegram (setMyDescription).
	 */
	static async setBotDescription(
		botToken: string,
		description: string,
		timeoutMs = 7000,
	): Promise<boolean> {
		return TelegramWebhookLifecycle.setBotDescription(botToken, description, timeoutMs);
	}

	/**
	 * Настройка краткого описания бота в Telegram (setMyShortDescription).
	 */
	static async setBotShortDescription(
		botToken: string,
		shortDescription: string,
		timeoutMs = 7000,
	): Promise<boolean> {
		return TelegramWebhookLifecycle.setBotShortDescription(botToken, shortDescription, timeoutMs);
	}

	/**
	 * ДВИЖОК ОНБОРДИНГА И ПРИМЕНЕНИЯ ПРЕСЕТА КЛИНИКИ
	 */
	static async applyPresetToBot(
		params: ApplyPresetParams,
	): Promise<ApplyPresetResult> {
		const preset = TelegramBotPresetsEngine.getPreset(params.presetId);
		const verifyResult = await this.verifyBotToken(params.botToken);
		if (!verifyResult.ok) {
			return {
				ok: false,
				preset,
				commandsConfigured: false,
				descriptionConfigured: false,
				shortDescriptionConfigured: false,
				webhookConfigured: false,
				error: verifyResult.error || "Не удалось верифицировать токен бота в Telegram Bot API.",
			};
		}

		// Применяем команды и описания
		const commandsConfigured = await this.setBotCommands(params.botToken, preset.commands);
		const descriptionConfigured = await this.setBotDescription(params.botToken, preset.description);
		const shortDescriptionConfigured = await this.setBotShortDescription(params.botToken, preset.shortDescription);

		let webhookConfigured = false;
		if (params.webhookUrl?.trim()) {
			const webhookResult = await this.setupWebhook({
				botToken: params.botToken,
				webhookUrl: params.webhookUrl.trim(),
				secretToken: params.secretToken?.trim() || null,
			});
			webhookConfigured = webhookResult.ok;
		}

		return {
			ok: true,
			botUsername: verifyResult.username,
			preset,
			commandsConfigured,
			descriptionConfigured,
			shortDescriptionConfigured,
			webhookConfigured,
		};
	}

	/**
	 * МГНОВЕННЫЙ ПУШ ИНТЕРКОМА В TELEGRAM ПЕРСОНАЛА
	 */
	static async dispatchIntercomPingToTelegramStaff(
		params: DispatchIntercomParams,
	): Promise<DispatchIntercomResult> {
		return TelegramIntercomStaffNotifier.dispatchIntercomPingToTelegramStaff(params);
	}

	/**
	 * ОБРАБОТКА ПОДТВЕРЖДЕНИЯ ИНТЕРКОМ-ВЫЗОВА ИЗ TELEGRAM
	 */
	static async handleIntercomAckCallback(
		params: HandleIntercomAckParams,
	): Promise<HandleIntercomAckResult> {
		return TelegramIntercomStaffNotifier.handleIntercomAckCallback(params);
	}

	/**
	 * ФОРМИРОВАНИЕ РАСПИСАНИЯ ВРАЧА НА СЕГОДНЯ / ЗАВТРА (БЕЗ ПДн)
	 */
	static async buildStaffScheduleReply(
		params: BuildScheduleParams,
	): Promise<BuildScheduleResult> {
		return TelegramStaffScheduleFormatter.buildStaffScheduleReply(params);
	}

	/**
	 * КАТАЛОГ КЛИНИЧЕСКИХ ПАМЯТОК ПОСЛЕ ЛЕЧЕНИЯ ДЛЯ ПАЦИЕНТОВ
	 */
	static getClinicalCareInstruction(topic: string): ClinicalCareInstruction {
		return getClinicalCareInstruction(topic);
	}

	/**
	 * Подключение и верификация Telegram-бота клиники.
	 */
	static async connectBot(params: ConnectBotParams): Promise<ConnectBotResult> {
		const trimmedToken = params.botToken.trim();
		if (!trimmedToken) {
			return { ok: false, error: "Токен бота не может быть пустым." };
		}

		// 1. Верификация токена через getMe
		const verifyResult = await this.verifyBotToken(trimmedToken);
		if (!verifyResult.ok || !verifyResult.username) {
			return {
				ok: false,
				error: verifyResult.error || "Не удалось верифицировать токен в Telegram Bot API. Проверьте правильность токена от @BotFather.",
			};
		}

		// 2. Шифрование токена с tenant AAD
		const encryptedToken = TelegramTokenCrypto.encryptToken(
			trimmedToken,
			params.organizationId,
		);

		const botConfigId = params.botConfigId || "default";
		const now = new Date();

		// 3. Проверяем наличие записи
		const [existing] = await db
			.select()
			.from(denteTelegramBotConfigs)
			.where(
				and(
					eq(denteTelegramBotConfigs.organizationId, params.organizationId),
					eq(denteTelegramBotConfigs.botConfigId, botConfigId),
				),
			)
			.limit(1);

		let webhookReady = false;

		// 4. Настройка команд бота
		try {
			await this.setBotCommands(trimmedToken, DEFAULT_PATIENT_BOT_COMMANDS);
		} catch {
			// Не блокируем подключение при сбое установки команд
		}

		// 5. Настройка вебхука при наличии базового URL
		const webhookUrl = params.webhookBaseUrl
			? `${params.webhookBaseUrl.replace(/\/+$/, "")}/api/telegram/webhook`
			: null;

		if (webhookUrl) {
			const webhookRes = await this.setupWebhook({
				botToken: trimmedToken,
				webhookUrl,
			});
			webhookReady = webhookRes.ok;
		}

		if (existing) {
			await db
				.update(denteTelegramBotConfigs)
				.set({
					clinicId: params.clinicId ?? existing.clinicId,
					mode: "clinic_owned_bot",
					botUsername: verifyResult.username,
					ownBotUsername: verifyResult.username,
					tokenSecretRef: encryptedToken,
					webhookBaseUrl: webhookUrl || existing.webhookBaseUrl,
					isActive: true,
					updatedAt: now,
				})
				.where(eq(denteTelegramBotConfigs.id, existing.id));
		} else {
			await db.insert(denteTelegramBotConfigs).values({
				organizationId: params.organizationId,
				clinicId: params.clinicId ?? null,
				botConfigId,
				mode: "clinic_owned_bot",
				botUsername: verifyResult.username,
				ownBotUsername: verifyResult.username,
				tokenSecretRef: encryptedToken,
				webhookBaseUrl: webhookUrl,
				isActive: true,
				updatedAt: now,
				createdAt: now,
			});
		}

		// 6. Регистрация в пуле инстансов
		TelegramBotInstancePool.registerInstance({
			organizationId: params.organizationId,
			clinicId: params.clinicId ?? null,
			botConfigId,
			botToken: trimmedToken,
			botUsername: verifyResult.username,
			mode: "clinic_owned_bot",
			status: webhookReady ? "webhook" : "running",
			webhookUrl,
			lastHealthCheck: now,
			startedAt: now,
		});

		return {
			ok: true,
			bot: {
				username: verifyResult.username,
				firstName: verifyResult.firstName || "Telegram Bot",
				maskedToken: TelegramTokenCrypto.maskToken(trimmedToken),
				mode: "clinic_owned_bot",
				webhookReady,
			},
		};
	}

	/**
	 * Получение статуса бота клиники.
	 */
	static async getBotStatus(
		params: GetBotStatusParams,
	): Promise<GetBotStatusResult> {
		const botConfigId = params.botConfigId || "default";

		const [config] = await db
			.select()
			.from(denteTelegramBotConfigs)
			.where(
				and(
					eq(denteTelegramBotConfigs.organizationId, params.organizationId),
					eq(denteTelegramBotConfigs.botConfigId, botConfigId),
					eq(denteTelegramBotConfigs.isActive, true),
				),
			)
			.limit(1);

		if (!config || config.mode === "disabled" || !config.tokenSecretRef) {
			return {
				ok: true,
				connected: false,
				bot: null,
			};
		}

		let maskedToken: string | null = null;
		try {
			const rawToken = TelegramTokenCrypto.resolveOperationalToken(
				config.tokenSecretRef,
				params.organizationId,
			);
			maskedToken = TelegramTokenCrypto.maskToken(rawToken);
		} catch {
			maskedToken = TelegramTokenCrypto.maskToken(config.tokenSecretRef);
		}

		return {
			ok: true,
			connected: true,
			bot: {
				username: config.botUsername || config.ownBotUsername || null,
				firstName: "Telegram Bot",
				maskedToken,
				mode: config.mode,
				webhookReady: Boolean(config.webhookBaseUrl),
			},
		};
	}

	/**
	 * Отключение Telegram-бота клиники.
	 */
	static async disconnectBot(
		params: DisconnectBotParams,
	): Promise<DisconnectBotResult> {
		const botConfigId = params.botConfigId || "default";

		await db
			.update(denteTelegramBotConfigs)
			.set({
				mode: "disabled",
				isActive: false,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(denteTelegramBotConfigs.organizationId, params.organizationId),
					eq(denteTelegramBotConfigs.botConfigId, botConfigId),
				),
			);

		TelegramBotInstancePool.unregisterInstance(params.organizationId, botConfigId);

		return { ok: true };
	}

	/**
	 * Тестирование подключения Telegram-бота.
	 */
	static async testBotConnection(
		params: TestBotConnectionParams,
	): Promise<TestBotConnectionResult> {
		let token = params.botToken ? params.botToken.trim() : "";

		if (!token) {
			const botConfigId = params.botConfigId || "default";
			const [config] = await db
				.select({ tokenSecretRef: denteTelegramBotConfigs.tokenSecretRef })
				.from(denteTelegramBotConfigs)
				.where(
					and(
						eq(denteTelegramBotConfigs.organizationId, params.organizationId),
						eq(denteTelegramBotConfigs.botConfigId, botConfigId),
					),
				)
				.limit(1);

			if (!config?.tokenSecretRef) {
				return {
					ok: false,
					error: "Токен бота не настроен. Сначала укажите токен от @BotFather.",
				};
			}

			const resolved = TelegramTokenCrypto.resolveOperationalToken(
				config.tokenSecretRef,
				params.organizationId,
			);
			token = resolved || "";
		}

		if (!token) {
			return { ok: false, error: "Не удалось получить токен бота." };
		}

		const botMe = await this.verifyBotToken(token);
		if (!botMe.ok) {
			return {
				ok: false,
				bot: botMe,
				error: botMe.error || "Не удалось проверить статус бота в Telegram.",
			};
		}

		const webhookInfo = await this.getWebhookInfo(token);

		return {
			ok: true,
			bot: botMe,
			webhook: webhookInfo,
		};
	}
}
