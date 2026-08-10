import { useRef, useEffect, useCallback, useState } from "react";
import type { MutableRefObject } from "react";
import type { UiPreferences, UiPreferencesInput, PersistenceHealth, PersistenceIntegrityReport } from "../../AppHelpers";
import { normalizePersistenceHealth } from "../../AppHelpers";
import type { LocalBridgeReadinessResponse, LocalBridgeUsePlansResponse } from "@dental/shared";

export interface UiPreferencesLogicProps {
	dashboard: any;
	auth: any;
	showToast: any;
	actionFailureToast: any;
	saveServerUiPreferences: any;
	uiPreferencesSyncErrorMessage: any;
	operatorWorkflowFailureMessage: any;
	loadServerUiPreferences: any;
	loadUiPreferences: any;
	safeLocalStorageSetItem: any;
	uiPreferencesStorageKey: any;
	saveUiPreferences: any;
	browserCapabilityFailureMessage: any;
	inspectBrowserContinuity: any;
	loadPersistenceHealthRef: any;
	refreshSpeechRuntimeRef: any;
	settingsAdminSecretSession: any;
	setError: any;
	responseErrorMessage: any;
	loadWorkspaceProfile: any;
	pricelistLogic: any;
	uiPreferencesSyncError: any;
	setUiPreferencesSyncError: any;
	uiPreferencesHydrated: any;
	setUiPreferencesHydrated: any;
	persistenceHealth: any;
	setPersistenceHealth: any;
	persistenceIntegrity: any;
	setPersistenceIntegrity: any;
	isPersistenceExporting: any;
	setIsPersistenceExporting: any;
	browserContinuity: any;
	setBrowserContinuity: any;
	localBridgeReadiness: any;
	setLocalBridgeReadiness: any;
	localBridgeUsePlans: any;
	setLocalBridgeUsePlans: any;
	uiLanguage: any;
	setUiLanguage: any;
	selectedWorkspaceRole: any;
	setSelectedWorkspaceRole: any;
	selectedSpecialty: any;
	setSelectedSpecialty: any;
	selectedProtocolId: any;
	setSelectedProtocolId: any;
	selectedPatientId: any;
	setSelectedPatientId: any;
	scheduleDoctorFilterId: any;
	setScheduleDoctorFilterId: any;
	scheduleAssistantFilterId: any;
	setScheduleAssistantFilterId: any;
	scheduleChairFilterId: any;
	setScheduleChairFilterId: any;
	scheduleDefaultDoctorUserId: any;
	setScheduleDefaultDoctorUserId: any;
	scheduleDefaultAssistantUserId: any;
	setScheduleDefaultAssistantUserId: any;
	scheduleDefaultChairId: any;
	setScheduleDefaultChairId: any;
	scheduleStatusFilter: any;
	setScheduleStatusFilter: any;
	scheduleDateFilter: any;
	setScheduleDateFilter: any;
	paymentMethod: any;
	setPaymentMethod: any;
	taxDocumentYear: any;
	setTaxDocumentYear: any;
	selectedDocumentKind: any;
	setSelectedDocumentKind: any;
	taxApplicationForm: any;
	setTaxApplicationForm: any;
	taxApplicationDeliveryChannel: any;
	setTaxApplicationDeliveryChannel: any;
	paymentReceiptTaxSupportRequested: any;
	setPaymentReceiptTaxSupportRequested: any;
	documentIssueSignatureMode: any;
	setDocumentIssueSignatureMode: any;
	documentIssueStaffFullName: any;
	setDocumentIssueStaffFullName: any;
	documentIssueStaffRole: any;
	setDocumentIssueStaffRole: any;
	procedureConsentProcedureType: any;
	setProcedureConsentProcedureType: any;
	postVisitCareTopic: any;
	setPostVisitCareTopic: any;
	pricelistSourceKind: any;
	setPricelistSourceKind: any;
	usePricelistAi: any;
	setUsePricelistAi: any;
	odontogramUseSurfaces: any;
	setOdontogramUseSurfaces: any;
	recognitionKind: any;
	setRecognitionKind: any;
	recognitionTarget: any;
	setRecognitionTarget: any;
	importSourceKind: any;
	setImportSourceKind: any;
	documentIngestionTarget: any;
	setDocumentIngestionTarget: any;
	imagingImportSourceKind: any;
	setImagingImportSourceKind: any;
	smartImportMode: any;
	setSmartImportMode: any;
	imagingKindFilter: any;
	setImagingKindFilter: any;
	dicomWebEndpointUrl: any;
	setDicomWebEndpointUrl: any;
	ohifBaseUrl: any;
	setOhifBaseUrl: any;
	telegramBotConfigId: any;
	setTelegramBotConfigId: any;
	telegramLinkSubjectType: any;
	setTelegramLinkSubjectType: any;
	telegramLinkStaffId: any;
	setTelegramLinkStaffId: any;
	telegramOutboxStatusFilter: any;
	setTelegramOutboxStatusFilter: any;
	telegramOutboxTemplateFilter: any;
	setTelegramOutboxTemplateFilter: any;
	onboardingDismissed: any;
	setOnboardingDismissed: any;
	onboardingDismissedAt: any;
	setOnboardingDismissedAt: any;
	onboardingStep: any;
	setOnboardingStep: any;
	onboardingDraftMode: any;
	setOnboardingDraftMode: any;
}


