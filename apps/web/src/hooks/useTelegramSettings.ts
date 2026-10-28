import type {
	DenteTelegramFeature,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardKey,
} from "@dental/shared";
import {
	operatorReadableErrorDetailFromUnknown,
	operatorWorkflowFailureMessage,
} from "../AppHelpers.js";
import { showToast } from "../components/GlobalToast";
import { actionFailureToast } from "../lib/panelStateText";
import { logger } from "../utils/logger.js";
import { useAppStore } from "../store/appStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import type {
	TelegramPostVisitCheckupDelayDrafts,
	TelegramPostVisitCheckupDelayKey,
} from "../workspaceStaticOptions.js";
import {
	createTelegramControlPlaneHeaders,
	parseTelegramLinkTtlMinutes as parseTtl,
	parseTelegramReminderLeadTimesHours as parseLeadTimes,
	parseTelegramReviewRequestDelayHours as parseReviewDelay,
	telegramFeatureLabel as resolveFeatureLabel,
	prepareTelegramSettingsSave,
	parseTelegramPostVisitCheckupDelayHours as parseCheckupDelays,
	normalizeTelegramPostVisitCheckupDelayDrafts as normCheckupDelays,
} from "./telegram/useTelegramTokenValidation.js";
import {
	buildTelegramStatusEndpoint,
	buildTelegramOutboxRequestParams,
	buildTelegramLinkCodeLedgerRequestParams,
	buildTelegramChatLinkLedgerRequestParams,
	fetchTelegramControlPlaneBundle,
	putTelegramSettingsRequest,
} from "./telegram/useTelegramWebhookState.js";

