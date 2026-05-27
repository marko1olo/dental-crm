import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FlipHorizontal,
  Gauge,
  History,
  Image as ImageIcon,
  Layers3,
  Mic,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ScanSearch,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import type { ChangeEvent } from "react";
import type {
  ClinicMode,
  DentalMaterialKind,
  DentalRestorationType,
  DentalSpecialty,
  DicomMprProjection,
  DocumentIngestionTarget,
  ImagingViewerWindowPreset,
  ImportSourceKind,
  PricelistSourceKind,
  SmartImportMode,
  StaffRole
} from "@dental/shared";
import { viewLabels as workspaceViewLabels } from "./workspaceShell";

type MprProjection = DicomMprProjection;
type MprWindowPreset = Extract<ImagingViewerWindowPreset, "bone" | "soft_tissue" | "implant" | "custom">;
type SettingsTabId = "clinic" | "access" | "telegram" | "protocols" | "rules" | "prices" | "sources" | "ai" | "imports" | "audit";
type SettingsTab = { id: SettingsTabId; title: string };
type CbctWorkbenchPlane = { key: MprProjection; title: string; detail: string };
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

type SettingsViewProps = Record<string, any>;
const viewLabels = workspaceViewLabels as Record<string, string>;
const staffCreationRoles: StaffRole[] = ["doctor", "administrator", "assistant", "manager"];
const clinicalRuleOwnerRoles: StaffRole[] = ["doctor", "assistant", "administrator", "manager", "owner"];
const clinicPublicLookupFieldLabels: Record<string, string> = {
  clinicName: "Название",
  legalName: "Юрлицо",
  inn: "ИНН",
  kpp: "КПП",
  ogrn: "ОГРН",
  address: "Адрес",
  phone: "Телефон",
  email: "Email",
  website: "Сайт",
  medicalLicenseNumber: "Лицензия",
  medicalLicenseIssuedAt: "Дата лицензии",
  medicalLicenseIssuer: "Кем выдана",
  bankDetails: "Банк"
};
const migrationReadinessLevelLabels: Record<string, string> = {
  ready_for_preview: "готово к preview",
  needs_bridge: "нужен bridge",
  needs_export: "нужен export",
  manual_review: "ручной разбор",
  blocked: "заблокировано"
};
const migrationBridgeKitKindLabels: Record<string, string> = {
  none: "нет",
  file_upload: "файл/таблица",
  local_db_bridge: "DB bridge",
  dicom_export: "DICOM export",
  image_manifest: "manifest снимков",
  network_share_bridge: "сетевая папка",
  browser_manifest_bridge: "browser manifest",
  manual_manifest: "ручной manifest"
};
const migrationOperatorPacketStatusLabels: Record<string, string> = {
  ready_for_preview: "готово к preview",
  needs_admin: "нужен админ",
  needs_bridge: "нужен bridge",
  needs_export: "нужен export",
  manual_review: "ручной разбор",
  blocked: "заблокировано",
  empty: "нет источников"
};

