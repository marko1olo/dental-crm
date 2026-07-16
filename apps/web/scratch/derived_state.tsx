		setTelegramAdminSecretDraft,
	} = useSettingsStore();

	const recognitionInputReady = (recognitionText || "").trim().length > 0;
	const smartImportInputReady = (smartImportText || "").trim().length > 0;
	const imagingImportInputReady = (imagingImportText || "").trim().length > 0;
	const patientImportInputReady = (importText || "").trim().length > 0;
	const localImagingFolderReady = (imagingFolderPath || "").trim().length > 0;
	const newStaffReadyToCreate = (newStaffName || "").trim().length > 0;
	const newChairReadyToCreate = (newChairName || "").trim().length > 0;
	const adminSecretReady = (telegramAdminSecretDraft || "").trim().length > 0;
	const adminSecretScopeWarning =
		settingsTab === "telegram"
			? "Этот секрет относится только к Telegram. Он не разблокирует настройки клиники, расписание или клинические данные, если для них включены отдельные секреты."
			: "Этот секрет относится только к настройкам клиники. Он не разблокирует расписание, Telegram или клинические данные, если для них включены отдельные секреты.";
	const typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
	const typedModeHints = dashboard.clinicSettings.modeHints as string[];
	const typedRoleQueues = dashboard.shiftIntelligence.roleQueues as RoleQueue[];
	const typedStaffMembers = dashboard.clinicSettings.staff as StaffMember[];
	const typedChairs = dashboard.clinicSettings.chairs as Chair[];
	const typedWeekdayOptions = weekdayOptions as WeekdayOption[];
	const typedUiLanguageOptions = uiLanguageOptions as Array<{
		value: string;
		label: string;
		detail: string;
	}>;
	const typedTelegramLinkStaffOptions =
		telegramLinkStaffOptions as StaffMember[];
	const typedProtocolTemplates =
		dashboard.protocolTemplates as ProtocolTemplate[];
	const typedImagingConnectorCards =
		imagingConnectorCards as ImagingConnectorCard[];
	const typedImagingViewerCapabilities =
		imagingViewerCapabilities as ImagingViewerCapability[];
	const typedCtPlanningImplantPlan =
		ctPlanningImplantPlan as ImagingViewerImplantPlan | null;
	const typedCtPlanningActiveQuickActionId =
		typeof ctPlanningActiveQuickActionId === "string"
			? ctPlanningActiveQuickActionId
			: null;
	const typedImagingViewerActiveTool =
		imagingViewerActiveTool as ImagingViewerTool;
	const typedIntegrationPresets = dashboard.clinicSettings
		.integrationPresets as IntegrationPreset[];
	const typedSpeechProviders = dashboard.speechProviders as SpeechProvider[];
	const typedRecognitionPresets = recognitionPresets as RecognitionPreset[];
	const typedRecognitionJob = recognitionJob as AiRecognitionJob | null;
	const typedSpeechRecordingRecovery =
		speechRecordingRecovery as SpeechRecordingRecoveryList | null;
	const typedBrowserMigrationDiscovery =
		browserMigrationDiscovery as MigrationLocalSourceDiscoveryResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;
	const typedImagingSourceChoices = imagingSourceChoices as ImagingSourceKind[];
	const typedImagingImportPreview =
		imagingImportPreview as ImagingImportPreviewResponse | null;
	const typedBrowserContinuityChecks =
		browserContinuityChecks as BrowserContinuityCheck[];
	const typedLocalBridgeReadiness =
		localBridgeReadiness as LocalBridgeReadinessResponse | null;
	const typedLocalBridgeUsePlans =
		localBridgeUsePlans as LocalBridgeUsePlansResponse | null;
	const typedPersistenceIntegrity =
		persistenceIntegrity as PersistenceIntegrityReport | null;
