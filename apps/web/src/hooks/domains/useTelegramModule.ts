import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import type {
	DenteTelegramChatLinkListResponse,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
	DenteTelegramOutboxSendDueResponse,
	DenteTelegramOutboxSendResponse,
} from "@dental/shared";
import { useEffect, useRef } from "react";
import {
	type DenteTelegramHandoffTarget,
	operatorWorkflowFailureMessage,
	readDenteTelegramHandoffTarget,
	responseErrorMessage,
	stripDenteTelegramHandoffQuery,
	telegramHumanMessage,
} from "../../AppHelpers";
import { useAppStore } from "../../store/appStore";
import { useSettingsStore } from "../../store/settingsStore";
import { emptyTelegramVisualCardUrlDrafts } from "../../utils/draftDefaults";
import { defaultTelegramPostVisitCheckupDelayHoursByTopic } from "../../workspaceStaticOptions";
import { useTelegramSettings } from "../useTelegramSettings";

export type UseTelegramModuleOptions = {
	settingsAdminSecretSession?: string | null;
	loadDashboard: () => Promise<void>;
	setError: (error: string | null) => void;
	dashboard: any;
	currentView: string;
	settingsTab: string;
	onboardingDismissed: boolean;
	onboardingStep: string;
	activePatient: any;
	activeDoctor: any;
	activeAppointment: any;
	uiPreferencesHydrated: boolean;
	setCurrentView: (view: any) => void;
	setSelectedDocumentKind: (kind: any) => void;
};

