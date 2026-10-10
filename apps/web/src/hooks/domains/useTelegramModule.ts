import { useTelegramSettings } from "../useTelegramSettings";
import {
	useTelegramBotSettings,
	useTelegramBroadcastCampaigns,
	useTelegramPatientNotifications,
} from "./telegramModule";
import type {
	UseTelegramModuleOptions,
	UseTelegramModuleResult,
} from "./telegramModule/types";

export type { UseTelegramModuleOptions };

/** Canonical facade for useTelegramModule decomposed under Mandate 8b into ./telegramModule/ */
export function useTelegramModule(
	options: UseTelegramModuleOptions,
): UseTelegramModuleResult {
	const telegramSettingsModule = useTelegramSettings({
		apiFetch: null,
		setError: options.setError,
		settingsAdminSecretSession: options.settingsAdminSecretSession || undefined,
		loadDashboard: options.loadDashboard,
	});

	const botSettings = useTelegramBotSettings({
		...options,
		telegramSettingsModule,
	});
	const { telegramOutboxActionQueryString } = botSettings;

	const notifications = useTelegramPatientNotifications({
		dashboard: options.dashboard,
		activePatient: options.activePatient,
		activeDoctor: options.activeDoctor,
		activeAppointment: options.activeAppointment,
		setError: options.setError,
		telegramControlPlaneHeaders: telegramSettingsModule.telegramControlPlaneHeaders,
		loadTelegramControlPlane: telegramSettingsModule.loadTelegramControlPlane,
		parseTelegramLinkTtlMinutes: telegramSettingsModule.parseTelegramLinkTtlMinutes,
		telegramLinkCodeLedgerRequestParams: telegramSettingsModule.telegramLinkCodeLedgerRequestParams,
		telegramChatLinkLedgerRequestParams: telegramSettingsModule.telegramChatLinkLedgerRequestParams,
		telegramOutboxActionQueryString,
	});

	const broadcasts = useTelegramBroadcastCampaigns({
		loadDashboard: options.loadDashboard,
		setError: options.setError,
		telegramControlPlaneHeaders: telegramSettingsModule.telegramControlPlaneHeaders,
		loadTelegramControlPlane: telegramSettingsModule.loadTelegramControlPlane,
		telegramOutboxRequestParams: telegramSettingsModule.telegramOutboxRequestParams,
		telegramOutboxActionQueryString,
	});

	return {
		telegramSettingsModule,
		loadMoreTelegramOutbox: broadcasts.loadMoreTelegramOutbox,
		loadMoreTelegramLinkCodes: notifications.loadMoreTelegramLinkCodes,
		loadMoreTelegramChatLinks: notifications.loadMoreTelegramChatLinks,
		createTelegramLinkCode: notifications.createTelegramLinkCode,
		copyTelegramTextToClipboard: notifications.copyTelegramTextToClipboard,
		downloadTelegramQrSvg: notifications.downloadTelegramQrSvg,
		revokeTelegramChatLink: notifications.revokeTelegramChatLink,
		previewTelegramTemplate: notifications.previewTelegramTemplate,
		sendTelegramOutboxItem: broadcasts.sendTelegramOutboxItem,
		sendDueTelegramOutbox: broadcasts.sendDueTelegramOutbox,
	};
}