export function SettingsView(props: SettingsViewProps) {
  const {
    activePatient,
    activeSettingsTabButtonRef,
    activeSpeechProviderHealth,
    activeWorkspaceProfile,
    addChair,
    addStaffMember,
    analyzePricelist,
    applyProtocolTemplate,
    attachPricelistImage,
    browserCanRequestPersistentStorage,
    browserContinuity,
    browserContinuityChecks,
    browserContinuityState,
    browserContinuityValue,
    browserDirectoryInputRef,
    browserDirectoryPickerAvailable,
    browserMigrationDiscovery,
    browserMigrationInputRef,
    browserPickedImagingFolder,
    buildDicomFolderWorkupPlan,
    buildDicomRenderCachePlan,
    buildDicomViewerLaunchManifest,
    buildDicomViewerToolStateBundle,
    buildDicomViewerWorkbenchManifest,
    cbctWorkbenchPlanes,
    cbctWorkbenchProjections,
    cbctWorkbenchSeries,
    cbctWorkbenchTools,
    chairScheduleDirtyIds,
    chairScheduleDrafts,
    chairScheduleSaveStates,
    chairScheduleSavingId,
    changeClinicMode,
    checkDicomWebConnector,
    checkDicomWorkstationReadiness,
    chooseRecognitionPreset,
    clinicPublicLookup,
    clearBrowserPickedImagingFolderPreview,
    clearDicomWorkbenchRecovery,
    clearLocalImagingFolderRecovery,
    clearPricelistImage,
    clinicalRuleActionLabels,
    clinicalRuleSeverityLabels,
    clinicModeLabels,
    clinicProfileDraft,
    clinicProfileSaveState,
    commitImagingImport,
    commitImport,
    commitSmartImport,
    copyTelegramTextToClipboard,
    createClinicalRuleFromSettings,
    createTelegramLinkCode,
    dashboard,
    defaultDicomFirstFrameViewerState,
    dentalMaterialKindLabels,
    dentalRestorationTypeLabels,
    dicomFirstFrameImageStyle,
    dicomFirstFramePreview,
    dicomFirstFrameStatusLabels,
    dicomFirstFrameViewerState,
    dicomFolderSeriesScan,
    dicomFolderWorkupPathLabels,
    dicomFolderWorkupPlan,
    dicomLabel,
    dicomLocalFolderDiscovery,
    dicomQualityModeLabels,
    dicomReadinessCheckLabels,
    dicomRenderCachePlan,
    dicomRuntimeTierLabels,
    dicomSeriesPreview,
    dicomSeriesViewerLabels,
    dicomTextureStrategyLabels,
    dicomViewerLaunchManifest,
    dicomViewerLaunchModeLabels,
    dicomViewerToolStateBundle,
    dicomViewerWorkbenchManifest,
    dicomWebCheck,
    dicomWebEndpointUrl,
    dicomWebStatusLabels,
    dicomWorkbenchLocalSavedAt,
    dicomWorkbenchServerBundle,
    dicomWorkbenchSourceIsRedacted,
    dicomWorkstationReadiness,
    discoverDicomFolders,
    discoverMigrationSources,
    documentDetectedKindLabel,
    documentIngestion,
    documentIngestionQualityLabels,
    documentIngestionTarget,
    documentLabels,
    downloadDicomViewerToolStateBundle,
    downloadDicomWorkbenchManifest,
    downloadMigrationHandoffReport,
    downloadPersistenceExport,
    downloadSmartImportSafeHandoffReport,
    downloadSmartImportReport,
    downloadTelegramQrSvg,
    filteredTelegramOutboxItems,
    formatDateTime,
    formatMegabytes,
    formatTime,
    handleBrowserDirectoryInputChange,
    handleBrowserMigrationInputChange,
    hiddenTelegramOutboxItemCount,
    imagingConnectorCards,
    imagingFolderPath,
    imagingFolderScan,
    imagingImportCommit,
    imagingImportPreview,
    imagingImportSourceKind,
    imagingImportText,
    imagingKindLabels,
    imagingSourceChoices,
    imagingSourceDetails,
    imagingSourceLabels,
    imagingViewerCapabilities,
    importCommit,
    importIntake,
    importPreview,
    importSourceKind,
    importSourceLabels,
    importText,
    ingestImportFile,
    ingestionTargetLabels,
    integrationCapabilityLabels,
    integrationCategoryLabels,
    integrationStatusLabels,
    isBrowserImagingFolderPicking,
    isBrowserMigrationScanning,
    isClinicPublicLookupLoading,
    isClinicalRuleSaving,
    isDicomFirstFramePreviewing,
    isDicomFolderWorkupPlanning,
    isDicomLocalDiscovering,
    isDicomManifestBuilding,
    isDicomRenderCachePlanning,
    isDicomSeriesPreviewLoading,
    isDicomToolStateBuilding,
    isDicomWebChecking,
    isDicomWorkbenchBuilding,
    isDicomWorkbenchReconnecting,
    isDicomWorkbenchServerSaving,
    isDicomWorkstationChecking,
    isDocumentIngesting,
    isImagingFolderScanning,
    isImagingImportCommitting,
    isImagingImportLoading,
    isImportCommitting,
    isImportDictating,
    isImportLoading,
    isLocalImagingOrganizing,
    isMigrationAutopilotLoading,
    isMigrationHandoffReportLoading,
    isMigrationSourceDiscovering,
    isMigrationSourceProbeLoading,
    isMigrationSourceWorkupLoading,
    isPersistenceExporting,
    isPricelistAnalyzing,
    isRecognitionLoading,
    isSmartImportCommitting,
    isSmartImportLoading,
    isSmartReportLoading,
    isSmartSafeReportLoading,
    isTelegramChatLinksLoadingMore,
    isTelegramLinkCodesLoadingMore,
    isTelegramLinkCreating,
    isTelegramLoading,
    isTelegramOutboxItemDueForUi,
    isTelegramOutboxLoadingMore,
    isTelegramSendingDue,
    isTelegramSettingsSaving,
    latestDicomWorkbenchServerBundle,
    legalMissingFields,
    legalReadinessPercent,
    loadLocalBridgeUsePlans,
    loadMoreTelegramChatLinks,
    loadMoreTelegramLinkCodes,
    loadMoreTelegramOutbox,
    loadPersistenceHealth,
    loadPersistenceIntegrity,
    loadTelegramControlPlane,
    localBridgeReadiness,
    localBridgeStatusLabels,
    localBridgeStatusState,
    localBridgeStatusValue,
    localBridgeUsePathLabels,
    localBridgeUsePlans,
    localImagingFolderDraft,
    localImagingModelRoleLabels,
    localImagingOrganizer,
    localImagingOrganizerActionLabels,
    lookupClinicPublicProfile,
    lockTelegramAdminSession,
    markTelegramSettingsDirty,
    megabytes,
    migrationAutopilot,
    migrationSourceDiscovery,
    migrationSourceProbe,
    migrationSourceWorkup,
    mprAxisDeg,
    mprCacheModeLabels,
    mprCrosshairEnabled,
    mprLinkedPlanesEnabled,
    mprLoadStrategyLabels,
    mprProjection,
    mprProjectionLabels,
    mprResourceTierLabels,
    mprSlabMm,
    mprToolLabels,
    mprWindowPreset,
    mprWindowPresetLabels,
    newChairHasMicroscope,
    newChairHasSurgeryKit,
    newChairHasXraySensor,
    newChairName,
    newRuleAction,
    newRuleBlockedServiceId,
    newRuleCategory,
    newRuleCompletedServiceId,
    newRuleOwnerRole,
    newRulePatientText,
    newRuleRequiredServiceId,
    newRuleSeverity,
    newRuleSpecialty,
    newRuleTitle,
    newRuleTriggerServiceId,
    newRuleWarningText,
    newStaffName,
    newStaffRole,
    newStaffSpecialty,
    normalizedClinicalRuleAction,
    normalizedClinicalRuleSeverity,
    normalizedDentalSpecialty,
    normalizedServiceCategory,
    normalizedStaffRole,
    normalizedTelegramBotMode,
    normalizedTelegramLinkSubjectType,
    normalizedTelegramOutboxStatusFilter,
    normalizedTelegramOutboxTemplateFilter,
    normalizedTelegramPrivacyMode,
    normalizeUiLanguageInput,
    ohifBaseUrl,
    organizeLocalImagingSources,
    persistenceHealth,
    persistenceIntegrity,
    pickBrowserImagingFolder,
    pickBrowserMigrationSource,
    policyAuditEventLabels,
    prepareDicomWorkbenchFromFolder,
    previewDicomFirstFrame,
    previewDicomSeries,
    planMigrationDiscoveryCandidate,
    probeMigrationDiscoveryCandidate,
    previewImagingImport,
    previewImport,
    previewSmartImport,
    previewTelegramTemplate,
    pricelistAnalysis,
    pricelistImageBase64,
    pricelistImageName,
    pricelistImageNote,
    pricelistItemMaterialText,
    pricelistMaterialSummaryText,
    pricelistParserModeLabels,
    pricelistRecognitionBrandGroups,
    pricelistRecognitionServiceGroups,
    pricelistSourceKind,
    pricelistSourceKindLabels,
    pricelistText,
    recognitionJob,
    recognitionKind,
    recognitionPresets,
    recognitionTarget,
    recognitionTargetLabels,
    recognitionText,
    reconnectDicomWorkbenchFromCurrentFolder,
    refreshBrowserContinuity,
    refreshSpeechRuntime,
    addMigrationDiscoveryCandidateToSmartImport,
    rememberLocalImagingFolder,
    reopenOnboarding,
    requestBrowserStoragePersistence,
    restoreDicomWorkbenchServerBundle,
    revokeTelegramChatLink,
    runMigrationAutopilot,
    runRecognitionJob,
    saveChairSchedule,
    saveClinicProfileFromDraft,
    saveDicomWorkbenchBundleToServer,
    saveStaffSchedule,
    saveTelegramSettings,
    scanDicomFolderSeries,
    scanImagingFolder,
    selectedUiLanguageOption,
    sendDueTelegramOutbox,
    sendRecognitionResultToImport,
    sendTelegramOutboxItem,
    serviceCategoryLabels,
    serviceTitle,
    setDicomFirstFramePreview,
    setDicomFirstFrameViewerState,
    setDicomFolderSeriesScan,
    setDicomFolderWorkupPlan,
    setDicomLocalFolderDiscovery,
    setDicomRenderCachePlan,
    setDicomSeriesPreview,
    setDicomViewerLaunchManifest,
    setDicomViewerToolStateBundle,
    setDicomViewerWorkbenchManifest,
    setDicomWebCheck,
    setDicomWebEndpointUrl,
    setDicomWorkbenchLocalSavedAt,
    setDicomWorkstationReadiness,
    setDocumentIngestionTarget,
    setImagingFolderPath,
    setImagingFolderScan,
    setImagingImportCommit,
    setImagingImportPreview,
    setImagingImportSourceKind,
    setImagingImportText,
    setImportCommit,
    setImportIntake,
    setImportPreview,
    setImportSourceKind,
    setImportText,
    setLocalImagingOrganizer,
    setMprAxisDeg,
    setMprCrosshairEnabled,
    setMprLinkedPlanesEnabled,
    setMprProjection,
    setMprSlabMm,
    setMprWindowPreset,
    setNewChairHasMicroscope,
    setNewChairHasSurgeryKit,
    setNewChairHasXraySensor,
    setNewChairName,
    setNewRuleAction,
    setNewRuleBlockedServiceId,
    setNewRuleCategory,
    setNewRuleCompletedServiceId,
    setNewRuleOwnerRole,
    setNewRulePatientText,
    setNewRuleRequiredServiceId,
    setNewRuleSeverity,
    setNewRuleSpecialty,
    setNewRuleTitle,
    setNewRuleTriggerServiceId,
    setNewRuleWarningText,
    setNewStaffName,
    setNewStaffRole,
    setNewStaffSpecialty,
    setOhifBaseUrl,
    setPricelistAnalysis,
    setPricelistSourceKind,
    setPricelistText,
    setRecognitionJob,
    setRecognitionText,
    setSettingsTab,
    setSmartImportCommit,
    setSmartImportMode,
    setSmartImportPreview,
    setSmartImportText,
    setTelegramAdminSecretDraft,
    setTelegramAllowVoiceIntakeDraft,
    setTelegramBotConfigId,
    setTelegramBotUsernameDraft,
    setTelegramEnabledFeaturesDraft,
    setTelegramLinkActionState,
    setTelegramLinkCode,
    setTelegramLinkStaffId,
    setTelegramLinkSubjectType,
    setTelegramMapsUrlDraft,
    setTelegramModeDraft,
    setTelegramOutboxStatusFilter,
    setTelegramOutboxTemplateFilter,
    setTelegramOwnBotUsernameDraft,
    setTelegramPatientPortalBaseUrlDraft,
    setTelegramPrivacyModeDraft,
    setTelegramReminderLeadTimesDraft,
    setTelegramReviewRequestDelayDraft,
    setTelegramReviewUrlDraft,
    setTelegramStaffEscalationChannelDraft,
    setTelegramTokenTtlDraft,
    setTelegramWebhookBaseUrlDraft,
    setTelegramWelcomeImageUrlDraft,
    settingsTab,
    settingsTabs,
    setUiLanguage,
    setUsePricelistAi,
    smartImportCommit,
    smartImportMode,
    smartImportModeLabels,
    smartImportPreview,
    smartImportText,
    specialtyLabels,
    speechGatewayCanUpload,
    speechGatewayHealthReport,
    speechGatewayStatus,
    speechProviderConnectorLabels,
    speechProviderHealthById,
    speechProviderHealthLabels,
    speechProviderModeLabels,
    speechProviderRuntimeById,
    speechProviderSelectionLabels,
    speechProviderStatusLabels,
    speechRecordingPathLabels,
    speechRecordingRecovery,
    speechRecordingStrategy,
    speechRecoveryStateLabels,
    staffRoleLabels,
    staffScheduleDirtyIds,
    staffScheduleDraftFromWorkingHours,
    staffScheduleDrafts,
    staffScheduleSaveStates,
    staffScheduleSavingId,
    stageLocalImagingFolderRecovery,
    startImportDictation,
    telegramAdminSecretDraft,
    telegramAdminSecretSession,
    telegramAllowVoiceIntakeDraft,
    telegramBotConfigId,
    telegramBotUsernameDraft,
    telegramChatLinkLedger,
    telegramChatLinks,
    telegramClassificationLabels,
    telegramDeliveryStatusLabels,
    telegramEnabledFeaturesDraft,
    telegramFeatureHelp,
    telegramFeatureLabel,
    telegramFeatureOptions,
    telegramFeaturePlan,
    telegramHumanMessage,
    telegramInlineButtonKindLabels,
    telegramInlineButtonRowsFromReplyMarkup,
    telegramLinkActionState,
    telegramLinkCode,
    telegramLinkCodeLedger,
    telegramLinkCodes,
    telegramLinkCodeStatusLabels,
    telegramLinkStaffId,
    telegramLinkStaffOptions,
    telegramLinkSubjectType,
    telegramMapsUrlDraft,
    telegramModeDraft,
    telegramModeHints,
    telegramModeLabels,
    telegramOutbox,
    telegramOutboxStatusFilter,
    telegramOutboxStatusFilterLabels,
    telegramOutboxStatusFilterOptions,
    telegramOutboxTemplateFilter,
    telegramOutboxTemplateFilterLabels,
    telegramOutboxTemplateFilterOptions,
    telegramOwnBotUsernameDraft,
    telegramPatientPortalBaseUrlDraft,
    telegramPostVisitCheckupDelayDrafts,
    telegramPostVisitCheckupDelayFields,
    telegramPreview,
    telegramPrivacyModeDraft,
    telegramPrivacyModeHints,
    telegramPrivacyModeLabels,
    telegramQrSvgToDataUrl,
    telegramReminderLeadTimesDraft,
    telegramReviewRequestDelayDraft,
    telegramReviewUrlDraft,
    telegramRevokingLinkId,
    telegramSendingItemId,
    telegramSettingsDirty,
    telegramSettingsSaveError,
    telegramSettingsSaveState,
    telegramStaffEscalationChannelDraft,
    telegramStatus,
    telegramSubjectName,
    telegramTemplateLabels,
    telegramTokenTtlDraft,
    telegramVisualCardFields,
    telegramVisualCardUrlDrafts,
    telegramWebhookBaseUrlDraft,
    telegramWelcomeImageUrlDraft,
    toggleChairWorkingDay,
    toggleClinicalRule,
    toggleClinicWorkingDay,
    toggleStaffWorkingDay,
    toggleTelegramFeature,
    uiLanguage,
    uiLanguageOptions,
    unlockTelegramAdminSession,
    updateChairScheduleDay,
    updateChairScheduleDraft,
    updateClinicProfileDraft,
    updateStaffScheduleDay,
    updateStaffScheduleDraft,
    updateTelegramPostVisitCheckupDelayDraft,
    updateTelegramVisualCardUrlDraft,
    usePricelistAi,
    visibleTelegramOutboxItems,
    weekdayOptions,
    workspaceScopeLabels
  } = props;

  const recognitionInputReady = recognitionText.trim().length > 0;
  const smartImportInputReady = smartImportText.trim().length > 0;
  const imagingImportInputReady = imagingImportText.trim().length > 0;
  const patientImportInputReady = importText.trim().length > 0;
  const newStaffReadyToCreate = newStaffName.trim().length > 0;
  const newChairReadyToCreate = newChairName.trim().length > 0;
  const adminSecretReady = telegramAdminSecretDraft.trim().length > 0;

  return (
        <section className="settings-zone" id="settings" aria-label="Настройки и перенос данных">
          <div className="settings-heading">
            <div>
              <p className="eyebrow">Настройки</p>
              <h2>Настройки клиники</h2>
            </div>
            <div className="settings-heading-actions">
              <span>Не показывается врачу в рабочей смене</span>
              <button className="secondary-button" type="button" onClick={reopenOnboarding}>
                <ClipboardCheck aria-hidden="true" /> Мастер первого запуска
              </button>
            </div>
          </div>

          <div className="settings-tabs" aria-label="Раздел настроек">
            {(settingsTabs as SettingsTab[]).map((tab) => (
              <button
                className={settingsTab === tab.id ? "active" : ""}
                key={tab.id}
                ref={settingsTab === tab.id ? activeSettingsTabButtonRef : undefined}
                type="button"
                onClick={() => {
                  setSettingsTab(tab.id);
                  window.location.hash = `settings/${tab.id}`;
                }}
              >
                {tab.title}
              </button>
            ))}
          </div>

          {settingsTab === "clinic" ? (
          <section className="clinic-config" aria-label="Аккаунт клиники и команда">
            <div className="clinic-config-head">
              <div>
                <p className="eyebrow">Аккаунт клиники</p>
                <h2>{dashboard.clinicSettings.profile.clinicName}</h2>
                <p>
                  {dashboard.clinicSettings.profile.legalName} · {dashboard.clinicSettings.profile.address} ·{" "}
                  {dashboard.clinicSettings.profile.timezone}
                </p>
              </div>
              <span>{clinicModeLabels[dashboard.clinicSettings.profile.mode].title}</span>
            </div>

            <div className="mode-grid" aria-label="Режим продукта">
              {(Object.keys(clinicModeLabels) as ClinicMode[]).map((mode: any) => (
                <button
                  className={`mode-card ${dashboard.clinicSettings.profile.mode === mode ? "active" : ""}`}
                  key={mode}
                  type="button"
                  onClick={() => changeClinicMode(mode)}
                >
                  <strong>{clinicModeLabels[mode].title}</strong>
                  <span>{clinicModeLabels[mode].detail}</span>
                </button>
              ))}
            </div>

            <div className="clinic-hints">
              {dashboard.clinicSettings.modeHints.map((hint: any) => (
                <span key={hint}>{hint}</span>
              ))}
            </div>

            <div className="mode-readiness">
              <div>
                <p className="eyebrow">Готовность режима</p>
                <strong>{dashboard.shiftIntelligence.modeFit.fitScore}%</strong>
                <span>{dashboard.shiftIntelligence.modeFit.lowFrictionNextStep}</span>
              </div>
              <div>
                <p className="eyebrow">Открытые роли</p>
                {dashboard.shiftIntelligence.roleQueues.map((queue: any) => (
                  <span key={queue.role}>
                    {staffRoleLabels[queue.role]}: {queue.openItems}
                  </span>
                ))}
              </div>
            </div>

            <section className="clinic-legal-form" aria-label="Юридический профиль клиники">
              <div className="clinic-legal-summary">
                <div>
                  <p className="eyebrow">Профиль документов</p>
                  <h3>Данные для договоров, актов, чеков и налоговой справки</h3>
                  <p>
                    Эти поля сохраняются на сервере и подставляются в шаблоны. Если критичные поля пустые, выдача финального документа блокируется.
                  </p>
                </div>
                <strong>{legalReadinessPercent}%</strong>
                <span>{legalMissingFields.length ? `Не хватает: ${legalMissingFields.join(", ")}` : "Минимальные поля заполнены"}</span>
              </div>
              <div className="clinic-profile-form-grid">
                <label>
                  Рабочее название
                  <input value={clinicProfileDraft.clinicName} onChange={(event: any) => updateClinicProfileDraft("clinicName", event.target.value)} />
                </label>
                <label>
                  Юридическое лицо
                  <input value={clinicProfileDraft.legalName} onChange={(event: any) => updateClinicProfileDraft("legalName", event.target.value)} />
                </label>
                <label>
                  ИНН
                  <input inputMode="numeric" value={clinicProfileDraft.inn} onChange={(event: any) => updateClinicProfileDraft("inn", event.target.value.replace(/[^\d]/g, "").slice(0, 12))} />
                </label>
                <label>
                  КПП
                  <input inputMode="numeric" value={clinicProfileDraft.kpp} onChange={(event: any) => updateClinicProfileDraft("kpp", event.target.value.replace(/[^\d]/g, "").slice(0, 9))} />
                </label>
                <label>
                  ОГРН / ОГРНИП
                  <input inputMode="numeric" value={clinicProfileDraft.ogrn} onChange={(event: any) => updateClinicProfileDraft("ogrn", event.target.value.replace(/[^\d]/g, "").slice(0, 15))} />
                </label>
                <label>
                  Телефон
                  <input value={clinicProfileDraft.phone} onChange={(event: any) => updateClinicProfileDraft("phone", event.target.value)} />
                </label>
                <label>
                  Email
                  <input value={clinicProfileDraft.email} onChange={(event: any) => updateClinicProfileDraft("email", event.target.value)} />
                </label>
                <label>
                  Сайт
                  <input value={clinicProfileDraft.website} onChange={(event: any) => updateClinicProfileDraft("website", event.target.value)} />
                </label>
                <label className="form-span-2">
                  Адрес
                  <input value={clinicProfileDraft.address} onChange={(event: any) => updateClinicProfileDraft("address", event.target.value)} />
                </label>
                <label>
                  Номер лицензии
                  <input value={clinicProfileDraft.medicalLicenseNumber} onChange={(event: any) => updateClinicProfileDraft("medicalLicenseNumber", event.target.value)} />
                </label>
                <label>
                  Дата лицензии
                  <input value={clinicProfileDraft.medicalLicenseIssuedAt} onChange={(event: any) => updateClinicProfileDraft("medicalLicenseIssuedAt", event.target.value)} />
                </label>
                <label className="form-span-2">
                  Кем выдана лицензия
                  <input value={clinicProfileDraft.medicalLicenseIssuer} onChange={(event: any) => updateClinicProfileDraft("medicalLicenseIssuer", event.target.value)} />
                </label>
                <label>
                  Подписант
                  <input value={clinicProfileDraft.signatoryName} onChange={(event: any) => updateClinicProfileDraft("signatoryName", event.target.value)} />
                </label>
                <label>
                  Должность подписанта
                  <input value={clinicProfileDraft.signatoryTitle} onChange={(event: any) => updateClinicProfileDraft("signatoryTitle", event.target.value)} />
                </label>
                <label className="form-span-2">
                  Банковские реквизиты
                  <textarea value={clinicProfileDraft.bankDetails} onChange={(event: any) => updateClinicProfileDraft("bankDetails", event.target.value)} />
                </label>
                <label>
                  Часовой пояс
                  <input value={clinicProfileDraft.timezone} onChange={(event: any) => updateClinicProfileDraft("timezone", event.target.value)} />
                </label>
                <label>
                  Язык интерфейса
                  <select value={uiLanguage} onChange={(event: any) => setUiLanguage(normalizeUiLanguageInput(event.target.value))}>
                    {uiLanguageOptions.map((option: any) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="field-note">{selectedUiLanguageOption.detail}</small>
                </label>
                <label>
                  Минут на визит
                  <input
                    inputMode="numeric"
                    value={clinicProfileDraft.defaultVisitMinutes}
                    onChange={(event: any) => updateClinicProfileDraft("defaultVisitMinutes", event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                  />
                </label>
                <label>
                  Начало смены
                  <input type="time" value={clinicProfileDraft.workdayStart} onChange={(event: any) => updateClinicProfileDraft("workdayStart", event.target.value)} />
                </label>
                <label>
                  Конец смены
                  <input type="time" value={clinicProfileDraft.workdayEnd} onChange={(event: any) => updateClinicProfileDraft("workdayEnd", event.target.value)} />
                </label>
                <label>
                  Буфер, мин
                  <input
                    inputMode="numeric"
                    value={clinicProfileDraft.appointmentBufferMinutes}
                    onChange={(event: any) => updateClinicProfileDraft("appointmentBufferMinutes", event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                  />
                </label>
                <div className="weekday-toggle-row form-span-2" role="group" aria-label="Рабочие дни клиники">
                  <span>Рабочие дни</span>
                  {weekdayOptions.map((day: any) => (
                    <button
                      className={clinicProfileDraft.workingDays.includes(day.value) ? "active" : ""}
                      key={day.value}
                      type="button"
                      onClick={() => toggleClinicWorkingDay(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <label className="checkbox-line">
                  <input
                    checked={clinicProfileDraft.egiszEnabled}
                    type="checkbox"
                    onChange={(event: any) => updateClinicProfileDraft("egiszEnabled", event.target.checked)}
                  />
                  ЕГИСЗ-адаптер включен
                </label>
              </div>
              <div className="clinic-profile-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void lookupClinicPublicProfile()}
                  disabled={isClinicPublicLookupLoading}
                >
                  <Search aria-hidden="true" /> {isClinicPublicLookupLoading ? "Ищу реквизиты" : "Найти реквизиты"}
                </button>
                <button className="primary-button" type="button" onClick={() => void saveClinicProfileFromDraft()} disabled={clinicProfileSaveState === "saving"}>
                  <ShieldCheck aria-hidden="true" /> {clinicProfileSaveState === "saving" ? "Сохраняю" : "Сохранить профиль"}
                </button>
                <span className={`save-state save-state-${clinicProfileSaveState}`}>
                  {clinicProfileSaveState === "saved"
                    ? "Сохранено"
                    : clinicProfileSaveState === "error"
                      ? "Проверьте поля"
                      : "Изменения не выдаются в документах до сохранения"}
                </span>
              </div>
              {clinicPublicLookup ? (
                <div className="clinic-public-lookup-result" data-testid="clinic-public-lookup-result" aria-label="Публичный поиск реквизитов клиники">
                  <div className="dicom-discovery-head">
                    <strong>
                      Публичный поиск: {clinicPublicLookup.providerStatus} · безопасный запрос {clinicPublicLookup.safeQuery || "не сформирован"}
                    </strong>
                    <span>{clinicPublicLookup.nextAction}</span>
                  </div>
                  {clinicPublicLookup.suggestions.length ? (
                    <div className="clinic-public-suggestions">
                      {clinicPublicLookup.suggestions.slice(0, 4).map((suggestion: any, index: number) => (
                        <article key={`${suggestion.source}-${index}`}>
                          <strong>
                            {suggestion.source} · {Math.round(suggestion.confidence * 100)}%
                          </strong>
                          <p>
                            {Object.entries(suggestion.fields)
                              .map(([key, value]) => `${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value)}`)
                              .join(" · ")}
                          </p>
                          {suggestion.warnings.slice(0, 2).map((warning: string) => (
                            <small key={warning}>{warning}</small>
                          ))}
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {clinicPublicLookup.publicLookupTargets.length ? (
                    <div className="clinic-public-targets">
                      {clinicPublicLookup.publicLookupTargets.map((target: any) => (
                        <a className="secondary-button" href={target.url} key={`${target.kind}:${target.title}`} target="_blank" rel="noreferrer">
                          <ExternalLink aria-hidden="true" /> {target.title}
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {clinicPublicLookup.warnings.slice(0, 4).map((warning: string) => (
                    <small key={warning}>{warning}</small>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="clinic-config-grid">
              <article>
                <div className="panel-heading">
                  <h3>Команда и права</h3>
                  <span className="status-pill status-arrived">{dashboard.clinicSettings.staff.length}</span>
                </div>
                <div className="quick-create">
                  <input
                    aria-label="Новый сотрудник"
                    placeholder="ФИО сотрудника"
                    value={newStaffName}
                    onChange={(event: TextInputChangeEvent) => setNewStaffName(event.target.value)}
                  />
                  <button
                    aria-label="Добавить сотрудника"
                    className="icon-button"
                    type="button"
                    onClick={() => addStaffMember(newStaffRole)}
                    disabled={!newStaffReadyToCreate}
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </div>
                {!newStaffReadyToCreate ? (
                  <p className="quick-create-guidance" role="status" aria-live="polite">
                    Введите ФИО сотрудника, затем выберите роль.
                  </p>
                ) : null}
                <div className="role-picker" aria-label="Роль нового сотрудника">
                  {staffCreationRoles.map((role) => (
                    <button
                      className={newStaffRole === role ? "active" : ""}
                      key={role}
                      type="button"
                      onClick={() => setNewStaffRole(role)}
                    >
                      {staffRoleLabels[role]}
                    </button>
                  ))}
                </div>
                {newStaffRole === "doctor" || newStaffRole === "assistant" ? (
                  <div className="specialty-strip staff-specialty-picker" aria-label="Специальность нового сотрудника">
                    {(Object.keys(specialtyLabels) as DentalSpecialty[]).map((specialty) => (
                      <button
                        className={newStaffSpecialty === specialty ? "active" : ""}
                        key={specialty}
                        type="button"
                        onClick={() => setNewStaffSpecialty(specialty)}
                      >
                        {specialtyLabels[specialty]}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="staff-list">
                  {dashboard.clinicSettings.staff.map((member: any) => {
                    const scheduleDraft = staffScheduleDrafts[member.id] ?? staffScheduleDraftFromWorkingHours(member.workingHours ?? null);
                    const scheduleSaveState = staffScheduleSaveStates[member.id] ?? "saved";
                    const scheduleDirty = staffScheduleDirtyIds.has(member.id);
                    const scheduleSaving = staffScheduleSavingId === member.id || scheduleSaveState === "saving";
                    const scheduleSaveLabel = scheduleSaving
                      ? "Автосохранение"
                      : scheduleSaveState === "error"
                        ? "Не сохранено"
                        : scheduleDirty
                          ? "Ждет автосохранения"
                          : "Сохранено";
                    return (
                      <div className="staff-row" key={member.id}>
                        <span style={{ background: member.color }} />
                        <div>
                          <strong>{member.fullName}</strong>
                          <p>
                            {staffRoleLabels[member.role as StaffRole]} · {(member.specialties as DentalSpecialty[]).map((item) => specialtyLabels[item]).join(", ")}
                          </p>
                        </div>
                        <small>{member.canSignMedicalRecords ? "ЭМК" : member.canManageImports ? "Импорт" : "Доступ"}</small>
                        <div className="staff-schedule-editor">
                          <label>
                            С
                            <input
                              type="time"
                              value={scheduleDraft.start}
                              onChange={(event: any) => updateStaffScheduleDraft(member.id, { start: event.target.value })}
                            />
                          </label>
                          <label>
                            До
                            <input
                              type="time"
                              value={scheduleDraft.end}
                              onChange={(event: any) => updateStaffScheduleDraft(member.id, { end: event.target.value })}
                            />
                          </label>
                          <div className="weekday-toggle-row staff-weekday-row" role="group" aria-label={`Рабочие дни: ${member.fullName}`}>
                            {weekdayOptions.map((day: any) => (
                              <button
                                className={scheduleDraft.workingDays.includes(day.value) ? "active" : ""}
                                key={day.value}
                                type="button"
                                onClick={() => toggleStaffWorkingDay(member.id, day.value)}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                          <div className="staff-day-hours" aria-label={`Часы по дням: ${member.fullName}`}>
                            {weekdayOptions
                              .filter((day: any) => scheduleDraft.workingDays.includes(day.value))
                              .map((day: any) => {
                                const dayHours = scheduleDraft.perDay[day.value];
                                return (
                                  <div key={`hours-${member.id}-${day.value}`}>
                                    <span>{day.label}</span>
                                    <input
                                      aria-label={`${day.label}, начало`}
                                      type="time"
                                      value={dayHours?.start ?? scheduleDraft.start}
                                      onChange={(event: any) => updateStaffScheduleDay(member.id, day.value, { start: event.target.value })}
                                    />
                                    <input
                                      aria-label={`${day.label}, конец`}
                                      type="time"
                                      value={dayHours?.end ?? scheduleDraft.end}
                                      onChange={(event: any) => updateStaffScheduleDay(member.id, day.value, { end: event.target.value })}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                          <div className="staff-schedule-actions">
                            <span className={`save-state save-state-${scheduleSaveState}`}>{scheduleSaveLabel}</span>
                            <button
                              className="secondary-button compact-button"
                              type="button"
                              onClick={() => void saveStaffSchedule(member.id)}
                              disabled={scheduleSaving}
                            >
                              {scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article>
                <div className="panel-heading">
                  <h3>Кресла и кабинеты</h3>
                  <span className="status-pill status-confirmed">{dashboard.clinicSettings.chairs.length}</span>
                </div>
                <div className="quick-create">
                  <input
                    aria-label="Новое кресло"
                    placeholder="Кресло / кабинет"
                    value={newChairName}
                    onChange={(event: any) => setNewChairName(event.target.value)}
                  />
                  <button
                    aria-label="Добавить кресло или кабинет"
                    className="icon-button"
                    type="button"
                    onClick={addChair}
                    disabled={!newChairReadyToCreate}
                  >
                    <Plus aria-hidden="true" />
                  </button>
                </div>
                {!newChairReadyToCreate ? (
                  <p className="quick-create-guidance" role="status" aria-live="polite">
                    Введите понятное название кресла или кабинета.
                  </p>
                ) : null}
                <div className="role-picker equipment-picker" aria-label="Оборудование кресла">
                  <button
                    className={newChairHasXraySensor ? "active" : ""}
                    type="button"
                    onClick={() => setNewChairHasXraySensor((value: any) => !value)}
                  >
                    RVG
                  </button>
                  <button
                    className={newChairHasMicroscope ? "active" : ""}
                    type="button"
                    onClick={() => setNewChairHasMicroscope((value: any) => !value)}
                  >
                    Микроскоп
                  </button>
                  <button
                    className={newChairHasSurgeryKit ? "active" : ""}
                    type="button"
                    onClick={() => setNewChairHasSurgeryKit((value: any) => !value)}
                  >
                    Хирургия
                  </button>
                </div>
                <div className="staff-list">
                  {dashboard.clinicSettings.chairs.map((chair: any) => {
                    const scheduleDraft = chairScheduleDrafts[chair.id] ?? staffScheduleDraftFromWorkingHours(chair.workingHours ?? null);
                    const scheduleSaveState = chairScheduleSaveStates[chair.id] ?? "saved";
                    const scheduleDirty = chairScheduleDirtyIds.has(chair.id);
                    const scheduleSaving = chairScheduleSavingId === chair.id || scheduleSaveState === "saving";
                    const scheduleSaveLabel = scheduleSaving
                      ? "Автосохранение"
                      : scheduleSaveState === "error"
                        ? "Не сохранено"
                        : scheduleDirty
                          ? "Ждет автосохранения"
                          : "Сохранено";
                    return (
                      <div className="staff-row" key={chair.id}>
                        <CalendarDays aria-hidden="true" />
                        <div>
                          <strong>{chair.name}</strong>
                          <p>
                            {chair.room ?? "кабинет не указан"} ·{" "}
                            {chair.specialization ? specialtyLabels[chair.specialization] : "универсально"}
                          </p>
                        </div>
                        <small>
                          {chair.hasXraySensor ? "RVG" : chair.hasMicroscope ? "Микроскоп" : chair.hasSurgeryKit ? "Хирургия" : "База"}
                        </small>
                        <div className="staff-schedule-editor">
                          <label>
                            С
                            <input
                              type="time"
                              value={scheduleDraft.start}
                              onChange={(event: any) => updateChairScheduleDraft(chair.id, { start: event.target.value })}
                            />
                          </label>
                          <label>
                            До
                            <input
                              type="time"
                              value={scheduleDraft.end}
                              onChange={(event: any) => updateChairScheduleDraft(chair.id, { end: event.target.value })}
                            />
                          </label>
                          <div className="weekday-toggle-row staff-weekday-row" role="group" aria-label={`Рабочие дни кресла: ${chair.name}`}>
                            {weekdayOptions.map((day: any) => (
                              <button
                                className={scheduleDraft.workingDays.includes(day.value) ? "active" : ""}
                                key={day.value}
                                type="button"
                                onClick={() => toggleChairWorkingDay(chair.id, day.value)}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                          <div className="staff-day-hours" aria-label={`Часы по дням кресла: ${chair.name}`}>
                            {weekdayOptions
                              .filter((day: any) => scheduleDraft.workingDays.includes(day.value))
                              .map((day: any) => {
                                const dayHours = scheduleDraft.perDay[day.value];
                                return (
                                  <div key={`chair-hours-${chair.id}-${day.value}`}>
                                    <span>{day.label}</span>
                                    <input
                                      aria-label={`${day.label}, начало кресла`}
                                      type="time"
                                      value={dayHours?.start ?? scheduleDraft.start}
                                      onChange={(event: any) => updateChairScheduleDay(chair.id, day.value, { start: event.target.value })}
                                    />
                                    <input
                                      aria-label={`${day.label}, конец кресла`}
                                      type="time"
                                      value={dayHours?.end ?? scheduleDraft.end}
                                      onChange={(event: any) => updateChairScheduleDay(chair.id, day.value, { end: event.target.value })}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                          <div className="staff-schedule-actions">
                            <span className={`save-state save-state-${scheduleSaveState}`}>{scheduleSaveLabel}</span>
                            <button
                              className="secondary-button compact-button"
                              type="button"
                              onClick={() => void saveChairSchedule(chair.id)}
                              disabled={scheduleSaving}
                            >
                              {scheduleSaving ? "Сохраняю" : "Сохранить сейчас"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </article>
            </div>
          </section>
          ) : null}

          {settingsTab === "access" ? (
          <section className="access-settings" aria-label="Доступы, рабочие профили и роли">
            <div className="import-copy">
              <UserCheck aria-hidden="true" />
              <div>
                <p className="eyebrow">Доступы</p>
                <h2>Рабочие профили для врача, администратора, ассистента и сети</h2>
                <p>
                  Режим клиники влияет на первый экран, видимые разделы, права записи, аудит и зоны, где нужно ручное подтверждение.
                </p>
              </div>
            </div>

            {activeWorkspaceProfile ? (
              <article className="active-workspace-card">
                <div>
                  <span>{workspaceScopeLabels[activeWorkspaceProfile.scope]}</span>
                  <h3>{activeWorkspaceProfile.title}</h3>
                  <p>{activeWorkspaceProfile.description}</p>
                </div>
                <div className="workspace-token-row">
                  <strong>Старт: {viewLabels[activeWorkspaceProfile.defaultSection]}</strong>
                  {activeWorkspaceProfile.primaryRoles.map((role: any) => (
                    <span key={role}>{staffRoleLabels[role]}</span>
                  ))}
                </div>
              </article>
            ) : null}

            <div className="workspace-profile-grid">
              {dashboard.clinicSettings.workspaceProfiles.map((profile: any) => (
                <article className={`workspace-profile-card ${profile.mode === dashboard.clinicSettings.profile.mode ? "active" : ""}`} key={profile.id}>
                  <div className="workspace-profile-head">
                    <span>{clinicModeLabels[profile.mode].title}</span>
                    <strong>{profile.title}</strong>
                    <p>{profile.description}</p>
                  </div>
                  <div className="workspace-token-row" aria-label="Разделы профиля">
                    {profile.visibleSections.map((section: any) => (
                      <span key={section}>{viewLabels[section]}</span>
                    ))}
                  </div>
                  <ul>
                    {profile.automations.slice(0, 3).map((automation: any) => (
                      <li key={automation}>{automation}</li>
                    ))}
                  </ul>
                  <small>{profile.compactNavigation ? "Компактная навигация для телефона" : "Расширенная навигация для команды"}</small>
                </article>
              ))}
            </div>

            <div className="access-policy-grid">
              {dashboard.clinicSettings.roleAccessPolicies.map((policy: any) => (
                <article className="access-policy-card" key={policy.role}>
                  <div className="access-policy-head">
                    <ShieldCheck aria-hidden="true" />
                    <div>
                      <span>{workspaceScopeLabels[policy.scope]}</span>
                      <h3>{policy.title}</h3>
                      <p>Первый экран: {viewLabels[policy.defaultSection]}</p>
                    </div>
                  </div>
                  <div className="access-column-row">
                    <div>
                      <strong>Запись</strong>
                      {policy.canWrite.map((section: any) => (
                        <span key={section}>{viewLabels[section]}</span>
                      ))}
                    </div>
                    <div>
                      <strong>Ограничено</strong>
                      {policy.restricted.length ? (
                        policy.restricted.map((section: any) => <span key={section}>{viewLabels[section]}</span>)
                      ) : (
                        <span>нет</span>
                      )}
                    </div>
                  </div>
                  <ul>
                    {policy.requiresApprovalFor.slice(0, 3).map((item: any) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <small>Аудит: {policy.auditEvents.map((event: any) => policyAuditEventLabels[event] ?? event).join(", ")}</small>
                </article>
              ))}
            </div>
          </section>
          ) : null}

          {settingsTab === "telegram" ? (
          <section className="telegram-settings" aria-label="Telegram DENTE">
            <div className="import-copy">
              <Bot aria-hidden="true" />
              <div>
                <p className="eyebrow">DENTE-бот</p>
                <h2>Telegram-связь без передачи медицинских данных</h2>
                <p>
                  Код действует короткое время, хранится на сервере только как хэш и связывает чат с пациентом или сотрудником.
                  Документы, снимки, диагнозы и налоговые PDF остаются в DENTE/портале.
                </p>
              </div>
            </div>

            <div className="telegram-status-grid">
              <article>
                <span>Бот</span>
                <strong>{telegramStatus?.botUsername ? `@${telegramStatus.botUsername.replace(/^@/, "")}` : "не указан"}</strong>
                <p>{telegramStatus ? telegramModeLabels[telegramStatus.mode] : "статус не загружен"}</p>
              </article>
              <article>
                <span>Токен</span>
                <strong>{telegramStatus?.tokenConfigured ? "на сервере" : "не задан"}</strong>
                <p>В браузер и ответы API секрет не возвращается.</p>
              </article>
              <article>
                <span>Вебхук</span>
                <strong>{telegramStatus?.webhookReady ? "готов" : "проверить"}</strong>
                <p>{telegramStatus?.webhookSecretConfigured ? "секрет вебхука включен" : "нужен секрет вебхука"}</p>
              </article>
              <article>
                <span>Связки</span>
                <strong>{telegramStatus?.activeChatLinkCount ?? 0}</strong>
                <p>{telegramStatus?.pendingLinkCodeCount ?? 0} кодов ожидают подтверждения</p>
              </article>
            </div>

            <article className="telegram-link-panel telegram-admin-panel">
              <div className="panel-heading">
                <div>
                  <h3>Доступ к настройкам и Telegram</h3>
                  <p>Если на API включен DENTE_SETTINGS_ADMIN_SECRET или DENTE_TELEGRAM_ADMIN_SECRET / DENTE_CLINICAL_ADMIN_SECRET, введите его один раз на текущую сессию. В браузере секрет не сохраняется.</p>
                </div>
              </div>
              <div className="telegram-link-controls">
                <label>
                  Секрет админ-доступа DENTE
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={telegramAdminSecretDraft}
                    onChange={(event: any) => setTelegramAdminSecretDraft(event.target.value)}
                    onKeyDown={(event: any) => {
                      if (event.key === "Enter" && adminSecretReady) {
                        event.preventDefault();
                        unlockTelegramAdminSession();
                      }
                    }}
                    placeholder="x-dente-admin-secret"
                    aria-describedby={!adminSecretReady ? "settings-admin-unlock-guidance" : undefined}
                  />
                </label>
                {!adminSecretReady ? (
                  <p className="admin-unlock-guidance" id="settings-admin-unlock-guidance" role="status" aria-live="polite">
                    Введите секрет администратора клиники, чтобы менять защищенные настройки и Telegram.
                  </p>
                ) : null}
                <button className="secondary-button" type="button" onClick={unlockTelegramAdminSession} disabled={!adminSecretReady}>
                  <ShieldCheck aria-hidden="true" /> Разблокировать
                </button>
                <button className="secondary-button" type="button" onClick={lockTelegramAdminSession} disabled={!telegramAdminSecretSession}>
                  Забыть секрет
                </button>
              </div>
              <p>{telegramAdminSecretSession ? "Админ-доступ DENTE разблокирован до перезагрузки страницы." : "Без секрета будут работать только окружения, где сервер не требует админ-доступ."}</p>
            </article>

            <div className="telegram-workbench">
              <article className="telegram-link-panel">
                <div className="panel-heading">
                  <div>
                    <h3>QR для подключения</h3>
                    <p>Покажите пациенту или сотруднику. Старый ожидающий код для этой записи будет отозван.</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => void loadTelegramControlPlane()} disabled={isTelegramLoading}>
                    <RefreshCw aria-hidden="true" /> Обновить
                  </button>
                </div>
                <div className="telegram-link-controls">
                  <label>
                    Кого подключаем
                    <select
                      value={telegramLinkSubjectType}
                      onChange={(event: any) => {
                        setTelegramLinkSubjectType(normalizedTelegramLinkSubjectType(event.target.value));
                        setTelegramLinkCode(null);
                        setTelegramLinkActionState(null);
                      }}
                    >
                      <option value="patient">Активный пациент</option>
                      <option value="staff">Сотрудник клиники</option>
                    </select>
                  </label>
                  {telegramLinkSubjectType === "staff" ? (
                    <label>
                      Сотрудник
                      <select
                        value={telegramLinkStaffId}
                        onChange={(event: any) => {
                          setTelegramLinkStaffId(event.target.value);
                          setTelegramLinkCode(null);
                          setTelegramLinkActionState(null);
                        }}
                      >
                        {telegramLinkStaffOptions.length === 0 ? (
                          <option value="">Нет активных сотрудников</option>
                        ) : null}
                        {telegramLinkStaffOptions.map((member: any) => (
                          <option key={member.id} value={member.id}>
                            {member.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      Пациент
                      <input readOnly value={activePatient?.fullName ?? "Нет активного пациента"} />
                    </label>
                  )}
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void createTelegramLinkCode()}
                    disabled={isTelegramLinkCreating || (telegramLinkSubjectType === "staff" && !telegramLinkStaffOptions.length)}
                  >
                    <Bot aria-hidden="true" /> {isTelegramLinkCreating ? "Создаю" : "Создать QR/код"}
                  </button>
                </div>

                {telegramLinkCode ? (
                  <div className="telegram-link-result">
                    <div>
                      <span>Код</span>
                      <strong>{telegramLinkCode.code}</strong>
                      <p>До {formatDateTime(telegramLinkCode.expiresAt)}. В списках показывается только хвост {telegramLinkCode.codeLast4}.</p>
                      {telegramLinkCode.deepLink ? (
                        <a href={telegramLinkCode.deepLink} target="_blank" rel="noreferrer">
                          Открыть ссылку Telegram <ExternalLink aria-hidden="true" />
                        </a>
                      ) : null}
                      <small>{telegramLinkCode.shareText}</small>
                      <div className="telegram-link-actions">
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => void copyTelegramTextToClipboard(telegramLinkCode.code, "Код")}
                          disabled={!telegramLinkCode.code.trim()}
                        >
                          <Copy aria-hidden="true" /> Код
                        </button>
                        {telegramLinkCode.deepLink ? (
                          <button
                            className="secondary-button compact-button"
                            type="button"
                            onClick={() => void copyTelegramTextToClipboard(telegramLinkCode.deepLink, "Ссылка")}
                          >
                            <Copy aria-hidden="true" /> Ссылка
                          </button>
                        ) : null}
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => void copyTelegramTextToClipboard(telegramLinkCode.shareText, "Текст для пациента")}
                          disabled={!telegramLinkCode.shareText.trim()}
                        >
                          <Copy aria-hidden="true" /> Текст
                        </button>
                        {telegramLinkCode.qrSvg ? (
                          <button className="secondary-button compact-button" type="button" onClick={downloadTelegramQrSvg}>
                            <Download aria-hidden="true" /> Скачать QR
                          </button>
                        ) : null}
                      </div>
                      {telegramLinkActionState ? <small className="telegram-link-action-state">{telegramLinkActionState}</small> : null}
                    </div>
                    {telegramLinkCode.qrSvg ? (
                      <img alt="QR-код DENTE Telegram" src={telegramQrSvgToDataUrl(telegramLinkCode.qrSvg)} />
                    ) : (
                      <p>QR недоступен для слишком длинной ссылки, используйте код вручную.</p>
                    )}
                  </div>
                ) : null}

                <div className="telegram-link-ledger">
                  <div>
                    <h4>Активные связки</h4>
                    <p>
                      {telegramChatLinkLedger?.activeCount ?? telegramChatLinks.filter((link: any) => link.status === "active").length} чатов сейчас можно использовать для отправок.
                      {telegramChatLinkLedger ? ` Показано ${telegramChatLinks.length} из ${telegramChatLinkLedger.filteredCount}.` : ""}
                    </p>
                  </div>
                  {telegramChatLinks.length ? (
                    <div className="telegram-link-ledger-list">
                      {telegramChatLinks.map((link: any) => (
                        <article className={`telegram-link-ledger-row link-${link.status}`} key={link.id}>
                          <div>
                            <strong>{telegramSubjectName(link.subjectType, link.subjectId)}</strong>
                            <span>
                              {link.subjectType === "patient" ? "пациент" : "сотрудник"} · чат *{link.chatIdLast4 ?? "----"} · {link.status === "active" ? "активна" : "отозвана"}
                            </span>
                            <small>{formatDateTime(link.linkedAt)}</small>
                          </div>
                          <button
                            className="secondary-button compact-button"
                            type="button"
                            onClick={() => void revokeTelegramChatLink(link.id)}
                            disabled={link.status !== "active" || Boolean(telegramRevokingLinkId)}
                          >
                            {telegramRevokingLinkId === link.id ? "..." : "Отозвать"}
                          </button>
                        </article>
                      ))}
                      {telegramChatLinkLedger?.nextCursor ? (
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => void loadMoreTelegramChatLinks()}
                          disabled={isTelegramChatLinksLoadingMore}
                        >
                          {isTelegramChatLinksLoadingMore ? "Загружаем" : "Показать еще связки"}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="telegram-empty-state">Связанных Telegram-чатов пока нет. Создайте QR и попросите пациента открыть бота.</p>
                  )}
                  <div className="telegram-link-ledger-codes">
                    <span>
                      {telegramLinkCodeLedger?.pendingCount ?? telegramLinkCodes.filter((code: any) => code.status === "pending").length} кодов ожидают подключения
                      {telegramLinkCodeLedger ? ` · показано ${telegramLinkCodes.length} из ${telegramLinkCodeLedger.filteredCount}` : ""}
                    </span>
                    {telegramLinkCodes.map((code: any) => (
                      <small key={code.id}>
                        {telegramSubjectName(code.subjectType, code.subjectId)} · *{code.codeLast4} · {telegramLinkCodeStatusLabels[code.status]} · до{" "}
                        {formatDateTime(code.expiresAt)}
                      </small>
                    ))}
                    {telegramLinkCodeLedger?.nextCursor ? (
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => void loadMoreTelegramLinkCodes()}
                        disabled={isTelegramLinkCodesLoadingMore}
                      >
                        {isTelegramLinkCodesLoadingMore ? "Загружаем" : "Показать еще коды"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>

              <article className="telegram-policy-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Безопасные сценарии</h3>
                    <p>Это не рекламная рассылка и не канал медицинских документов. Только уведомления и портальные ссылки.</p>
                  </div>
                  <span className="status-pill status-confirmed">{telegramFeaturePlan?.enabledFeatures.length ?? 0}</span>
                </div>
                <div className="telegram-token-row">
                  {(telegramFeaturePlan?.patientSafeActions ?? []).slice(0, 6).map((action: any) => (
                    <span key={action}>{action}</span>
                  ))}
                </div>
                <div className="telegram-blocked-list">
                  {(telegramFeaturePlan?.blockedByDefault ?? []).slice(0, 6).map((item: any) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <div className="telegram-settings-form">
                  <label>
                    Режим бота
                    <select
                      value={telegramModeDraft}
                      onChange={(event: any) => {
                        setTelegramModeDraft(normalizedTelegramBotMode(event.target.value));
                        markTelegramSettingsDirty();
                      }}
                    >
                      <option value="shared_dente_bot">{telegramModeLabels.shared_dente_bot}</option>
                      <option value="disabled">{telegramModeLabels.disabled}</option>
                      <option value="clinic_owned_bot">{telegramModeLabels.clinic_owned_bot}</option>
                    </select>
                    <small>{telegramModeHints[telegramModeDraft]}</small>
                  </label>
                  <label>
                    Имя общего бота в Telegram
                    <input
                      inputMode="text"
                      placeholder="dentecrm_bot"
                      value={telegramBotUsernameDraft}
                      onChange={(event: any) => {
                        setTelegramBotUsernameDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    Имя бота клиники в Telegram
                    <input
                      inputMode="text"
                      placeholder="clinic_bot"
                      value={telegramOwnBotUsernameDraft}
                      onChange={(event: any) => {
                        setTelegramOwnBotUsernameDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    ID конфигурации бота клиники
                    <input
                      inputMode="text"
                      placeholder="clinic-main"
                      value={telegramBotConfigId}
                      onChange={(event: any) => setTelegramBotConfigId(event.target.value)}
                    />
                    <small>Сохраняется автоматически и выбирает статус конкретного бота клиники.</small>
                  </label>
                  <label>
                    Webhook HTTPS
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://clinic.example/api/telegram/webhook"
                      value={telegramWebhookBaseUrlDraft}
                      onChange={(event: any) => {
                        setTelegramWebhookBaseUrlDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    Портал пациента
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://portal.example"
                      value={telegramPatientPortalBaseUrlDraft}
                      onChange={(event: any) => {
                        setTelegramPatientPortalBaseUrlDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    Картинка приветствия
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://.../welcome.jpg"
                      value={telegramWelcomeImageUrlDraft}
                      onChange={(event: any) => {
                        setTelegramWelcomeImageUrlDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    Срок QR-кода, минут
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      step={5}
                      value={telegramTokenTtlDraft}
                      onChange={(event: any) => {
                        setTelegramTokenTtlDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    Напоминания до приема, часы
                    <input
                      inputMode="text"
                      placeholder="24, 2"
                      value={telegramReminderLeadTimesDraft}
                      onChange={(event: any) => {
                        setTelegramReminderLeadTimesDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                    <small>Напоминания до приема в часах: от 1 до 168, максимум 6 значений.</small>
                  </label>
                  <label>
                    Просьба оценить клинику, часы после визита
                    <input
                      type="number"
                      min={1}
                      max={720}
                      step={1}
                      value={telegramReviewRequestDelayDraft}
                      onChange={(event: any) => {
                        setTelegramReviewRequestDelayDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                    <small>Клиника сама выбирает момент просьбы оставить отзыв: от 1 до 720 часов после закрытого визита или оплаты.</small>
                  </label>
                  <fieldset className="telegram-checkup-delay-fields full">
                    <legend>Контроль после лечения</legend>
                    <small>Настраивается для каждой клиники. Бот отправит безопасный вопрос о самочувствии через выбранное число часов после памятки.</small>
                    {telegramPostVisitCheckupDelayFields.map((field: any) => (
                      <label key={field.key}>
                        {field.label}
                        <input
                          type="number"
                          min={1}
                          max={720}
                          step={1}
                          value={telegramPostVisitCheckupDelayDrafts[field.key]}
                          onChange={(event: any) => updateTelegramPostVisitCheckupDelayDraft(field.key, event.target.value)}
                        />
                        <small>{field.help}</small>
                      </label>
                    ))}
                  </fieldset>
                  <label>
                    Канал эскалации
                    <input
                      inputMode="text"
                      placeholder="@clinic_admins"
                      value={telegramStaffEscalationChannelDraft}
                      onChange={(event: any) => {
                        setTelegramStaffEscalationChannelDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    Приватность
                    <select
                      value={telegramPrivacyModeDraft}
                      onChange={(event: any) => {
                        setTelegramPrivacyModeDraft(normalizedTelegramPrivacyMode(event.target.value));
                        markTelegramSettingsDirty();
                      }}
                    >
                      <option value="no_phi_by_default">{telegramPrivacyModeLabels.no_phi_by_default}</option>
                      <option value="limited_admin_only">{telegramPrivacyModeLabels.limited_admin_only}</option>
                      <option value="consented_phi_templates" disabled>
                        {telegramPrivacyModeLabels.consented_phi_templates} (после аудита)
                      </option>
                    </select>
                    <small>{telegramPrivacyModeHints[telegramPrivacyModeDraft]}</small>
                  </label>
                </div>
                <div className="telegram-feature-grid" aria-label="Функции Telegram">
                  {telegramFeatureOptions.map((feature: any) => (
                    <label className={telegramEnabledFeaturesDraft.includes(feature) ? "feature-enabled" : ""} key={feature}>
                      <input
                        type="checkbox"
                        checked={telegramEnabledFeaturesDraft.includes(feature)}
                        onChange={() => toggleTelegramFeature(feature)}
                      />
                      <span>
                        <strong>{telegramFeatureLabel(feature)}</strong>
                        <small>{telegramFeatureHelp[feature]}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <label className="telegram-voice-toggle">
                  <input
                    type="checkbox"
                    checked={telegramAllowVoiceIntakeDraft}
                    onChange={(event: any) => {
                      const checked = event.target.checked;
                      setTelegramAllowVoiceIntakeDraft(checked);
                      if (checked && !telegramEnabledFeaturesDraft.includes("voice_note_intake")) {
                        setTelegramEnabledFeaturesDraft((current: any) => [...current, "voice_note_intake"]);
                      }
                      markTelegramSettingsDirty();
                    }}
                  />
                  <span>
                    <strong>Разрешить голосовые обращения</strong>
                    <small>Даже при включении бот не отправляет диагнозы и файлы в Telegram.</small>
                  </span>
                </label>
                <div className="telegram-visual-card-fields">
                  {telegramVisualCardFields.map((field: any) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        type="url"
                        inputMode="url"
                        placeholder={field.placeholder}
                        value={telegramVisualCardUrlDrafts[field.key] ?? ""}
                        onChange={(event: any) => updateTelegramVisualCardUrlDraft(field.key, event.target.value)}
                      />
                      <small>{field.help} Если поле пустое, используется картинка приветствия.</small>
                    </label>
                  ))}
                </div>
                <div className="telegram-external-links">
                  <label>
                    Ссылка на отзыв
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://..."
                      value={telegramReviewUrlDraft}
                      onChange={(event: any) => {
                        setTelegramReviewUrlDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <label>
                    Ссылка на карту
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://..."
                      value={telegramMapsUrlDraft}
                      onChange={(event: any) => {
                        setTelegramMapsUrlDraft(event.target.value);
                        markTelegramSettingsDirty();
                      }}
                    />
                  </label>
                  <button className="secondary-button" type="button" onClick={() => void saveTelegramSettings()} disabled={isTelegramSettingsSaving}>
                    <ExternalLink aria-hidden="true" /> {isTelegramSettingsSaving ? "..." : "Сохранить"}
                  </button>
                </div>
                <p className={`telegram-save-state save-${telegramSettingsSaveState}`}>
                  {telegramSettingsSaveState === "saving"
                    ? "Автосохранение настроек..."
                    : telegramSettingsSaveState === "saved"
                      ? "Настройки Telegram сохранены."
                      : telegramSettingsSaveState === "error"
                        ? telegramSettingsSaveError ?? "Настройки Telegram не сохранены."
                        : telegramSettingsDirty
                          ? "Изменения будут сохранены автоматически."
                          : "Выбранная конфигурация сохранена и будет применяться до изменения."}
                </p>
                <div className="telegram-preview-actions">
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("appointment_confirmation")} disabled={!activePatient || isTelegramLoading}>
                    <Send aria-hidden="true" /> Прием
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("document_ready_notice")} disabled={!activePatient || isTelegramLoading}>
                    <FileCheck2 aria-hidden="true" /> Документ
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("payment_reminder_notice")} disabled={!activePatient || isTelegramLoading}>
                    <CreditCard aria-hidden="true" /> Оплата
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("recall_notice")} disabled={!activePatient || isTelegramLoading}>
                    <CalendarDays aria-hidden="true" /> Профилактика
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("review_request")} disabled={!activePatient || isTelegramLoading}>
                    <ExternalLink aria-hidden="true" /> Отзыв
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("post_visit_instruction_link")} disabled={!activePatient || isTelegramLoading}>
                    <ClipboardCheck aria-hidden="true" /> Памятка
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("post_visit_checkup")} disabled={!activePatient || isTelegramLoading}>
                    <ClipboardCheck aria-hidden="true" /> Контроль
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void previewTelegramTemplate("staff_daily_digest")} disabled={!telegramLinkStaffOptions.length || isTelegramLoading}>
                    <Users aria-hidden="true" /> {"\u0421\u0432\u043e\u0434\u043a\u0430 \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0443"}
                  </button>
                </div>
                {telegramPreview ? (
                  <div className="telegram-preview-box">
                    <span>
                      {telegramTemplateLabels[telegramPreview.templateKind]} · {telegramClassificationLabels[telegramPreview.classification]}
                    </span>
                    <p>{telegramPreview.text || telegramHumanMessage(telegramPreview.blockedReason)}</p>
                    {telegramPreview.photoUrl ? (
                      <div className="telegram-visual-card-preview">
                        <img src={telegramPreview.photoUrl} alt="Визуальная карточка Telegram" loading="lazy" />
                        <span className="telegram-visual-card-indicator">
                          <ImageIcon aria-hidden="true" /> Визуальная карточка
                        </span>
                      </div>
                    ) : null}
                    {telegramInlineButtonRowsFromReplyMarkup(telegramPreview.replyMarkup).length ? (
                      <div className="telegram-preview-buttons" aria-label="Кнопки Telegram-сообщения">
                        {telegramInlineButtonRowsFromReplyMarkup(telegramPreview.replyMarkup).map((row: any, rowIndex: any) => (
                          <div className="telegram-inline-button-row" key={`preview-row-${rowIndex}`}>
                            {row.map((button: any) => (
                              <span className="telegram-preview-button" key={`${button.text}:${button.target}`}>
                                {button.text}
                                <small>{telegramInlineButtonKindLabels[button.kind]}</small>
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {telegramPreview.warnings.map((warning: any) => (
                      <small key={warning}>{telegramHumanMessage(warning)}</small>
                    ))}
                  </div>
                ) : null}
              </article>
            </div>

            <article className="telegram-outbox-panel">
              <div className="panel-heading">
                <div>
                  <h3>Очередь безопасных отправок</h3>
                  <p>Это расчет готовности: отправка разрешена только при связанном чате, серверном токене и зашифрованном transport-ref.</p>
                </div>
                <div className="telegram-outbox-summary-actions">
                  <span className="status-pill status-confirmed">
                    {telegramOutbox?.dueCount ?? 0} к отправке сейчас / {telegramOutbox?.readyCount ?? 0} готово / {telegramOutbox?.blockedCount ?? 0} требует настройки
                  </span>
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    onClick={() => void sendDueTelegramOutbox()}
                    disabled={!telegramOutbox?.dueCount || isTelegramSendingDue || Boolean(telegramSendingItemId) || isTelegramLoading}
                  >
                    <Send aria-hidden="true" /> {isTelegramSendingDue ? "Отправляем" : "Отправить готовые"}
                  </button>
                </div>
              </div>
              <div className="telegram-outbox-controls" aria-label="Фильтры очереди Telegram">
                <label>
                  Статус
                  <select value={telegramOutboxStatusFilter} onChange={(event: any) => setTelegramOutboxStatusFilter(normalizedTelegramOutboxStatusFilter(event.target.value))}>
                    {telegramOutboxStatusFilterOptions.map((status: any) => (
                      <option value={status} key={status}>
                        {telegramOutboxStatusFilterLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Сценарий
                  <select value={telegramOutboxTemplateFilter} onChange={(event: any) => setTelegramOutboxTemplateFilter(normalizedTelegramOutboxTemplateFilter(event.target.value))}>
                    {telegramOutboxTemplateFilterOptions.map((templateKind: any) => (
                      <option value={templateKind} key={templateKind}>
                        {telegramOutboxTemplateFilterLabels[templateKind]}
                      </option>
                    ))}
                  </select>
                </label>
                <span>
                  Показано {visibleTelegramOutboxItems.length} из {telegramOutbox?.filteredCount ?? filteredTelegramOutboxItems.length}
                  {telegramOutbox ? ` / всего ${telegramOutbox.totalCount}` : ""}
                </span>
              </div>
              <div className="telegram-outbox-list">
                {visibleTelegramOutboxItems.map((item: any) => {
                  const itemButtonRows = telegramInlineButtonRowsFromReplyMarkup(item.replyMarkup);
                  const itemBlockingNote = item.blockedReason ? telegramHumanMessage(item.blockedReason) : "";
                  const itemWarningNotes = item.warnings.map((warning: any) => telegramHumanMessage(warning)).filter(Boolean);
                  return (
                    <article className={`telegram-outbox-item outbox-${item.deliveryStatus}`} key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.previewText || telegramHumanMessage(item.blockedReason)}</p>
                        <div className="telegram-outbox-preview-meta">
                          {item.photoUrl ? (
                            <div className="telegram-visual-card-preview compact">
                              <img src={item.photoUrl} alt="Картинка Telegram-сообщения" loading="lazy" />
                              <span className="telegram-visual-card-indicator">
                                <ImageIcon aria-hidden="true" /> Картинка
                              </span>
                            </div>
                          ) : null}
                          {itemButtonRows.length ? (
                            <div className="telegram-outbox-buttons" aria-label="Кнопки Telegram">
                              {itemButtonRows.map((row: any, rowIndex: any) => (
                                <div className="telegram-inline-button-row" key={`${item.id}-row-${rowIndex}`}>
                                  {row.map((button: any) => (
                                    <span key={`${item.id}-${button.text}-${button.target}`}>
                                      {button.text}
                                      <small>{telegramInlineButtonKindLabels[button.kind]}</small>
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        {itemBlockingNote || itemWarningNotes.length ? (
                          <div className="telegram-outbox-notes" aria-label="Причины и предупреждения Telegram">
                            {itemBlockingNote ? <small>{itemBlockingNote}</small> : null}
                            {itemWarningNotes.map((warning: any) => (
                              <small key={`${item.id}:${warning}`}>{warning}</small>
                            ))}
                          </div>
                        ) : null}
                        <small>
                          {telegramTemplateLabels[item.templateKind]} · {telegramDeliveryStatusLabels[item.deliveryStatus]} · {formatDateTime(item.scheduledAt)}
                        </small>
                      </div>
                      <div className="telegram-outbox-actions">
                        <span>{item.chatLinkId ? "чат связан" : "нужен QR"}</span>
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => void sendTelegramOutboxItem(item.id)}
                          disabled={
                            item.deliveryStatus !== "ready" ||
                            !isTelegramOutboxItemDueForUi(item) ||
                            Boolean(telegramSendingItemId) ||
                            isTelegramSendingDue
                          }
                        >
                          <Send aria-hidden="true" /> {telegramSendingItemId === item.id ? "..." : "Отправить"}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {hiddenTelegramOutboxItemCount > 0 ? (
                  <div className="telegram-outbox-result-note">
                    <span>Еще {hiddenTelegramOutboxItemCount} задач в выбранном фильтре.</span>
                    {telegramOutbox?.nextCursor ? (
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => void loadMoreTelegramOutbox()}
                        disabled={isTelegramOutboxLoadingMore}
                      >
                        {isTelegramOutboxLoadingMore ? "Загружаем" : "Показать еще"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {telegramOutbox && telegramOutbox.items.length > 0 && filteredTelegramOutboxItems.length === 0 ? (
                  <p className="telegram-empty-state">По выбранным фильтрам задач нет.</p>
                ) : null}
                {telegramOutbox && telegramOutbox.items.length === 0 ? (
                  <p className="telegram-empty-state">Нет безопасных Telegram-задач в текущей очереди связи.</p>
                ) : null}
              </div>
              {telegramOutbox?.warnings.length ? (
                <div className="telegram-warning-strip compact">
                  {telegramOutbox.warnings.map((warning: any) => (
                    <span key={warning}>{telegramHumanMessage(warning)}</span>
                  ))}
                </div>
              ) : null}
            </article>

            {telegramStatus?.warnings.length || telegramStatus?.nextActions.length ? (
              <div className="telegram-warning-strip">
                {[...(telegramStatus?.warnings ?? []), ...(telegramStatus?.nextActions ?? [])].map((item: any) => (
                  <span key={item}>{telegramHumanMessage(item)}</span>
                ))}
              </div>
            ) : null}
          </section>
          ) : null}

          {settingsTab === "protocols" ? (
          <section className="protocol-settings" aria-label="Библиотека клинических протоколов">
            <div className="import-copy">
              <ClipboardCheck aria-hidden="true" />
              <div>
                <p className="eyebrow">Протоколы</p>
                <h2>Шаблоны приема по специальностям</h2>
                <p>Терапия, ортопедия, хирургия, ортодонтия, пародонтология, гигиена, детский прием, имплантация и рентген.</p>
              </div>
            </div>

            <div className="protocol-settings-grid">
              {dashboard.protocolTemplates.map((template: any) => (
                <article className="protocol-settings-card" key={template.id}>
                  <div className="protocol-settings-head">
                    <span>{specialtyLabels[template.specialty]}</span>
                    <strong>{template.title}</strong>
                    <p>
                      {template.visitReason} · {template.defaultDurationMinutes} мин
                    </p>
                  </div>
                  <div className="protocol-token-row" aria-label="Документы протокола">
                    {template.requiredDocuments.map((kind: any) => (
                      <span key={kind}>{documentLabels[kind]}</span>
                    ))}
                  </div>
                  <div className="protocol-token-row protocol-token-row-soft" aria-label="Снимки протокола">
                    {template.suggestedImaging.map((kind: any) => (
                      <span key={kind}>{imagingKindLabels[kind]}</span>
                    ))}
                  </div>
                  <ul>
                    {template.safetyWarnings.slice(0, 2).map((warning: any) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      applyProtocolTemplate(template);
                      window.location.hash = "visit";
                    }}
                  >
                    <ClipboardCheck aria-hidden="true" /> Открыть в приеме
                  </button>
                </article>
              ))}
            </div>
          </section>
          ) : null}

          {settingsTab === "rules" ? (
          <section className="rule-studio" aria-label="Редактор клинических правил">
            <div className="import-copy">
              <ShieldCheck aria-hidden="true" />
              <div>
                <p className="eyebrow">Клинические правила</p>
                <h2>Бандлы, ограничения и предупреждения главврача</h2>
                <p>
                  Правило связывает услугу-триггер с обязательной услугой, ограничением, завершенным этапом или recall.
                  Результат сразу попадает в прием, финансы и сменные предупреждения.
                </p>
              </div>
            </div>

            <div className="rule-studio-summary">
              <article>
                <span>Активные</span>
                <strong>{dashboard.clinicalRuleSummary.activeRules}</strong>
                <p>{dashboard.clinicalRules.length} правил в библиотеке</p>
              </article>
              <article className={dashboard.clinicalRuleSummary.blockers ? "rule-danger" : ""}>
                <span>Важные</span>
                <strong>{dashboard.clinicalRuleSummary.blockers}</strong>
                <p>{dashboard.clinicalRuleSummary.unresolved} нерешенных оценок</p>
              </article>
              <article>
                <span>Добавить</span>
                <strong>{dashboard.clinicalRuleSummary.requiredServices}</strong>
                <p>обязательных услуг в текущем плане</p>
              </article>
            </div>

            <div className="rule-studio-layout">
              <section className="rule-form" aria-label="Новое клиническое правило">
                <div className="panel-heading">
                  <h3>Новое правило</h3>
                  <span className="status-pill status-arrived">{newRuleAction}</span>
                </div>
                <label>
                  Название
                  <input value={newRuleTitle} onChange={(event: TextInputChangeEvent) => setNewRuleTitle(event.target.value)} />
                </label>
                <div className="rule-form-grid">
                  <label>
                    Действие
                    <select value={newRuleAction} onChange={(event: any) => setNewRuleAction(normalizedClinicalRuleAction(event.target.value))}>
                      {Object.keys(clinicalRuleActionLabels).map((action: any) => (
                        <option key={action} value={action}>{clinicalRuleActionLabels[action as keyof typeof clinicalRuleActionLabels]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Уровень
                    <select value={newRuleSeverity} onChange={(event: any) => setNewRuleSeverity(normalizedClinicalRuleSeverity(event.target.value))}>
                      {Object.keys(clinicalRuleSeverityLabels).map((severity: any) => (
                        <option key={severity} value={severity}>{clinicalRuleSeverityLabels[severity as keyof typeof clinicalRuleSeverityLabels]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Владелец
                    <select value={newRuleOwnerRole} onChange={(event: SelectChangeEvent) => setNewRuleOwnerRole(normalizedStaffRole(event.target.value))}>
                      {clinicalRuleOwnerRoles.map((role) => (
                        <option key={role} value={role}>{staffRoleLabels[role]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Специальность
                    <select value={newRuleSpecialty} onChange={(event: SelectChangeEvent) => setNewRuleSpecialty(normalizedDentalSpecialty(event.target.value))}>
                      {(Object.keys(specialtyLabels) as DentalSpecialty[]).map((specialty) => (
                        <option key={specialty} value={specialty}>{specialtyLabels[specialty]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Категория
                    <select value={newRuleCategory} onChange={(event: any) => setNewRuleCategory(normalizedServiceCategory(event.target.value))}>
                      {(Object.keys(serviceCategoryLabels) as string[]).map((category: any) => (
                        <option key={category} value={category}>{serviceCategoryLabels[category]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Триггер
                    <select value={newRuleTriggerServiceId} onChange={(event: any) => setNewRuleTriggerServiceId(event.target.value)}>
                      {dashboard.serviceCatalog.map((service: any) => (
                        <option key={service.id} value={service.id}>{service.title}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Обязательная услуга
                    <select value={newRuleRequiredServiceId} onChange={(event: any) => setNewRuleRequiredServiceId(event.target.value)}>
                      {dashboard.serviceCatalog.map((service: any) => (
                        <option key={service.id} value={service.id}>{service.title}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Должно быть завершено
                    <select value={newRuleCompletedServiceId} onChange={(event: any) => setNewRuleCompletedServiceId(event.target.value)}>
                      {dashboard.serviceCatalog.map((service: any) => (
                        <option key={service.id} value={service.id}>{service.title}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Блокировать
                    <select value={newRuleBlockedServiceId} onChange={(event: any) => setNewRuleBlockedServiceId(event.target.value)}>
                      {dashboard.serviceCatalog.map((service: any) => (
                        <option key={service.id} value={service.id}>{service.title}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Предупреждение врачу
                  <textarea value={newRuleWarningText} onChange={(event: any) => setNewRuleWarningText(event.target.value)} />
                </label>
                <label>
                  Объяснение пациенту
                  <textarea value={newRulePatientText} onChange={(event: any) => setNewRulePatientText(event.target.value)} />
                </label>
                <button className="primary-button" type="button" onClick={createClinicalRuleFromSettings} disabled={isClinicalRuleSaving}>
                  <Plus aria-hidden="true" /> {isClinicalRuleSaving ? "Сохраняю" : "Добавить правило"}
                </button>
              </section>

              <section className="rule-library" aria-label="Библиотека правил клиники">
                {dashboard.clinicalRules.map((rule: any) => (
                  <article className={`rule-card severity-${rule.severity} ${rule.active ? "" : "disabled"}`} key={rule.id}>
                    <div className="rule-card-head">
                      <span>{clinicalRuleSeverityLabels[rule.severity]} · {clinicalRuleActionLabels[rule.action]}</span>
                      <button className="text-button" type="button" onClick={() => toggleClinicalRule(rule)} disabled={isClinicalRuleSaving}>
                        {rule.active ? "Выключить" : "Включить"}
                      </button>
                    </div>
                    <h3>{rule.title}</h3>
                    <p>{rule.warningText}</p>
                    <div className="rule-token-row">
                      <span>{specialtyLabels[rule.specialty]}</span>
                      <span>{serviceCategoryLabels[rule.category]}</span>
                      <span>{staffRoleLabels[rule.ownerRole]}</span>
                    </div>
                    <div className="rule-token-row rule-token-row-soft">
                      {rule.triggerServiceIds.map((serviceId: any) => <span key={`${rule.id}-t-${serviceId}`}>если {serviceTitle(serviceId)}</span>)}
                      {rule.requiredServiceIds.map((serviceId: any) => <span key={`${rule.id}-r-${serviceId}`}>добавить {serviceTitle(serviceId)}</span>)}
                      {rule.requiresCompletedServiceIds.map((serviceId: any) => <span key={`${rule.id}-c-${serviceId}`}>завершить {serviceTitle(serviceId)}</span>)}
                      {rule.blockedServiceIds.map((serviceId: any) => <span key={`${rule.id}-b-${serviceId}`}>блок {serviceTitle(serviceId)}</span>)}
                    </div>
                    <small>{rule.patientText}</small>
 
                           </article>
                ))}
              </section>
            </div>
          </section>
          ) : null}

          {settingsTab === "prices" ? (
          <section className="pricelist-studio" aria-label="Разбор прайс-листа клиники">
            <div className="import-copy">
              <ReceiptText aria-hidden="true" />
              <div>
                <p className="eyebrow">Прайс и материалы</p>
                <h2>Прайс клиники разбирается в услуги, материалы, бренды и типы реставраций</h2>
                <p>
                  Это админский инструмент, не экран врача на приеме. Он превращает текст, OCR или фото прайса в JSON, ничего не записывает без предпросмотра и не придумывает цены.
                </p>
              </div>
            </div>

            <div className="pricelist-controls" aria-label="Источник прайса">
              {(Object.keys(pricelistSourceKindLabels) as PricelistSourceKind[]).map((kind: any) => (
                <button
                  className={`source-card ${pricelistSourceKind === kind ? "active" : ""}`}
                  key={kind}
                  type="button"
                  onClick={() => {
                    setPricelistSourceKind(kind);
                    if (kind !== "photo_ocr") clearPricelistImage();
                    setPricelistAnalysis(null);
                  }}
                >
                  <strong>{pricelistSourceKindLabels[kind]}</strong>
                  <span>{kind === "photo_ocr" ? "текст с фото или ИИ-проверка" : "локальный парсер + проверка"}</span>
                </button>
              ))}
            </div>

            <details className="pricelist-taxonomy">
              <summary>
                <span>Каталог распознавания</span>
                <small>Справочник для администратора. Врач на приеме это не видит.</small>
              </summary>
              <div className="taxonomy-grid">
                <article>
                  <strong>Виды лечения</strong>
                  {pricelistRecognitionServiceGroups.map((group: any) => (
                    <div className="taxonomy-chip-row" key={group.title}>
                      <span>{group.title}</span>
                      {group.items.map((item: any) => (
                        <small key={item}>{item}</small>
                      ))}
                    </div>
                  ))}
                </article>
                <article>
                  <strong>Материалы</strong>
                  <div className="taxonomy-chip-row taxonomy-chip-row-flat">
                    {(Object.keys(dentalMaterialKindLabels) as DentalMaterialKind[])
                      .filter((kind: any) => kind !== "unknown")
                      .map((kind: any) => (
                        <small key={kind}>{dentalMaterialKindLabels[kind]}</small>
                      ))}
                  </div>
                </article>
                <article>
                  <strong>Реставрации</strong>
                  <div className="taxonomy-chip-row taxonomy-chip-row-flat">
                    {(Object.keys(dentalRestorationTypeLabels) as DentalRestorationType[])
                      .filter((kind: any) => kind !== "unknown")
                      .map((kind: any) => (
                        <small key={kind}>{dentalRestorationTypeLabels[kind]}</small>
                      ))}
                  </div>
                </article>
                <article>
                  <strong>Бренды и линейки</strong>
                  {pricelistRecognitionBrandGroups.map((group: any) => (
                    <div className="taxonomy-chip-row" key={group.title}>
                      <span>{group.title}</span>
                      {group.items.map((item: any) => (
                        <small key={item}>{item}</small>
                      ))}
                    </div>
                  ))}
                </article>
              </div>
            </details>

            <div className="pricelist-workbench">
              <textarea
                aria-label="Прайс-лист клиники"
                value={pricelistText}
                onChange={(event: any) => {
                  setPricelistText(event.target.value);
                  setPricelistAnalysis(null);
                }}
              />
              <div className="pricelist-image-row">
                <label className="pricelist-image-upload">
                  <ImageIcon aria-hidden="true" />
                  <span>{pricelistImageName ?? "Фото прайса"}</span>
                  <small>{pricelistImageNote ?? "JPEG, PNG или WebP. Сжимается в браузере перед отправкой."}</small>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    type="file"
                    onChange={(event: any) => void attachPricelistImage(event.currentTarget.files?.[0])}
                  />
                </label>
                {pricelistImageName ? (
                  <button className="secondary-button" type="button" onClick={clearPricelistImage}>
                    Убрать фото
                  </button>
                ) : null}
              </div>
              <div className="import-tool-row">
                <button
                  className={`secondary-button ${usePricelistAi ? "active" : ""}`}
                  type="button"
                  onClick={() => setUsePricelistAi((value: any) => !value)}
                >
                  <Bot aria-hidden="true" /> {usePricelistAi ? "ИИ-разбор включен" : "Только локально"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setPricelistSourceKind("spreadsheet_copy");
                    clearPricelistImage();
                    setPricelistText(
                      "Коронка циркониевая MultiLayer 35 000 руб\nКоронка IPS e.max 32 000 руб\nВинир керамический E.max 38 000 руб\nРеставрация композитная Filtek 9 500 руб\nЛечение канала 1 канал 6 800 руб\nИмплантация Straumann BLX 85 000 руб\nАбатмент индивидуальный циркониевый 28 000 руб\nСинус-лифтинг открытый 55 000 руб\nПрофессиональная гигиена Air Flow EMS 6 000 руб\nЭлайнеры Star Smile 160 000 руб"
                    );
                    setPricelistAnalysis(null);
                  }}
                >
                  <Sparkles aria-hidden="true" /> Демо
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={analyzePricelist}
                  disabled={isPricelistAnalyzing || (!pricelistText.trim() && !pricelistImageBase64)}
                >
                  <UploadCloud aria-hidden="true" /> {isPricelistAnalyzing ? "Разбираю" : "Разобрать прайс"}
                </button>
              </div>
            </div>

            {pricelistAnalysis ? (
              <div className="pricelist-result">
                <div className="pricelist-status">
                  <strong>{pricelistAnalysis.items.length} позиций</strong>
                  <span>{pricelistParserModeLabels[pricelistAnalysis.parserMode] ?? pricelistAnalysis.parserMode}</span>
                  <span>
                    Groq {pricelistAnalysis.aiVision.used ? "использован" : pricelistAnalysis.aiVision.configured ? "готов" : "не настроен"}
                  </span>
                  <small>{pricelistAnalysis.aiVision.reason}</small>
                </div>
                <div className="pricelist-summary">
                  {pricelistAnalysis.summary.slice(0, 6).map((item: any) => (
                    <article key={`${item.category}-${item.specialty}`}>
                      <strong>{serviceCategoryLabels[item.category]}</strong>
                      <span>{specialtyLabels[item.specialty]}</span>
                      <p>
                        {item.count} поз. · {item.minPriceRub ?? "?"}-{item.maxPriceRub ?? "?"} ₽
                      </p>
                      <small>{pricelistMaterialSummaryText(item)}</small>
                    </article>
                  ))}
                </div>
                <div className="pricelist-rows">
                  {pricelistAnalysis.items.slice(0, 12).map((item: any) => (
                    <article className="pricelist-row" key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {serviceCategoryLabels[item.category]} · {specialtyLabels[item.specialty]} · {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <div>
                        <span>{item.priceRub !== null ? `${item.priceRub.toLocaleString("ru-RU")} ₽` : "цена ?"}</span>
                        <small>{pricelistItemMaterialText(item)}</small>
                      </div>
                      <p>{item.warnings.length ? item.warnings.join(", ") : "готово к маппингу"}</p>
                    </article>
                  ))}
                </div>
                {pricelistAnalysis.warnings.length ? (
                  <div className="recognition-notes">
                    {pricelistAnalysis.warnings.map((warning: any) => (
                      <span key={warning}>{warning}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
          ) : null}

          {settingsTab === "sources" ? (
          <section className="connector-grid" aria-label="Интеграции снимков">
            {imagingConnectorCards.map((connector: any) => (
              <article key={connector.title}>
                <ImageIcon aria-hidden="true" />
                <div>
                  <h3>{connector.title}</h3>
                  <p>{connector.detail}</p>
                  <span>{imagingSourceLabels[connector.source]}</span>
                </div>
              </article>
            ))}
          </section>
          ) : null}

          {settingsTab === "sources" ? (
          <section className="dicom-capability-panel" aria-label="Рентген и DICOM-просмотрщик">
            <div className="import-copy">
              <ScanSearch aria-hidden="true" />
              <div>
                <p className="eyebrow">Рентген</p>
                <h2>Сначала быстрый просмотр, потом полноценные DICOM/CBCT серии</h2>
                <p>
                  Врач не должен ждать тяжелый 3D-модуль на обычном приеме. 2D-снимки открываются сразу; DICOMweb, MPR и срезы КТ
                  выделены в отдельный модуль, чтобы не перегружать смену.
                </p>
              </div>
            </div>
            <div className="dicom-capability-grid">
              {imagingViewerCapabilities.map((capability: any) => {
                const CapabilityIcon = capability.icon;
                return (
                  <article key={capability.title}>
                    <CapabilityIcon aria-hidden="true" />
                    <div>
                      <span>{capability.state}</span>
                      <h3>{capability.title}</h3>
                      <p>{capability.detail}</p>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="dicom-series-lab" aria-label="Предпросмотр серий DICOM">
              <div>
                <strong>Предпросмотр серий DICOM</strong>
                <p>
                  Берет текущий манифест снимков или результат сканирования папки и группирует КТ/CBCT по UID исследования/серии. Пиксельные данные не
                  сохраняется.
                </p>
              </div>
              <button className="secondary-button" type="button" onClick={() => void previewDicomSeries()} disabled={isDicomSeriesPreviewLoading}>
                <Layers3 aria-hidden="true" />
                {isDicomSeriesPreviewLoading ? "Группирую" : "Проверить серии"}
              </button>
              {dicomSeriesPreview ? (
                <div className="dicom-series-result">
                  <div className="dicom-series-stats">
                    <span>{dicomSeriesPreview.totalRows} файлов</span>
                    <span>{dicomSeriesPreview.totalSeries} серий</span>
                    <span>{dicomSeriesPreview.readySeries} готово</span>
                    <span>{dicomSeriesPreview.warningSeries} предупреждения</span>
                    <span>{dicomSeriesPreview.blockedSeries} заблокировано</span>
                  </div>
                  <div className="dicom-series-list">
                    {dicomSeriesPreview.series.slice(0, 6).map((series: any) => (
                      <article className={`dicom-series-row dicom-series-${series.status}`} key={series.id}>
                        <div>
                          <strong>{series.patientName ?? "Пациент ?"}</strong>
                          <span>
                            {series.kind ? imagingKindLabels[series.kind] : "тип не указан"} · {series.modality ?? "модальность не указана"} ·{" "}
                            {series.fileCount} файлов
                          </span>
                        </div>
                        <div>
                          <span>{dicomSeriesViewerLabels[series.recommendedViewer]}</span>
                          <small>
                            {series.mprReadiness.recommendedLayout} ·{" "}
                            {series.mprReadiness.canOpenMpr ? "MPR-предпросмотр готов" : series.mprReadiness.nextAction}
                          </small>
                          <small className="dicom-series-resource">
                            {mprLoadStrategyLabels[series.mprReadiness.resourcePolicy.loadStrategy]} /{" "}
                            {series.mprReadiness.resourcePolicy.estimatedMemoryMb} MB /{" "}
                            {mprResourceTierLabels[series.mprReadiness.resourcePolicy.requiredTier]}
                          </small>
                          <small>{series.seriesDescription ?? series.studyDescription ?? series.seriesInstanceUid ?? "UID серии не указан"}</small>
                        </div>
                        <p>{series.warnings.length ? series.warnings.slice(0, 3).join(", ") : "готово к просмотру"}</p>
                      </article>
                    ))}
                  </div>
                  <div className="recognition-notes">
                    {dicomSeriesPreview.parserNotes.map((note: any) => (
                      <span key={note}>{note}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="dicom-mpr-workbench" aria-label="Готовность рабочего места CBCT MPR">
              <div className="dicom-mpr-head">
                <div>
                  <strong>Рабочее место CBCT / MPR</strong>
                  <p>
                    {cbctWorkbenchSeries
                      ? `${cbctWorkbenchSeries.patientName ?? "Пациент ?"} · ${cbctWorkbenchSeries.fileCount} файлов · ${cbctWorkbenchSeries.mprReadiness.recommendedLayout}`
                      : "Сначала проверьте предпросмотр серий DICOM/CBCT."}
                  </p>
                </div>
                <span className={cbctWorkbenchSeries?.mprReadiness.canOpenMpr ? "mpr-ready" : "mpr-warn"}>
                  {cbctWorkbenchSeries?.mprReadiness.canOpenMpr ? "MPR-предпросмотр готов" : "только предпросмотр"}
                </span>
              </div>
              <small className="dicom-mpr-safety-note">
                Не диагностическое заключение. Подтверждайте CT-находки в сертифицированном просмотрщике/рабочей станции клиники.
              </small>
              <div className="dicom-mpr-layout">
                <div className="mpr-plane-grid">
                  {(cbctWorkbenchPlanes as CbctWorkbenchPlane[]).map((plane) => (
                    <button
                      className={`mpr-plane ${mprProjection === plane.key ? "active" : ""}`}
                      key={plane.key}
                      type="button"
                      onClick={() => setMprProjection(plane.key)}
                      disabled={!(cbctWorkbenchProjections as MprProjection[]).includes(plane.key)}
                    >
                      <span>{plane.title}</span>
                      <small>{plane.detail}</small>
                    </button>
                  ))}
                </div>
                <div className="mpr-control-panel">
                  <div className="mpr-toggle-row">
                    {(cbctWorkbenchProjections as MprProjection[]).map((projection) => (
                      <button
                        className={mprProjection === projection ? "active" : ""}
                        key={projection}
                        type="button"
                        onClick={() => setMprProjection(projection)}
                      >
                        {mprProjectionLabels[projection]}
                      </button>
                    ))}
                  </div>
                  <label>
                    Угол оси: {mprAxisDeg}°
                    <input min="-45" max="45" step="1" type="range" value={mprAxisDeg} onChange={(event: InputChangeEvent) => setMprAxisDeg(Number(event.target.value))} />
                  </label>
                  <label>
                    Толщина слоя: {mprSlabMm} мм
                    <input min="1" max="30" step="1" type="range" value={mprSlabMm} onChange={(event: InputChangeEvent) => setMprSlabMm(Number(event.target.value))} />
                  </label>
                  <div className="mpr-toggle-row">
                    {(Object.keys(mprWindowPresetLabels) as MprWindowPreset[]).map((preset) => (
                      <button
                        className={mprWindowPreset === preset ? "active" : ""}
                        key={preset}
                        type="button"
                        onClick={() => setMprWindowPreset(preset)}
                      >
                        {mprWindowPresetLabels[preset]}
                      </button>
                    ))}
                  </div>
                  <div className="mpr-check-row">
                    <label>
                      <input checked={mprCrosshairEnabled} type="checkbox" onChange={(event: InputChangeEvent) => setMprCrosshairEnabled(event.target.checked)} />
                      Синхронный курсор
                    </label>
                    <label>
                      <input checked={mprLinkedPlanesEnabled} type="checkbox" onChange={(event: InputChangeEvent) => setMprLinkedPlanesEnabled(event.target.checked)} />
                      Связанные плоскости
                    </label>
                  </div>
                </div>
              </div>
              <div className="recognition-notes">
                {(cbctWorkbenchSeries?.mprReadiness.tools.length ? cbctWorkbenchTools : ["window_level", "pan", "zoom", "external_open"]).map((tool: any) => (
                  <span key={tool}>{mprToolLabels[tool] ?? "инструмент просмотра"}</span>
                ))}
                {cbctWorkbenchSeries?.mprReadiness.blockers.map((blocker: any) => (
                  <span key={blocker}>{blocker}</span>
                ))}
                {cbctWorkbenchSeries?.mprReadiness.warnings.map((warning: any) => (
                  <span key={warning}>{warning}</span>
                ))}
              </div>
              {cbctWorkbenchSeries ? (
                <div className="dicom-resource-policy" aria-label="Политика ресурсов DICOM">
                  <article>
                    <strong>{mprLoadStrategyLabels[cbctWorkbenchSeries.mprReadiness.resourcePolicy.loadStrategy]}</strong>
                    <span>{mprResourceTierLabels[cbctWorkbenchSeries.mprReadiness.resourcePolicy.requiredTier]}</span>
                  </article>
                  <article>
                    <strong>{cbctWorkbenchSeries.mprReadiness.resourcePolicy.estimatedMemoryMb} MB</strong>
                    <span>лимит срезов: {cbctWorkbenchSeries.mprReadiness.resourcePolicy.maxClientSlices}</span>
                  </article>
                  <article>
                    <strong>{mprCacheModeLabels[cbctWorkbenchSeries.mprReadiness.resourcePolicy.cacheMode]}</strong>
                    <span>{cbctWorkbenchSeries.mprReadiness.resourcePolicy.thumbnailFirst ? "сначала миниатюры" : "прямая загрузка"}</span>
                  </article>
                  <p>{cbctWorkbenchSeries.mprReadiness.resourcePolicy.nextAction}</p>
                  {cbctWorkbenchSeries.mprReadiness.resourcePolicy.safetyCaps.slice(0, 4).map((cap: any) => (
                    <small key={cap}>{cap}</small>
                  ))}
                </div>
              ) : null}
              <div className="dicomweb-launch-panel" aria-label="Запуск DICOMweb и внешнего просмотрщика">
                <div className="dicomweb-launch-head">
                  <div>
                    <strong>DICOMweb / OHIF передача</strong>
                    <p>Админская проверка коннектора и манифеста просмотра. Прием остается легким.</p>
                  </div>
                  <span>{dicomViewerLaunchManifest ? dicomViewerLaunchModeLabels[dicomViewerLaunchManifest.launchMode] : "не запускалось"}</span>
                </div>
                <div className="dicomweb-input-grid">
                  <label>
                    Корень DICOMweb
                    <input
                      value={dicomWebEndpointUrl}
                      onChange={(event: any) => {
                        setDicomWebEndpointUrl(event.target.value);
                        setDicomWebCheck(null);
                        setDicomViewerLaunchManifest(null);
                        setDicomViewerToolStateBundle(null);
                        setDicomViewerWorkbenchManifest(null);
                        setDicomWorkbenchLocalSavedAt(null);
                        setDicomWorkstationReadiness(null);
                        setDicomRenderCachePlan(null);
                      }}
                    />
                  </label>
                  <label>
                    Корень OHIF
                    <input
                      value={ohifBaseUrl}
                      onChange={(event: any) => {
                        setOhifBaseUrl(event.target.value);
                        setDicomViewerLaunchManifest(null);
                        setDicomViewerToolStateBundle(null);
                        setDicomViewerWorkbenchManifest(null);
                        setDicomWorkbenchLocalSavedAt(null);
                        setDicomWorkstationReadiness(null);
                        setDicomRenderCachePlan(null);
                      }}
                    />
                  </label>
                </div>
                <div className="dicomweb-action-row">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void buildDicomViewerWorkbenchManifest()}
                    disabled={!cbctWorkbenchSeries || isDicomWorkbenchBuilding}
                  >
                    <Layers3 aria-hidden="true" />
                    {isDicomWorkbenchBuilding ? "Готовлю" : "Открыть CT-рабочее место"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void checkDicomWorkstationReadiness()}
                    disabled={!cbctWorkbenchSeries || isDicomWorkstationChecking}
                  >
                    <Gauge aria-hidden="true" />
                    {isDicomWorkstationChecking ? "Проверяю" : "Проверить этот ПК"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void buildDicomViewerLaunchManifest()}
                    disabled={!cbctWorkbenchSeries || isDicomManifestBuilding}
                  >
                    <ExternalLink aria-hidden="true" />
                    {isDicomManifestBuilding ? "Собираю" : "Открыть в OHIF"}
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void checkDicomWebConnector()} disabled={isDicomWebChecking}>
                    <CheckCircle2 aria-hidden="true" />
                    {isDicomWebChecking ? "Проверяю" : "Проверить архив"}
                  </button>
                </div>
                <details className="dicomweb-advanced-actions">
                  <summary>Расширенная настройка просмотрщика</summary>
                  <div className="dicomweb-action-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void buildDicomViewerToolStateBundle()}
                    disabled={!cbctWorkbenchSeries || isDicomToolStateBuilding}
                  >
                    <ClipboardCheck aria-hidden="true" />
                    {isDicomToolStateBuilding ? "Собираю" : "Экспорт состояния просмотрщика"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void buildDicomRenderCachePlan()}
                    disabled={!cbctWorkbenchSeries || !dicomWorkstationReadiness || isDicomRenderCachePlanning}
                  >
                    <Layers3 aria-hidden="true" />
                    {isDicomRenderCachePlanning ? "Планирую" : "Подготовить быструю загрузку"}
                  </button>
                  </div>
                  <small>Только метаданные/состояние. Рендер пикселей остается за OHIF, Cornerstone или сертифицированным локальным просмотрщиком.</small>
                </details>
                {dicomWebCheck ? (
                  <div className="dicomweb-status-grid">
                    <article className={`dicomweb-status dicomweb-${dicomWebCheck.status}`}>
                      <strong>{dicomWebStatusLabels[dicomWebCheck.status]}</strong>
                      <span>{dicomWebCheck.qidoHttpStatus ? `HTTP ${dicomWebCheck.qidoHttpStatus}` : "нет HTTP"}</span>
                    </article>
                    <article>
                      <strong>{dicomWebCheck.latencyMs} ms</strong>
                      <span>{dicomWebCheck.canSearch ? "QIDO-поиск готов" : "QIDO не готов"}</span>
                    </article>
                    <article>
                      <strong>{dicomWebCheck.storeConfigured ? "STOW настроен" : "STOW пропущен"}</strong>
                      <span>{dicomWebCheck.canRetrieve ? "WADO-серия готова" : "WADO нужен UID"}</span>
                    </article>
                  </div>
                ) : null}
                {dicomViewerWorkbenchManifest ? (
                  <div className="dicom-workbench-bundle-result" data-testid="dicom-workbench-bundle-result" aria-label="Пакет рабочего места DICOM CT">
                    <div>
                      <strong>
                        готовность загрузки {dicomViewerWorkbenchManifest.readiness.readinessScore}% ·{" "}
                        {dicomLabel(dicomQualityModeLabels, dicomViewerWorkbenchManifest.renderCachePlan.qualityMode, "режим качества")}
                      </strong>
                      <span>
                        {dicomViewerWorkbenchManifest.launchManifest.launchMode} ·{" "}
                        {dicomLabel(dicomTextureStrategyLabels, dicomViewerWorkbenchManifest.renderCachePlan.textureStrategy, "стратегия текстур")}
                      </span>
                    </div>
                    <article>
                      <strong>{dicomViewerWorkbenchManifest.renderCachePlan.firstPaintBudgetMs} ms</strong>
                      <span>первый срез</span>
                    </article>
                    <article>
                      <strong>{dicomViewerWorkbenchManifest.toolStateBundle.viewports.length}</strong>
                      <span>MPR-окна</span>
                    </article>
                    <article>
                      <strong>{dicomViewerWorkbenchManifest.warnings.length}</strong>
                      <span>предупреждений</span>
                    </article>
                    <p>{dicomViewerWorkbenchManifest.nextAction}</p>
                    <div className="dicom-workbench-actions">
                      <span>
                        {dicomWorkbenchLocalSavedAt
                          ? `Сохранено локально ${formatTime(dicomWorkbenchLocalSavedAt)}; восстановится после обновления.`
                          : "Сформированный bundle пока не сохранен локально."}
                      </span>
                      <span>
                        {dicomWorkbenchServerBundle
                          ? `Сервер сохранил ${formatTime(dicomWorkbenchServerBundle.serverSavedAt)}; пиксели не сохранялись.`
                          : latestDicomWorkbenchServerBundle
                            ? `На сервере есть восстановление ${formatTime(latestDicomWorkbenchServerBundle.serverSavedAt)}.`
                            : "Серверного восстановления пока нет."}
                      </span>
                      <span>
                        {dicomWorkbenchSourceIsRedacted
                          ? "Локальный источник скрыт в серверном восстановлении; найдите DICOM или вставьте папку, затем переподключите перед загрузкой пикселей."
                          : "Локальный источник доступен для этого рабочего набора."}
                      </span>
                      <button
                        className="secondary-button"
                        type="button"
                        data-testid="save-dicom-workbench-server"
                        onClick={() => void saveDicomWorkbenchBundleToServer()}
                        disabled={isDicomWorkbenchServerSaving}
                      >
                        <Database aria-hidden="true" />
                        {isDicomWorkbenchServerSaving ? "Сохраняю" : "Сохранить на сервер"}
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        data-testid="reconnect-dicom-workbench-folder"
                        onClick={() => void reconnectDicomWorkbenchFromCurrentFolder()}
                        disabled={!imagingFolderPath.trim() || isDicomWorkbenchReconnecting}
                      >
                        <RefreshCw aria-hidden="true" />
                        {isDicomWorkbenchReconnecting ? "Подключаю" : "Переподключить папку"}
                      </button>
                      {latestDicomWorkbenchServerBundle ? (
                        <button className="text-button" type="button" onClick={() => restoreDicomWorkbenchServerBundle(latestDicomWorkbenchServerBundle)}>
                          Восстановить с сервера
                        </button>
                      ) : null}
                      <button className="secondary-button" type="button" onClick={downloadDicomWorkbenchManifest} disabled={!dicomViewerWorkbenchManifest}>
                        <FileText aria-hidden="true" />
                        Скачать JSON
                      </button>
                      <button className="text-button" type="button" onClick={clearDicomWorkbenchRecovery} disabled={!dicomWorkbenchLocalSavedAt}>
                        Очистить локальную копию
                      </button>
                    </div>
                    <div className="dicom-cache-task-list">
                      {dicomViewerWorkbenchManifest.renderCachePlan.tasks.slice(0, 4).map((task: any) => (
                        <span key={task.id}>
                          {task.priority}: {task.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {dicomWorkstationReadiness ? (
                  <div className="dicom-workstation-result" aria-label="Готовность DICOM-станции">
                    <div className="dicom-workstation-score">
                      <strong>готовность загрузки {dicomWorkstationReadiness.readinessScore}%</strong>
                      <span>
                        {dicomLabel(dicomRuntimeTierLabels, dicomWorkstationReadiness.detectedTier, "класс ПК")} /{" "}
                        {dicomLabel(mprLoadStrategyLabels as Record<string, string>, dicomWorkstationReadiness.effectiveLoadStrategy, "стратегия загрузки")}
                      </span>
                    </div>
                    <div className="dicom-render-plan">
                      <strong>
                        {dicomWorkstationReadiness.renderPlan.gpuClass} ·{" "}
                        {dicomLabel(dicomQualityModeLabels, dicomWorkstationReadiness.renderPlan.qualityMode, "режим качества")}
                      </strong>
                      <span>{dicomLabel(dicomTextureStrategyLabels, dicomWorkstationReadiness.renderPlan.textureStrategy, "стратегия текстур")}</span>
                      <small>
                        batch {dicomWorkstationReadiness.renderPlan.targetSliceBatch} · downsample x
                        {dicomWorkstationReadiness.renderPlan.downsampleFactor} · GPU ~
                        {dicomWorkstationReadiness.renderPlan.estimatedGpuMemoryMb} MB
                      </small>
                      <small>{dicomWorkstationReadiness.renderPlan.firstPaintStrategy}</small>
                    </div>
                    <div className="dicom-workstation-checks">
                      {dicomWorkstationReadiness.checks.map((check: any) => (
                        <article className={`dicom-check-${check.status}`} key={check.id}>
                          <strong>{dicomReadinessCheckLabels[check.status]} · {check.label}</strong>
                          <span>{check.detail}</span>
                        </article>
                      ))}
                    </div>
                    <p>{dicomWorkstationReadiness.nextAction}</p>
                  </div>
                ) : null}
                {dicomRenderCachePlan ? (
                  <div className="dicom-cache-plan-result" aria-label="План кэша рендера DICOM">
                    <div>
                      <strong>
                        срезы {dicomRenderCachePlan.firstWindowStart}-{dicomRenderCachePlan.firstWindowEnd}
                      </strong>
                      <span>
                        {dicomLabel(dicomTextureStrategyLabels, dicomRenderCachePlan.textureStrategy, "стратегия текстур")} ·{" "}
                        {dicomLabel(dicomQualityModeLabels, dicomRenderCachePlan.qualityMode, "режим качества")}
                      </span>
                    </div>
                    <article>
                      <strong>{dicomRenderCachePlan.firstPaintBudgetMs} ms</strong>
                      <span>первый кадр</span>
                    </article>
                    <article>
                      <strong>{dicomRenderCachePlan.gpuMemoryBudgetMb} MB</strong>
                      <span>бюджет GPU</span>
                    </article>
                    <article>
                      <strong>{dicomRenderCachePlan.workerCount}</strong>
                      <span>воркеры</span>
                    </article>
                    <p>{dicomRenderCachePlan.nextAction}</p>
                    <div className="dicom-cache-task-list">
                      {dicomRenderCachePlan.tasks.slice(0, 5).map((task: any) => (
                        <span key={task.id}>
                          {task.priority}: {task.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {dicomViewerLaunchManifest ? (
                  <div className="dicomweb-manifest-result">
                    <div>
                      <strong>{dicomViewerLaunchModeLabels[dicomViewerLaunchManifest.launchMode]}</strong>
                      <span>{dicomViewerLaunchManifest.cornerstoneVolumeId ?? "ID потокового тома еще не создан"}</span>
                    </div>
                    {dicomViewerLaunchManifest.viewerUrl ? (
                      <a href={dicomViewerLaunchManifest.viewerUrl} target="_blank" rel="noreferrer">
                        Открыть просмотрщик
                      </a>
                    ) : (
                      <span>{dicomViewerLaunchManifest.nextAction}</span>
                    )}
                    <p>{dicomViewerLaunchManifest.warnings.slice(0, 3).join(" · ")}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
          ) : null}

          {settingsTab === "sources" && dicomViewerToolStateBundle ? (
            <section className="dicom-toolstate-result" aria-label="Пакет состояния инструментов DICOM-просмотрщика">
              <div>
                <strong>
                  {dicomViewerToolStateBundle.target} · окон {dicomViewerToolStateBundle.viewports.length}
                </strong>
                <span>
                  заметок {dicomViewerToolStateBundle.annotations.length} · инструментов {dicomViewerToolStateBundle.tools.length}
                </span>
              </div>
              <button className="secondary-button" type="button" onClick={downloadDicomViewerToolStateBundle} disabled={!dicomViewerToolStateBundle}>
                <FileText aria-hidden="true" />
                JSON
              </button>
              <p>{dicomViewerToolStateBundle.nextAction}</p>
              <small>{dicomViewerToolStateBundle.exportHints[0]}</small>
              {dicomViewerToolStateBundle.warnings.slice(0, 3).map((warning: any) => (
                <small key={warning}>{warning}</small>
              ))}
            </section>
          ) : null}

          {settingsTab === "sources" ? (
          <section className="integration-presets" aria-label="Пресеты миграции и внешних систем">
            <div className="import-copy">
              <Database aria-hidden="true" />
              <div>
                <p className="eyebrow">Источники данных</p>
                <h2>Старая программа, таблица, бумага и снимки идут через один безопасный предпросмотр</h2>
                <p>
                  Это не кнопки для врача. Это карта миграции для владельца или администратора: что можно разобрать сейчас, где нужна
                  карта полей, а где потребуется отдельный коннектор.
                </p>
              </div>
            </div>
            <div className="preset-grid">
              {dashboard.clinicSettings.integrationPresets.map((preset: any) => (
                <details className={`preset-card preset-${preset.status}`} key={preset.id} open={preset.status === "usable_now"}>
                  <summary className="preset-card-head">
                    <div>
                      <strong>{preset.title}</strong>
                      <p>
                        {preset.vendor} · {integrationCategoryLabels[preset.category]} · риск {preset.riskLevel}
                      </p>
                    </div>
                    <span>{integrationStatusLabels[preset.status]}</span>
                  </summary>
                  <div className="preset-capabilities" aria-label="Что переносит источник">
                    {preset.capabilities.slice(0, 6).map((capability: any) => (
                      <span key={capability}>{integrationCapabilityLabels[capability]}</span>
                    ))}
                  </div>
                  <ul>
                    {preset.migrationNotes.slice(0, 2).map((note: any) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <small>Вход: {preset.supportedInputs.slice(0, 4).join(", ")}</small>
                </details>
              ))}
            </div>
          </section>
          ) : null}

          {settingsTab === "ai" ? (
          <section className="recognition-lab" aria-label="ИИ-распознавание диктовки, журнала и снимков">
            <div className="import-copy">
              <Bot aria-hidden="true" />
              <div>
                <p className="eyebrow">ИИ-распознавание</p>
                <h2>Диктовка, фото журнала и снимки становятся черновиками с проверкой</h2>
                <p>
                  Здесь проверяется контур обработки будущих нейронок: вход, уверенность, предупреждения и следующий шаг. Ничего не
                  подписывается и не попадает в ЭМК без врача.
                </p>
              </div>
            </div>

            <div className="speech-provider-panel" aria-label="Контуры распознавания речи">
              <div className="speech-provider-head">
                <div>
                  <p className="eyebrow">STT-контур</p>
                  <h3>Голос: браузер сейчас, серверные провайдеры через ключи, офлайн позже</h3>
                </div>
                <span>сырой текст + черновик + аудит</span>
              </div>
              {speechGatewayStatus ? (
                <div className="speech-gateway-strip">
                  <strong>{speechGatewayStatus.providerLabel}</strong>
                  <span>
                    {speechGatewayCanUpload(speechGatewayStatus)
                      ? "серверный STT доступен"
                      : speechGatewayStatus.serverTranscriptionEnabled
                        ? "серверный STT ждет ключ/мост"
                        : "серверный STT не активен"}
                  </span>
                  <span>{speechProviderSelectionLabels[speechGatewayStatus.providerSelectionMode]}</span>
                  <span>
                    умное окно {Math.round(speechGatewayStatus.chunkingPolicy.minChunkMs / 1000)}-
                    {Math.round(speechGatewayStatus.chunkingPolicy.maxChunkMs / 1000)} сек. · фрагмент до {Math.round(speechGatewayStatus.maxChunkBytes / 1024 / 1024)} МБ
                  </span>
                  <span>защита дублей {speechGatewayStatus.chunkingPolicy.dedupeWindowChars} симв.</span>
                  <span>
                    полировка {speechGatewayStatus.polishPolicy.neuralEnabled ? speechGatewayStatus.polishPolicy.modelName ?? "ИИ" : "правила"}
                  </span>
                  <span className="speech-prompt-chip">
                    словарь {speechGatewayStatus.promptPolicy.enabled ? speechGatewayStatus.promptPolicy.version.replace("dental-stt-", "") : "выключен"}
                  </span>
                  <small className="speech-gateway-hint">
                    ключи {speechGatewayStatus.keyPool.availableKeyCount}/{speechGatewayStatus.keyPool.configuredKeyCount}
                    {speechGatewayStatus.keyPool.rotationEnabled ? " · ротация" : ""} · попыток{" "}
                    {speechGatewayStatus.keyPool.maxAttemptsPerProvider} · таймаут{" "}
                    {Math.round(speechGatewayStatus.keyPool.timeoutMs / 1000)} сек. терминов словаря{" "}
                    {speechGatewayStatus.promptPolicy.termCount}, максимум {speechGatewayStatus.promptPolicy.maxChars} симв.{" "}
                    {speechGatewayStatus.nextSetupStep}
                  </small>
                  <button className="secondary-button" type="button" onClick={() => void refreshSpeechRuntime({ silent: false })}>
                    Проверить
                  </button>
                </div>
              ) : null}
              {speechGatewayHealthReport ? (
                <div className={`speech-health-strip speech-health-${activeSpeechProviderHealth?.healthLevel ?? "offline"}`}>
                  <div>
                    <strong>Состояние STT</strong>
                    <span>
                      {speechGatewayHealthReport.activeProviderLabel} ·{" "}
                      {speechProviderHealthLabels[activeSpeechProviderHealth?.healthLevel ?? "offline"] ?? "офлайн"}
                    </span>
                  </div>
                  <span>
                    ключи {speechGatewayHealthReport.totalAvailableKeys}/{speechGatewayHealthReport.totalConfiguredKeys}
                    {speechGatewayHealthReport.totalCoolingDownKeys ? ` · ключей на паузе ${speechGatewayHealthReport.totalCoolingDownKeys}` : ""}
                  </span>
                  <span>резерв {speechGatewayHealthReport.fallbackProviderIds.length}</span>
                  <span>таймаут {Math.round(speechGatewayHealthReport.timeoutMs / 1000)} сек.</span>
                  <span>{speechGatewayHealthReport.promptEnabled ? "стоматологический словарь включен" : "словарь выключен"}</span>
                  <span>{speechGatewayHealthReport.deterministicParserEnabled ? "офлайн-парсер включен" : "парсер выключен"}</span>
                  <small>{speechGatewayHealthReport.nextAction}</small>
                  {speechGatewayHealthReport.warnings[0] ? <small>{speechGatewayHealthReport.warnings[0]}</small> : null}
                </div>
              ) : null}
              {speechRecordingStrategy ? (
                <div className="speech-strategy-strip">
                  <strong>{speechRecordingPathLabels[speechRecordingStrategy.recommendedPath] ?? speechRecordingStrategy.recommendedPath}</strong>
                  <span>{speechRecordingStrategy.providerLabel}</span>
                  <span>
                    фрагмент {Math.round(speechRecordingStrategy.chunkMs / 1000)} сек.
                    {speechRecordingStrategy.estimatedChunkCount ? ` · ~${speechRecordingStrategy.estimatedChunkCount} фрагм.` : ""}
                  </span>
                  <small>{speechRecordingStrategy.reason}</small>
                </div>
              ) : null}
              {speechRecordingRecovery?.recordings.length ? (
                <div className="speech-recovery-list">
                  {speechRecordingRecovery.recordings.slice(0, 3).map((recording: any) => (
                    <article className={`speech-recovery-row recovery-${recording.recoveryState}`} key={recording.recordingId}>
                      <div>
                        <strong>{speechRecoveryStateLabels[recording.recoveryState] ?? recording.recoveryState}</strong>
                        <span>
                          фрагментов {recording.chunkCount} · ок {recording.qualityCounts.clear} · проверить{" "}
                          {recording.qualityCounts.review + recording.qualityCounts.empty + recording.qualityCounts.failed}
                        </span>
                      </div>
                      <p>{recording.transcriptPreview || recording.nextAction}</p>
                      <small>
                        {recording.missingChunkIndexes.length ? `нет фрагментов ${recording.missingChunkIndexes.join(", ")} · ` : ""}
                        {recording.providerLabels.join(", ") || "локально"} ·{" "}
                        {recording.nextAction}
                      </small>
                    </article>
                  ))}
                </div>
              ) : null}
              <div className="speech-provider-list">
                {dashboard.speechProviders.map((provider: any) => {
                  const runtime = speechProviderRuntimeById.get(provider.id);
                  const health = speechProviderHealthById.get(provider.id);
                  return (
                  <article className={`speech-provider-row speech-provider-${provider.status}`} key={provider.id}>
                    <div>
                      <strong>{provider.title}</strong>
                      <p>
                        {speechProviderStatusLabels[provider.status]} · {speechProviderModeLabels[provider.mode]}
                      </p>
                    </div>
                    <div className="speech-provider-tags">
                      {provider.recommendedFor.slice(0, 3).map((item: any) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                    <ul>
                      {provider.strengths.slice(0, 2).map((strength: any) => (
                        <li key={strength}>{strength}</li>
                      ))}
                    </ul>
                    <div className="speech-provider-foot">
                      <span>{provider.costNote}</span>
                      {runtime ? (
                        <small className={runtime.configured ? "speech-runtime-ready" : "speech-runtime-missing"}>
                          {speechProviderConnectorLabels[runtime.connector]} ·{" "}
                          {runtime.canTranscribeChunks ? "готов" : runtime.configured ? "настроен" : "не настроен"}
                          {runtime.connector === "local_bridge"
                            ? " · без облачного ключа"
                            : ` · ключи ${runtime.keyPool.availableKeyCount}/${runtime.keyPool.configuredKeyCount}`}
                        </small>
                      ) : null}
                      {health ? (
                        <small className={`speech-health-chip speech-health-chip-${health.healthLevel}`}>
                          {speechProviderHealthLabels[health.healthLevel] ?? health.healthLevel} · безопасно {health.safeToUseInVisit ? "да" : "нет"}
                          {health.keyPool.coolingDownKeyCount ? ` · ключей на паузе ${health.keyPool.coolingDownKeyCount}` : ""}
                        </small>
                      ) : null}
                      <small>{provider.envVars.length ? provider.envVars.join(" · ") : "без серверного секрета"}</small>
                      <a href={provider.sourceUrl} target="_blank" rel="noreferrer">
                        Документация
                      </a>
                    </div>
                  </article>
                  );
                })}
              </div>
            </div>

            <div className="recognition-preset-row">
              {recognitionPresets.map((preset: any) => (
                <button
                  className={`source-card ${recognitionKind === preset.kind && recognitionTarget === preset.target ? "active" : ""}`}
                  key={preset.key}
                  type="button"
                  onClick={() => chooseRecognitionPreset(preset)}
                >
                  <strong>{preset.title}</strong>
                  <span>{preset.detail}</span>
                </button>
              ))}
            </div>

            <div className="recognition-workbench">
              <textarea
                aria-label="Текст для AI-распознавания"
                value={recognitionText}
                onChange={(event: any) => {
                  setRecognitionText(event.target.value);
                  setRecognitionJob(null);
                }}
              />
              <div className="import-tool-row">
                <span className="recognition-target">Цель: {recognitionTargetLabels[recognitionTarget]}</span>
                <button className="primary-button" type="button" onClick={runRecognitionJob} disabled={isRecognitionLoading || !recognitionInputReady}>
                  <Sparkles aria-hidden="true" /> {isRecognitionLoading ? "Готовлю черновик" : "Распознать"}
                </button>
              </div>
              {!recognitionInputReady ? (
                <p className="import-empty-guidance" role="status" aria-live="polite">
                  Вставьте текст, OCR или диктовку перед распознаванием.
                </p>
              ) : null}
              {recognitionJob ? (
                <div className="recognition-result">
                  <div>
                    <strong>Уверенность {Math.round(recognitionJob.confidence * 100)}%</strong>
                    <span>{recognitionJob.suggestedNextStep}</span>
                  </div>
                  <p>{recognitionJob.resultText}</p>
                  <div className="recognition-notes">
                    {recognitionJob.warnings.map((warning: any) => (
                      <span key={warning}>{warning}</span>
                    ))}
                  </div>
                  {recognitionJob.target === "patient_import" || recognitionJob.target === "visit_note" ? (
                    <button className="secondary-button" type="button" onClick={sendRecognitionResultToImport}>
                      <UploadCloud aria-hidden="true" /> Передать дальше
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
          ) : null}

          {settingsTab === "imports" ? (
          <section className="import-studio smart-import-studio" aria-label="Умный разбор смешанной выгрузки">
            <div className="import-copy">
              <Sparkles aria-hidden="true" />
              <div>
                <p className="eyebrow">Умный парсер</p>
                <h2>Один вход для пациентов, снимков и мусорных строк</h2>
                <p>
                  Вставь смешанную выгрузку из старой МИС, RVG-папки, Excel, OCR или диктовки. Парсер сам разделит строки,
                  покажет уверенность разбора и отправит каждую часть в безопасный предпросмотр.
                </p>
              </div>
            </div>

            <div className="import-source-grid smart-mode-grid" aria-label="Режим умного парсера">
              {(Object.keys(smartImportModeLabels) as SmartImportMode[]).map((mode: any) => (
                <button
                  className={`source-card ${smartImportMode === mode ? "active" : ""}`}
                  type="button"
                  key={mode}
                  onClick={() => {
                    setSmartImportMode(mode);
                    setSmartImportPreview(null);
                    setSmartImportCommit(null);
                  }}
                >
                  <strong>{smartImportModeLabels[mode].title}</strong>
                  <span>{smartImportModeLabels[mode].detail}</span>
                </button>
              ))}
            </div>

            <div className="import-workbench">
              <textarea
                aria-label="Смешанная выгрузка для умного парсера"
                value={smartImportText}
                onChange={(event: any) => {
                  setSmartImportText(event.target.value);
                  setSmartImportPreview(null);
                  setSmartImportCommit(null);
                }}
              />
              <div className="import-tool-row">
                <input
                  ref={browserMigrationInputRef}
                  data-testid="browser-migration-folder-input"
                  type="file"
                  multiple
                  hidden
                  tabIndex={-1}
                  onChange={(event: any) => void handleBrowserMigrationInputChange(event.currentTarget.files)}
                />
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setSmartImportMode("auto");
                    setSmartImportText(
                      "Старая МИС: Firebird backup C:\\Legacy\\clinic_2024.fdb\nАрхив выгрузки D:\\Migration\\patients_payments.xlsx\nDental clinic Smile Center INN 1234567890 Address: Samara, Lenina 1\nНовый Пациент Снимков +7 927 444-55-66 12.02.1991 перенос из старой МИС\nНовый Пациент Снимков +7 927 444-55-66 RVG 36 12.05.2026 C:\\Images\\new_patient_36.dcm\nИванова Марина Сергеевна +7 927 111-22-33 ОПТГ 10.05.2026 C:\\Images\\ivanova_opg.png\nслужебная строка без полезных данных"
                    );
                    setSmartImportPreview(null);
                    setSmartImportCommit(null);
                  }}
                >
                  <Sparkles aria-hidden="true" /> Смешанный пример
                </button>
                <button className="secondary-button" type="button" onClick={downloadSmartImportReport} disabled={isSmartReportLoading || !smartImportInputReady}>
                  <FileText aria-hidden="true" /> {isSmartReportLoading ? "Готовлю отчет" : "CSV-отчет"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={downloadSmartImportSafeHandoffReport}
                  disabled={isSmartSafeReportLoading || !smartImportInputReady}
                  data-testid="download-smart-safe-handoff-report"
                  title="CSV для администратора, IT или вендора без ФИО, телефонов, дат рождения, локальных путей и имен файлов"
                >
                  <ShieldCheck aria-hidden="true" /> {isSmartSafeReportLoading ? "Готовлю safe CSV" : "Safe CSV"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void runMigrationAutopilot()}
                  disabled={isMigrationAutopilotLoading}
                  data-testid="run-migration-autopilot"
                >
                  <Sparkles aria-hidden="true" /> {isMigrationAutopilotLoading ? "Строю автоплан" : "Автоплан"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void downloadMigrationHandoffReport()}
                  disabled={isMigrationHandoffReportLoading}
                  data-testid="download-migration-handoff-report"
                  aria-busy={isMigrationHandoffReportLoading || undefined}
                >
                  <FileText aria-hidden="true" /> {isMigrationHandoffReportLoading ? "Готовлю handoff" : "Handoff CSV"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void pickBrowserMigrationSource()}
                  disabled={isBrowserMigrationScanning}
                  data-testid="pick-browser-migration-source"
                  title={
                    browserDirectoryPickerAvailable
                      ? "Выбрать папку старой МИС, диск выгрузки, CT/DICOM или архив снимков"
                      : "Выбрать файлы старой МИС, CT/DICOM или архивы через браузерный fallback"
                  }
                >
                  <Database aria-hidden="true" /> {isBrowserMigrationScanning ? "Сканирую manifest" : "Папка/диск"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void discoverMigrationSources()}
                  disabled={isMigrationSourceDiscovering}
                  data-testid="discover-migration-sources"
                >
                  <ScanSearch aria-hidden="true" /> {isMigrationSourceDiscovering ? "Ищу источники" : "Найти на ПК"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void lookupClinicPublicProfile()}
                  disabled={isClinicPublicLookupLoading}
                  data-testid="lookup-clinic-public-profile"
                >
                  <Search aria-hidden="true" /> {isClinicPublicLookupLoading ? "Ищу реквизиты" : "Реквизиты клиники"}
                </button>
                <button className="primary-button" type="button" onClick={previewSmartImport} disabled={isSmartImportLoading || !smartImportInputReady}>
                  <UploadCloud aria-hidden="true" /> {isSmartImportLoading ? "Разбираю" : "Разобрать"}
                </button>
              </div>
              {!smartImportInputReady ? (
                <p className="import-empty-guidance" role="status" aria-live="polite">
                  Вставьте выгрузку из старой МИС, таблицу, OCR или диктовку перед разбором.
                </p>
            ) : null}
          </div>

            {browserMigrationDiscovery ? (
              <div
                className="dicom-discovery-result browser-migration-manifest-result"
                data-testid="browser-migration-manifest-result"
                aria-label="Браузерный manifest старых баз, выгрузок и снимков"
              >
                <div className="dicom-discovery-head">
                  <strong>
                    Browser manifest: источников {browserMigrationDiscovery.candidates.length} · файлов{" "}
                    {browserMigrationDiscovery.candidates.reduce((sum: number, candidate: any) => sum + candidate.matchedFiles, 0)} · папок{" "}
                    {browserMigrationDiscovery.scannedFolders}
                  </strong>
                  <span>{browserMigrationDiscovery.nextAction}</span>
                  <span>Сканирование выполнено после явного выбора папки/файлов. Полный путь и содержимое файлов не сохраняются в CRM.</span>
                </div>
                <div className="migration-source-artifact-list">
                  {browserMigrationDiscovery.candidates.slice(0, 6).map((candidate: any) => (
                    <span key={candidate.sourceFingerprint}>
                      {candidate.safeDisplayName} · {candidate.sourceKind} · {Math.round(candidate.confidence * 100)}%
                    </span>
                  ))}
                </div>
                {browserMigrationDiscovery.warnings.slice(0, 4).map((warning: string) => (
                  <small key={warning}>{warning}</small>
                ))}
              </div>
            ) : null}

            {migrationAutopilot ? (
              <div
                className="dicom-discovery-result migration-autopilot-result"
                data-testid="migration-autopilot-result"
                aria-label="Автоплан миграции старых баз, снимков и реквизитов клиники"
              >
                <div className="dicom-discovery-head">
                  <strong>
                    Автоплан миграции: источников {migrationAutopilot.discovery.candidateCount} · проб {migrationAutopilot.discovery.probedCount} · папок{" "}
                    {migrationAutopilot.discovery.scannedFolders}
                  </strong>
                  <span>{migrationAutopilot.nextAction}</span>
                  <span>Сырые локальные пути, имена файлов и пациентские данные не отправляются в публичный поиск клиники.</span>
                </div>
                {migrationAutopilot.operatorPacket ? (
                  <div className="migration-autopilot-operator-packet" data-testid="migration-autopilot-operator-packet">
                    <div className="migration-operator-score">
                      <strong>
                        Пакет миграции: {migrationOperatorPacketStatusLabels[migrationAutopilot.operatorPacket.overallStatus] ?? migrationAutopilot.operatorPacket.overallStatus} ·{" "}
                        {Math.round(migrationAutopilot.operatorPacket.score * 100)}%
                      </strong>
                      <span>
                        БД {migrationAutopilot.operatorPacket.totals.databaseSources} · снимки {migrationAutopilot.operatorPacket.totals.mediaSources} · таблицы{" "}
                        {migrationAutopilot.operatorPacket.totals.tableSources} · системные следы {migrationAutopilot.operatorPacket.totals.workstationHints} · публичные ссылки{" "}
                        {migrationAutopilot.operatorPacket.totals.publicLookupTargets}
                      </span>
                    </div>
                    <div className="migration-autopilot-summary">
                      {migrationAutopilot.operatorPacket.lanes.slice(0, 5).map((lane: any) => (
                        <article key={lane.id}>
                          <strong>{lane.title}</strong>
                          <span>
                            {lane.owner} · {migrationOperatorPacketStatusLabels[lane.status] ?? lane.status} · {Math.round(lane.score * 100)}%
                          </span>
                          <small>{lane.detail}</small>
                          <small>{lane.nextAction}</small>
                        </article>
                      ))}
                    </div>
                    <div className="migration-source-artifact-list" aria-label="Первые действия миграции">
                      {migrationAutopilot.operatorPacket.firstActions.slice(0, 6).map((action: string) => (
                        <span key={action}>{action}</span>
                      ))}
                    </div>
                    <div className="migration-autopilot-summary" data-testid="migration-autopilot-handoff-checklist" aria-label="Handoff checklist миграции">
                      {migrationAutopilot.operatorPacket.handoffChecklist.slice(0, 6).map((item: any) => (
                        <article key={item.id}>
                          <strong>{item.title}</strong>
                          <span>
                            {item.owner} · {item.phase} · {migrationOperatorPacketStatusLabels[item.status] ?? item.status}
                          </span>
                          <small>{item.detail}</small>
                          <small>Нужно: {item.requiredArtifact}</small>
                          <small>{item.doneWhen}</small>
                        </article>
                      ))}
                    </div>
                    <small>
                      Онлайн можно: {migrationAutopilot.operatorPacket.onlineLookupPolicy.allowed.join(" · ")}. Нельзя:{" "}
                      {migrationAutopilot.operatorPacket.onlineLookupPolicy.forbidden.slice(0, 6).join(" · ")}.
                    </small>
                  </div>
                ) : null}
                <div className="migration-autopilot-summary">
                  {migrationAutopilot.steps.slice(0, 6).map((step: any) => (
                    <article key={`${step.order}:${step.title}`}>
                      <strong>
                        {step.order}. {step.title}
                      </strong>
                      <span>
                        {step.owner} · {step.blocking ? "обязательно" : "можно параллельно"}
                      </span>
                      <small>{step.detail}</small>
                    </article>
                  ))}
                </div>
                {migrationAutopilot.sources.length ? (
                  <div className="dicom-discovery-grid">
                    {migrationAutopilot.sources.slice(0, 6).map((source: any) => (
                      <article key={source.candidate.sourceFingerprint}>
                        <strong>{source.candidate.safeDisplayName}</strong>
                        <span>
                          {source.priority} · {source.owner} · {Math.round(source.score * 100)}%
                        </span>
                        {source.readiness ? (
                          <small>
                            Готовность: {migrationReadinessLevelLabels[source.readiness.level] ?? source.readiness.level} ·{" "}
                            {Math.round(source.readiness.score * 100)}% · блокеров {source.readiness.blockers.length}
                          </small>
                        ) : null}
                        {source.bridgeKit ? (
                          <small>
                            Kit: {migrationBridgeKitKindLabels[source.bridgeKit.kind] ?? source.bridgeKit.kind} · {source.bridgeKit.status} ·{" "}
                            {source.bridgeKit.requiredTools.slice(0, 2).join(" · ")}
                          </small>
                        ) : null}
                        <small>
                          {source.candidate.sourceKind} · ID {source.candidate.sourceFingerprint.toUpperCase()} · файлов {source.candidate.matchedFiles}
                        </small>
                        {source.probe ? (
                          <small>
                            Проба: БД {source.probe.counts.databases} · DICOM {source.probe.counts.dicom} · снимков {source.probe.counts.images} · таблиц{" "}
                            {source.probe.counts.tables}
                          </small>
                        ) : (
                          <small>Проба еще не запускалась для этого кандидата.</small>
                        )}
                        <span>{source.recommendedAction}</span>
                        {source.riskFlags.slice(0, 4).map((flag: string) => (
                          <small key={flag}>{flag}</small>
                        ))}
                        {source.readiness?.blockers.slice(0, 2).map((item: any) => (
                          <small key={item.id}>
                            {item.owner}: {item.title} · {item.nextAction}
                          </small>
                        ))}
                        {source.probe?.adapters.slice(0, 2).map((adapter: any) => (
                          <small key={adapter.id}>
                            {adapter.title}: {adapter.status} · {Math.round(adapter.confidence * 100)}%
                          </small>
                        ))}
                        <div className="migration-source-card-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => planMigrationDiscoveryCandidate(source.candidate)}
                            disabled={isMigrationSourceWorkupLoading}
                          >
                            План
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => probeMigrationDiscoveryCandidate(source.candidate)}
                            disabled={isMigrationSourceProbeLoading}
                          >
                            Проба
                          </button>
                          <button className="text-button" type="button" onClick={() => addMigrationDiscoveryCandidateToSmartImport(source.candidate)}>
                            В парсер
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
                {migrationAutopilot.clinicLookup ? (
                  <div className="migration-autopilot-clinic">
                    <strong>
                      Реквизиты клиники: {migrationAutopilot.clinicLookup.providerStatus} · {migrationAutopilot.clinicLookup.safeQuery || "без запроса"}
                    </strong>
                    <span>{migrationAutopilot.clinicLookup.nextAction}</span>
                    <div className="clinic-public-targets">
                      {migrationAutopilot.clinicLookup.publicLookupTargets.slice(0, 4).map((target: any) => (
                        <a className="secondary-button" href={target.url} key={`${target.kind}:${target.title}`} target="_blank" rel="noreferrer">
                          <ExternalLink aria-hidden="true" /> {target.title}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
                {[...migrationAutopilot.privacyWarnings, ...migrationAutopilot.warnings].slice(0, 8).map((warning: string) => (
                  <small key={warning}>{warning}</small>
                ))}
              </div>
            ) : null}

            {migrationSourceDiscovery ? (
              <div
                className="dicom-discovery-result migration-source-discovery-result"
                data-testid="migration-source-discovery-result"
                aria-label="Автопоиск старых баз, выгрузок и снимков"
              >
                <div className="dicom-discovery-head">
                  <strong>
                    Найдено источников: {migrationSourceDiscovery.candidates.length} · просканировано папок:{" "}
                    {migrationSourceDiscovery.scannedFolders}
                  </strong>
                  <span>{migrationSourceDiscovery.nextAction}</span>
                  <span>Сырые пути и похожие на ФИО названия папок скрыты до добавления в парсер.</span>
                </div>
                <div className="dicom-discovery-grid">
                  {migrationSourceDiscovery.candidates.slice(0, 9).map((candidate: any) => (
                    <article key={candidate.sourceFingerprint}>
                      <strong>{candidate.safeDisplayName}</strong>
                      <span>
                        {candidate.sourceLabel} · {candidate.sourceKind} · локальный ID {candidate.sourceFingerprint.toUpperCase()}
                      </span>
                      <small>
                        {Math.round(candidate.confidence * 100)}% · файлов {candidate.matchedFiles} · БД {candidate.databaseFiles} · DICOM{" "}
                        {candidate.dicomLikeFiles} · изображений {candidate.imageFiles}
                      </small>
                      {candidate.latestModifiedAt ? <small>Последнее изменение: {formatDateTime(candidate.latestModifiedAt)}</small> : null}
                      {candidate.reasons.slice(0, 3).map((reason: string) => (
                        <span key={reason}>{reason}</span>
                      ))}
                      {candidate.warnings.slice(0, 2).map((warning: string) => (
                        <small key={warning}>{warning}</small>
                      ))}
                      <div className="migration-source-card-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => planMigrationDiscoveryCandidate(candidate)}
                          disabled={isMigrationSourceWorkupLoading}
                        >
                          План
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => probeMigrationDiscoveryCandidate(candidate)}
                          disabled={isMigrationSourceProbeLoading}
                        >
                          Проба
                        </button>
                        <button className="text-button" type="button" onClick={() => addMigrationDiscoveryCandidateToSmartImport(candidate)}>
                          В парсер
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {migrationSourceDiscovery.warnings.slice(0, 4).map((warning: string) => (
                  <small key={warning}>{warning}</small>
                ))}
              </div>
            ) : null}

            {migrationSourceWorkup ? (
              <div
                className="dicom-discovery-result migration-source-workup-result"
                data-testid="migration-source-workup-result"
                aria-label="План безопасной миграции найденного источника"
              >
                <div className="dicom-discovery-head">
                  <strong>
                    План: {migrationSourceWorkup.safeDisplayName} · {migrationSourceWorkup.sourceKind} · ID{" "}
                    {migrationSourceWorkup.sourceFingerprint.toUpperCase()}
                  </strong>
                  <span>
                    {migrationSourceWorkup.sourceLabel} ·{" "}
                    {migrationSourceWorkup.sourceExists ? "источник доступен" : "источник сейчас не доступен"} ·{" "}
                    {migrationSourceWorkup.automationLevel}
                  </span>
                  <span>{migrationSourceWorkup.nextAction}</span>
                  <span>{migrationSourceWorkup.recommendedRoute}</span>
                </div>
                <div className="migration-source-workup-lanes" aria-label="Готовность источника к миграции">
                  <article>
                    <strong>
                      Готовность: {migrationReadinessLevelLabels[migrationSourceWorkup.readiness.level] ?? migrationSourceWorkup.readiness.level} ·{" "}
                      {Math.round(migrationSourceWorkup.readiness.score * 100)}%
                    </strong>
                    <p>{migrationSourceWorkup.readiness.nextAction}</p>
                    <small>
                      Блокеры {migrationSourceWorkup.readiness.blockers.length} · предупреждения {migrationSourceWorkup.readiness.warnings.length} · готово{" "}
                      {migrationSourceWorkup.readiness.ready.length}
                    </small>
                  </article>
                  <article>
                    <strong>Что мешает</strong>
                    {[...migrationSourceWorkup.readiness.blockers, ...migrationSourceWorkup.readiness.warnings].slice(0, 3).map((item: any) => (
                      <span key={item.id}>
                        {item.owner}: {item.title}
                      </span>
                    ))}
                  </article>
                </div>
                <div className="migration-source-workup-lanes" aria-label="Bridge kit источника миграции">
                  <article>
                    <strong>
                      Kit: {migrationBridgeKitKindLabels[migrationSourceWorkup.bridgeKit.kind] ?? migrationSourceWorkup.bridgeKit.kind} ·{" "}
                      {migrationSourceWorkup.bridgeKit.status}
                    </strong>
                    <p>{migrationSourceWorkup.bridgeKit.nextAction}</p>
                    <small>{migrationSourceWorkup.bridgeKit.requiredTools.slice(0, 4).join(" · ")}</small>
                  </article>
                  <article>
                    <strong>Staging manifest</strong>
                    <span>{migrationSourceWorkup.bridgeKit.outputManifest.format}</span>
                    <small>{migrationSourceWorkup.bridgeKit.outputManifest.requiredColumns.slice(0, 5).join(" · ")}</small>
                  </article>
                </div>
                <div className="migration-source-workup-lanes">
                  <article>
                    <strong>Что можно вытянуть</strong>
                    <p>{migrationSourceWorkup.extractableEntities.join(" · ")}</p>
                    <small>{migrationSourceWorkup.requiredArtifacts.join(" · ")}</small>
                  </article>
                  <article>
                    <strong>Передача в CRM</strong>
                    {migrationSourceWorkup.handoffs.slice(0, 3).map((handoff: any) => (
                      <span key={`${handoff.method}:${handoff.endpoint}`}>
                        {handoff.title}: {handoff.method} {handoff.endpoint}
                      </span>
                    ))}
                  </article>
                </div>
                <div className="dicom-discovery-grid">
                  {migrationSourceWorkup.steps.map((step: any) => (
                    <article key={step.id}>
                      <strong>{step.title}</strong>
                      <span>{step.status} · {step.actionLabel}</span>
                      <small>{step.detail}</small>
                    </article>
                  ))}
                </div>
                {[...migrationSourceWorkup.privacyWarnings, ...migrationSourceWorkup.warnings].slice(0, 6).map((warning: string) => (
                  <small key={warning}>{warning}</small>
                ))}
              </div>
            ) : null}

            {migrationSourceProbe ? (
              <div
                className="dicom-discovery-result migration-source-probe-result"
                data-testid="migration-source-probe-result"
                aria-label="Read-only проба найденного источника миграции"
              >
                <div className="dicom-discovery-head">
                  <strong>
                    Проба: {migrationSourceProbe.safeDisplayName} · {migrationSourceProbe.sourceKind} · ID{" "}
                    {migrationSourceProbe.sourceFingerprint.toUpperCase()}
                  </strong>
                  <span>
                    {migrationSourceProbe.sourceLabel} · папок {migrationSourceProbe.scannedFolders} · файлов{" "}
                    {migrationSourceProbe.scannedFiles}
                  </span>
                  <span>{migrationSourceProbe.nextAction}</span>
                  <span>{migrationSourceProbe.recommendedRoute}</span>
                </div>
                <div className="migration-source-workup-lanes" aria-label="Готовность пробы источника к миграции">
                  <article>
                    <strong>
                      Готовность: {migrationReadinessLevelLabels[migrationSourceProbe.readiness.level] ?? migrationSourceProbe.readiness.level} ·{" "}
                      {Math.round(migrationSourceProbe.readiness.score * 100)}%
                    </strong>
                    <p>{migrationSourceProbe.readiness.nextAction}</p>
                    <small>
                      Блокеры {migrationSourceProbe.readiness.blockers.length} · предупреждения {migrationSourceProbe.readiness.warnings.length} · готово{" "}
                      {migrationSourceProbe.readiness.ready.length}
                    </small>
                  </article>
                  <article>
                    <strong>Preflight</strong>
                    {[...migrationSourceProbe.readiness.blockers, ...migrationSourceProbe.readiness.warnings].slice(0, 3).map((item: any) => (
                      <span key={item.id}>
                        {item.owner}: {item.title}
                      </span>
                    ))}
                  </article>
                </div>
                <div className="migration-source-workup-lanes" aria-label="Bridge kit пробы источника">
                  <article>
                    <strong>
                      Kit: {migrationBridgeKitKindLabels[migrationSourceProbe.bridgeKit.kind] ?? migrationSourceProbe.bridgeKit.kind} ·{" "}
                      {migrationSourceProbe.bridgeKit.status}
                    </strong>
                    <p>{migrationSourceProbe.bridgeKit.nextAction}</p>
                    <small>{migrationSourceProbe.bridgeKit.requiredTools.slice(0, 4).join(" · ")}</small>
                  </article>
                  <article>
                    <strong>Запрещено наружу</strong>
                    <span>{migrationSourceProbe.bridgeKit.outputManifest.forbiddenFields.slice(0, 4).join(" · ")}</span>
                    <small>{migrationSourceProbe.bridgeKit.privacyBoundary}</small>
                  </article>
                </div>
                <div className="migration-source-workup-lanes">
                  <article>
                    <strong>Инвентарь</strong>
                    <p>
                      БД {migrationSourceProbe.counts.databases} · dump {migrationSourceProbe.counts.dumps} · таблицы{" "}
                      {migrationSourceProbe.counts.tables} · архивы {migrationSourceProbe.counts.archives} · DICOM{" "}
                      {migrationSourceProbe.counts.dicom} · снимки {migrationSourceProbe.counts.images} · 3D{" "}
                      {migrationSourceProbe.counts.models}
                    </p>
                    <small>{migrationSourceProbe.detectedVendors.length ? migrationSourceProbe.detectedVendors.join(" · ") : "Вендор не распознан"}</small>
                  </article>
                  <article>
                    <strong>Сигнатуры</strong>
                    <p>{migrationSourceProbe.formatSignals.slice(0, 8).join(" · ") || "Только имя/расширение, без читаемой сигнатуры"}</p>
                    <small>Пути и похожие на ФИО имена файлов скрыты в безопасные alias.</small>
                  </article>
                </div>
                <div className="dicom-discovery-grid">
                  {migrationSourceProbe.adapters.slice(0, 4).map((adapter: any) => (
                    <article key={adapter.id}>
                      <strong>{adapter.title}</strong>
                      <span>
                        {adapter.status} · {Math.round(adapter.confidence * 100)}%
                      </span>
                      <small>{adapter.input}</small>
                      <small>{adapter.output}</small>
                      <span>{adapter.nextAction}</span>
                    </article>
                  ))}
                </div>
                {migrationSourceProbe.artifactSamples.length ? (
                  <div className="migration-source-artifact-list" aria-label="Безопасные примеры найденных артефактов">
                    {migrationSourceProbe.artifactSamples.slice(0, 8).map((artifact: any) => (
                      <span key={artifact.id}>
                        {artifact.safeName} · {artifact.kind}
                        {artifact.byteSize !== null ? ` · ${megabytes(artifact.byteSize)}` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
                {[...migrationSourceProbe.privacyWarnings, ...migrationSourceProbe.warnings].slice(0, 6).map((warning: string) => (
                  <small key={warning}>{warning}</small>
                ))}
              </div>
            ) : null}

            {clinicPublicLookup && settingsTab === "imports" ? (
              <div className="clinic-public-lookup-result smart-clinic-public-lookup" aria-label="Публичные источники для профиля клиники">
                <div className="dicom-discovery-head">
                  <strong>
                    Реквизиты клиники: {clinicPublicLookup.providerStatus} · {clinicPublicLookup.safeQuery || "без запроса"}
                  </strong>
                  <span>{clinicPublicLookup.nextAction}</span>
                </div>
                {clinicPublicLookup.suggestions.length ? (
                  <div className="clinic-public-suggestions">
                    {clinicPublicLookup.suggestions.slice(0, 3).map((suggestion: any, index: number) => (
                      <article key={`${suggestion.source}-${index}`}>
                        <strong>
                          {suggestion.source} · {Math.round(suggestion.confidence * 100)}%
                        </strong>
                        <p>
                          {Object.entries(suggestion.fields)
                            .map(([key, value]) => `${clinicPublicLookupFieldLabels[key] ?? key}: ${String(value)}`)
                            .join(" · ")}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}
                <div className="clinic-public-targets">
                  {clinicPublicLookup.publicLookupTargets.map((target: any) => (
                    <a className="secondary-button" href={target.url} key={`${target.kind}:${target.title}`} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" /> {target.title}
                    </a>
                  ))}
                </div>
                {clinicPublicLookup.warnings.slice(0, 3).map((warning: string) => (
                  <small key={warning}>{warning}</small>
                ))}
              </div>
            ) : null}

            {smartImportPreview ? (
              <div className="import-preview">
                <div className="import-stats">
                  <span>{smartImportPreview.totalLines} строк</span>
                  <span>{smartImportPreview.patientPreview.totalRows} пациентов</span>
                  <span>{smartImportPreview.imagingPreview.totalRows} снимков</span>
                  <span>{smartImportPreview.clinicSuggestion ? Object.keys(smartImportPreview.clinicSuggestion.fields).length : 0} реквизитов</span>
                  <span>{smartImportPreview.legacySources?.length ?? 0} источников</span>
                  <span>
                    {smartImportPreview.lineClassifications.filter((row: any) => row.kind === "ignored").length} пропущено
                  </span>
                </div>
                <div className="import-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={commitSmartImport}
                    disabled={
                      isSmartImportCommitting ||
                      !smartImportInputReady ||
                      (smartImportPreview.patientPreview.readyRows === 0 && smartImportPreview.imagingPreview.readyRows === 0)
                    }
                  >
                    <CheckCircle2 aria-hidden="true" /> {isSmartImportCommitting ? "Записываю" : "Записать готовые"}
                  </button>
                  {smartImportCommit ? (
                    <span>
                      Пациенты: {smartImportCommit.patientCommit?.importedCount ?? 0}. Снимки:{" "}
                      {smartImportCommit.imagingCommit?.importedCount ?? 0}.
                    </span>
                  ) : (
                    <span>Применение сначала создаст новых пациентов, затем заново привяжет готовые снимки. Реквизиты клиники только подсказываются.</span>
                  )}
                </div>
                {smartImportPreview.migrationPlan ? (
                  <div className="import-rows">
                    {smartImportPreview.migrationPlan.steps.map((step: any) => (
                      <article className={`import-row import-${step.status === "blocked" ? "blocked" : step.status === "ready" ? "ready" : "warning"}`} key={step.id}>
                        <strong>{step.title}</strong>
                        <span>{step.status}</span>
                        <span>{step.detail}</span>
                        <p>{step.nextAction}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
                {smartImportPreview.legacySources?.length ? (
                  <div className="import-rows">
                    {smartImportPreview.legacySources.map((source: any, index: number) => (
                      <article
                        className={`import-row import-${source.automationLevel === "ready_for_preview" ? "ready" : source.automationLevel === "manual_review" ? "blocked" : "warning"}`}
                        key={`${source.kind}:${source.sourceRef ?? index}`}
                      >
                        <strong>
                          {source.title} · {Math.round(source.confidence * 100)}%
                        </strong>
                        <span>
                          {source.kind} · {source.automationLevel}
                        </span>
                        {source.safeSourceAlias ? <span>{source.safeSourceAlias}</span> : null}
                        <p>{source.recommendedRoute}</p>
                        <p>Нужно: {source.requiredArtifacts.join(" · ")}</p>
                        <p>{source.privacy}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
                {smartImportPreview.clinicSuggestion ? (
                  <div className="import-rows">
                    <article className="import-row import-warning">
                      <strong>Профиль клиники · {Math.round(smartImportPreview.clinicSuggestion.confidence * 100)}%</strong>
                      <span>Строки: {smartImportPreview.clinicSuggestion.sourceLineNumbers.join(", ")}</span>
                      <p>
                        {Object.entries(smartImportPreview.clinicSuggestion.fields)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" · ")}
                      </p>
                    </article>
                    {smartImportPreview.publicLookupTargets.map((target: any) => (
                      <article className="import-row import-warning" key={`${target.kind}:${target.url}`}>
                        <strong>{target.title}</strong>
                        <span>{target.privacy}</span>
                        <p>{target.nextAction}</p>
                        <a className="text-button" href={target.url} target="_blank" rel="noreferrer">
                          <ExternalLink aria-hidden="true" /> Открыть
                        </a>
                      </article>
                    ))}
                  </div>
                ) : null}
                <div className="import-rows">
                  {smartImportPreview.lineClassifications.map((row: any) => (
                    <article className={`import-row import-${row.kind === "ignored" ? "warning" : "ready"}`} key={row.lineNumber}>
                      <strong>
                        {row.kind === "patient"
                          ? "Пациент"
                          : row.kind === "imaging"
                            ? "Снимок"
                            : row.kind === "clinic"
                              ? "Клиника"
                              : row.kind === "legacy_source"
                                ? "Источник"
                                : "Пропуск"} ·{" "}
                        {Math.round(row.confidence * 100)}%
                      </strong>
                      <span>Строка {row.lineNumber}</span>
                      <span>{row.reason}</span>
                      <p>{row.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          ) : null}

          {["imports", "sources"].includes(settingsTab) ? (
          <section
            className="import-studio imaging-import-studio"
            aria-label="Импорт снимков из внешних систем"
          >
            <div className="import-copy">
              <ImageIcon aria-hidden="true" />
              <div>
                <p className="eyebrow">Снимки и DICOM</p>
                <h2>Манифест снимков сначала проходит безопасный предпросмотр</h2>
                <p>
                  Для RVG, ОПТГ, ТРГ, КТ, PACS и папок обмена: вставь экспорт, CSV, список файлов или текст из старой программы.
                  Система сопоставит пациента, тип снимка, зуб, дату и путь к файлу до записи в карту.
                </p>
              </div>
            </div>

            <div className="import-source-grid imaging-source-grid" aria-label="Источник снимков">
              {imagingSourceChoices.map((kind: any) => (
                <button
                  className={`source-card ${imagingImportSourceKind === kind ? "active" : ""}`}
                  type="button"
                  key={kind}
                  onClick={() => {
                    setImagingImportSourceKind(kind);
                    setImagingImportPreview(null);
                    setImagingImportCommit(null);
                  }}
                >
                  <strong>{imagingSourceLabels[kind]}</strong>
                  <span>{imagingSourceDetails[kind]}</span>
                </button>
              ))}
            </div>

            <div className="import-workbench">
              <div className="folder-scan-row">
                <label>
                  Папка обмена на сервере
                  <input
                    data-testid="imaging-folder-path-input"
                    value={imagingFolderPath}
                    onChange={(event: any) => {
                      const nextFolderPath = event.target.value;
                      setImagingFolderPath(nextFolderPath);
                      if (nextFolderPath.trim() !== localImagingFolderDraft?.folderPath) {
                        stageLocalImagingFolderRecovery(nextFolderPath, { origin: "manual" });
                      }
                      setImagingFolderScan(null);
                      setDicomFolderSeriesScan(null);
                      setDicomFolderWorkupPlan(null);
                      setDicomFirstFramePreview(null);
                      setDicomLocalFolderDiscovery(null);
                      setLocalImagingOrganizer(null);
                    }}
                    onBlur={(event: any) => {
                      rememberLocalImagingFolder(event.target.value, { origin: "manual" });
                    }}
                    placeholder="C:\Images или D:\OPG"
                  />
                </label>
                <input
                  ref={browserDirectoryInputRef}
                  data-testid="browser-local-imaging-folder-input"
                  type="file"
                  multiple
                  hidden
                  tabIndex={-1}
                  onChange={(event: any) => void handleBrowserDirectoryInputChange(event.currentTarget.files)}
                />
                <button
                  className="secondary-button"
                  type="button"
                  data-testid="browser-pick-local-imaging-folder"
                  onClick={() => void pickBrowserImagingFolder()}
                  disabled={isBrowserImagingFolderPicking}
                  title={
                    browserDirectoryPickerAvailable
                      ? "Выбрать локальную папку CT/DICOM в браузере"
                      : "Использовать запасной выбор файлов браузера для локальных снимков"
                  }
                >
                  <UploadCloud aria-hidden="true" /> {isBrowserImagingFolderPicking ? "Сканирую" : "Выбрать CT"}
                </button>
                <button className="secondary-button" type="button" onClick={scanImagingFolder} disabled={isImagingFolderScanning}>
                  <Search aria-hidden="true" /> {isImagingFolderScanning ? "Сканирую" : "Сканировать папку"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  data-testid="find-local-dicom-folders"
                  onClick={() => void discoverDicomFolders()}
                  disabled={isDicomLocalDiscovering}
                >
                  <ScanSearch aria-hidden="true" /> {isDicomLocalDiscovering ? "Ищу" : "Найти DICOM"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  data-testid="organize-local-imaging-sources"
                  onClick={() => void organizeLocalImagingSources()}
                  disabled={isLocalImagingOrganizing}
                >
                  <Database aria-hidden="true" /> {isLocalImagingOrganizing ? "Организую" : "Организовать CT/3D"}
                </button>
                <button className="secondary-button" type="button" onClick={scanDicomFolderSeries} disabled={isImagingFolderScanning}>
                  <Layers3 aria-hidden="true" /> {isImagingFolderScanning ? "Читаю DICOM" : "Метаданные DICOM"}
                </button>
                <button className="secondary-button" type="button" onClick={() => void buildDicomFolderWorkupPlan()} disabled={isDicomFolderWorkupPlanning}>
                  <Gauge aria-hidden="true" /> {isDicomFolderWorkupPlanning ? "Готовлю" : "План DICOM"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  data-testid="preview-dicom-first-frame"
                  onClick={() => void previewDicomFirstFrame()}
                  disabled={isDicomFirstFramePreviewing || !imagingFolderPath.trim()}
                >
                  <ImageIcon aria-hidden="true" /> {isDicomFirstFramePreviewing ? "Открываю" : "Первый срез"}
                </button>
              </div>
              {localImagingFolderDraft ? (
                <div className="local-imaging-folder-recovery" data-testid="local-imaging-folder-recovery">
                  <div>
                    <strong>{localImagingFolderDraft.safeDisplayName}</strong>
                    <span>
                      локальное восстановление - {localImagingFolderDraft.sourceLabel} - сохранено {formatTime(localImagingFolderDraft.savedAt)}
                    </span>
                  </div>
                  <button className="text-button" type="button" onClick={clearLocalImagingFolderRecovery}>
                    Очистить
                  </button>
                </div>
              ) : null}
              {browserPickedImagingFolder ? (
                <div
                  className="browser-picked-folder-result"
                  data-testid="browser-picked-imaging-folder-result"
                  aria-label="Предпросмотр локальной папки снимков браузера"
                >
                  <div className="browser-picked-folder-head">
                    <div>
                      <strong>{browserPickedImagingFolder.safeDisplayName}</strong>
                      <span>
                        {browserPickedImagingFolder.sourceLabel} - локальный ID {browserPickedImagingFolder.folderFingerprint} -{" "}
                        {formatTime(browserPickedImagingFolder.createdAt)}
                      </span>
                    </div>
                    <button className="text-button" type="button" onClick={clearBrowserPickedImagingFolderPreview}>
                      Очистить
                    </button>
                  </div>
                  <div className="browser-picked-folder-stats">
                    <span>файлов: {browserPickedImagingFolder.scannedFiles}</span>
                    <span>папок: {browserPickedImagingFolder.scannedFolders}</span>
                    <span>DICOM-похожих: {browserPickedImagingFolder.dicomLikeFiles}</span>
                    <span>архивов: {browserPickedImagingFolder.archiveFiles}</span>
                    <span>3D-моделей: {browserPickedImagingFolder.modelFiles}</span>
                    <span>{formatMegabytes(megabytes(browserPickedImagingFolder.totalBytes))}</span>
                  </div>
                  <p>{browserPickedImagingFolder.nextAction}</p>
                  {browserPickedImagingFolder.warnings.slice(0, 3).map((warning: any) => (
                    <small key={warning}>{warning}</small>
                  ))}
                </div>
              ) : null}
              {dicomLocalFolderDiscovery ? (
                <div className="dicom-discovery-result" data-testid="local-dicom-discovery-result" aria-label="Поиск локальной папки DICOM">
                  <div className="dicom-discovery-head">
                    <strong>
                      Найдено кандидатов: {dicomLocalFolderDiscovery.candidates.length} / просканировано папок: {dicomLocalFolderDiscovery.scannedFolders}
                    </strong>
                    <span>{dicomLocalFolderDiscovery.nextAction}</span>
                  </div>
                  <div className="dicom-discovery-grid">
                    {dicomLocalFolderDiscovery.candidates.slice(0, 6).map((candidate: any) => (
                      <article key={candidate.folderPath}>
                        <strong>{candidate.safeDisplayName}</strong>
                        <span>
                          {candidate.sourceLabel} · локальный ID {candidate.folderFingerprint.toUpperCase()} · глубина {candidate.depth}
                        </span>
                        <span>Путь к папке и имена, похожие на данные пациента, скрыты до выбора</span>
                        <small>
                          {Math.round(candidate.confidence * 100)}% / {candidate.dicomLikeFiles} DICOM / архивов {candidate.archivesFound}
                        </small>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            rememberLocalImagingFolder(candidate.folderPath, {
                              safeDisplayName: candidate.safeDisplayName,
                              sourceLabel: candidate.sourceLabel,
                              sourceKind: candidate.sourceKind,
                              folderFingerprint: candidate.folderFingerprint,
                              origin: "discovery"
                            });
                            setDicomFolderSeriesScan(null);
                            setDicomFolderWorkupPlan(null);
                            setDicomFirstFramePreview(null);
                            setImagingFolderScan(null);
                            setLocalImagingOrganizer(null);
                          }}
                        >
                          Выбрать папку
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          data-testid="prepare-dicom-discovery-workbench"
                          disabled={isDicomFolderWorkupPlanning || isDicomWorkbenchBuilding}
                          onClick={() =>
                            void prepareDicomWorkbenchFromFolder(candidate.folderPath, "dicom_discovery_quick_workbench", {
                              safeDisplayName: candidate.safeDisplayName,
                              sourceLabel: candidate.sourceLabel,
                              sourceKind: candidate.sourceKind,
                              folderFingerprint: candidate.folderFingerprint,
                              origin: "discovery"
                            })
                          }
                        >
                          Подготовить CT
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          data-testid="preview-dicom-discovery-first-frame"
                          disabled={isDicomFirstFramePreviewing}
                          onClick={() => {
                            rememberLocalImagingFolder(candidate.folderPath, {
                              safeDisplayName: candidate.safeDisplayName,
                              sourceLabel: candidate.sourceLabel,
                              sourceKind: candidate.sourceKind,
                              folderFingerprint: candidate.folderFingerprint,
                              origin: "discovery"
                            });
                            void previewDicomFirstFrame(candidate.folderPath, {
                              safeDisplayName: candidate.safeDisplayName,
                              sourceLabel: candidate.sourceLabel,
                              sourceKind: candidate.sourceKind,
                              folderFingerprint: candidate.folderFingerprint,
                              origin: "discovery"
                            });
                          }}
                        >
                          Первый срез
                        </button>
                      </article>
                    ))}
                  </div>
                  {dicomLocalFolderDiscovery.warnings.slice(0, 4).map((warning: any) => (
                    <small key={warning}>{warning}</small>
                  ))}
                </div>
              ) : null}
              {localImagingOrganizer ? (
                <div className="local-imaging-organizer-result" data-testid="local-imaging-organizer-result" aria-label="Органайзер локальных снимков">
                  <div className="dicom-discovery-head">
                    <strong>
                      Органайзер: кейсов {localImagingOrganizer.cases.length} / просканировано папок {localImagingOrganizer.scannedFolders}
                    </strong>
                    <span>{localImagingOrganizer.nextAction}</span>
                  </div>
                  <div className="local-imaging-case-grid">
                    {localImagingOrganizer.cases.slice(0, 6).map((caseItem: any) => (
                      <article className={`local-imaging-case local-action-${caseItem.recommendedAction}`} key={caseItem.id}>
                        <div>
                          <strong>{caseItem.safeDisplayName}</strong>
                          <span>
                            {caseItem.sourceLabel} · локальный ID {caseItem.folderFingerprint.toUpperCase()}
                          </span>
                          <span>Путь к папке и имена, похожие на данные пациента, скрыты до выбора</span>
                        </div>
                        <div className="local-imaging-case-metrics">
                          <span>{Math.round(caseItem.combinedConfidence * 100)}%</span>
                          <span>{caseItem.dicomLikeFiles} DICOM</span>
                          <span>{caseItem.modelFiles} 3D</span>
                          <span>архивов: {caseItem.archiveFiles}</span>
                        </div>
                        <small>{localImagingOrganizerActionLabels[caseItem.recommendedAction]}</small>
                        {caseItem.modelCandidates.length ? (
                          <div className="local-imaging-model-list">
                            {caseItem.modelCandidates.slice(0, 3).map((model: any) => (
                              <span key={`${caseItem.id}-${model.filePath}`}>
                                {model.format.toUpperCase()} · {localImagingModelRoleLabels[model.role] ?? model.role} · {Math.round(model.confidence * 100)}%
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            rememberLocalImagingFolder(caseItem.folderPath, {
                              safeDisplayName: caseItem.safeDisplayName,
                              sourceLabel: caseItem.sourceLabel,
                              sourceKind: caseItem.sourceKind,
                              folderFingerprint: caseItem.folderFingerprint,
                              origin: "organizer"
                            });
                            setDicomFolderSeriesScan(null);
                            setDicomFolderWorkupPlan(null);
                            setDicomFirstFramePreview(null);
                            setImagingFolderScan(null);
                            setDicomLocalFolderDiscovery(null);
                          }}
                        >
                          Выбрать папку
                        </button>
                        {caseItem.recommendedAction !== "review_3d_models" ? (
                          <button
                            className="text-button"
                            type="button"
                            data-testid="prepare-local-dicom-workbench"
                            disabled={isDicomFolderWorkupPlanning || isDicomWorkbenchBuilding}
                            onClick={() =>
                              void prepareDicomWorkbenchFromFolder(caseItem.folderPath, "local_organizer_quick_workbench", {
                                safeDisplayName: caseItem.safeDisplayName,
                                sourceLabel: caseItem.sourceLabel,
                                sourceKind: caseItem.sourceKind,
                                folderFingerprint: caseItem.folderFingerprint,
                                origin: "organizer"
                              })
                            }
                          >
                            Подготовить CT
                          </button>
                        ) : null}
                        {caseItem.dicomLikeFiles > 0 ? (
                          <button
                            className="text-button"
                            type="button"
                            data-testid="preview-local-dicom-first-frame"
                            disabled={isDicomFirstFramePreviewing}
                            onClick={() => {
                              rememberLocalImagingFolder(caseItem.folderPath, {
                                safeDisplayName: caseItem.safeDisplayName,
                                sourceLabel: caseItem.sourceLabel,
                                sourceKind: caseItem.sourceKind,
                                folderFingerprint: caseItem.folderFingerprint,
                                origin: "organizer"
                              });
                              void previewDicomFirstFrame(caseItem.folderPath, {
                                safeDisplayName: caseItem.safeDisplayName,
                                sourceLabel: caseItem.sourceLabel,
                                sourceKind: caseItem.sourceKind,
                                folderFingerprint: caseItem.folderFingerprint,
                                origin: "organizer"
                              });
                            }}
                          >
                            Первый срез
                          </button>
                        ) : null}
                      </article>
                    ))}
                  </div>
                  {localImagingOrganizer.warnings.slice(0, 4).map((warning: any) => (
                    <small key={warning}>{warning}</small>
                  ))}
                </div>
              ) : null}
              {imagingFolderScan ? (
                <div className="recognition-notes">
                  <span>
                    Найдено файлов: {imagingFolderScan.filesFound}. В предпросмотре: {imagingFolderScan.preview.totalRows}.
                  </span>
                  {imagingFolderScan.warnings.map((warning: any) => (
                    <span key={warning}>{warning}</span>
                  ))}
                </div>
              ) : null}
              {dicomFolderSeriesScan ? (
                <div className="recognition-notes">
                  <span>
                    Заголовки DICOM: файлов {dicomFolderSeriesScan.filesFound}, прочитано {dicomFolderSeriesScan.filesParsed}, строк метаданных{" "}
                    {dicomFolderSeriesScan.metadataRows}, серий {dicomFolderSeriesScan.preview.totalSeries}.
                  </span>
                  {dicomFolderSeriesScan.warnings.slice(0, 5).map((warning: any) => (
                    <span key={warning}>{warning}</span>
                  ))}
                </div>
              ) : null}
              {dicomFolderWorkupPlan ? (
                <div className="dicom-folder-workup-result" aria-label="План разбора DICOM папки">
                  <div className="dicom-folder-workup-head">
                    <strong>
                      План: серий {dicomFolderWorkupPlan.selectedSeriesCount} / файлов {dicomFolderWorkupPlan.folder.filesParsed}
                    </strong>
                    <span>{dicomFolderWorkupPlan.nextAction}</span>
                  </div>
                  <div className="dicom-folder-workup-plans">
                    {dicomFolderWorkupPlan.plans.slice(0, 4).map((plan: any) => (
                      <article className={`workup-${plan.recommendedPath}`} key={plan.series.id}>
                        <strong>{dicomFolderWorkupPathLabels[plan.recommendedPath]}</strong>
                        <span>
                          {plan.series.modality ?? "DICOM"} / файлов {plan.series.fileCount} / готовность {plan.readiness.readinessScore}%
                        </span>
                        <small>
                          {dicomLabel(dicomTextureStrategyLabels, plan.renderCachePlan.textureStrategy, "стратегия текстур")} /{" "}
                          {plan.renderCachePlan.firstPaintBudgetMs} ms /{" "}
                          {plan.renderCachePlan.gpuMemoryBudgetMb} MB
                        </small>
                        <small>{plan.nextAction}</small>
                      </article>
                    ))}
                  </div>
                  {dicomFolderWorkupPlan.warnings.slice(0, 4).map((warning: any) => (
                    <small key={warning}>{warning}</small>
                  ))}
                </div>
              ) : null}
              {dicomFirstFramePreview ? (
                <div
                  className={`dicom-first-frame-preview preview-${dicomFirstFramePreview.status}`}
                  data-testid="dicom-first-frame-preview-result"
                  aria-label="Предпросмотр первого DICOM-среза"
                >
                  <div className="dicom-first-frame-head">
                    <div>
                      <strong>
                        Первый срез: только ориентация, не диагностика:{" "}
                        {dicomFirstFrameStatusLabels[dicomFirstFramePreview.status] ?? dicomFirstFramePreview.status}
                      </strong>
                      <span>
                        {dicomFirstFramePreview.sourceWidth && dicomFirstFramePreview.sourceHeight
                          ? `${dicomFirstFramePreview.sourceWidth}x${dicomFirstFramePreview.sourceHeight}`
                          : "Нет пиксельного кадра"}{" "}
                        / {dicomFirstFramePreview.transferSyntaxUid ?? "синтаксис передачи не указан"}
                      </span>
                    </div>
                    <small>{dicomFirstFramePreview.nextAction}</small>
                  </div>
                  {dicomFirstFramePreview.imageDataUrl ? (
                    <>
                      <div className="dicom-first-frame-tools" aria-label="Инструменты предпросмотра первого среза">
                        <button
                          className="viewer-tool-button"
                          type="button"
                          title="Повернуть влево"
                          aria-label="Повернуть первый срез влево"
                          onClick={() => setDicomFirstFrameViewerState((state: any) => ({ ...state, rotationDeg: state.rotationDeg - 90 }))}
                        >
                          <RotateCcw aria-hidden="true" />
                        </button>
                        <button
                          className="viewer-tool-button"
                          type="button"
                          title="Повернуть вправо"
                          aria-label="Повернуть первый срез вправо"
                          onClick={() => setDicomFirstFrameViewerState((state: any) => ({ ...state, rotationDeg: state.rotationDeg + 90 }))}
                        >
                          <RotateCw aria-hidden="true" />
                        </button>
                        <button
                          className={`viewer-tool-button ${dicomFirstFrameViewerState.flipHorizontal ? "active" : ""}`}
                          type="button"
                          title="Отразить"
                          aria-label="Отразить первый срез"
                          onClick={() => setDicomFirstFrameViewerState((state: any) => ({ ...state, flipHorizontal: !state.flipHorizontal }))}
                        >
                          <FlipHorizontal aria-hidden="true" />
                        </button>
                        <button
                          className={`viewer-tool-button ${dicomFirstFrameViewerState.inverted ? "active" : ""}`}
                          type="button"
                          title="Инвертировать"
                          aria-label="Инвертировать первый срез"
                          onClick={() => setDicomFirstFrameViewerState((state: any) => ({ ...state, inverted: !state.inverted }))}
                        >
                          +/-
                        </button>
                        <button
                          className="viewer-tool-button"
                          type="button"
                          title="Уменьшить"
                          aria-label="Уменьшить первый срез"
                          onClick={() => setDicomFirstFrameViewerState((state: any) => ({ ...state, zoom: Math.max(0.7, state.zoom - 0.1) }))}
                        >
                          <ZoomOut aria-hidden="true" />
                        </button>
                        <button
                          className="viewer-tool-button"
                          type="button"
                          title="Увеличить"
                          aria-label="Увеличить первый срез"
                          onClick={() => setDicomFirstFrameViewerState((state: any) => ({ ...state, zoom: Math.min(2.2, state.zoom + 0.1) }))}
                        >
                          <ZoomIn aria-hidden="true" />
                        </button>
                        <button
                          className="viewer-tool-button"
                          type="button"
                          title="Сбросить"
                          aria-label="Сбросить инструменты первого среза"
                          onClick={() => setDicomFirstFrameViewerState(defaultDicomFirstFrameViewerState)}
                        >
                          <RefreshCw aria-hidden="true" />
                        </button>
                      </div>
                      <div className="dicom-first-frame-sliders">
                        <label>
                          Яркость
                          <input
                            min="0.65"
                            max="1.6"
                            step="0.05"
                            type="range"
                            value={dicomFirstFrameViewerState.brightness}
                            onChange={(event: any) =>
                              setDicomFirstFrameViewerState((state: any) => ({ ...state, brightness: Number(event.target.value) }))
                            }
                          />
                        </label>
                        <label>
                          Контраст
                          <input
                            min="0.75"
                            max="1.8"
                            step="0.05"
                            type="range"
                            value={dicomFirstFrameViewerState.contrast}
                            onChange={(event: any) =>
                              setDicomFirstFrameViewerState((state: any) => ({ ...state, contrast: Number(event.target.value) }))
                            }
                          />
                        </label>
                      </div>
                      <div className="dicom-first-frame-image-wrap">
                        <img
                          src={dicomFirstFramePreview.imageDataUrl}
                          alt="Предпросмотр ориентации первого среза DICOM"
                          style={dicomFirstFrameImageStyle}
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="dicom-first-frame-facts">
                    <span>{dicomFirstFramePreview.photometricInterpretation ?? "фотометрия не указана"}</span>
                    <span>{dicomFirstFramePreview.bitsAllocated ? `${dicomFirstFramePreview.bitsAllocated} бит` : "битность не указана"}</span>
                    <span>
                      окно: центр {Math.round(dicomFirstFramePreview.windowCenter ?? 0)} / ширина{" "}
                      {Math.round(dicomFirstFramePreview.windowWidth ?? 0)}
                    </span>
                    <span>не сохранено</span>
                    <span>только инструменты предпросмотра</span>
                  </div>
                  {dicomFirstFramePreview.warnings.slice(0, 4).map((warning: any) => (
                    <small key={warning}>{warning}</small>
                  ))}
                </div>
              ) : null}
              <textarea
                aria-label="Данные импорта снимков"
                value={imagingImportText}
                onChange={(event: any) => {
                  setImagingImportText(event.target.value);
                  setImagingImportPreview(null);
                  setImagingImportCommit(null);
                  setDicomSeriesPreview(null);
                  setDicomFolderSeriesScan(null);
                  setDicomFolderWorkupPlan(null);
                }}
              />
              <div className="import-tool-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setImagingImportSourceKind("dicom_file");
                    setImagingImportText(
                      "Пациент;Телефон;Модальность;StudyInstanceUID;SeriesInstanceUID;InstanceNumber;SeriesDescription;Дата;Путь\nИванова Марина Сергеевна;+7 927 111-22-33;CBCT;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;1;КТ нижней челюсти;12.05.2026;D:\\\\CBCT\\\\ivanova_2026_05_12\\\\IMG0001.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;CBCT;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;2;КТ нижней челюсти;12.05.2026;D:\\\\CBCT\\\\ivanova_2026_05_12\\\\IMG0002.dcm\nИванова Марина Сергеевна;+7 927 111-22-33;TRG;1.2.643.5.1.20260510.7;1.2.643.5.1.20260510.7.1;1;боковая ТРГ;10.05.2026;D:\\\\CEPH\\\\ivanova_ceph.ima\nПетров Алексей Николаевич;+7 927 555-19-40;OPG;1.2.643.5.1.20260510.9;1.2.643.5.1.20260510.9.1;1;панорамный снимок;10.05.2026;D:\\\\OPG\\\\petrov_opg.png"
                    );
                    setImagingImportPreview(null);
                    setImagingImportCommit(null);
                    setDicomSeriesPreview(null);
                    setDicomFolderSeriesScan(null);
                    setDicomFolderWorkupPlan(null);
                  }}
                >
                  <FileCheck2 aria-hidden="true" /> Пример КТ/ОПТГ/ТРГ
                </button>
                <button className="secondary-button" type="button" onClick={() => void previewDicomSeries()} disabled={isDicomSeriesPreviewLoading || !imagingImportInputReady}>
                  <Layers3 aria-hidden="true" /> {isDicomSeriesPreviewLoading ? "Группирую" : "Серии DICOM"}
                </button>
                <button className="primary-button" type="button" onClick={previewImagingImport} disabled={isImagingImportLoading || !imagingImportInputReady}>
                  <UploadCloud aria-hidden="true" /> {isImagingImportLoading ? "Проверяю" : "Проверить снимки"}
                </button>
              </div>
              {!imagingImportInputReady ? (
                <p className="import-empty-guidance" role="status" aria-live="polite">
                  Вставьте строки со снимками или выберите пример КТ/ОПТГ/ТРГ перед проверкой.
                </p>
              ) : null}
            </div>

            {dicomSeriesPreview ? (
              <div className="dicom-series-result">
                <div className="dicom-series-stats">
                  <span>{dicomSeriesPreview.totalRows} файлов</span>
                  <span>{dicomSeriesPreview.totalSeries} серий</span>
                  <span>{dicomSeriesPreview.readySeries} готово</span>
                  <span>{dicomSeriesPreview.warningSeries} предупреждения</span>
                  <span>{dicomSeriesPreview.blockedSeries} заблокировано</span>
                </div>
                <div className="dicom-series-list">
                  {dicomSeriesPreview.series.slice(0, 6).map((series: any) => (
                    <article className={`dicom-series-row dicom-series-${series.status}`} key={series.id}>
                      <div>
                        <strong>{series.patientName ?? "Пациент ?"}</strong>
                        <span>
                          {series.kind ? imagingKindLabels[series.kind] : "тип не указан"} · {series.modality ?? "модальность не указана"} ·{" "}
                          {series.fileCount} файлов
                        </span>
                      </div>
                      <div>
                        <span>{dicomSeriesViewerLabels[series.recommendedViewer]}</span>
                        <small>
                          {series.mprReadiness.recommendedLayout} ·{" "}
                          {series.mprReadiness.canOpenMpr ? "MPR-предпросмотр готов" : series.mprReadiness.nextAction}
                        </small>
                        <small className="dicom-series-resource">
                          {mprLoadStrategyLabels[series.mprReadiness.resourcePolicy.loadStrategy]} /{" "}
                          {series.mprReadiness.resourcePolicy.estimatedMemoryMb} MB /{" "}
                          {mprResourceTierLabels[series.mprReadiness.resourcePolicy.requiredTier]}
                        </small>
                        <small>{series.seriesDescription ?? series.studyDescription ?? series.seriesInstanceUid ?? "UID серии не указан"}</small>
                      </div>
                      <p>{series.warnings.length ? series.warnings.slice(0, 3).join(", ") : "готово к просмотру"}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {imagingImportPreview ? (
              <div className="import-preview">
                <div className="import-stats">
                  <span>{imagingImportPreview.totalRows} строк</span>
                  <span>{imagingImportPreview.readyRows} готово</span>
                  <span>{imagingImportPreview.warningRows} предупреждения</span>
                  <span>{imagingImportPreview.blockedRows} к исправлению</span>
                </div>
                <div className="import-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={commitImagingImport}
                    disabled={isImagingImportCommitting || !imagingImportInputReady || imagingImportPreview.readyRows === 0}
                  >
                    <CheckCircle2 aria-hidden="true" /> {isImagingImportCommitting ? "Записываю" : "Привязать готовые"}
                  </button>
                  {imagingImportCommit ? (
                    <span>
                      Привязано: {imagingImportCommit.importedCount}. Пропущено: {imagingImportCommit.skippedCount}.
                    </span>
                  ) : (
                    <span>В карту попадут только строки с найденным пациентом, типом снимка и путем к файлу.</span>
                  )}
                </div>
                <div className="import-rows">
                  {imagingImportPreview.rows.map((row: any) => (
                    <article className={`import-row import-${row.status}`} key={row.rowNumber}>
                      <strong>{row.patientName ?? `Строка ${row.rowNumber}`}</strong>
                      <span>{row.kind ? imagingKindLabels[row.kind] : "тип не найден"}</span>
                      <span>{row.toothCode ?? row.region ?? "область не найдена"}</span>
                      <p>{row.warnings.length ? row.warnings.join(", ") : row.filePath ?? "готово к привязке"}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

          </section>
          ) : null}

          {settingsTab === "audit" ? (
          <section className="ops-grid" aria-label="Журнал операций">
            <div className="panel audit-panel persistence-panel">
              <div className="panel-heading">
                <h2>Сохранность данных</h2>
                <div className="persistence-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      void loadPersistenceHealth({ silent: false });
                      void loadPersistenceIntegrity({ silent: false });
                    }}
                  >
                    Проверить
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={downloadPersistenceExport}
                    disabled={isPersistenceExporting}
                    aria-busy={isPersistenceExporting || undefined}
                  >
                    {isPersistenceExporting ? "Готовлю" : "Скачать JSON"}
                  </button>
                </div>
              </div>
              <div className="ops-list">
                <article className={`ops-row browser-continuity-row safety-${browserContinuityState}`}>
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <h3>Контур офлайн/онлайн</h3>
                    <p>
                      {browserContinuity
                        ? `Проверено ${formatTime(browserContinuity.checkedAt)} · ${browserContinuity.warnings.length ? browserContinuity.warnings.join(", ") : "локальный черновик и очередь доступны"}`
                        : "Проверяю браузерное хранилище, PWA-оболочку и локальные очереди"}
                    </p>
                  </div>
                  <span>{browserContinuityValue}</span>
                </article>
                <div className="browser-continuity-grid" aria-label="Проверки сохранения в браузере">
                  {browserContinuityChecks.map((check: any) => (
                    <article key={check.label}>
                      <span>{check.label}</span>
                      <strong>{check.value}</strong>
                      <p>{check.detail}</p>
                    </article>
                  ))}
                </div>
                <div className="persistence-actions persistence-inline-actions">
                  <button className="secondary-button" type="button" onClick={() => void refreshBrowserContinuity({ silent: false })}>
                    Проверить устройство
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void requestBrowserStoragePersistence()}
                    disabled={!browserCanRequestPersistentStorage || browserContinuity?.storagePersisted === true}
                  >
                    Постоянное хранилище
                  </button>
                </div>
                <article className={`ops-row local-bridge-summary safety-${localBridgeStatusState}`}>
                  <SlidersHorizontal aria-hidden="true" />
                  <div>
                    <h3>Локальные мосты ПК</h3>
                    <p>
                      {localBridgeReadiness
                        ? `${localBridgeReadiness.nextAction} · Проверено ${formatTime(localBridgeReadiness.generatedAt)}`
                        : "Проверяю Whisper/Vosk, DICOM/CBCT-обработчик, OCR-обработчик и OHIF-просмотрщик"}
                    </p>
                  </div>
                  <span>{localBridgeStatusValue}</span>
                </article>
                <div className="local-bridge-grid" aria-label="Готовность локальных мостов рабочей станции">
                  {(localBridgeReadiness?.bridges ?? []).map((bridge: any) => (
                    <article className={`bridge-${bridge.status}`} key={bridge.kind}>
                      <div>
                        <strong>{bridge.title}</strong>
                        <span>{localBridgeStatusLabels[bridge.status]}</span>
                      </div>
                      <p>{bridge.role} · {bridge.workload}</p>
                      <small>{bridge.urlRedacted ?? bridge.acceptedEnvVars[0]}</small>
                      <small>{bridge.privacyBoundary}</small>
                      <small>{bridge.latencyMs !== null ? `${bridge.latencyMs} ms` : bridge.nextAction}</small>
                      {bridge.warnings.slice(0, 2).map((warning: any) => (
                        <em key={warning}>{warning}</em>
                      ))}
                    </article>
                  ))}
                  {!localBridgeReadiness ? (
                    <article className="bridge-planned">
                      <div>
                        <strong>Предпроверка мостов</strong>
                        <span>проверка</span>
                      </div>
                      <p>Проверка загрузится по кнопке или при открытии аудита.</p>
                    </article>
                  ) : null}
                </div>
                <div className="persistence-actions persistence-inline-actions">
                  <button className="secondary-button" type="button" onClick={() => void loadLocalBridgeUsePlans({ silent: false })}>
                    Проверить мосты
                  </button>
                </div>
                {localBridgeUsePlans ? (
                  <div className="local-bridge-plan-grid" aria-label="Планы использования локальных мостов">
                    {localBridgeUsePlans.plans.map((plan: any) => (
                      <article className={`plan-${plan.primaryPath}`} key={plan.scenario}>
                        <div>
                          <strong>{plan.title}</strong>
                          <span>{localBridgeUsePathLabels[plan.primaryPath]}</span>
                        </div>
                        <p>{plan.nextAction}</p>
                        <small>{plan.doctorBlocking ? "блокирует врача" : "только предупреждение"} · {Math.round(plan.confidence * 100)}%</small>
                        <small>{plan.steps.slice(0, 2).map((step: any) => step.title).join(" → ")}</small>
                        {plan.warnings.slice(0, 1).map((warning: any) => (
                          <em key={warning}>{warning}</em>
                        ))}
                      </article>
                    ))}
                  </div>
                ) : null}
                {persistenceHealth ? (
                  <>
                    <article className="ops-row">
                      <ShieldCheck aria-hidden="true" />
                      <div>
                        <h3>{persistenceHealth.enabled && persistenceHealth.exists ? "Серверное состояние найдено" : "Серверное состояние не найдено"}</h3>
                        <p>
                          {persistenceHealth.savedAt ? `Последняя запись ${formatDateTime(persistenceHealth.savedAt)}` : "Файл состояния еще не создан"} ·{" "}
                          {persistenceHealth.checksum ? "контрольная сумма есть" : "контрольная сумма появится после следующей записи"}
                        </p>
                      </div>
                      <span>{persistenceHealth.version ? `v${persistenceHealth.version}` : "нет"}</span>
                    </article>
                    <article className="ops-row">
                      <Database aria-hidden="true" />
                      <div>
                        <h3>Резервные копии</h3>
                        <p>
                          {persistenceHealth.backupCount} из {persistenceHealth.maxBackupCount} ·{" "}
                          {persistenceHealth.latestBackupAt ? `последняя ${formatDateTime(persistenceHealth.latestBackupAt)}` : "после следующей записи"}
                        </p>
                      </div>
                      <span>{persistenceHealth.backupCount ? "есть" : "пусто"}</span>
                    </article>
                    {persistenceIntegrity ? (
                      <>
                        <article className="ops-row">
                          <ShieldCheck aria-hidden="true" />
                          <div>
                            <h3>{persistenceIntegrity.ok ? "Проверка резервной копии прошла" : "Нужна проверка резервной копии"}</h3>
                            <p>
                              {persistenceIntegrity.nextAction} ·{" "}
                              {persistenceIntegrity.checksumVerified === false ? "контрольная сумма не совпала" : "контрольная сумма совпала"}
                            </p>
                          </div>
                          <span>{formatDateTime(persistenceIntegrity.checkedAt)}</span>
                        </article>
                        <div className="backup-check-grid" aria-label="Последние резервные копии">
                          {persistenceIntegrity.backups.slice(0, 6).map((backup: any) => (
                            <span key={backup.fileName}>
                              {backup.readable && backup.checksumVerified !== false ? "проверено" : "проверить"} ·{" "}
                              {Math.round(backup.sizeBytes / 1024)} КБ · {backup.fileName}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                    <article className="ops-row">
                      <History aria-hidden="true" />
                      <div>
                        <h3>Локальный файл прототипа</h3>
                        <p>{persistenceHealth.filePath || "путь недоступен"}</p>
                      </div>
                      <span>без кэширования</span>
                    </article>
                  </>
                ) : (
                  <article className="ops-empty">
                    <ShieldCheck aria-hidden="true" />
                    <p>Статус сохранности загрузится при открытии аудита или по кнопке проверки.</p>
                  </article>
                )}
              </div>
            </div>

            <div className="panel import-history-panel">
              <div className="panel-heading">
                <h2>История миграций</h2>
                <span className="status-pill status-arrived">{dashboard.importBatches.length}</span>
              </div>
              <div className="ops-list">
                {dashboard.importBatches.length ? (
                  dashboard.importBatches.map((batch: any) => (
                    <article className="ops-row" key={batch.id}>
                      <Database aria-hidden="true" />
                      <div>
                        <h3>{batch.sourceName}</h3>
                        <p>
                          {batch.importedRows} записано · {batch.skippedRows} пропущено · {formatDateTime(batch.createdAt)}
                        </p>
                      </div>
                      <span>{batch.status === "completed" ? "готово" : "есть пропуски"}</span>
                    </article>
                  ))
                ) : (
                  <article className="ops-empty">
                    <Database aria-hidden="true" />
                    <p>После первого импорта здесь будет журнал batch, дублей и пропусков.</p>
                  </article>
                )}
              </div>
            </div>

            <div className="panel audit-panel">
              <div className="panel-heading">
                <h2>Аудит действий</h2>
                <ShieldCheck aria-hidden="true" />
              </div>
              <div className="ops-list">
                {dashboard.auditEvents.map((event: any) => (
                  <article className="ops-row" key={event.id}>
                    <ShieldCheck aria-hidden="true" />
                    <div>
                      <h3>{event.reason ? "Системное событие" : "Запись аудита"}</h3>
                      <p>{event.reason ?? "Служебная запись без публичного описания"}</p>
                    </div>
                    <span>{formatDateTime(event.createdAt)}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>
          ) : null}

          {settingsTab === "imports" ? (
          <section className="import-studio" aria-label="Миграция из старой программы">
            <div className="import-copy">
              <Database aria-hidden="true" />
              <div>
                <p className="eyebrow">Мастер переноса</p>
                <h2>Любой источник сначала проходит предпросмотр</h2>
                <p>
                  Здесь живут CSV, Excel, экспорт старых МИС, OCR с фото бумажного журнала, диктовка и свободный текст.
                  В базу ничего не пишется без подтверждения.
                </p>
              </div>
            </div>

            <div className="import-source-grid" aria-label="Источник импорта">
              {(Object.keys(importSourceLabels) as ImportSourceKind[]).map((kind: any) => (
                <button
                  className={`source-card ${importSourceKind === kind ? "active" : ""}`}
                  type="button"
                  key={kind}
                  onClick={() => {
                    setImportSourceKind(kind);
                    setImportPreview(null);
                    setImportCommit(null);
                  }}
                >
                  <strong>{importSourceLabels[kind].title}</strong>
                  <span>{importSourceLabels[kind].detail}</span>
                </button>
              ))}
            </div>

            <div className="document-ingestion-panel" aria-label="Извлечение текста из файла">
              <div className="document-ingestion-head">
                <FileText aria-hidden="true" />
                <div>
                  <strong>ZIP, PDF, DOCX, XLSX, CSV, TXT, HTML, RTF</strong>
                  <span>Сначала извлечь текст и таблицы, потом отправить в предпросмотр. Без прямой записи в базу.</span>
                </div>
              </div>
              <div className="document-ingestion-targets" aria-label="Куда отправить извлеченный текст">
                {(Object.keys(ingestionTargetLabels) as DocumentIngestionTarget[]).map((target: any) => (
                  <button
                    className={documentIngestionTarget === target ? "active" : ""}
                    key={target}
                    type="button"
                    onClick={() => setDocumentIngestionTarget(target)}
                  >
                    {ingestionTargetLabels[target]}
                  </button>
                ))}
              </div>
              <label className="document-file-upload">
                <UploadCloud aria-hidden="true" />
                <span>{isDocumentIngesting ? "Разбираю файл" : "Выбрать файл"}</span>
                <small>До 8 МБ. ZIP/DOCX/XLSX/PPTX и ODT/ODS/ODP через встроенный ZIP/XML-извлекатель; PDF без OCR в ограниченном режиме.</small>
                <input
                  accept=".txt,.csv,.tsv,.json,.xml,.html,.htm,.rtf,.zip,.pdf,.doc,.xls,.ppt,.docx,.xlsx,.xlsm,.pptx,.odt,.ods,.odp,image/jpeg,image/png,image/webp"
                  type="file"
                  onChange={(event: any) => void ingestImportFile(event.currentTarget.files?.[0])}
                />
              </label>
              {documentIngestion ? (
                <div className="document-ingestion-result">
                  <div className="document-ingestion-stats">
                    <span>{documentDetectedKindLabel(documentIngestion.detectedKind)}</span>
                    <span>{documentIngestion.rowCount} строк</span>
                    <span>{documentIngestion.tableCount} таблиц</span>
                    <span>{Math.round(documentIngestion.byteSize / 1024)} КБ</span>
                    <span>{documentIngestion.extractedFiles.length} файлов</span>
                  </div>
                  <div className={`document-quality quality-${documentIngestion.quality.extractionQuality}`}>
                    <div>
                      <strong>{documentIngestionQualityLabels[documentIngestion.quality.extractionQuality]}</strong>
                      <span>{Math.round(documentIngestion.quality.confidence * 100)}% · {ingestionTargetLabels[documentIngestion.quality.suggestedTarget]}</span>
                    </div>
                    <p>{documentIngestion.quality.nextAction}</p>
                    {documentIngestion.quality.signals.length ? (
                      <div className="document-signal-row">
                        {documentIngestion.quality.signals.slice(0, 10).map((signal: any) => (
                          <span key={signal}>{signal}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {documentIngestion.extractedFiles.length ? (
                    <div className="document-extracted-files" aria-label="Извлеченные файлы архива">
                      {documentIngestion.extractedFiles.slice(0, 8).map((file: any) => (
                        <span key={`${file.fileName}-${file.detectedKind}`}>
                          {documentDetectedKindLabel(file.detectedKind)} · {file.rowCount} строк · {file.fileName}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p>{documentIngestion.textPreview || "Текст не извлечен"}</p>
                  <div className="recognition-notes">
                    {documentIngestion.routes.slice(0, 4).map((route: any) => (
                      <span key={route.target}>
                        {ingestionTargetLabels[route.target]}: {route.enabled ? "готово" : "пропустить"} · {route.reason}
                      </span>
                    ))}
                    {documentIngestion.warnings.map((warning: any) => (
                      <span key={warning}>{warning}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="import-workbench">
              <textarea
                aria-label="Данные для проверки импорта"
                value={importText}
                onChange={(event: any) => {
                  setImportText(event.target.value);
                  setImportPreview(null);
                  setImportCommit(null);
                  setImportIntake(null);
                }}
              />
              <div className="import-tool-row">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={startImportDictation}
                  disabled={isImportDictating}
                  aria-busy={isImportDictating || undefined}
                >
                  <Mic aria-hidden="true" /> Надиктовать импорт
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setImportSourceKind("image_ocr");
                    setImportText(
                      "Фото журнала -> OCR текст:\nИванов Иван Иванович +7 900 111-22-33 01.01.1980 первичный прием\nПетров Петр Петрович 8 927 333-44-55 12.02.1975 нужен вычет"
                      );
                    setImportPreview(null);
                    setImportCommit(null);
                    setImportIntake(null);
                  }}
                >
                  <ImageIcon aria-hidden="true" /> Фото журнала
                </button>
                <button className="primary-button" type="button" onClick={previewImport} disabled={isImportLoading || !patientImportInputReady}>
                  <UploadCloud aria-hidden="true" /> {isImportLoading ? "Проверяю" : "Проверить"}
                </button>
              </div>
              {!patientImportInputReady ? (
                <p className="import-empty-guidance" role="status" aria-live="polite">
                  Вставьте список пациентов, OCR журнала или надиктуйте импорт перед проверкой.
                </p>
              ) : null}
            </div>

            {importIntake ? (
              <div className="recognition-notes">
                {importIntake.recognitionNotes.map((note: any) => (
                  <span key={note}>{note}</span>
                ))}
              </div>
            ) : null}

            {importPreview ? (
              <div className="import-preview">
                <div className="import-stats">
                  <span>{importPreview.totalRows} строк</span>
                  <span>{importPreview.readyRows} готово</span>
                  <span>{importPreview.warningRows} предупреждения</span>
                  <span>{importPreview.blockedRows} к исправлению</span>
                </div>
                <div className="import-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={commitImport}
                    disabled={isImportCommitting || !patientImportInputReady || importPreview.readyRows === 0}
                  >
                    <CheckCircle2 aria-hidden="true" /> {isImportCommitting ? "Записываю" : "Импортировать готовые"}
                  </button>
                  {importCommit ? (
                    <span>
                      Записано: {importCommit.importedCount}. Пропущено: {importCommit.skippedCount}.
                    </span>
                  ) : (
                    <span>В базу попадут только строки без предупреждений.</span>
                  )}
                </div>
                <div className="import-rows">
                  {importPreview.rows.map((row: any) => (
                    <article className={`import-row import-${row.status}`} key={row.rowNumber}>
                      <strong>{row.fullName ?? `Строка ${row.rowNumber}`}</strong>
                      <span>{row.phone ?? "нет телефона"}</span>
                      <span>{row.birthDate ?? "нет даты"}</span>
                      <p>{row.warnings.length ? row.warnings.join(", ") : row.notes ?? "готово к импорту"}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          ) : null}
        </section>
      );
}