export function useTelegramModule({
	settingsAdminSecretSession,
	loadDashboard,
	setError,
	dashboard,
	currentView,
	settingsTab,
	onboardingDismissed,
	onboardingStep,
	activePatient,
	activeDoctor,
	activeAppointment,
	uiPreferencesHydrated,
	setCurrentView,
	setSelectedDocumentKind,
}: UseTelegramModuleOptions) {
	const initialTelegramHandoffTargetRef =
		useRef<DenteTelegramHandoffTarget | null>(readDenteTelegramHandoffTarget());

	const {
		isTelegramLoading,
		setIsTelegramLoading,
		isTelegramLinkCreating,
		setIsTelegramLinkCreating,
		isTelegramSendingDue,
		setIsTelegramSendingDue,
		isTelegramOutboxLoadingMore,
		setIsTelegramOutboxLoadingMore,
		isTelegramLinkCodesLoadingMore,
		setIsTelegramLinkCodesLoadingMore,
		isTelegramChatLinksLoadingMore,
		setIsTelegramChatLinksLoadingMore,
	} = useAppStore();

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
		telegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		telegramOutbox,
		setTelegramOutbox,
		telegramLinkCodeLedger,
		setTelegramLinkCodeLedger,
		telegramLinkCodes,
		setTelegramLinkCodes,
		telegramChatLinkLedger,
		setTelegramChatLinkLedger,
		telegramChatLinks,
		setTelegramChatLinks,
		telegramLinkSubjectType,
		telegramLinkStaffId,
		setTelegramLinkActionState,
		telegramLinkCode,
		setTelegramLinkCode,
		telegramRevokingLinkId,
		setTelegramRevokingLinkId,
		setTelegramPreview,
		telegramSendingItemId,
		setTelegramSendingItemId,
		telegramAdminSecretSession,
		telegramAdminSecretDraft,
		setTelegramHandoffNotice,
	} = useSettingsStore();

	const telegramLinkStaffOptions = dashboard?.clinicSettings?.staff ?? [];

	const telegramSettingsModule = useTelegramSettings({
		apiFetch: null,
		setError,
		settingsAdminSecretSession: settingsAdminSecretSession || undefined,
		loadDashboard,
	});

	const {
		saveTelegramSettings,
		telegramControlPlaneHeaders,
		loadTelegramControlPlane,
		telegramOutboxRequestParams,
		telegramLinkCodeLedgerRequestParams,
		telegramChatLinkLedgerRequestParams,
		parseTelegramLinkTtlMinutes,
		normalizeTelegramPostVisitCheckupDelayDrafts,
	} = telegramSettingsModule;

	useEffect(() => {
		const settings = telegramStatus?.settings;
		if (!settings || telegramSettingsDirty) return;
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
		telegramStatus?.settings.updatedAt,
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
		if (
			(currentView === "settings" && settingsTab === "telegram") ||
			(!onboardingDismissed && onboardingStep === "telegram")
		) {
			void loadTelegramControlPlane({ silent: true });
		}
	}, [
		currentView,
		settingsTab,
		onboardingDismissed,
		onboardingStep,
		loadTelegramControlPlane,
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

	async function loadMoreTelegramOutbox() {
		if (!telegramOutbox?.nextCursor || isTelegramOutboxLoadingMore) return;
		setIsTelegramOutboxLoadingMore(true);
		try {
			const headers = telegramControlPlaneHeaders(
				{},
				telegramAdminSecretSession || telegramAdminSecretDraft,
			);
			const outboxParams = telegramOutboxRequestParams(
				telegramOutbox.nextCursor,
			);
			const response = await fetch(
				`/api/telegram/outbox?${outboxParams.toString()}`,
				{ cache: "no-store", headers },
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Очередь Telegram"),
				);
			const nextPage = (await response.json()) as DenteTelegramOutboxResponse;
			setTelegramOutbox((current) => {
				if (!current) return nextPage;
				const knownIds = new Set(current.items.map((item) => item.id));
				return {
					...nextPage,
					items: [
						...current.items,
						...nextPage.items.filter((item) => !knownIds.has(item.id)),
					],
				};
			});
		} catch (telegramError) {
			showToast(actionFailureToast("Очередь Telegram не загрузилась", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage(
					"Очередь Telegram не загрузилась",
					telegramError,
				),
			);
		} finally {
			setIsTelegramOutboxLoadingMore(false);
		}
	}

	async function loadMoreTelegramLinkCodes() {
		if (!telegramLinkCodeLedger?.nextCursor || isTelegramLinkCodesLoadingMore)
			return;
		setIsTelegramLinkCodesLoadingMore(true);
		try {
			const headers = telegramControlPlaneHeaders(
				{},
				telegramAdminSecretSession || telegramAdminSecretDraft,
			);
			const params = telegramLinkCodeLedgerRequestParams(
				telegramLinkCodeLedger.nextCursor,
			);
			const response = await fetch(
				`/api/telegram/link-codes?${params.toString()}`,
				{ cache: "no-store", headers },
			);
			if (!response.ok)
				throw new Error(await responseErrorMessage(response, "Коды Telegram"));
			const nextPage =
				(await response.json()) as DenteTelegramLinkCodeListResponse;
			const knownIds = new Set(telegramLinkCodes.map((code) => code.id));
			const linkCodes = [
				...telegramLinkCodes,
				...nextPage.linkCodes.filter((code) => !knownIds.has(code.id)),
			];
			setTelegramLinkCodes(linkCodes);
			setTelegramLinkCodeLedger({ ...nextPage, linkCodes });
		} catch (telegramError) {
			showToast(actionFailureToast("Коды Telegram не загрузились", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage(
					"Коды Telegram не загрузились",
					telegramError,
				),
			);
		} finally {
			setIsTelegramLinkCodesLoadingMore(false);
		}
	}

	async function loadMoreTelegramChatLinks() {
		if (!telegramChatLinkLedger?.nextCursor || isTelegramChatLinksLoadingMore)
			return;
		setIsTelegramChatLinksLoadingMore(true);
		try {
			const headers = telegramControlPlaneHeaders(
				{},
				telegramAdminSecretSession || telegramAdminSecretDraft,
			);
			const params = telegramChatLinkLedgerRequestParams(
				telegramChatLinkLedger.nextCursor,
			);
			const response = await fetch(
				`/api/telegram/chat-links?${params.toString()}`,
				{ cache: "no-store", headers },
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Связанные Telegram-чаты"),
				);
			const nextPage =
				(await response.json()) as DenteTelegramChatLinkListResponse;
			const knownIds = new Set(telegramChatLinks.map((link) => link.id));
			const chatLinks = [
				...telegramChatLinks,
				...nextPage.chatLinks.filter((link) => !knownIds.has(link.id)),
			];
			setTelegramChatLinks(chatLinks);
			setTelegramChatLinkLedger({ ...nextPage, chatLinks });
		} catch (telegramError) {
			showToast(actionFailureToast("Связанные Telegram-чаты не загрузились", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage(
					"Связанные Telegram-чаты не загрузились",
					telegramError,
				),
			);
		} finally {
			setIsTelegramChatLinksLoadingMore(false);
		}
	}

	async function createTelegramLinkCode() {
		if (isTelegramLinkCreating) {
			setError("Дождитесь завершения текущего создания Telegram-кода.");
			return;
		}
		if (!dashboard) {
			setError(
				"Данные клиники еще не загружены. Повторите создание Telegram-кода после загрузки рабочего экрана.",
			);
			return;
		}
		const subjectId =
			telegramLinkSubjectType === "patient"
				? activePatient?.id
				: telegramLinkStaffId;
		if (!subjectId) {
			setError(
				telegramLinkSubjectType === "patient"
					? "Выберите активного пациента для Telegram-кода."
					: "Выберите сотрудника для Telegram-кода.",
			);
			return;
		}
		setIsTelegramLinkCreating(true);
		setTelegramLinkActionState(null);
		try {
			const response = await fetch("/api/telegram/link-codes", {
				method: "POST",
				headers: telegramControlPlaneHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					organizationId: dashboard?.clinicSettings?.profile?.organizationId,
					subjectType: telegramLinkSubjectType,
					subjectId,
					clinicId: dashboard?.clinicSettings?.profile?.organizationId,
					botConfigId:
						telegramModeDraft === "clinic_owned_bot"
							? telegramBotConfigId.trim() || undefined
							: undefined,
					ttlMinutes: parseTelegramLinkTtlMinutes(),
					createdByUserId: activeDoctor?.id ?? null,
				}),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Telegram-код не создан"),
				);
			setTelegramLinkCode(
				(await response.json()) as DenteTelegramLinkCodeCreated,
			);
			await loadTelegramControlPlane({ silent: true });
			setError(null);
		} catch (telegramError) {
			showToast(actionFailureToast("Telegram-код не создан", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage("Telegram-код не создан", telegramError),
			);
		} finally {
			setIsTelegramLinkCreating(false);
		}
	}

	async function copyTelegramTextToClipboard(
		value: string | null | undefined,
		label: string,
	) {
		const text = value?.trim();
		if (!text) {
			const message = `${label} пустой. Сначала создайте новый Telegram-код или проверьте настройки бота.`;
			setTelegramLinkActionState(message);
			setError(message);
			return;
		}
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const area = document.createElement("textarea");
				area.value = text;
				area.setAttribute("readonly", "true");
				area.style.position = "fixed";
				area.style.left = "-9999px";
				document.body.appendChild(area);
				area.select();
				document.execCommand("copy");
				document.body.removeChild(area);
			}
			setTelegramLinkActionState(`${label} скопирован`);
			setError(null);
		} catch {
        showToast(actionFailureToast("Операция завершилась ошибкой", null), "error");
			setTelegramLinkActionState(null);
			setError(
				`${label} не скопирован. Откройте ссылку или выделите код вручную.`,
			);
		}
	}

	function downloadTelegramQrSvg() {
		if (!telegramLinkCode?.qrSvg) {
			const message =
				"QR-код недоступен. Используйте текстовый код или создайте новый Telegram-код.";
			setTelegramLinkActionState(message);
			setError(message);
			return;
		}
		const blob = new Blob([telegramLinkCode.qrSvg], {
			type: "image/svg+xml;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `dente-telegram-qr-${telegramLinkCode.codeLast4}.svg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		setTelegramLinkActionState("QR-код скачан");
		setError(null);
	}

	async function revokeTelegramChatLink(linkId: string) {
		if (telegramRevokingLinkId) {
			setError("Дождитесь завершения текущего отзыва Telegram-связки.");
			return;
		}
		setTelegramRevokingLinkId(linkId);
		try {
			const response = await fetch(
				`/api/telegram/chat-links/${encodeURIComponent(linkId)}/revoke${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders(),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Связка Telegram не отозвана"),
				);
			await loadTelegramControlPlane({ silent: true });
			setError(null);
		} catch (telegramError) {
			showToast(actionFailureToast("Связка Telegram не отозвана", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage(
					"Связка Telegram не отозвана",
					telegramError,
				),
			);
		} finally {
			setTelegramRevokingLinkId(null);
		}
	}

	async function previewTelegramTemplate(
		templateKind: DenteTelegramMessagePreview["templateKind"],
	) {
		const isStaffPreview = templateKind === "staff_daily_digest";
		const staffId =
			telegramLinkStaffId || telegramLinkStaffOptions[0]?.id || "";
		if (!isStaffPreview && !activePatient) {
			setError(
				"Выберите активного пациента перед предпросмотром Telegram-сообщения.",
			);
			return;
		}
		if (isStaffPreview && !staffId) {
			setError("Выберите сотрудника перед предпросмотром Telegram-дайджеста.");
			return;
		}
		setIsTelegramLoading(true);
		try {
			const response = await fetch(
				`/api/telegram/messages/preview${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						templateKind,
						patientId: isStaffPreview ? undefined : activePatient?.id,
						staffId: isStaffPreview ? staffId : undefined,
						appointmentId: isStaffPreview ? undefined : activeAppointment?.id,
						includePhi: false,
					}),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Предпросмотр Telegram не создан",
					),
				);
			setTelegramPreview(
				(await response.json()) as DenteTelegramMessagePreview,
			);
			setError(null);
		} catch (telegramError) {
			showToast(actionFailureToast("Предпросмотр Telegram не создан", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage(
					"Предпросмотр Telegram не создан",
					telegramError,
				),
			);
		} finally {
			setIsTelegramLoading(false);
		}
	}

	async function sendTelegramOutboxItem(itemId: string) {
		if (telegramSendingItemId || isTelegramSendingDue) {
			setError("Дождитесь завершения текущей отправки Telegram.");
			return;
		}
		setTelegramSendingItemId(itemId);
		try {
			const mutationId =
				typeof crypto !== "undefined" && "randomUUID" in crypto
					? crypto.randomUUID()
					: `telegram-send-${Date.now()}`;
			const response = await fetch(
				`/api/telegram/outbox/${encodeURIComponent(itemId)}/send${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						dryRun: false,
						clientMutationId: mutationId,
					}),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Сообщение Telegram не отправлено",
					),
				);
			const result = (await response.json()) as DenteTelegramOutboxSendResponse;
			if (result.status === "blocked" || result.status === "failed") {
				const warning = result.warnings?.[0]
					? telegramHumanMessage(result.warnings?.[0])
					: "";
				const reason = telegramHumanMessage(result.blockedReason) || warning;
				setError(
					`Отправка Telegram заблокирована${reason ? `: ${reason}` : ""}`,
				);
				await loadTelegramControlPlane({ silent: true });
				return;
			}
			setError(null);
			await loadTelegramControlPlane({ silent: true });
			if (result.status === "sent") await loadDashboard();
		} catch (telegramError) {
			showToast(actionFailureToast("Сообщение Telegram не отправлено", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage(
					"Сообщение Telegram не отправлено",
					telegramError,
				),
			);
		} finally {
			setTelegramSendingItemId(null);
		}
	}

	async function sendDueTelegramOutbox() {
		if (isTelegramSendingDue || telegramSendingItemId) {
			setError("Дождитесь завершения текущей отправки Telegram.");
			return;
		}
		if (!telegramOutbox?.dueCount) {
			setError("Telegram: готовых сообщений к отправке нет.");
			return;
		}
		setIsTelegramSendingDue(true);
		try {
			const response = await fetch(
				`/api/telegram/outbox/send-due${telegramOutboxActionQueryString()}`,
				{
					method: "POST",
					headers: telegramControlPlaneHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({ dryRun: false, limit: 25 }),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Готовые Telegram-сообщения не отправлены",
					),
				);
			const result =
				(await response.json()) as DenteTelegramOutboxSendDueResponse;
			await loadTelegramControlPlane({ silent: true });
			if (result.sentCount > 0) await loadDashboard();
			setError(
				result.sentCount > 0
					? `Telegram: отправлено ${result.sentCount}, проверено ${result.attemptedCount}.`
					: "Telegram: готовых сообщений к отправке нет.",
			);
		} catch (telegramError) {
			showToast(actionFailureToast("Готовые Telegram-сообщения не отправлены", (telegramError as { status?: number })?.status ?? null), "error");
			setError(
				operatorWorkflowFailureMessage(
					"Готовые Telegram-сообщения не отправлены",
					telegramError,
				),
			);
		} finally {
			setIsTelegramSendingDue(false);
		}
	}

	return {
		telegramSettingsModule,
		loadMoreTelegramOutbox,
		loadMoreTelegramLinkCodes,
		loadMoreTelegramChatLinks,
		createTelegramLinkCode,
		copyTelegramTextToClipboard,
		downloadTelegramQrSvg,
		revokeTelegramChatLink,
		previewTelegramTemplate,
		sendTelegramOutboxItem,
		sendDueTelegramOutbox,
	};
}
