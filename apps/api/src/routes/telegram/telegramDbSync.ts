import type {
	DenteTelegramBotSettings,
	DenteTelegramChatLink,
	DenteTelegramFeature,
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import type { FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { hydrateDomainStateFromDb } from "../../db/domainStateHydration.js";
import { denteTelegramBotConfigs } from "../../db/schema/communications/channelsSchema.js";
import type { DomainState } from "./telegramCanonicalStore.js";
import {
	inMemoryDomainState,
	normalizePostVisitCheckupDelayHoursByTopic,
} from "./telegramCanonicalStore.js";
import { normalizeDenteTelegramVisualCardUrls } from "./telegramUrlHelpers.js";
import { isDbConnectionError } from "../../services/telegram/TelegramReferralLoyaltyService.js";
import { upsertDenteTelegramChatLink } from "../../telegram/chatLinks.js";
import type { TelegramRuntimeContext } from "./types.js";

/**
 * Загружает срез клиники из базы (или возвращает in-memory при in-memory режиме)
 * и передает его в построители очереди отправок Telegram.
 */
export async function hydrateTelegramDomainState(
	_request: FastifyRequest,
	organizationId: string,
): Promise<DomainState> {
	try {
		const { state } = await hydrateDomainStateFromDb(organizationId);
		return state;
	} catch (err) {
		if (
			isDbConnectionError(err) &&
			(process.env.NODE_ENV === "test" || !process.env.DATABASE_URL)
		) {
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
): Promise<void> {
	try {
		const orgId = settings.organizationId;
		const configId =
			settings.mode === "clinic_owned_bot"
				? `clinic_owned_bot:${orgId}:${(settings.ownBotUsername ?? "unconfigured").toLowerCase()}`
				: settings.mode === "disabled"
					? `disabled:${orgId}`
					: `shared_dente_bot:${orgId}`;

		const [existing] = await db
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
			await db
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
				.where(eq(denteTelegramBotConfigs.id, existing.id));
		} else {
			await db.insert(denteTelegramBotConfigs).values({
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
	} catch (err) {
		if (
			isDbConnectionError(err) &&
			(process.env.NODE_ENV === "test" || !process.env.DATABASE_URL)
		) {
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
): Promise<DenteTelegramBotSettings | null> {
	try {
		const [row] = await db
			.select()
			.from(denteTelegramBotConfigs)
			.where(
				and(
					eq(denteTelegramBotConfigs.organizationId, organizationId),
					eq(denteTelegramBotConfigs.isActive, true),
				),
			)
			.limit(1);

		if (!row) return null;

		let enabledFeatures: DenteTelegramFeature[] = [];
		try {
			const parsed = JSON.parse(row.enabledFeaturesJson);
			if (Array.isArray(parsed)) {
				enabledFeatures = parsed as DenteTelegramFeature[];
			}
		} catch {
			enabledFeatures = [];
		}

		let reminderHours: number[] = [24];
		try {
			const parsed = JSON.parse(row.appointmentReminderLeadTimesHoursJson);
			if (Array.isArray(parsed)) {
				reminderHours = parsed as number[];
			}
		} catch {
			reminderHours = [24];
		}

		let postVisitDelays: Record<string, number> = {};
		try {
			const parsed = JSON.parse(row.postVisitCheckupDelayHoursJson);
			if (parsed && typeof parsed === "object") {
				postVisitDelays = parsed as Record<string, number>;
			}
		} catch {
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
		if (
			isDbConnectionError(err) &&
			(process.env.NODE_ENV === "test" || !process.env.DATABASE_URL)
		) {
			return null;
		}
		throw err;
	}
}
