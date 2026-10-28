import type {
	DenteTelegramFeature,
	DenteTelegramPrivacyMode,
	DenteTelegramVisualCardUrls,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
} from "@dental/shared";
import {
	denteAdminSecretRequestHeaders,
	normalizeTelegramBotUsernameDraft,
	normalizeTelegramPublicHttpsUrlDraft,
	normalizeTelegramVisualCardUrlDraftsForSave,
	telegramHumanMessage,
} from "../../AppHelpers.js";
import {
	defaultTelegramPostVisitCheckupDelayDrafts,
	defaultTelegramPostVisitCheckupDelayHoursByTopic,
	type TelegramPostVisitCheckupDelayDrafts,
	telegramFeatureLabels,
	telegramPostVisitCheckupDelayFields,
} from "../../workspaceStaticOptions.js";

/**
 * Парсинг и нормализация настроек напоминаний и пост-визитных чекапов.
 */
export function parseTelegramPostVisitCheckupDelayHours(
	drafts: TelegramPostVisitCheckupDelayDrafts,
): DenteTelegramPostVisitCheckupDelayHoursByTopic {
	const values = { ...defaultTelegramPostVisitCheckupDelayHoursByTopic };
	for (const field of telegramPostVisitCheckupDelayFields) {
		const parsed = Number.parseInt(drafts[field.key], 10);
		values[field.key] = Number.isFinite(parsed)
			? Math.max(1, Math.min(720, parsed))
			: defaultTelegramPostVisitCheckupDelayHoursByTopic[field.key];
	}
	return values;
}

export function normalizeTelegramPostVisitCheckupDelayDrafts(
	values: DenteTelegramPostVisitCheckupDelayHoursByTopic,
): TelegramPostVisitCheckupDelayDrafts {
	const normalized = { ...defaultTelegramPostVisitCheckupDelayDrafts };
	for (const field of telegramPostVisitCheckupDelayFields) {
		normalized[field.key] = String(
			values[field.key] ??
				defaultTelegramPostVisitCheckupDelayDrafts[field.key],
		);
	}
	return normalized;
}

/**
 * Утилиты валидации и парсинга токенов, TTL и интервалов для Telegram.
 */
export function parseTelegramLinkTtlMinutes(tokenTtlDraft: string): number {
	const parsed = Number.parseInt(tokenTtlDraft, 10);
	if (!Number.isFinite(parsed)) return 15;
	return Math.min(1440, Math.max(5, parsed));
}

export function parseTelegramReminderLeadTimesHours(reminderLeadTimesDraft: string): number[] {
	const values = reminderLeadTimesDraft
		.split(/[,\s;]+/)
		.map((item) => Number.parseInt(item, 10))
		.filter((item) => Number.isFinite(item) && item >= 1 && item <= 168);
	const unique = [...new Set(values)] as number[];
	unique.sort((left, right) => right - left);
	return unique.length ? unique.slice(0, 6) : [24];
}

export function parseTelegramReviewRequestDelayHours(reviewRequestDelayDraft: string): number {
	const parsed = Number.parseInt(reviewRequestDelayDraft, 10);
	if (!Number.isFinite(parsed)) return 2;
	return Math.min(720, Math.max(1, parsed));
}

export function telegramFeatureLabel(value: DenteTelegramFeature | string): string {
	return (
		telegramFeatureLabels[value as DenteTelegramFeature] ??
		telegramHumanMessage(value)
	);
}

export function createTelegramControlPlaneHeaders(
	extra: Record<string, string> = {},
	adminSecretOverride?: string | null | undefined,
	settingsAdminSecretSession?: string | null | undefined,
): Record<string, string> {
	return denteAdminSecretRequestHeaders(
		extra,
		adminSecretOverride || settingsAdminSecretSession || undefined,
	);
}

export interface PreparedTelegramSettingsSave {
	payload: {
		mode: string;
		botUsername: string | null;
		ownBotUsername: string | null;
		webhookBaseUrl: string | null;
		patientPortalBaseUrl: string | null;
		welcomeImageUrl: string | null;
		visualCardUrls: DenteTelegramVisualCardUrls;
		clinicReviewUrl: string | null;
		clinicMapsUrl: string | null;
		enabledFeatures: DenteTelegramFeature[];
		patientLinkTokenTtlMinutes: number;
		appointmentReminderLeadTimesHours: number[];
		reviewRequestDelayHours: number;
		postVisitCheckupDelayHoursByTopic: DenteTelegramPostVisitCheckupDelayHoursByTopic;
		allowVoiceIntake: boolean;
		staffEscalationChannel: string | null;
		privacyMode: DenteTelegramPrivacyMode;
	};
	normalizedDrafts: {
		tokenTtl: string;
		reminderLeadTimes: string;
		reviewRequestDelay: string;
		postVisitCheckupDelays: TelegramPostVisitCheckupDelayDrafts;
		botUsername: string;
		ownBotUsername: string;
		webhookBaseUrl: string;
		patientPortalBaseUrl: string;
		welcomeImageUrl: string;
		visualCardUrls: DenteTelegramVisualCardUrls;
		reviewUrl: string;
		mapsUrl: string;
	};
}