export function useTelegramSettings(options: {
	serverBaseUrl?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	apiFetch: any;
	setError: (err: string | null) => void;
	settingsAdminSecretSession?: string | null | undefined;
	loadDashboard?: (() => Promise<void>) | undefined;
}) {
	const appStore = useAppStore();
	const { setError, settingsAdminSecretSession } = options;
	const {
		dashboard,
		isTelegramLoading,
		setIsTelegramLoading,
		isTelegramLinkCreating,
		setIsTelegramLinkCreating,
		isTelegramSettingsSaving,
		setIsTelegramSettingsSaving,
		isTelegramSendingDue,
		setIsTelegramSendingDue,
		isTelegramOutboxLoadingMore,
		setIsTelegramOutboxLoadingMore,
		isTelegramLinkCodesLoadingMore,
		setIsTelegramLinkCodesLoadingMore,
		isTelegramChatLinksLoadingMore,
		setIsTelegramChatLinksLoadingMore,
	} = appStore;

	const settingsStore = useSettingsStore();
	const {
		setTelegramOutbox,
		setTelegramLinkCodeLedger,
		setTelegramChatLinkLedger,
		setTelegramLinkCodes,
		setTelegramChatLinks,
		telegramModeDraft,
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		telegramOwnBotUsernameDraft,
		setTelegramOwnBotUsernameDraft,
		telegramWebhookBaseUrlDraft,
		setTelegramWebhookBaseUrlDraft,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramVisualCardUrlDrafts,
		setTelegramVisualCardUrlDrafts,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		telegramEnabledFeaturesDraft,
		setTelegramEnabledFeaturesDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		telegramPostVisitCheckupDelayDrafts,
		setTelegramPostVisitCheckupDelayDrafts,
		telegramAllowVoiceIntakeDraft,
		setTelegramAllowVoiceIntakeDraft,
		telegramStaffEscalationChannelDraft,
		telegramPrivacyModeDraft,
		setTelegramSettingsDirty,
		setTelegramSettingsSaveState,
		setTelegramSettingsSaveError,
		setTelegramStatus,
		setTelegramFeaturePlan,
		telegramBotConfigId,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
	} = settingsStore;

	function markTelegramSettingsDirty() {
		setTelegramSettingsDirty(true);
		setTelegramSettingsSaveState("idle");
		setTelegramSettingsSaveError(null);
	}

	function updateTelegramVisualCardUrlDraft(key: DenteTelegramVisualCardKey, value: string) {
		setTelegramVisualCardUrlDrafts((current) => ({
			...current,
			[key]: value.trim() ? value : null,
		}));
		markTelegramSettingsDirty();
	}

	function toggleTelegramFeature(feature: DenteTelegramFeature) {
		setTelegramEnabledFeaturesDraft((current) =>
			current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature],
		);
		if (feature === "voice_note_intake" && !telegramEnabledFeaturesDraft.includes(feature)) {
			setTelegramAllowVoiceIntakeDraft(true);
		}
		markTelegramSettingsDirty();
	}

	function parseTelegramLinkTtlMinutes(): number {
		return parseTtl(telegramTokenTtlDraft);
	}

	function parseTelegramReminderLeadTimesHours(): number[] {
		return parseLeadTimes(telegramReminderLeadTimesDraft);
	}

	function parseTelegramReviewRequestDelayHours(): number {
		return parseReviewDelay(telegramReviewRequestDelayDraft);
	}

	function parseTelegramPostVisitCheckupDelayHours(): DenteTelegramPostVisitCheckupDelayHoursByTopic {
		return parseCheckupDelays(telegramPostVisitCheckupDelayDrafts);
	}

	function normalizeTelegramPostVisitCheckupDelayDrafts(
		values: DenteTelegramPostVisitCheckupDelayHoursByTopic,
	): TelegramPostVisitCheckupDelayDrafts {
		return normCheckupDelays(values);
	}

	function updateTelegramPostVisitCheckupDelayDraft(key: TelegramPostVisitCheckupDelayKey, value: string) {
		setTelegramPostVisitCheckupDelayDrafts((current) => ({
			...current,
			[key]: value,
		}));
		markTelegramSettingsDirty();
	}

	function telegramFeatureLabel(value: DenteTelegramFeature | string) {
		return resolveFeatureLabel(value);
	}

	function telegramControlPlaneHeaders(
		extra: Record<string, string> = {},
		adminSecretOverride?: string | null,
	): Record<string, string> {
		return createTelegramControlPlaneHeaders(extra, adminSecretOverride, settingsAdminSecretSession);
	}

	function telegramStatusEndpoint(): string {
		return buildTelegramStatusEndpoint(dashboard, telegramModeDraft, telegramBotConfigId);
	}

	function telegramOutboxRequestParams(cursor?: string | null): URLSearchParams {
		return buildTelegramOutboxRequestParams(
			telegramOutboxStatusFilter,
			telegramOutboxTemplateFilter,
			cursor,
			dashboard,
			telegramModeDraft,
			telegramBotConfigId,
		);
	}

	function telegramLinkCodeLedgerRequestParams(cursor?: string | null): URLSearchParams {
		return buildTelegramLinkCodeLedgerRequestParams(
			cursor,
			dashboard,
			telegramModeDraft,
			telegramBotConfigId,
		);
	}

	function telegramChatLinkLedgerRequestParams(cursor?: string | null): URLSearchParams {
		return buildTelegramChatLinkLedgerRequestParams(
			cursor,
			dashboard,
			telegramModeDraft,
			telegramBotConfigId,
		);
	}

	async function loadTelegramControlPlane(options: { silent?: boolean; adminSecret?: string } = {}) {
		if (!options.silent) setIsTelegramLoading(true);
		try {
			const headers = telegramControlPlaneHeaders({}, options.adminSecret);
			const bundle = await fetchTelegramControlPlaneBundle(
				telegramStatusEndpoint(),
				headers,
				telegramOutboxRequestParams(),
				telegramLinkCodeLedgerRequestParams(),
				telegramChatLinkLedgerRequestParams(),
			);
			setTelegramStatus(bundle.status);
			setTelegramFeaturePlan(bundle.featurePlan);
			setTelegramOutbox(bundle.outbox);
			setTelegramLinkCodeLedger(bundle.linkCodeLedger);
			setTelegramChatLinkLedger(bundle.chatLinkLedger);
			setTelegramLinkCodes(bundle.linkCodeLedger.linkCodes);
			setTelegramChatLinks(bundle.chatLinkLedger.chatLinks);
		} catch (telegramError) {
			if (!options.silent) {
				showToast(
					actionFailureToast(
						"Панель управления Telegram недоступна",
						(telegramError as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError(operatorWorkflowFailureMessage("Панель управления Telegram недоступна", telegramError));
			} else {
				logger.warn("[TelegramSettings] Background control plane load failed:", telegramError);
			}
		} finally {
			if (!options.silent) setIsTelegramLoading(false);
		}
	}

	async function saveTelegramSettings(options: { silent?: boolean } = {}): Promise<boolean> {
		if (telegramPrivacyModeDraft === "consented_phi_templates") {
			const message =
				"Чувствительные Telegram-шаблоны заблокированы до отдельного согласия пациента, аудита и серверной политики PHI.";
			setTelegramSettingsSaveState("error");
			setTelegramSettingsSaveError(message);
			if (!options.silent) setError(message);
			return false;
		}

		let prepared: ReturnType<typeof prepareTelegramSettingsSave>;
		try {
			prepared = prepareTelegramSettingsSave({
				mode: telegramModeDraft,
				privacyMode: telegramPrivacyModeDraft,
				tokenTtl: telegramTokenTtlDraft,
				reminderLeadTimes: telegramReminderLeadTimesDraft,
				reviewRequestDelay: telegramReviewRequestDelayDraft,
				postVisitCheckupDelays: telegramPostVisitCheckupDelayDrafts,
				botUsername: telegramBotUsernameDraft,
				ownBotUsername: telegramOwnBotUsernameDraft,
				webhookBaseUrl: telegramWebhookBaseUrlDraft,
				patientPortalBaseUrl: telegramPatientPortalBaseUrlDraft,
				welcomeImageUrl: telegramWelcomeImageUrlDraft,
				visualCardUrls: telegramVisualCardUrlDrafts,
				reviewUrl: telegramReviewUrlDraft,
				mapsUrl: telegramMapsUrlDraft,
				enabledFeatures: telegramEnabledFeaturesDraft,
				allowVoiceIntake: telegramAllowVoiceIntakeDraft,
				staffEscalationChannel: telegramStaffEscalationChannelDraft,
			});
		} catch (urlError) {
			if (!options.silent) {
				showToast(
					actionFailureToast("Ошибка выполнения операции", (urlError as { status?: number })?.status ?? null),
					"error",
				);
			} else {
				logger.warn("[TelegramSettings] Background URL validation failed:", urlError);
			}
			const message =
				operatorReadableErrorDetailFromUnknown(urlError) ?? "Проверьте Telegram-настройки перед сохранением.";
			setTelegramSettingsSaveState("error");
			setTelegramSettingsSaveError(message);
			if (!options.silent) setError(message);
			return false;
		}

		const { normalizedDrafts, payload } = prepared;
		if (normalizedDrafts.tokenTtl !== telegramTokenTtlDraft) setTelegramTokenTtlDraft(normalizedDrafts.tokenTtl);
		if (normalizedDrafts.reminderLeadTimes !== telegramReminderLeadTimesDraft) setTelegramReminderLeadTimesDraft(normalizedDrafts.reminderLeadTimes);
		if (normalizedDrafts.reviewRequestDelay !== telegramReviewRequestDelayDraft) setTelegramReviewRequestDelayDraft(normalizedDrafts.reviewRequestDelay);
		if (JSON.stringify(normalizedDrafts.postVisitCheckupDelays) !== JSON.stringify(telegramPostVisitCheckupDelayDrafts)) {
			setTelegramPostVisitCheckupDelayDrafts(normalizedDrafts.postVisitCheckupDelays);
		}
		if (normalizedDrafts.botUsername !== telegramBotUsernameDraft.trim().replace(/^@/, "")) setTelegramBotUsernameDraft(normalizedDrafts.botUsername);
		if (normalizedDrafts.ownBotUsername !== telegramOwnBotUsernameDraft.trim().replace(/^@/, "")) setTelegramOwnBotUsernameDraft(normalizedDrafts.ownBotUsername);
		if (normalizedDrafts.webhookBaseUrl !== telegramWebhookBaseUrlDraft.trim()) setTelegramWebhookBaseUrlDraft(normalizedDrafts.webhookBaseUrl);
		if (normalizedDrafts.patientPortalBaseUrl !== telegramPatientPortalBaseUrlDraft.trim()) setTelegramPatientPortalBaseUrlDraft(normalizedDrafts.patientPortalBaseUrl);
		if (normalizedDrafts.welcomeImageUrl !== telegramWelcomeImageUrlDraft.trim()) setTelegramWelcomeImageUrlDraft(normalizedDrafts.welcomeImageUrl);
		if (JSON.stringify(normalizedDrafts.visualCardUrls) !== JSON.stringify(telegramVisualCardUrlDrafts)) setTelegramVisualCardUrlDrafts(normalizedDrafts.visualCardUrls);
		if (normalizedDrafts.reviewUrl !== telegramReviewUrlDraft.trim()) setTelegramReviewUrlDraft(normalizedDrafts.reviewUrl);
		if (normalizedDrafts.mapsUrl !== telegramMapsUrlDraft.trim()) setTelegramMapsUrlDraft(normalizedDrafts.mapsUrl);

		setIsTelegramSettingsSaving(true);
		setTelegramSettingsSaveState("saving");
		setTelegramSettingsSaveError(null);
		try {
			const status = await putTelegramSettingsRequest(payload, telegramControlPlaneHeaders());
			setTelegramStatus(status);
			setTelegramSettingsDirty(false);
			setTelegramSettingsSaveState("saved");
			await loadTelegramControlPlane({ silent: true });
			setError(null);
			return true;
		} catch (telegramError) {
			if (!options.silent) {
				showToast(
					actionFailureToast("Настройки Telegram не сохранены", (telegramError as { status?: number })?.status ?? null),
					"error",
				);
			} else {
				logger.warn("[TelegramSettings] Background autosave failed:", telegramError);
			}
			const message = operatorWorkflowFailureMessage("Настройки Telegram не сохранены", telegramError);
			setTelegramSettingsSaveState("error");
			setTelegramSettingsSaveError(message);
			if (!options.silent) setError(message);
			return false;
		} finally {
			setIsTelegramSettingsSaving(false);
		}
	}

	return {
		telegramChatLinkLedgerRequestParams,
		telegramLinkCodeLedgerRequestParams,
		telegramOutboxRequestParams,
		telegramStatusEndpoint,
		isTelegramLoading,
		setIsTelegramLoading,
		isTelegramLinkCreating,
		setIsTelegramLinkCreating,
		isTelegramSettingsSaving,
		setIsTelegramSettingsSaving,
		isTelegramSendingDue,
		setIsTelegramSendingDue,
		isTelegramOutboxLoadingMore,
		setIsTelegramOutboxLoadingMore,
		isTelegramLinkCodesLoadingMore,
		setIsTelegramLinkCodesLoadingMore,
		isTelegramChatLinksLoadingMore,
		setIsTelegramChatLinksLoadingMore,
		loadTelegramControlPlane,
		telegramControlPlaneHeaders,
		...settingsStore,
		markTelegramSettingsDirty,
		updateTelegramVisualCardUrlDraft,
		toggleTelegramFeature,
		parseTelegramLinkTtlMinutes,
		parseTelegramReminderLeadTimesHours,
		parseTelegramReviewRequestDelayHours,
		parseTelegramPostVisitCheckupDelayHours,
		normalizeTelegramPostVisitCheckupDelayDrafts,
		updateTelegramPostVisitCheckupDelayDraft,
		telegramFeatureLabel,
		saveTelegramSettings,
	};
}
