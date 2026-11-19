import type { Dashboard, Patient, StaffRole } from "@dental/shared";
import {
	defaultUiLanguageOption, operatorWorkflowFailureMessage, patientName as patientNameHelper,
	visitDraftMissingFieldLabel, visitDraftQualityLabels, visitDraftSignalLabel,
	visitNoteFieldDefinitions, visitSaveReceiptText,
} from "../../../../AppHelpers";
import { viewLabels } from "../../../../utils/routeUtils";
import { buildAppLogicImagingCompatibility } from "../appLogicImagingCompatibility";
import { buildAppLogicWorkflowCompatibility } from "../appLogicWorkflowCompatibility";
import {
	buildLegacyAppStoreBindings,
	buildLegacyFieldBindings,
	buildLegacyNavigationAndClinicalBindings,
	buildLegacyNormalizers,
	buildLegacyPatientFields,
	buildLegacyStubsAndFallbacks,
	buildProfileAndLegalHelpers,
	sortCommunicationTasks,
} from "./appLogicLegacyBridge";
import { buildServiceCatalogCompatibility } from "./appLogicCatalogCompatibility";
import type { AppLogicCompatibilityInputParams } from "./appLogicCompatibilityTypes";

export type { AppLogicCompatibilityInputParams as BuildAppLogicCompatibilityBagParams } from "./appLogicCompatibilityTypes";

