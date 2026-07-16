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
