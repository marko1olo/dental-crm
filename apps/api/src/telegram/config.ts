import type {
	DenteTelegramBotSettings,
	UpdateDenteTelegramBotSettingsInput,
} from "@dental/shared";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { denteTelegramBotConfigs } from "../db/schema.js";

// We'll assume a default single bot config for now since it's an MVP
const DEFAULT_BOT_CONFIG_ID = "default";

export async function getDenteTelegramBotSettings(
	organizationId: string,
): Promise<DenteTelegramBotSettings> {
	const [config] = await db
		.select()
		.from(denteTelegramBotConfigs)
		.where(eq(denteTelegramBotConfigs.organizationId, organizationId))
		.limit(1);

	if (!config) {
		return {
			version: 1,
			organizationId,
			mode: "disabled",
			botUsername: null,
			ownBotUsername: null,
			webhookBaseUrl: null,
			patientPortalBaseUrl: null,
			welcomeImageUrl: null,
			visualCardUrls: {
				mainMenu: null,
				appointment: null,
				documents: null,
				tax: null,
				billing: null,
				care: null,
				review: null,
				staff: null,
			},
			clinicReviewUrl: null,
			clinicMapsUrl: null,
			enabledFeatures: [],
			patientLinkTokenTtlMinutes: 120,
			appointmentReminderLeadTimesHours: [24],
			reviewRequestDelayHours: 2,
			postVisitCheckupDelayHoursByTopic: {
				extraction: 24,
				implantation: 24,
				filling_restoration: 48,
				endo: 48,
				surgery: 24,
				local_anesthesia: 24,
				hygiene: 72,
				prosthetics: 48,
				orthodontics: 72,
				periodontology: 72,
				other: 48,
			},
			allowVoiceIntake: false,
			privacyMode: "no_phi_by_default",
			staffEscalationChannel: null,
			updatedAt: new Date().toISOString(),
		};
	}

	return {
		version: 1,
		organizationId: config.organizationId,
		mode: config.mode as "disabled" | "shared_dente_bot" | "clinic_owned_bot",
		botUsername: config.botUsername,
		ownBotUsername: config.ownBotUsername,
		webhookBaseUrl: config.webhookBaseUrl,
		patientPortalBaseUrl: config.patientPortalBaseUrl,
		welcomeImageUrl: config.welcomeImageUrl,
		visualCardUrls: config.visualCardUrls ?? {
			mainMenu: null,
			appointment: null,
			documents: null,
			tax: null,
			billing: null,
			care: null,
			review: null,
			staff: null,
		},
		clinicReviewUrl: config.clinicReviewUrl,
		clinicMapsUrl: config.clinicMapsUrl,
		enabledFeatures: JSON.parse(config.enabledFeaturesJson) as any[],
		patientLinkTokenTtlMinutes: config.patientLinkTokenTtlMinutes,
		appointmentReminderLeadTimesHours: JSON.parse(
			config.appointmentReminderLeadTimesHoursJson,
		) as number[],
		reviewRequestDelayHours: config.reviewRequestDelayHours,
		postVisitCheckupDelayHoursByTopic: JSON.parse(
			config.postVisitCheckupDelayHoursJson,
		),
		allowVoiceIntake: config.allowVoiceIntake,
		privacyMode: config.privacyMode as
			| "no_phi_by_default"
			| "limited_admin_only"
			| "consented_phi_templates",
		staffEscalationChannel: config.staffEscalationChannel,
		updatedAt: config.updatedAt.toISOString(),
	};
}

export async function updateDenteTelegramBotSettings(
	organizationId: string,
	input: UpdateDenteTelegramBotSettingsInput,
): Promise<DenteTelegramBotSettings> {
	const existingConfig = await getDenteTelegramBotSettings(organizationId);

	// Here we only update fields that were provided
	const updatedSettings: DenteTelegramBotSettings = {
		...existingConfig,
		...(input as any),
		visualCardUrls: {
			...existingConfig.visualCardUrls,
			...(input.visualCardUrls ?? {}),
		},
	};

	const [existing] = await db
		.select()
		.from(denteTelegramBotConfigs)
		.where(eq(denteTelegramBotConfigs.organizationId, organizationId))
		.limit(1);

	if (existing) {
		await db
			.update(denteTelegramBotConfigs)
			.set({
				mode: updatedSettings.mode,
				botUsername: updatedSettings.botUsername,
				ownBotUsername: updatedSettings.ownBotUsername,
				webhookBaseUrl: updatedSettings.webhookBaseUrl,
				patientPortalBaseUrl: updatedSettings.patientPortalBaseUrl,
				welcomeImageUrl: updatedSettings.welcomeImageUrl,
				visualCardUrls: updatedSettings.visualCardUrls,
				clinicReviewUrl: updatedSettings.clinicReviewUrl,
				clinicMapsUrl: updatedSettings.clinicMapsUrl,
				privacyMode: updatedSettings.privacyMode,
				enabledFeaturesJson: JSON.stringify(updatedSettings.enabledFeatures),
				patientLinkTokenTtlMinutes: updatedSettings.patientLinkTokenTtlMinutes,
				appointmentReminderLeadTimesHoursJson: JSON.stringify(
					updatedSettings.appointmentReminderLeadTimesHours,
				),
				reviewRequestDelayHours: updatedSettings.reviewRequestDelayHours,
				postVisitCheckupDelayHoursJson: JSON.stringify(
					updatedSettings.postVisitCheckupDelayHoursByTopic,
				),
				allowVoiceIntake: updatedSettings.allowVoiceIntake,
				staffEscalationChannel: updatedSettings.staffEscalationChannel,
			})
			.where(eq(denteTelegramBotConfigs.id, existing.id));
	} else {
		await db.insert(denteTelegramBotConfigs).values({
			organizationId,
			botConfigId: DEFAULT_BOT_CONFIG_ID,
			mode: updatedSettings.mode,
			botUsername: updatedSettings.botUsername,
			ownBotUsername: updatedSettings.ownBotUsername,
			webhookBaseUrl: updatedSettings.webhookBaseUrl,
			patientPortalBaseUrl: updatedSettings.patientPortalBaseUrl,
			welcomeImageUrl: updatedSettings.welcomeImageUrl,
			visualCardUrls: updatedSettings.visualCardUrls,
			clinicReviewUrl: updatedSettings.clinicReviewUrl,
			clinicMapsUrl: updatedSettings.clinicMapsUrl,
			privacyMode: updatedSettings.privacyMode,
			enabledFeaturesJson: JSON.stringify(updatedSettings.enabledFeatures),
			patientLinkTokenTtlMinutes: updatedSettings.patientLinkTokenTtlMinutes,
			appointmentReminderLeadTimesHoursJson: JSON.stringify(
				updatedSettings.appointmentReminderLeadTimesHours,
			),
			reviewRequestDelayHours: updatedSettings.reviewRequestDelayHours,
			postVisitCheckupDelayHoursJson: JSON.stringify(
				updatedSettings.postVisitCheckupDelayHoursByTopic,
			),
			allowVoiceIntake: updatedSettings.allowVoiceIntake,
			staffEscalationChannel: updatedSettings.staffEscalationChannel,
		});
	}

	return updatedSettings;
}