export function buildAppLogicCompatibilityBag(
	params: AppLogicCompatibilityInputParams,
): Record<string, unknown> {
	const {
		appStore, settingsStore, imagingStore, soundNotifications, auth,
		navigationState, patientSelection, scheduleLogic, clinicalSession, billingModal,
		modalController, offlineSync, settingsAndIntegrations, staffSettingsLogic,
		migrationQueries, imagingQueries, communicationsQueries, emergencyTriage, navigationSync,
	} = params;

	const dashboard = appStore.dashboard as Dashboard | null | undefined;
	const selectedWorkspaceRole = navigationState.selectedWorkspaceRole as StaffRole | string | undefined;
	const patientRecord = (patientSelection.patient ?? {}) as Record<string, unknown>;
	const documentPatient = patientRecord.documentPatient as Patient | null | undefined;
	const scheduleRecord = (scheduleLogic ?? {}) as Record<string, unknown>;
	const innerSchedule = (scheduleRecord.schedule ?? {}) as Record<string, unknown>;
	const patientSelectionRecord = (patientSelection ?? {}) as Record<string, unknown>;
	const innerPatient = (patientSelectionRecord.patient ?? {}) as Record<string, unknown>;
	const settingsIntegrationsRecord = (settingsAndIntegrations ?? {}) as Record<string, unknown>;
	const dicomWorkbenchModule = (settingsIntegrationsRecord.dicomWorkbenchModule ?? {}) as Record<string, unknown>;
	const documentWorkflow = (settingsIntegrationsRecord.documentWorkflow ?? {}) as Record<string, unknown>;
	const telegram = (settingsIntegrationsRecord.telegram ?? {}) as Record<string, unknown>;
	const telegramSettingsModule = (settingsIntegrationsRecord.telegramSettingsModule ?? {}) as Record<string, unknown>;

	const activeQueueRole: StaffRole =
		(selectedWorkspaceRole as string) === "all" ? "doctor" : (selectedWorkspaceRole as StaffRole) ?? "doctor";

	const profileAndLegal = buildProfileAndLegalHelpers(appStore);
	const legacyStubs = buildLegacyStubsAndFallbacks();
	const legacyFieldBindings = buildLegacyFieldBindings(params);
	const legacyAppStore = buildLegacyAppStoreBindings(appStore);
	const legacyNavigation = buildLegacyNavigationAndClinicalBindings(clinicalSession, navigationState);

	const modalOrchestrator = (modalController.modalOrchestrator ?? {}) as Record<string, unknown>;
	const patientIntakeLogic = (patientSelection.patientIntakeLogic ?? {}) as Record<string, unknown>;
	const scheduleFilterController = (scheduleLogic.scheduleFilterController ?? {}) as Record<string, unknown>;
	const navigationRouter = (navigationState.navigationRouter ?? {}) as Record<string, unknown>;
	const clinicalVisitLogic = (clinicalSession.clinicalVisitLogic ?? {}) as Record<string, unknown>;
	const finance = (billingModal.finance ?? {}) as Record<string, unknown>;

	const appLogicBag: Record<string, unknown> = {
		...appStore,
		...settingsStore,
		...imagingStore,
		...clinicalSession,
		...settingsAndIntegrations,
		...dicomWorkbenchModule,
		...documentWorkflow,
		...modalOrchestrator,
		...staffSettingsLogic,
		...patientIntakeLogic,
		...migrationQueries,
		...imagingQueries,
		...communicationsQueries,
		...scheduleFilterController,
		...navigationRouter,
		...patientSelection,
		...billingModal,
		...scheduleLogic,
	};

	const imagingSlice = buildAppLogicImagingCompatibility({
		offlineSync,
		settingsAndIntegrations,
		appLogicBag,
	});

	const workflowSlice = buildAppLogicWorkflowCompatibility({
		appStore,
		settingsAndIntegrations,
		modalController,
		offlineSync,
		appLogicBag,
		browserDirectoryInputRef: params.browserDirectoryInputRef,
		browserMigrationInputRef: params.browserMigrationInputRef,
		refreshSpeechRuntimeRef: params.refreshSpeechRuntimeRef,
	});

	const legacyNormalizers = buildLegacyNormalizers(appLogicBag);
	const legacyPatient = buildLegacyPatientFields(documentPatient, dashboard);
	const sortedCommunicationTasks = sortCommunicationTasks(dashboard?.communicationTasks);

	const serviceCatalog = buildServiceCatalogCompatibility(
		(auth ?? {}) as Record<string, unknown>,
		(appStore ?? {}) as Record<string, unknown>,
		params.loadDashboard,
	);

	return {
		...documentWorkflow,
		...dicomWorkbenchModule,
		...telegramSettingsModule,
		...telegram,
		...auth,
		...clinicalVisitLogic,
		...staffSettingsLogic,
		...patientIntakeLogic,
		...migrationQueries,
		...imagingQueries,
		...communicationsQueries,
		...modalOrchestrator,
		...scheduleFilterController,
		...navigationRouter,
		...patientSelection,
		...billingModal,
		...scheduleLogic,
		...emergencyTriage,
		...navigationSync,
		...workflowSlice,
		...imagingSlice,
		...legacyStubs,
		...profileAndLegal,
		...legacyFieldBindings,
		...legacyAppStore,
		...legacyNavigation,
		...legacyNormalizers,
		...legacyPatient,
		soundNotifications,
		auth,
		activeAppointment: scheduleLogic.activeAppointment,
		activeChair: scheduleLogic.activeChair,
		activeDoctor: scheduleLogic.activeDoctor,
		activePatient: patientSelection.activePatient,
		activeVisitPatient: patientSelection.activeVisitPatient,
		activePatientCallablePhone: patientSelection.activePatientCallablePhone,
		activePatientHasCallablePhone: patientSelection.activePatientHasCallablePhone,
		activePatientInsight: patientSelection.activePatientInsight,
		activeQueueRole,
		appointmentReadinessById: scheduleLogic.appointmentReadinessById,
		appointmentReadinessLabels: appLogicBag.appointmentReadinessLabels ?? {},
		appointmentScheduleDraftFromAppointment: appLogicBag.appointmentScheduleDraftFromAppointment ?? (() => null),
		buildDraft: appLogicBag.buildDraft ?? (() => null),
		buildOfflineDraft: appLogicBag.buildOfflineDraft ?? (() => null),
		clinicPublicLookup: appLogicBag.clinicPublicLookup ?? null,
		closeAppointmentEditor: scheduleRecord.closeAppointmentEditor ?? innerSchedule.closeAppointmentEditor ?? (() => {}),
		completeCommunicationTask: settingsAndIntegrations.completeCommunicationTask,
		createAppointmentFromDraft: scheduleRecord.createAppointmentFromDraft ?? innerSchedule.createAppointmentFromDraft ?? (async () => {}),
		createClinicalRuleFromSettings: settingsAndIntegrations.createClinicalRuleFromSettings,
		...serviceCatalog,
		dashboard,
		documentFactoryGroups: appLogicBag.documentFactoryGroups ?? [],
		documentPatient,
		editingAppointmentId: scheduleLogic.editingAppointmentId,
		filteredPatients: patientSelectionRecord.filteredPatients ?? innerPatient.filteredPatients ?? [],
		flushPendingVisitSaves: appLogicBag.flushPendingVisitSaves ?? (async () => {}),
		isPaymentSaving: appLogicBag.isPaymentSaving ?? false,
		isRecognitionLoading: appLogicBag.isRecognitionLoading ?? false,
		isVisitNoteDirty: appLogicBag.isVisitNoteDirty ?? false,
		openAppointmentEditor: scheduleRecord.openAppointmentEditor ?? innerSchedule.openAppointmentEditor ?? (() => {}),
		openScheduleWarning: scheduleRecord.openScheduleWarning ?? innerSchedule.openScheduleWarning ?? (() => {}),
		openVisitWarningAction: appLogicBag.openVisitWarningAction ?? (() => {}),
		patientAdministrativeProfileValidationMessage:
			patientSelectionRecord.patientAdministrativeProfileValidationMessage ??
			innerPatient.patientAdministrativeProfileValidationMessage ??
			null,
		patientInsightById: patientSelectionRecord.patientInsightById ?? innerPatient.patientInsightById ?? {},
		patientInsightRiskLabels: appLogicBag.patientInsightRiskLabels ?? {},
		patientIntakePregnancyStatusOptions: appLogicBag.patientIntakePregnancyStatusOptions ?? [],
		patientName: patientNameHelper,
		paymentMutationIdRef: params.paymentMutationIdRef,
		paymentPatientContextMessage:
			patientSelectionRecord.paymentPatientContextMessage ?? innerPatient.paymentPatientContextMessage ?? null,
		paymentPatientContextReady:
			patientSelectionRecord.paymentPatientContextReady ?? innerPatient.paymentPatientContextReady ?? false,
		photoVideoMaterialOptions: appLogicBag.photoVideoMaterialOptions ?? [],
		policyAuditEventLabels: appLogicBag.policyAuditEventLabels ?? {},
		pricelistParserModeLabels: appLogicBag.pricelistParserModeLabels ?? {},
		primaryVisitWarning: appLogicBag.primaryVisitWarning ?? null,
		procedureSpecificConsentProcedureOptions: appLogicBag.procedureSpecificConsentProcedureOptions ?? [],
		query: patientSelection.query,
		recommendedActionPriorityLabels: appLogicBag.recommendedActionPriorityLabels ?? {},
		recordPayment: typeof finance.recordPayment === "function" ? (finance.recordPayment as () => Promise<void>) : (async () => {}),
		resetNewAppointmentDraft: scheduleRecord.resetNewAppointmentDraft ?? innerSchedule.resetNewAppointmentDraft ?? (() => {}),
		roleFocusOrder: appLogicBag.roleFocusOrder ?? [],
		saveAppointmentSchedule: scheduleRecord.saveAppointmentSchedule ?? innerSchedule.saveAppointmentSchedule ?? (async () => {}),
		saveChairSchedule: scheduleRecord.saveChairSchedule ?? innerSchedule.saveChairSchedule ?? (async () => {}),
		saveClinicProfileFromDraft: settingsAndIntegrations.saveClinicProfileFromDraft,
		savePatientAdministrativeProfile:
			patientSelectionRecord.savePatientAdministrativeProfile ?? innerPatient.savePatientAdministrativeProfile,
		savePatientCore: patientSelection.savePatientCore,
		createPatient: patientSelection.createPatient,
		saveStaffSchedule: scheduleLogic.saveStaffSchedule,
		scenarioPriorityLabels: appLogicBag.scenarioPriorityLabels ?? {},
		scenarioStrategyLabels: appLogicBag.scenarioStrategyLabels ?? {},
		scheduleAdminSecretDraft: scheduleLogic.scheduleAdminSecretDraft,
		scheduleAdminSecretSession: scheduleLogic.scheduleAdminSecretSession,
		selectedPatient: patientSelection.selectedPatient,
		selectedUiLanguageOption: defaultUiLanguageOption,
		selectedWorkspaceRole,
		setQuery: patientSelection.setQuery,
		settingsTabs: appLogicBag.settingsTabs ?? [],
		sortedAppointments: scheduleLogic.sortedAppointments,
		staffScheduleDraftFromWorkingHours: appLogicBag.staffScheduleDraftFromWorkingHours ?? (() => null),
		taxApplicationDeliveryChannelOptions: appLogicBag.taxApplicationDeliveryChannelOptions ?? [],
		taxApplicationFormOptions: appLogicBag.taxApplicationFormOptions ?? [],
		taxApplicationRelationshipOptions: appLogicBag.taxApplicationRelationshipOptions ?? [],
		uiLanguageOptions: appLogicBag.uiLanguageOptions ?? [],
		soundNotificationsMuted: soundNotifications.muted,
		setSoundNotificationsMuted: soundNotifications.setMuted,
		testOnlineBookingSound: soundNotifications.testOnlineBookingSound,
		testSlotEndSound: soundNotifications.testSlotEndSound,
		updatePatientAdministrativeProfileDraft: patientSelection.updatePatientAdministrativeProfileDraft,
		updatePatientCoreDraft: patientSelection.updatePatientCoreDraft,
		viewLabels,
		visitDraftMissingFieldLabel,
		visitDraftQualityLabels,
		visitDraftSignalLabel,
		visitNoteFieldDefinitions,
		visitSaveReceiptText,
		loadDashboard: params.loadDashboard,
		operatorWorkflowFailureMessage,
		activePayments: billingModal.activePayments,
		activeTreatmentPlanItems: billingModal.activeTreatmentPlanItems,
		analyzePricelist: settingsAndIntegrations.analyzePricelist,
		clinicalMutationHeaders: auth.denteClinicalMutationHeaders,
		clinicalReadHeaders: auth.denteClinicalReadHeaders,
		setSelectedPatientId: patientSelection.setSelectedPatientId,
		sortedCommunicationTasks,
		recentPatientViewsVersion: params.recentPatientViewsVersion,
	};
}