export function prepareTelegramSettingsSave(drafts: {
	mode: string;
	privacyMode: DenteTelegramPrivacyMode;
	tokenTtl: string;
	reminderLeadTimes: string;
	reviewRequestDelay: string;
	postVisitCheckupDelays: TelegramPostVisitCheckupDelayDrafts;
	botUsername: string;
	ownBotUsername: string;
	webhookBaseUrl: string;
	patientPortalBaseUrl: string;
	welcomeImageUrl: string;
	visualCardUrls: DenteTelegramVisualCardUrls;
	reviewUrl: string;
	mapsUrl: string;
	enabledFeatures: DenteTelegramFeature[];
	allowVoiceIntake: boolean;
	staffEscalationChannel: string;
}): PreparedTelegramSettingsSave {
	const patientLinkTokenTtlMinutes = parseTelegramLinkTtlMinutes(drafts.tokenTtl);
	const appointmentReminderLeadTimesHours = parseTelegramReminderLeadTimesHours(drafts.reminderLeadTimes);
	const reviewRequestDelayHours = parseTelegramReviewRequestDelayHours(drafts.reviewRequestDelay);
	const postVisitCheckupDelayHoursByTopic = parseTelegramPostVisitCheckupDelayHours(drafts.postVisitCheckupDelays);
	const normalizedPostVisitCheckupDelayDrafts = normalizeTelegramPostVisitCheckupDelayDrafts(postVisitCheckupDelayHoursByTopic);

	const botUsername = normalizeTelegramBotUsernameDraft("Общий бот", drafts.botUsername);
	const ownBotUsername = normalizeTelegramBotUsernameDraft("Бот клиники", drafts.ownBotUsername);
	const webhookBaseUrl = normalizeTelegramPublicHttpsUrlDraft("Адрес приема сообщений Telegram", drafts.webhookBaseUrl);
	const patientPortalBaseUrl = normalizeTelegramPublicHttpsUrlDraft("Портал пациента", drafts.patientPortalBaseUrl);
	const welcomeImageUrl = normalizeTelegramPublicHttpsUrlDraft("Картинка приветствия", drafts.welcomeImageUrl);
	const visualCardUrls = normalizeTelegramVisualCardUrlDraftsForSave(drafts.visualCardUrls);
	const clinicReviewUrl = normalizeTelegramPublicHttpsUrlDraft("Ссылка на отзыв", drafts.reviewUrl);
	const clinicMapsUrl = normalizeTelegramPublicHttpsUrlDraft("Ссылка на карту", drafts.mapsUrl);

	return {
		payload: {
			mode: drafts.mode,
			botUsername,
			ownBotUsername,
			webhookBaseUrl,
			patientPortalBaseUrl,
			welcomeImageUrl,
			visualCardUrls,
			clinicReviewUrl,
			clinicMapsUrl,
			enabledFeatures: drafts.enabledFeatures,
			patientLinkTokenTtlMinutes,
			appointmentReminderLeadTimesHours,
			reviewRequestDelayHours,
			postVisitCheckupDelayHoursByTopic,
			allowVoiceIntake: drafts.allowVoiceIntake,
			staffEscalationChannel: drafts.staffEscalationChannel.trim() || null,
			privacyMode: drafts.privacyMode,
		},
		normalizedDrafts: {
			tokenTtl: String(patientLinkTokenTtlMinutes),
			reminderLeadTimes: appointmentReminderLeadTimesHours.join(", "),
			reviewRequestDelay: String(reviewRequestDelayHours),
			postVisitCheckupDelays: normalizedPostVisitCheckupDelayDrafts,
			botUsername: botUsername ?? "",
			ownBotUsername: ownBotUsername ?? "",
			webhookBaseUrl: webhookBaseUrl ?? "",
			patientPortalBaseUrl: patientPortalBaseUrl ?? "",
			welcomeImageUrl: welcomeImageUrl ?? "",
			visualCardUrls,
			reviewUrl: clinicReviewUrl ?? "",
			mapsUrl: clinicMapsUrl ?? "",
		},
	};
}
