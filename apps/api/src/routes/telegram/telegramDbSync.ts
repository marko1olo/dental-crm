import {
	denteTelegramFeatureSchema,
	type DenteTelegramBotSettings,
	type DenteTelegramChatLink,
	type DenteTelegramFeature,
	type DenteTelegramVisualCardUrls,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { hydrateDomainStateFromDb } from "../../db/domainStateHydration.js";
import { withTenantCtx } from "../../db/rls.js";
import { denteTelegramBotConfigs } from "../../db/schema/communications/channelsSchema.js";
import { createApiLogger } from "../../observability/logger.js";
import { isDbConnectionError } from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { upsertDenteTelegramChatLink } from "../../telegram/chatLinks.js";
import type { DomainState } from "./telegramCanonicalStore.js";
import {
	inMemoryDomainState,
	normalizePostVisitCheckupDelayHoursByTopic,
} from "./telegramCanonicalStore.js";
import { normalizeDenteTelegramVisualCardUrls } from "./telegramUrlHelpers.js";
import type { TelegramRuntimeContext } from "./types.js";

const logger = createApiLogger("telegramDbSync");

export interface TelegramDbSyncOptions {
	/**
	 * Явный DI-флаг для тестов: разрешает fallback в `inMemoryDomainState` при ошибке БД.
	 */
	inMemoryFallback?: boolean | undefined;
}

export function isTelegramInMemoryMode(inMemoryFallbackOverride?: boolean): boolean {
	if (typeof inMemoryFallbackOverride === "boolean") {
		return inMemoryFallbackOverride;
	}
	return process.env.DENTAL_STATE_PERSISTENCE === "off" || !process.env.DATABASE_URL;
}

const telegramFeaturesArraySchema = z.array(denteTelegramFeatureSchema);

const reminderHoursArraySchema = z.array(z.number());
const postVisitDelaysRecordSchema = z.record(z.string(), z.number());

/**
 * Загружает срез клиники из базы (или возвращает in-memory при in-memory режиме)
 * и передает его в построители очереди отправок Telegram.
 */
export async function hydrateTelegramDomainState(
	request: FastifyRequest,
	organizationId: string,
	options?: TelegramDbSyncOptions,
): Promise<DomainState> {
	try {
		const { state } = await hydrateDomainStateFromDb(organizationId);
		return state;
	} catch (err) {
		if (isDbConnectionError(err) && isTelegramInMemoryMode(options?.inMemoryFallback)) {
			request.log.warn(
				{ err, organizationId },
				"[Telegram] DB unavailable in in-memory mode; falling back to inMemoryDomainState",
			);
			return inMemoryDomainState;
		}
		throw err;
	}
}

/**
 * Переносит только что созданную связку чата в таблицу `dente_telegram_chat_links`.
 */
export async function persistTelegramChatLinkToDatabase(
	request: FastifyRequest,
	runtime: TelegramRuntimeContext,
	chatLink: DenteTelegramChatLink,
): Promise<void> {
	try {
		await upsertDenteTelegramChatLink({
			organizationId: runtime.organizationId,
			clinicId: chatLink.clinicId ?? runtime.clinicId,
			botConfigId: runtime.botConfigId,
			subjectType: chatLink.subjectType,
			subjectId: chatLink.subjectId,
			chatFingerprint: chatLink.chatFingerprint,
			chatTransportRef: chatLink.chatTransportRef ?? null,
			chatIdLast4: chatLink.chatIdLast4 ?? null,
		});
	} catch (error) {
		request.log.error(
			{
				err: error,
				organizationId: runtime.organizationId,
				subjectType: chatLink.subjectType,
			},
			"[Telegram] Связка чата не записана в базу: напоминания этому пациенту не уйдут",
		);
	}
}

/**
 * Сохраняет канонические настройки Telegram бота в таблицу `dente_telegram_bot_configs`.
 */
export async function persistTelegramBotSettingsToDatabase(
	settings: DenteTelegramBotSettings,
	clinicId?: string | null,
	options?: TelegramDbSyncOptions,
): Promise<void> {
	try {
		const orgId = settings.organizationId;
		const configId =
			settings.mode === "clinic_owned_bot"
				? `clinic_owned_bot:${orgId}:${(settings.ownBotUsername ?? "unconfigured").toLowerCase()}`
				: settings.mode === "disabled"
					? `disabled:${orgId}`
					: `shared_dente_bot:${orgId}`;

		await withTenantCtx(orgId, async (tx) => {
			const [existing] = await tx
				.select({ id: denteTelegramBotConfigs.id })
				.from(denteTelegramBotConfigs)
				.where(
					and(
						eq(denteTelegramBotConfigs.organizationId, orgId),
						eq(denteTelegramBotConfigs.botConfigId, configId),
					),
				)
				.limit(1);

			if (existing) {
				await tx
					.update(denteTelegramBotConfigs)
					.set({
						mode: settings.mode,
						botUsername: settings.botUsername,
						ownBotUsername: settings.ownBotUsername,
						webhookBaseUrl: settings.webhookBaseUrl,
						patientPortalBaseUrl: settings.patientPortalBaseUrl,
						welcomeImageUrl: settings.welcomeImageUrl,
						visualCardUrls: settings.visualCardUrls,
						clinicReviewUrl: settings.clinicReviewUrl,
						clinicMapsUrl: settings.clinicMapsUrl,
						enabledFeaturesJson: JSON.stringify(settings.enabledFeatures ?? []),
						patientLinkTokenTtlMinutes: settings.patientLinkTokenTtlMinutes,
						appointmentReminderLeadTimesHoursJson: JSON.stringify(
							settings.appointmentReminderLeadTimesHours ?? [24],
						),
						reviewRequestDelayHours: settings.reviewRequestDelayHours,
						postVisitCheckupDelayHoursJson: JSON.stringify(
							settings.postVisitCheckupDelayHoursByTopic ?? {},
						),
						allowVoiceIntake: settings.allowVoiceIntake,
						staffEscalationChannel: settings.staffEscalationChannel,
						privacyMode: settings.privacyMode,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(denteTelegramBotConfigs.id, existing.id),
							eq(denteTelegramBotConfigs.organizationId, orgId),
						),
					);
			} else {
				await tx.insert(denteTelegramBotConfigs).values({
					organizationId: orgId,
					clinicId: clinicId ?? null,
					botConfigId: configId,
					mode: settings.mode,
					botUsername: settings.botUsername,
					ownBotUsername: settings.ownBotUsername,
					webhookBaseUrl: settings.webhookBaseUrl,
					patientPortalBaseUrl: settings.patientPortalBaseUrl,
					welcomeImageUrl: settings.welcomeImageUrl,
					visualCardUrls: settings.visualCardUrls,
					clinicReviewUrl: settings.clinicReviewUrl,
					clinicMapsUrl: settings.clinicMapsUrl,
					enabledFeaturesJson: JSON.stringify(settings.enabledFeatures ?? []),
					patientLinkTokenTtlMinutes: settings.patientLinkTokenTtlMinutes,
					appointmentReminderLeadTimesHoursJson: JSON.stringify(
						settings.appointmentReminderLeadTimesHours ?? [24],
					),
					reviewRequestDelayHours: settings.reviewRequestDelayHours,
					postVisitCheckupDelayHoursJson: JSON.stringify(
						settings.postVisitCheckupDelayHoursByTopic ?? {},
					),
					allowVoiceIntake: settings.allowVoiceIntake,
					staffEscalationChannel: settings.staffEscalationChannel,
					privacyMode: settings.privacyMode,
					isActive: true,
				});
			}
		});
	} catch (err) {
		if (isDbConnectionError(err) && isTelegramInMemoryMode(options?.inMemoryFallback)) {
			logger.warn(
				{ err, organizationId: settings.organizationId },
				"[Telegram] DB unavailable while persisting bot settings in in-memory mode",
			);
			return;
		}
		throw err;
	}
}

/**
 * Загружает канонические настройки Telegram бота из таблицы `dente_telegram_bot_configs`.
 */
export async function loadTelegramBotSettingsFromDatabase(
	organizationId: string,
	options?: TelegramDbSyncOptions,
): Promise<DenteTelegramBotSettings | null> {
	try {
		const row = await withTenantCtx(organizationId, async (tx) => {
			const [found] = await tx
				.select()
				.from(denteTelegramBotConfigs)
				.where(
					and(
						eq(denteTelegramBotConfigs.organizationId, organizationId),
						eq(denteTelegramBotConfigs.isActive, true),
					),
				)
				.limit(1);
			return found ?? null;
		});

		if (!row) return null;

		let enabledFeatures: DenteTelegramFeature[] = [];
		try {
			const parsed = telegramFeaturesArraySchema.safeParse(JSON.parse(row.enabledFeaturesJson));
			if (parsed.success) {
				enabledFeatures = parsed.data;
			} else {
				logger.warn(
					{ organizationId, issue: parsed.error.issues[0]?.message ?? "invalid_schema" },
					"[Telegram] Invalid enabledFeaturesJson schema in DB, defaulting to empty array",
				);
			}
		} catch (err) {
			logger.warn(
				{ err, organizationId },
				"[Telegram] Failed to parse enabledFeaturesJson, defaulting to empty array",
			);
			enabledFeatures = [];
		}

		let reminderHours: number[] = [24];
		try {
			const parsed = reminderHoursArraySchema.safeParse(
				JSON.parse(row.appointmentReminderLeadTimesHoursJson),
			);
			if (parsed.success) {
				reminderHours = parsed.data;
			} else {
				logger.warn(
					{ organizationId, issue: parsed.error.issues[0]?.message ?? "invalid_schema" },
					"[Telegram] Invalid appointmentReminderLeadTimesHoursJson schema in DB, defaulting to [24]",
				);
			}
		} catch (err) {
			logger.warn(
				{ err, organizationId },
				"[Telegram] Failed to parse appointmentReminderLeadTimesHoursJson, defaulting to [24]",
			);
			reminderHours = [24];
		}

		let postVisitDelays: Record<string, number> = {};
		try {
			const parsed = postVisitDelaysRecordSchema.safeParse(
				JSON.parse(row.postVisitCheckupDelayHoursJson),
			);
			if (parsed.success) {
				postVisitDelays = parsed.data;
			} else {
				logger.warn(
					{ organizationId, issue: parsed.error.issues[0]?.message ?? "invalid_schema" },
					"[Telegram] Invalid postVisitCheckupDelayHoursJson schema in DB, defaulting to {}",
				);
			}
		} catch (err) {
			logger.warn(
				{ err, organizationId },
				"[Telegram] Failed to parse postVisitCheckupDelayHoursJson, defaulting to {}",
			);
			postVisitDelays = {};
		}

		const settings: DenteTelegramBotSettings = {
			version: 1,
			organizationId: row.organizationId,
			mode: row.mode,
			botUsername: row.botUsername ?? "dentecrm_bot",
			ownBotUsername: row.ownBotUsername,
			webhookBaseUrl: row.webhookBaseUrl,
			patientPortalBaseUrl: row.patientPortalBaseUrl,
			welcomeImageUrl: row.welcomeImageUrl,
			visualCardUrls: normalizeDenteTelegramVisualCardUrls(row.visualCardUrls),
			clinicReviewUrl: row.clinicReviewUrl,
			clinicMapsUrl: row.clinicMapsUrl,
			enabledFeatures,
			patientLinkTokenTtlMinutes: row.patientLinkTokenTtlMinutes,
			appointmentReminderLeadTimesHours: reminderHours,
			reviewRequestDelayHours: row.reviewRequestDelayHours,
			postVisitCheckupDelayHoursByTopic:
				normalizePostVisitCheckupDelayHoursByTopic(postVisitDelays),
			allowVoiceIntake: row.allowVoiceIntake,
			staffEscalationChannel: row.staffEscalationChannel,
			privacyMode: row.privacyMode,
			updatedAt: row.updatedAt
				? new Date(row.updatedAt).toISOString()
				: new Date().toISOString(),
		};
		return settings;
	} catch (err) {
		if (isDbConnectionError(err) && isTelegramInMemoryMode(options?.inMemoryFallback)) {
			logger.warn(
				{ err, organizationId },
				"[Telegram] DB unavailable while loading bot settings in in-memory mode",
			);
			return null;
		}
		throw err;
	}
}
