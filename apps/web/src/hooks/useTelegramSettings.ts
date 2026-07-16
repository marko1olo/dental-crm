import type {
	DenteTelegramBotStatus,
	DenteTelegramChatLinkListResponse,
	DenteTelegramFeature,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramOutboxResponse,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardKey,
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	denteAdminSecretRequestHeaders,
	normalizeTelegramBotUsernameDraft,
	normalizeTelegramPublicHttpsUrlDraft,
	normalizeTelegramVisualCardUrlDraftsForSave,
	operatorReadableErrorDetailFromUnknown,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	type TelegramFeaturePlan,
	telegramHumanMessage,
} from "../AppHelpers.js";
import { useAppStore } from "../store/appStore.js";
import { useSettingsStore } from "../store/settingsStore.js";
import {
	defaultTelegramPostVisitCheckupDelayDrafts,
	defaultTelegramPostVisitCheckupDelayHoursByTopic,
	type TelegramPostVisitCheckupDelayDrafts,
	type TelegramPostVisitCheckupDelayKey,
	telegramFeatureLabels,
	telegramPostVisitCheckupDelayFields,
} from "../workspaceStaticOptions.js";

export function useTelegramSettings(options: {
	serverBaseUrl?: string | undefined;
	apiFetch: any;
	setError: (err: string | null) => void;
	settingsAdminSecretSession?: string | null | undefined;
	loadDashboard?: (() => Promise<void>) | undefined;
}) {
	const appStore = useAppStore();
	const {
		serverBaseUrl,
		apiFetch,
		setError,
		settingsAdminSecretSession,
		loadDashboard,
	} = options;
	const {
		dashboard,
		setDashboard,
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
		telegramAdminSecretSession,
		setTelegramAdminSecretSession,
		telegramSendingItemId,
		setTelegramSendingItemId,
		telegramRevokingLinkId,
		setTelegramRevokingLinkId,
		telegramOutbox,
		setTelegramOutbox,
		telegramLinkCodeLedger,
		setTelegramLinkCodeLedger,
		telegramChatLinkLedger,
		setTelegramChatLinkLedger,
		telegramLinkCodes,
		setTelegramLinkCodes,
		telegramChatLinks,
		setTelegramChatLinks,
	} = settingsStore;

	// Exporting the states from the store
	const {
		telegramModeDraft,
		setTelegramModeDraft,
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
		setTelegramStaffEscalationChannelDraft,
		telegramPrivacyModeDraft,
		setTelegramPrivacyModeDraft,
		telegramSettingsDirty,
		setTelegramSettingsDirty,
		telegramSettingsSaveState,
		setTelegramSettingsSaveState,
		telegramSettingsSaveError,
		setTelegramSettingsSaveError,
		telegramStatus,
		setTelegramStatus,
		telegramFeaturePlan,
		setTelegramFeaturePlan,
		telegramBotConfigId,
		setTelegramBotConfigId,
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
	} = settingsStore;

	function markTelegramSettingsDirty() {
		setTelegramSettingsDirty(true);
		setTelegramSettingsSaveState("idle");
		setTelegramSettingsSaveError(null);
	}

	function updateTelegramVisualCardUrlDraft(
		key: DenteTelegramVisualCardKey,
		value: string,
	) {
		setTelegramVisualCardUrlDrafts((current) => ({
			...current,
			[key]: value.trim() ? value : null,
		}));
		markTelegramSettingsDirty();
	}

	function toggleTelegramFeature(feature: DenteTelegramFeature) {
		setTelegramEnabledFeaturesDraft((current) =>
			current.includes(feature)
				? current.filter((item) => item !== feature)
				: [...current, feature],
		);
		if (
			feature === "voice_note_intake" &&
			!telegramEnabledFeaturesDraft.includes(feature)
		) {
			setTelegramAllowVoiceIntakeDraft(true);
		}
		markTelegramSettingsDirty();
	}

	function parseTelegramLinkTtlMinutes() {
		const parsed = Number.parseInt(telegramTokenTtlDraft, 10);
		if (!Number.isFinite(parsed)) return 15;
		return Math.min(1440, Math.max(5, parsed));
	}

	function parseTelegramReminderLeadTimesHours(): number[] {
		const values = telegramReminderLeadTimesDraft
			.split(/[,\s;]+/)
			.map((item) => Number.parseInt(item, 10))
			.filter((item) => Number.isFinite(item) && item >= 1 && item <= 168);
		const unique = [...new Set(values)] as number[];
		unique.sort((left, right) => right - left);
		return unique.length ? unique.slice(0, 6) : [24];
	}

	function parseTelegramReviewRequestDelayHours(): number {
		const parsed = Number.parseInt(telegramReviewRequestDelayDraft, 10);
		if (!Number.isFinite(parsed)) return 2;
		return Math.min(720, Math.max(1, parsed));
	}

	function parseTelegramPostVisitCheckupDelayHours(): DenteTelegramPostVisitCheckupDelayHoursByTopic {
		const values = { ...defaultTelegramPostVisitCheckupDelayHoursByTopic };
		for (const field of telegramPostVisitCheckupDelayFields) {
			const parsed = Number.parseInt(
				telegramPostVisitCheckupDelayDrafts[field.key],
				10,
			);
			values[field.key] = Number.isFinite(parsed)
				? Math.max(1, Math.min(720, parsed))
				: defaultTelegramPostVisitCheckupDelayHoursByTopic[field.key];
		}
		return values;
	}

	function normalizeTelegramPostVisitCheckupDelayDrafts(
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

	function updateTelegramPostVisitCheckupDelayDraft(
		key: TelegramPostVisitCheckupDelayKey,
		value: string,
	) {
		setTelegramPostVisitCheckupDelayDrafts((current) => ({
			...current,
			[key]: value,
		}));
		markTelegramSettingsDirty();
	}

	function telegramFeatureLabel(value: DenteTelegramFeature | string) {
		return (
			telegramFeatureLabels[value as DenteTelegramFeature] ??
			telegramHumanMessage(value)
		);
	}

	function telegramControlPlaneHeaders(
		extra: Record<string, string> = {},
		adminSecretOverride?: string,
	): Record<string, string> {
		return denteAdminSecretRequestHeaders(
			extra,
			adminSecretOverride || settingsAdminSecretSession || undefined,
		);
	}

	async function saveTelegramSettings(
		options: { silent?: boolean } = {},
	): Promise<boolean> {
		if (telegramPrivacyModeDraft === "consented_phi_templates") {
			const message =
				"Чувствительные Telegram-шаблоны заблокированы до отдельного согласия пациента, аудита и серверной политики PHI.";
			setTelegramSettingsSaveState("error");
			setTelegramSettingsSaveError(message);
			if (!options.silent) setError(message);
			return false;
		}
		const patientLinkTokenTtlMinutes = parseTelegramLinkTtlMinutes();
		if (String(patientLinkTokenTtlMinutes) !== telegramTokenTtlDraft) {
			setTelegramTokenTtlDraft(String(patientLinkTokenTtlMinutes));
		}
		const appointmentReminderLeadTimesHours =
			parseTelegramReminderLeadTimesHours();
		const normalizedReminderLeadTimes =
			appointmentReminderLeadTimesHours.join(", ");
		if (normalizedReminderLeadTimes !== telegramReminderLeadTimesDraft) {
			setTelegramReminderLeadTimesDraft(normalizedReminderLeadTimes);
		}
		const reviewRequestDelayHours = parseTelegramReviewRequestDelayHours();
		if (String(reviewRequestDelayHours) !== telegramReviewRequestDelayDraft) {
			setTelegramReviewRequestDelayDraft(String(reviewRequestDelayHours));
		}
		const postVisitCheckupDelayHoursByTopic =
			parseTelegramPostVisitCheckupDelayHours();
		const normalizedPostVisitCheckupDelayDrafts =
			normalizeTelegramPostVisitCheckupDelayDrafts(
				postVisitCheckupDelayHoursByTopic,
			);
		if (
			JSON.stringify(normalizedPostVisitCheckupDelayDrafts) !==
			JSON.stringify(telegramPostVisitCheckupDelayDrafts)
		) {
			setTelegramPostVisitCheckupDelayDrafts(
				normalizedPostVisitCheckupDelayDrafts,
			);
		}
		let botUsername: string | null;
		let ownBotUsername: string | null;
		let webhookBaseUrl: string | null;
		let patientPortalBaseUrl: string | null;
		let welcomeImageUrl: string | null;
		let visualCardUrls: DenteTelegramVisualCardUrls;
		let clinicReviewUrl: string | null;
		let clinicMapsUrl: string | null;
		try {
			botUsername = normalizeTelegramBotUsernameDraft(
				"Общий бот",
				telegramBotUsernameDraft,
			);
			ownBotUsername = normalizeTelegramBotUsernameDraft(
				"Бот клиники",
				telegramOwnBotUsernameDraft,
			);
			webhookBaseUrl = normalizeTelegramPublicHttpsUrlDraft(
				"Адрес приема сообщений Telegram",
				telegramWebhookBaseUrlDraft,
			);
			patientPortalBaseUrl = normalizeTelegramPublicHttpsUrlDraft(
				"Портал пациента",
				telegramPatientPortalBaseUrlDraft,
			);
			welcomeImageUrl = normalizeTelegramPublicHttpsUrlDraft(
				"Картинка приветствия",
				telegramWelcomeImageUrlDraft,
			);
			visualCardUrls = normalizeTelegramVisualCardUrlDraftsForSave(
				telegramVisualCardUrlDrafts,
			);
			clinicReviewUrl = normalizeTelegramPublicHttpsUrlDraft(
				"Ссылка на отзыв",
				telegramReviewUrlDraft,
			);
			clinicMapsUrl = normalizeTelegramPublicHttpsUrlDraft(
				"Ссылка на карту",
				telegramMapsUrlDraft,
			);
		} catch (urlError) {
			const message =
				operatorReadableErrorDetailFromUnknown(urlError) ??
				"Проверьте Telegram-настройки перед сохранением.";
			setTelegramSettingsSaveState("error");
			setTelegramSettingsSaveError(message);
			if (!options.silent) setError(message);
			return false;
		}
		if (
			(botUsername ?? "") !== telegramBotUsernameDraft.trim().replace(/^@/, "")
		)
			setTelegramBotUsernameDraft(botUsername ?? "");
		if (
			(ownBotUsername ?? "") !==
			telegramOwnBotUsernameDraft.trim().replace(/^@/, "")
		) {
			setTelegramOwnBotUsernameDraft(ownBotUsername ?? "");
		}
		if ((webhookBaseUrl ?? "") !== telegramWebhookBaseUrlDraft.trim())
			setTelegramWebhookBaseUrlDraft(webhookBaseUrl ?? "");
		if (
			(patientPortalBaseUrl ?? "") !== telegramPatientPortalBaseUrlDraft.trim()
		)
			setTelegramPatientPortalBaseUrlDraft(patientPortalBaseUrl ?? "");
		if ((welcomeImageUrl ?? "") !== telegramWelcomeImageUrlDraft.trim())
			setTelegramWelcomeImageUrlDraft(welcomeImageUrl ?? "");
		if (
			JSON.stringify(visualCardUrls) !==
			JSON.stringify(telegramVisualCardUrlDrafts)
		)
			setTelegramVisualCardUrlDrafts(visualCardUrls);
		if ((clinicReviewUrl ?? "") !== telegramReviewUrlDraft.trim())
			setTelegramReviewUrlDraft(clinicReviewUrl ?? "");
		if ((clinicMapsUrl ?? "") !== telegramMapsUrlDraft.trim())
			setTelegramMapsUrlDraft(clinicMapsUrl ?? "");
		setIsTelegramSettingsSaving(true);
		setTelegramSettingsSaveState("saving");
		setTelegramSettingsSaveError(null);
		try {
			const response = await fetch("/api/settings/telegram", {
				method: "PUT",
				headers: telegramControlPlaneHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					mode: telegramModeDraft,
					botUsername,
					ownBotUsername,
					webhookBaseUrl,
					patientPortalBaseUrl,
					welcomeImageUrl,
					visualCardUrls,
					clinicReviewUrl,
					clinicMapsUrl,
					enabledFeatures: telegramEnabledFeaturesDraft,
					patientLinkTokenTtlMinutes,
					appointmentReminderLeadTimesHours,
					reviewRequestDelayHours,
					postVisitCheckupDelayHoursByTopic,
					allowVoiceIntake: telegramAllowVoiceIntakeDraft,
					staffEscalationChannel:
						telegramStaffEscalationChannelDraft.trim() || null,
					privacyMode: telegramPrivacyModeDraft,
				}),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Настройки Telegram не сохранены",
					),
				);
			setTelegramStatus((await response.json()) as DenteTelegramBotStatus);
			setTelegramSettingsDirty(false);
			setTelegramSettingsSaveState("saved");
			await loadTelegramControlPlane({ silent: true });
			setError(null);
			return true;
		} catch (telegramError) {
			const message = operatorWorkflowFailureMessage(
				"Настройки Telegram не сохранены",
				telegramError,
			);
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

	async function loadTelegramControlPlane(
		options: { silent?: boolean; adminSecret?: string } = {},
	) {
		if (!options.silent) setIsTelegramLoading(true);
		try {
			const headers = telegramControlPlaneHeaders({}, options.adminSecret);
			const outboxParams = telegramOutboxRequestParams();
			const linkCodeParams = telegramLinkCodeLedgerRequestParams();
			const chatLinkParams = telegramChatLinkLedgerRequestParams();
			const [
				statusResponse,
				featurePlanResponse,
				outboxResponse,
				linkCodesResponse,
				chatLinksResponse,
			] = await Promise.all([
				fetch(telegramStatusEndpoint(), { cache: "no-store", headers }),
				fetch("/api/telegram/feature-plan", { cache: "no-store", headers }),
				fetch(`/api/telegram/outbox?${outboxParams.toString()}`, {
					cache: "no-store",
					headers,
				}),
				fetch(`/api/telegram/link-codes?${linkCodeParams.toString()}`, {
					cache: "no-store",
					headers,
				}),
				fetch(`/api/telegram/chat-links?${chatLinkParams.toString()}`, {
					cache: "no-store",
					headers,
				}),
			]);
			if (!statusResponse.ok)
				throw new Error(
					await responseErrorMessage(statusResponse, "Статус Telegram"),
				);
			if (!featurePlanResponse.ok)
				throw new Error(
					await responseErrorMessage(featurePlanResponse, "План Telegram"),
				);
			if (!outboxResponse.ok)
				throw new Error(
					await responseErrorMessage(outboxResponse, "Очередь Telegram"),
				);
			if (!linkCodesResponse.ok)
				throw new Error(
					await responseErrorMessage(linkCodesResponse, "Коды Telegram"),
				);
			if (!chatLinksResponse.ok)
				throw new Error(
					await responseErrorMessage(
						chatLinksResponse,
						"Связанные Telegram-чаты",
					),
				);
			setTelegramStatus(
				(await statusResponse.json()) as DenteTelegramBotStatus,
			);
			setTelegramFeaturePlan(
				(await featurePlanResponse.json()) as TelegramFeaturePlan,
			);
			setTelegramOutbox(
				(await outboxResponse.json()) as DenteTelegramOutboxResponse,
			);
			const nextLinkCodeLedger =
				(await linkCodesResponse.json()) as DenteTelegramLinkCodeListResponse;
			const nextChatLinkLedger =
				(await chatLinksResponse.json()) as DenteTelegramChatLinkListResponse;
			setTelegramLinkCodeLedger(nextLinkCodeLedger);
			setTelegramChatLinkLedger(nextChatLinkLedger);
			setTelegramLinkCodes(nextLinkCodeLedger.linkCodes);
			setTelegramChatLinks(nextChatLinkLedger.chatLinks);
		} catch (telegramError) {
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Панель управления Telegram недоступна",
						telegramError,
					),
				);
			}
		} finally {
			if (!options.silent) setIsTelegramLoading(false);
		}
	}

	function telegramStatusEndpoint(): string {
		const organizationId =
			dashboard?.clinicSettings?.profile?.organizationId?.trim();
		const botConfigId = telegramBotConfigId.trim();
		if (
			telegramModeDraft === "clinic_owned_bot" &&
			organizationId &&
			botConfigId
		) {
			return `/api/telegram/status/${encodeURIComponent(organizationId)}/${encodeURIComponent(botConfigId)}`;
		}

		return "/api/telegram/status";
	}

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
			params.set("botConfigId", botConfigId);
			params.set("organizationId", organizationId);
		}
		return params;
	}

	function telegramOutboxRequestParams(
		cursor?: string | null,
	): URLSearchParams {
		const params = new URLSearchParams();
		params.set("limit", "80");
		if (cursor) params.set("cursor", cursor);
		if (telegramOutboxStatusFilter !== "all")
			params.set("status", telegramOutboxStatusFilter);
		if (telegramOutboxTemplateFilter !== "all")
			params.set("templateKind", telegramOutboxTemplateFilter);
		appendTelegramRuntimeScopeParams(params);
		return params;
	}

	function telegramLinkCodeLedgerRequestParams(
		cursor?: string | null,
	): URLSearchParams {
		const params = new URLSearchParams();
		params.set("limit", "8");
		if (cursor) params.set("cursor", cursor);
		appendTelegramRuntimeScopeParams(params);
		return params;
	}

	function telegramChatLinkLedgerRequestParams(
		cursor?: string | null,
	): URLSearchParams {
		const params = new URLSearchParams();
		params.set("limit", "8");
		if (cursor) params.set("cursor", cursor);
		appendTelegramRuntimeScopeParams(params);
		return params;
	}
}
