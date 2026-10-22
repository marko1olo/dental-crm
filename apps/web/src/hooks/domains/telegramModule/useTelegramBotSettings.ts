import { useEffect, useRef } from "react";
import type { DenteTelegramHandoffTarget } from "../../../AppConstants";
import {
	readDenteTelegramHandoffTarget,
	stripDenteTelegramHandoffQuery,
} from "../../../AppHelpers";
import { useSettingsStore } from "../../../store/settingsStore";
import { emptyTelegramVisualCardUrlDrafts } from "../../../utils/draftDefaults";
import { defaultTelegramPostVisitCheckupDelayHoursByTopic } from "../../../workspaceStaticOptions";
import { useTelegramSettings } from "../../useTelegramSettings";
import type {
	UseTelegramBotSettingsOptions,
	UseTelegramBotSettingsResult,
} from "./types";

export function useTelegramBotSettings({
	settingsAdminSecretSession,
	loadDashboard,
	setError,
	dashboard,
	currentView,
	settingsTab,
	onboardingDismissed,
	onboardingStep,
	uiPreferencesHydrated,
	setCurrentView,
	setSelectedDocumentKind,
	telegramSettingsModule: injectedTelegramSettingsModule,
}: UseTelegramBotSettingsOptions): UseTelegramBotSettingsResult {
	const initialTelegramHandoffTargetRef =
		useRef<DenteTelegramHandoffTarget | null>(readDenteTelegramHandoffTarget());
	const lastHydratedSettingsKeyRef = useRef<string | null>(null);
	const lastLoadedControlPlaneRef = useRef<boolean>(false);

	const {
		telegramBotConfigId,
		telegramModeDraft,
		setTelegramModeDraft,
		setTelegramBotUsernameDraft,
		setTelegramOwnBotUsernameDraft,
		setTelegramWebhookBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		setTelegramVisualCardUrlDrafts,
		setTelegramReviewUrlDraft,
		setTelegramMapsUrlDraft,
		setTelegramEnabledFeaturesDraft,
		setTelegramTokenTtlDraft,
		setTelegramReminderLeadTimesDraft,
		setTelegramReviewRequestDelayDraft,
		setTelegramPostVisitCheckupDelayDrafts,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramStaffEscalationChannelDraft,
		setTelegramPrivacyModeDraft,
		setTelegramSettingsSaveState,
		setTelegramSettingsSaveError,
		telegramSettingsDirty,
		telegramStatus,
		setTelegramHandoffNotice,
	} = useSettingsStore();

	const internalTelegramSettingsModule = useTelegramSettings({
		apiFetch: null,
		setError,
		settingsAdminSecretSession: settingsAdminSecretSession || undefined,
		loadDashboard,
	});

	const telegramSettingsModule =
		injectedTelegramSettingsModule ?? internalTelegramSettingsModule;

	const {
		saveTelegramSettings,
		loadTelegramControlPlane,
		normalizeTelegramPostVisitCheckupDelayDrafts,
	} = telegramSettingsModule;

	useEffect(() => {
		const settings = telegramStatus?.settings;
		if (!settings || telegramSettingsDirty) return;
		const key = `${settings.updatedAt || ""}_${settings.botUsername || ""}_${settings.mode}_${settings.ownBotUsername || ""}`;
		if (lastHydratedSettingsKeyRef.current === key) return;
		lastHydratedSettingsKeyRef.current = key;

		setTelegramModeDraft(settings.mode);
		setTelegramBotUsernameDraft(settings.botUsername ?? "");
		setTelegramOwnBotUsernameDraft(settings.ownBotUsername ?? "");
		setTelegramWebhookBaseUrlDraft(settings.webhookBaseUrl ?? "");
		setTelegramPatientPortalBaseUrlDraft(settings.patientPortalBaseUrl ?? "");
		setTelegramWelcomeImageUrlDraft(settings.welcomeImageUrl ?? "");
		setTelegramVisualCardUrlDrafts({
			...emptyTelegramVisualCardUrlDrafts(),
			...(settings.visualCardUrls ?? {}),
		});
		setTelegramReviewUrlDraft(settings.clinicReviewUrl ?? "");
		setTelegramMapsUrlDraft(settings.clinicMapsUrl ?? "");
		setTelegramEnabledFeaturesDraft(settings.enabledFeatures);
		setTelegramTokenTtlDraft(String(settings.patientLinkTokenTtlMinutes));
		setTelegramReminderLeadTimesDraft(
			(settings.appointmentReminderLeadTimesHours?.length
				? settings.appointmentReminderLeadTimesHours
				: [24]
			).join(", "),
		);
		setTelegramReviewRequestDelayDraft(
			String(settings.reviewRequestDelayHours ?? 2),
		);
		setTelegramPostVisitCheckupDelayDrafts(
			normalizeTelegramPostVisitCheckupDelayDrafts(
				settings.postVisitCheckupDelayHoursByTopic ??
					defaultTelegramPostVisitCheckupDelayHoursByTopic,
			),
		);
		setTelegramAllowVoiceIntakeDraft(settings.allowVoiceIntake);
		setTelegramStaffEscalationChannelDraft(
			settings.staffEscalationChannel ?? "",
		);
		setTelegramPrivacyModeDraft(settings.privacyMode);
		setTelegramSettingsSaveState("idle");
		setTelegramSettingsSaveError(null);
	}, [
		telegramStatus?.settings?.updatedAt,
		telegramSettingsDirty,
		setTelegramStaffEscalationChannelDraft,
		telegramStatus?.settings,
		setTelegramBotUsernameDraft,
		setTelegramTokenTtlDraft,
		setTelegramVisualCardUrlDrafts,
		setTelegramWebhookBaseUrlDraft,
		setTelegramSettingsSaveState,
		setTelegramWelcomeImageUrlDraft,
		setTelegramSettingsSaveError,
		setTelegramReviewUrlDraft,
		setTelegramReviewRequestDelayDraft,
		setTelegramReminderLeadTimesDraft,
		setTelegramPrivacyModeDraft,
		setTelegramOwnBotUsernameDraft,
		setTelegramPostVisitCheckupDelayDrafts,
		setTelegramModeDraft,
		setTelegramAllowVoiceIntakeDraft,
		setTelegramPatientPortalBaseUrlDraft,
		setTelegramMapsUrlDraft,
		setTelegramEnabledFeaturesDraft,
		normalizeTelegramPostVisitCheckupDelayDrafts,
	]);

	useEffect(() => {
		if (!telegramSettingsDirty || !telegramStatus?.settings) return;
		const timeout = window.setTimeout(() => {
			void saveTelegramSettings({ silent: true });
		}, 900);
		return () => window.clearTimeout(timeout);
	}, [telegramSettingsDirty, telegramStatus?.settings, saveTelegramSettings]);

	useEffect(() => {
		const isTelegramActive =
			(currentView === "settings" && settingsTab === "telegram") ||
			(!onboardingDismissed && onboardingStep === "telegram");
		if (!isTelegramActive) {
			lastLoadedControlPlaneRef.current = false;
			return;
		}
		if (lastLoadedControlPlaneRef.current) return;
		lastLoadedControlPlaneRef.current = true;

		void loadTelegramControlPlane({ silent: true });
	}, [
		currentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
	]);

	useEffect(() => {
		const telegramHandoffTarget =
			initialTelegramHandoffTargetRef.current ??
			readDenteTelegramHandoffTarget();
		if (!telegramHandoffTarget) return;
		setTelegramHandoffNotice(telegramHandoffTarget);
		stripDenteTelegramHandoffQuery(telegramHandoffTarget);
	}, [setTelegramHandoffNotice]);

	useEffect(() => {
		if (!uiPreferencesHydrated) return;
		const telegramHandoffTarget =
			initialTelegramHandoffTargetRef.current ??
			readDenteTelegramHandoffTarget();
		if (!telegramHandoffTarget) return;
		setCurrentView(telegramHandoffTarget.view);
		if (telegramHandoffTarget.documentKind) {
			setSelectedDocumentKind(telegramHandoffTarget.documentKind);
		}
		setTelegramHandoffNotice(telegramHandoffTarget);
		stripDenteTelegramHandoffQuery(telegramHandoffTarget);
	}, [
		uiPreferencesHydrated,
		setTelegramHandoffNotice,
		setSelectedDocumentKind,
		setCurrentView,
	]);

	function appendTelegramRuntimeScopeParams(
		params: URLSearchParams,
	): URLSearchParams {
		const organizationId =
			dashboard?.clinicSettings?.profile?.organizationId?.trim();
		const botConfigId = telegramBotConfigId.trim();
		if (
			telegramModeDraft === "clinic_owned_bot" &&
			organizationId &&
			botConfigId
		) {
			params.set("organizationId", organizationId);
			params.set("botConfigId", botConfigId);
		}
		return params;
	}

	function telegramOutboxActionQueryString(): string {
		const params = appendTelegramRuntimeScopeParams(new URLSearchParams());
		const query = params.toString();
		return query ? `?${query}` : "";
	}

	return {
		telegramSettingsModule,
		appendTelegramRuntimeScopeParams,
		telegramOutboxActionQueryString,
		initialTelegramHandoffTargetRef,
	};
}