export function useUiPreferencesLogic(props: UiPreferencesLogicProps) {
	const {
		dashboard,
		auth,
		showToast,
		actionFailureToast,
		saveServerUiPreferences,
		uiPreferencesSyncErrorMessage,
		operatorWorkflowFailureMessage,
		loadServerUiPreferences,
		loadUiPreferences,
		safeLocalStorageSetItem,
		uiPreferencesStorageKey,
		saveUiPreferences,
		browserCapabilityFailureMessage,
		inspectBrowserContinuity,
		loadPersistenceHealthRef,
		refreshSpeechRuntimeRef,
		settingsAdminSecretSession,
		setError,
		responseErrorMessage,
		loadWorkspaceProfile,
		pricelistLogic,
		uiPreferencesSyncError,
		setUiPreferencesSyncError,
		uiPreferencesHydrated,
		setUiPreferencesHydrated,
		persistenceHealth,
		setPersistenceHealth,
		persistenceIntegrity,
		setPersistenceIntegrity,
		isPersistenceExporting,
		setIsPersistenceExporting,
		browserContinuity,
		setBrowserContinuity,
		localBridgeReadiness,
		setLocalBridgeReadiness,
		localBridgeUsePlans,
		setLocalBridgeUsePlans,
		uiLanguage,
		setUiLanguage,
		selectedWorkspaceRole,
		setSelectedWorkspaceRole,
		selectedSpecialty,
		setSelectedSpecialty,
		selectedProtocolId,
		setSelectedProtocolId,
		selectedPatientId,
		setSelectedPatientId,
		scheduleDoctorFilterId,
		setScheduleDoctorFilterId,
		scheduleAssistantFilterId,
		setScheduleAssistantFilterId,
		scheduleChairFilterId,
		setScheduleChairFilterId,
		scheduleDefaultDoctorUserId,
		setScheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		setScheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		setScheduleDefaultChairId,
		scheduleStatusFilter,
		setScheduleStatusFilter,
		scheduleDateFilter,
		setScheduleDateFilter,
		paymentMethod,
		setPaymentMethod,
		taxDocumentYear,
		setTaxDocumentYear,
		selectedDocumentKind,
		setSelectedDocumentKind,
		taxApplicationForm,
		setTaxApplicationForm,
		taxApplicationDeliveryChannel,
		setTaxApplicationDeliveryChannel,
		paymentReceiptTaxSupportRequested,
		setPaymentReceiptTaxSupportRequested,
		documentIssueSignatureMode,
		setDocumentIssueSignatureMode,
		documentIssueStaffFullName,
		setDocumentIssueStaffFullName,
		documentIssueStaffRole,
		setDocumentIssueStaffRole,
		procedureConsentProcedureType,
		setProcedureConsentProcedureType,
		postVisitCareTopic,
		setPostVisitCareTopic,
		pricelistSourceKind,
		setPricelistSourceKind,
		usePricelistAi,
		setUsePricelistAi,
		odontogramUseSurfaces,
		setOdontogramUseSurfaces,
		recognitionKind,
		setRecognitionKind,
		recognitionTarget,
		setRecognitionTarget,
		importSourceKind,
		setImportSourceKind,
		documentIngestionTarget,
		setDocumentIngestionTarget,
		imagingImportSourceKind,
		setImagingImportSourceKind,
		smartImportMode,
		setSmartImportMode,
		imagingKindFilter,
		setImagingKindFilter,
		dicomWebEndpointUrl,
		setDicomWebEndpointUrl,
		ohifBaseUrl,
		setOhifBaseUrl,
		telegramBotConfigId,
		setTelegramBotConfigId,
		telegramLinkSubjectType,
		setTelegramLinkSubjectType,
		telegramLinkStaffId,
		setTelegramLinkStaffId,
		telegramOutboxStatusFilter,
		setTelegramOutboxStatusFilter,
		telegramOutboxTemplateFilter,
		setTelegramOutboxTemplateFilter,
		onboardingDismissed,
		setOnboardingDismissed,
		onboardingDismissedAt,
		setOnboardingDismissedAt,
		onboardingStep,
		setOnboardingStep,
		onboardingDraftMode,
		setOnboardingDraftMode,
	} = props;

	
	const uiPreferencesServerReadyRef = useRef(false);
	const uiPreferencesSyncInFlightRef = useRef(false);
	const uiPreferencesRetryTimerRef = useRef<number | null>(null);
	const pendingUiPreferencesSyncRef = useRef<UiPreferences | null>(null);
	const uiPreferencesHydratedRef = useRef(false);

	const recordedPatientViewRef = useRef<string | null>(null);
	/** Набор модулей уже запрашивали с сервера в этом сеансе. */
	const workspaceProfileLoadedRef = useRef(false);
	/*
	 * Счётчик состоявшихся отметок просмотра.
	 *
	 * Виджет «Недавние» читает историю при своём появлении, а отметка уходит
	 * отсюда — и почти всегда позже. Пациент восстанавливается из настроек ещё
	 * до того, как виджет смонтируется, поэтому «перечитать при смене пациента»
	 * не спасает: смены не происходит. Проверено живьём — счётчик оставался
	 * нулём, хотя строка в базе уже была. Номер меняется только после успешного
	 * ответа сервера, и виджет перечитывает список именно тогда, когда там
	 * появилось что-то новое.
	 */
	const [recentPatientViewsVersion, setRecentPatientViewsVersion] = useState(0);

	function currentUiPreferencesInput(): UiPreferencesInput {
		return {
			uiLanguage,
			selectedWorkspaceRole,
			selectedSpecialty,
			selectedProtocolId,
			selectedPatientId,
			scheduleDoctorFilterId,
			scheduleAssistantFilterId,
			scheduleChairFilterId,
			scheduleDefaultDoctorUserId,
			scheduleDefaultAssistantUserId,
			scheduleDefaultChairId,
			scheduleStatusFilter,
			scheduleDateFilter,
			paymentMethod,
			taxDocumentYear,
			selectedDocumentKind,
			taxApplicationForm,
			taxApplicationDeliveryChannel,
			paymentReceiptTaxSupportRequested,
			documentIssueSignatureMode,
			documentIssueStaffFullName,
			documentIssueStaffRole,
			procedureConsentProcedureType,
			postVisitCareTopic,
			pricelistSourceKind,
			usePricelistAi,
			odontogramUseSurfaces,
			recognitionKind,
			recognitionTarget,
			importSourceKind,
			documentIngestionTarget,
			imagingImportSourceKind,
			smartImportMode,
			imagingKindFilter,
			dicomWebEndpointUrl,
			ohifBaseUrl,
			telegramBotConfigId: telegramBotConfigId.trim(),
			telegramLinkSubjectType,
			telegramLinkStaffId: telegramLinkStaffId || null,
			telegramOutboxStatusFilter,
			telegramOutboxTemplateFilter,
			onboardingDismissed,
			onboardingDismissedAt,
			onboardingStep,
			onboardingDraftMode,
		};
	}

	function clearUiPreferencesRetryTimer(): void {
		if (
			typeof window === "undefined" ||
			uiPreferencesRetryTimerRef.current === null
		)
			return;
		window.clearTimeout(uiPreferencesRetryTimerRef.current);
		uiPreferencesRetryTimerRef.current = null;
	}

	function queueUiPreferencesServerSync(
		preferences: UiPreferences,
		options: { delayMs?: number } = {},
	): void {
		pendingUiPreferencesSyncRef.current = preferences;
		if (
			!settingsAdminSecretSession.trim() ||
			!uiPreferencesServerReadyRef.current ||
			uiPreferencesSyncInFlightRef.current ||
			typeof window === "undefined"
		) {
			return;
		}
		clearUiPreferencesRetryTimer();
		uiPreferencesRetryTimerRef.current = window.setTimeout(() => {
			uiPreferencesRetryTimerRef.current = null;
			void flushPendingUiPreferencesServerSync();
		}, options.delayMs ?? 600);
	}

	async function flushPendingUiPreferencesServerSync(): Promise<void> {
		if (
			!settingsAdminSecretSession.trim() ||
			!uiPreferencesServerReadyRef.current ||
			uiPreferencesSyncInFlightRef.current
		)
			return;
		const preferences = pendingUiPreferencesSyncRef.current;
		if (!preferences) return;
		pendingUiPreferencesSyncRef.current = null;
		uiPreferencesSyncInFlightRef.current = true;
		try {
			await saveServerUiPreferences(preferences, settingsAdminSecretSession);
			if (!pendingUiPreferencesSyncRef.current) setUiPreferencesSyncError(null);
		} catch (preferencesError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(preferencesError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!pendingUiPreferencesSyncRef.current)
				pendingUiPreferencesSyncRef.current = preferences;
			setUiPreferencesSyncError(
				uiPreferencesSyncErrorMessage(preferencesError),
			);
		} finally {
			uiPreferencesSyncInFlightRef.current = false;
			const pending = pendingUiPreferencesSyncRef.current;
			if (pending)
				queueUiPreferencesServerSync(pending, {
					delayMs: pending.savedAt === preferences.savedAt ? 5000 : 0,
				});
		}
	}

	const loadPersistenceHealth = useCallback(
		async function loadPersistenceHealth(
			options: { silent?: boolean; adminSecret?: string | undefined } = {},
		) {
			try {
				const response = await fetch("/api/system/persistence/verify", {
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders({}, options.adminSecret),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Проверка сервера не выполнена",
						),
					);
				const report = (await response.json()) as PersistenceIntegrityReport & {
					meta?: PersistenceHealth;
				};
				setPersistenceIntegrity(report);
				setPersistenceHealth(normalizePersistenceHealth(report));
			} catch (healthError) {
				showToast(
					actionFailureToast(
						"Статус сохранности недоступен",
						(healthError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (!options.silent) {
					setError(
						operatorWorkflowFailureMessage(
							"Статус сохранности недоступен",
							healthError,
						),
					);
				}
			}
		},
		[auth, setError, setPersistenceIntegrity, setPersistenceHealth],
	);

	async function loadPersistenceIntegrity(options: { silent?: boolean } = {}) {
		try {
			const response = await fetch("/api/system/persistence/verify", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Проверка резервной копии не выполнена",
					),
				);
			const report = (await response.json()) as PersistenceIntegrityReport & {
				meta?: PersistenceHealth;
			};
			setPersistenceIntegrity(report);
			if (report.meta) setPersistenceHealth(report.meta);
		} catch (verifyError) {
			showToast(
				actionFailureToast(
					"Проверка резервной копии не выполнена",
					(verifyError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Проверка резервной копии не выполнена",
						verifyError,
					),
				);
			}
		}
	}
	loadPersistenceHealthRef.current = loadPersistenceHealth;

	async function downloadPersistenceExport() {
		if (isPersistenceExporting) {
			setError("Дождитесь завершения текущего экспорта резервной копии.");
			return;
		}
		setIsPersistenceExporting(true);
		try {
			const response = await fetch("/api/system/persistence/export", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Экспорт резервной копии не выполнен",
					),
				);
			const blob = await response.blob();
			if (blob.size === 0)
				throw new Error("Сервер вернул пустой файл резервной копии.");
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `dental-crm-state-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.json`;
			document.body.append(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			await loadPersistenceIntegrity({ silent: true });
			setError(null);
		} catch (exportError) {
			showToast(
				actionFailureToast(
					"Экспорт резервной копии не выполнен",
					(exportError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Экспорт резервной копии не выполнен",
					exportError,
				),
			);
		} finally {
			setIsPersistenceExporting(false);
		}
	}

	const refreshBrowserContinuity = useCallback(
		async function refreshBrowserContinuity(
			options: { silent?: boolean } = {},
		) {
			try {
				setBrowserContinuity(await inspectBrowserContinuity());
			} catch (continuityError) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(continuityError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (!options.silent) {
					setError(
						browserCapabilityFailureMessage(
							"Проверка сохранности браузера не выполнена",
							continuityError,
						),
					);
				}
			}
		},
		[setError, setBrowserContinuity],
	);

	async function _loadLocalBridgeReadiness(options: { silent?: boolean } = {}) {
		try {
			const response = await fetch("/api/system/local-bridges/readiness", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Готовность локального модуля не проверена",
					),
				);
			setLocalBridgeReadiness(
				(await response.json()) as LocalBridgeReadinessResponse,
			);
		} catch (bridgeError) {
			showToast(
				actionFailureToast(
					"Готовность локального модуля не проверена",
					(bridgeError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Готовность локального модуля не проверена",
						bridgeError,
					),
				);
			}
		}
	}

	const loadLocalBridgeUsePlans = useCallback(
		async function loadLocalBridgeUsePlans(options: { silent?: boolean } = {}) {
			try {
				const response = await fetch("/api/system/local-bridges/use-plans", {
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"План локального модуля недоступен",
						),
					);
				const payload = (await response.json()) as LocalBridgeUsePlansResponse;
				setLocalBridgeUsePlans(payload);
				setLocalBridgeReadiness(payload.readiness);
			} catch (planError) {
				showToast(
					actionFailureToast(
						"План локального модуля недоступен",
						(planError as { status?: number })?.status ?? null,
					),
					"error",
				);
				if (!options.silent) {
					setError(
						operatorWorkflowFailureMessage(
							"План локального модуля недоступен",
							planError,
						),
					);
				}
			}
		},
		[auth, setLocalBridgeUsePlans, setLocalBridgeReadiness, setError],
	);

	async function requestBrowserStoragePersistence() {
		if (
			typeof navigator === "undefined" ||
			!navigator.storage ||
			typeof navigator.storage.persist !== "function"
		) {
			setError("Постоянное хранилище браузера недоступно на этом устройстве.");
			return;
		}
		try {
			const granted = await navigator.storage.persist();
			await refreshBrowserContinuity({ silent: true });
			if (!granted) {
				setError(
					"Браузер не выдал постоянное хранилище. Локальные черновики работают, но устройство может очистить локальное хранилище при нехватке места.",
				);
			}
		} catch (storageError) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(storageError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				browserCapabilityFailureMessage(
					"Запрос постоянного хранилища не выполнен",
					storageError,
				),
			);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: safe
	const applyUiPreferences = useCallback((preferences: UiPreferences) => {
		setUiLanguage(preferences.uiLanguage);
		setSelectedWorkspaceRole(preferences.selectedWorkspaceRole);
		setSelectedSpecialty(preferences.selectedSpecialty);
		setSelectedProtocolId(preferences.selectedProtocolId);
		setSelectedPatientId(preferences.selectedPatientId);
		setScheduleDoctorFilterId(preferences.scheduleDoctorFilterId);
		setScheduleAssistantFilterId(preferences.scheduleAssistantFilterId);
		setScheduleChairFilterId(preferences.scheduleChairFilterId);
		setScheduleDefaultDoctorUserId(preferences.scheduleDefaultDoctorUserId);
		setScheduleDefaultAssistantUserId(
			preferences.scheduleDefaultAssistantUserId,
		);
		setScheduleDefaultChairId(preferences.scheduleDefaultChairId);
		setScheduleStatusFilter(preferences.scheduleStatusFilter);
		setScheduleDateFilter(preferences.scheduleDateFilter);
		setOnboardingDismissed(preferences.onboardingDismissed);
		setOnboardingDismissedAt(preferences.onboardingDismissedAt ?? null);
		setOnboardingStep(preferences.onboardingStep);
		setOnboardingDraftMode(preferences.onboardingDraftMode);
		setPaymentMethod(preferences.paymentMethod);
		setTaxDocumentYear(preferences.taxDocumentYear);
		setSelectedDocumentKind(preferences.selectedDocumentKind);
		setTaxApplicationForm(preferences.taxApplicationForm);
		setTaxApplicationDeliveryChannel(preferences.taxApplicationDeliveryChannel);
		setPaymentReceiptTaxSupportRequested(
			preferences.paymentReceiptTaxSupportRequested,
		);
		setDocumentIssueSignatureMode(preferences.documentIssueSignatureMode);
		setDocumentIssueStaffFullName(preferences.documentIssueStaffFullName);
		setDocumentIssueStaffRole(preferences.documentIssueStaffRole);
		setProcedureConsentProcedureType(preferences.procedureConsentProcedureType);
		setPostVisitCareTopic(preferences.postVisitCareTopic);
		pricelistLogic.setPricelistSourceKind(preferences.pricelistSourceKind);
		pricelistLogic.setUsePricelistAi(preferences.usePricelistAi);
		setOdontogramUseSurfaces(preferences.odontogramUseSurfaces ?? false);
		setRecognitionKind(preferences.recognitionKind);
		setRecognitionTarget(preferences.recognitionTarget);
		setImportSourceKind(preferences.importSourceKind);
		setDocumentIngestionTarget(preferences.documentIngestionTarget);
		setImagingImportSourceKind(preferences.imagingImportSourceKind);
		setSmartImportMode(preferences.smartImportMode);
		setImagingKindFilter(preferences.imagingKindFilter);
		setDicomWebEndpointUrl(preferences.dicomWebEndpointUrl);
		setOhifBaseUrl(preferences.ohifBaseUrl);
		setTelegramBotConfigId(preferences.telegramBotConfigId);
		setTelegramLinkSubjectType(preferences.telegramLinkSubjectType);
		setTelegramLinkStaffId(preferences.telegramLinkStaffId ?? "");
		setTelegramOutboxStatusFilter(preferences.telegramOutboxStatusFilter);
		setTelegramOutboxTemplateFilter(preferences.telegramOutboxTemplateFilter);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: applyUiPreferences/queueUiPreferencesServerSync are plain functions recreated each render; listing them causes infinite re-run
	useEffect(() => {
		let cancelled = false;
		const preferencesAccessSecret = settingsAdminSecretSession.trim();
		if (!preferencesAccessSecret) {
			uiPreferencesServerReadyRef.current = false;
			uiPreferencesHydratedRef.current = true;
			setUiPreferencesHydrated(true);
			return () => {
				cancelled = true;
			};
		}
		loadServerUiPreferences(preferencesAccessSecret)
			.then(async (serverPreferences) => {
				if (cancelled) return;
				const localPreferences = loadUiPreferences();
				if (
					serverPreferences &&
					(!localPreferences.savedAt ||
						(serverPreferences.savedAt &&
							serverPreferences.savedAt > localPreferences.savedAt))
				) {
					applyUiPreferences(serverPreferences);
					safeLocalStorageSetItem(
						uiPreferencesStorageKey,
						JSON.stringify(serverPreferences),
					);
					setUiPreferencesSyncError(null);
				} else if (!serverPreferences && localPreferences.savedAt) {
					await saveServerUiPreferences(
						localPreferences,
						preferencesAccessSecret,
					);
					if (!cancelled) setUiPreferencesSyncError(null);
				}
			})
			.catch((preferencesError) => {
				if (!cancelled) {
					setUiPreferencesSyncError(
						uiPreferencesSyncErrorMessage(preferencesError),
					);
				}
			})
			.finally(() => {
				if (!cancelled) {
					uiPreferencesServerReadyRef.current = true;
					uiPreferencesHydratedRef.current = true;
					setUiPreferencesHydrated(true);
					const pendingPreferences = pendingUiPreferencesSyncRef.current;
					if (pendingPreferences)
						queueUiPreferencesServerSync(pendingPreferences, { delayMs: 0 });
				}
			});
		return () => {
			cancelled = true;
		};
	}, [
		settingsAdminSecretSession,
		setUiPreferencesHydrated,
		setUiPreferencesSyncError,
	]);

	/*
	 * Отметка об открытии карточки пациента.
	 *
	 * Виджет «Недавние» в шапке рабочего места читал таблицу
	 * recent_patient_history, в которую не писал никто и никогда: ни одной
	 * вставки во всём сервере, ноль строк в живой базе. Каждому пользователю
	 * каждый день показывалось «История просмотров пуста», и выглядело это как
	 * «функция есть, просто ещё не накопилось».
	 *
	 * Отметка ставится здесь, а не в обработчиках нажатий: карточка выбирается
	 * из списка, из поиска, из задачи, из расписания и из самого виджета —
	 * пришлось бы дописывать пять мест и забыть шестое. Смена selectedPatientId
	 * — единственное общее событие.
	 *
	 * Ошибка запроса намеренно проглатывается: история просмотров не стоит
	 * того, чтобы мешать врачу работать сообщением о сбое.
	 */
	/*
	 * Набор включённых модулей читается с сервера при запуске.
	 *
	 * loadWorkspaceProfile() в собственном комментарии заявлена «used in App
	 * startup» — и её не звал НИКТО. Из-за этого набор модулей жил только в
	 * localStorage браузера: на втором устройстве, в другом браузере и у второго
	 * сотрудника клиника получала все модули включёнными, а выбор владельца никуда
	 * не доходил. Вместе с тем, что сервер до миграции 0139 отдавал константу и не
	 * сохранял ничего, вся модульность держалась на одном лишь localStorage.
	 *
	 * Запрос уходит один раз за сеанс, после загрузки рабочей смены: до неё нет ни
	 * токена сотрудника, ни организации.
	 */
	useEffect(() => {
		if (!dashboard || workspaceProfileLoadedRef.current) return;
		workspaceProfileLoadedRef.current = true;
		void loadWorkspaceProfile();
	}, [dashboard]);

	useEffect(() => {
		if (!selectedPatientId || !dashboard) return;
		if (recordedPatientViewRef.current === selectedPatientId) return;
		recordedPatientViewRef.current = selectedPatientId;
		void fetch("/api/hr/recent-patients", {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({ patientId: selectedPatientId }),
		})
			.then((response) => {
				if (response.ok) setRecentPatientViewsVersion((version) => version + 1);
			})
			.catch((err) => {
				showToast(
					actionFailureToast(
						"Ошибка обновления списка пациентов",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
			});
	}, [selectedPatientId, dashboard, auth.denteClinicalMutationHeaders]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: currentUiPreferencesInput/queueUiPreferencesServerSync are plain closures over component state; they are intentionally excluded to prevent infinite re-render loops
	useEffect(() => {
		if (!uiPreferencesHydrated) return undefined;
		const savedPreferences = saveUiPreferences(currentUiPreferencesInput());
		if (!savedPreferences) {
			setUiPreferencesSyncError(
				"Настройки интерфейса не сохранены: браузер заблокировал локальное хранилище.",
			);
			return undefined;
		}
		queueUiPreferencesServerSync(savedPreferences, { delayMs: 600 });
		return undefined;
	}, [uiPreferencesHydrated, setUiPreferencesSyncError]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearUiPreferencesRetryTimer is a plain function (uses only refs); including it causes infinite re-render
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const retryPendingUiPreferences = () => {
			const pendingPreferences =
				pendingUiPreferencesSyncRef.current ?? loadUiPreferences();
			if (pendingPreferences)
				queueUiPreferencesServerSync(pendingPreferences, { delayMs: 0 });
		};
		window.addEventListener("online", retryPendingUiPreferences);
		return () => {
			window.removeEventListener("online", retryPendingUiPreferences);
			clearUiPreferencesRetryTimer();
		};
	}, []);

	return {
		currentUiPreferencesInput,
		clearUiPreferencesRetryTimer,
		queueUiPreferencesServerSync,
		flushPendingUiPreferencesServerSync,
		loadPersistenceHealth,
		loadPersistenceIntegrity,
		downloadPersistenceExport,
		refreshBrowserContinuity,
		_loadLocalBridgeReadiness,
		loadLocalBridgeUsePlans,
		requestBrowserStoragePersistence,
		applyUiPreferences,
		recentPatientViewsVersion
	};
}
