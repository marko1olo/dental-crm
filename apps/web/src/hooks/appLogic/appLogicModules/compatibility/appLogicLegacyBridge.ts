/**
 * DENTE CRM — App Logic Legacy Bridge (Layer 2)
 *
 * Adapters, normalizers, and fallback signatures for backward compatibility.
 */

import {
	type ClinicProfileDraft,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
} from "../../../../AppHelpers";
import type { LegacyStubsAndFallbacks, ProfileAndLegalCompatibility } from "./appLogicCompatibilityTypes.js";

// biome-ignore lint/suspicious/noExplicitAny: compatibility bag helper
export function buildProfileAndLegalHelpers(appStore: any): ProfileAndLegalCompatibility {
	const { dashboard, setClinicProfileDraft, setClinicProfileDirty } = appStore;

	const legalMissingFields = dashboard?.clinicSettings?.profile
		? clinicLegalMissingFields(dashboard.clinicSettings.profile)
		: [];
	const legalReadinessPercent = dashboard?.clinicSettings?.profile
		? clinicLegalReadinessPercent(dashboard.clinicSettings.profile)
		: 0;

	const updateClinicProfileDraft = (
		field: string,
		value: unknown,
	) => {
		setClinicProfileDraft((prev: any) => ({ ...prev, [field]: value }));
		setClinicProfileDirty(true);
	};

	return {
		legalMissingFields,
		legalReadinessPercent,
		updateClinicProfileDraft,
	};
}

// biome-ignore lint/suspicious/noExplicitAny: stubs and fallbacks
export function buildLegacyStubsAndFallbacks(): any {
	return {
		attachPricelistImage: async (_file: File) => {},
		clearPricelistImage: () => {},
		draft: null,
		isDraftAccepting: false,
		isDraftLoading: false,
		isPendingVisitSyncing: false,
		lastPendingVisitSaveAt: null,
		lastServerDraftSavedAt: null,
		lastVisitSaveReceipt: null,
		localDraftWasRestored: false,
		pendingVisitSaveCount: 0,
		serverDraftSyncState: "idle",
		goToVisitDictation: () => {},
		handleQuickConsult: () => {},
		isQuickConsultLoading: false,
		documentIngestionTarget: "general",
		setDocumentIngestionTarget: () => {},
		selectedSpecialty: "",
		setSelectedSpecialty: () => {},
		setSelectedProtocolId: () => {},
		visitToothStateByCode: {},
		serviceTitle: (serviceId: string) => serviceId,
		money: (v: unknown) => `${v ?? 0} ₽`,
		activeCommunicationTasks: null,
		addImagingViewerNoteAnnotation: null,
		applyProtocolTemplate: null,
		applyProtocolTemplateDirectly: null,
		assembleSpeechRecording: async () => {},
		chooseRecognitionPreset: null,
		selectedPaymentReceiptTotalRub: 0,
		selectedProtocolTemplate: null,
		selectedTaxPaymentTotalRub: 0,
		shiftWarnings: null,
		specialtiesWithTemplates: [],
		specialtyProtocolTemplates: [],
		visibleVisitSpecialtyFocusOptions: [],
		visitPrimaryAction: null,
		visitSafetyCards: [],
		visitWorkflowSteps: [],
	};
}

// biome-ignore lint/suspicious/noExplicitAny: legacy normalizers mapper
export function buildLegacyNormalizers(appLogicBag: any): Record<string, any> {
	return {
		normalizeOptionalWorkingDaysDraft: appLogicBag.normalizeOptionalWorkingDaysDraft ?? ((d: any) => d),
		normalizeUiLanguageInput: appLogicBag.normalizeUiLanguageInput ?? ((l: any) => l),
		normalizedAppointmentStatus: appLogicBag.normalizedAppointmentStatus ?? ((s: any) => s),
		normalizedAppointmentStatusFilter: appLogicBag.normalizedAppointmentStatusFilter ?? ((f: any) => f),
		normalizedClinicalRuleAction: appLogicBag.normalizedClinicalRuleAction ?? ((a: any) => a),
		normalizedClinicalRuleSeverity: appLogicBag.normalizedClinicalRuleSeverity ?? ((s: any) => s),
		normalizedDentalSpecialty: appLogicBag.normalizedDentalSpecialty ?? ((s: any) => s),
		normalizedDocumentIssueSignatureMode: appLogicBag.normalizedDocumentIssueSignatureMode ?? ((m: any) => m),
		normalizedDocumentKind: appLogicBag.normalizedDocumentKind ?? ((k: any) => k),
		normalizedDocumentVoidReasonCode: appLogicBag.normalizedDocumentVoidReasonCode ?? ((c: any) => c),
		normalizedMedicalDocumentReleaseChannel: appLogicBag.normalizedMedicalDocumentReleaseChannel ?? ((c: any) => c),
		normalizedPatientIntakePregnancyStatus: appLogicBag.normalizedPatientIntakePregnancyStatus ?? ((p: any) => p),
		normalizedPaymentRefundCorrectionAction: appLogicBag.normalizedPaymentRefundCorrectionAction ?? ((a: any) => a),
		normalizedPaymentRefundCorrectionMethod: appLogicBag.normalizedPaymentRefundCorrectionMethod ?? ((m: any) => m),
		normalizedPostVisitCareTopic: appLogicBag.normalizedPostVisitCareTopic ?? ((t: any) => t),
		normalizedProcedureSpecificConsentProcedure: appLogicBag.normalizedProcedureSpecificConsentProcedure ?? ((p: any) => p),
		normalizedServiceCategory: appLogicBag.normalizedServiceCategory ?? ((c: any) => c),
		normalizedStaffRole: appLogicBag.normalizedStaffRole ?? ((r: any) => r),
		normalizedTaxApplicationDeliveryChannel: appLogicBag.normalizedTaxApplicationDeliveryChannel ?? ((d: any) => d),
		normalizedTaxApplicationForm: appLogicBag.normalizedTaxApplicationForm ?? ((f: any) => f),
		normalizedTaxApplicationRelationshipSelect: appLogicBag.normalizedTaxApplicationRelationshipSelect ?? ((r: any) => r),
		normalizedTreatmentPlanAcceptanceVariant: appLogicBag.normalizedTreatmentPlanAcceptanceVariant ?? ((v: any) => v),
		normalizedXrayPregnancyStatus: appLogicBag.normalizedXrayPregnancyStatus ?? ((p: any) => p),
		normalizedXrayPriority: appLogicBag.normalizedXrayPriority ?? ((p: any) => p),
		normalizedXrayStudyType: appLogicBag.normalizedXrayStudyType ?? ((t: any) => t),
	};
}

// biome-ignore lint/suspicious/noExplicitAny: legacy task sorter
export function sortCommunicationTasks(tasks: any[]): any[] {
	const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
	return (tasks ?? []).slice().sort((a: any, b: any) => {
		const pA = priorityOrder[a.priority] ?? 2;
		const pB = priorityOrder[b.priority] ?? 2;
		if (pA !== pB) return pA - pB;
		return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
	});
}

// biome-ignore lint/suspicious/noExplicitAny: patient & document fields
export function buildLegacyPatientFields(documentPatient: any, dashboard: any): Record<string, any> {
	return {
		address: documentPatient?.administrativeProfile?.registrationAddress ?? "",
		clinic: dashboard?.clinicSettings?.profile ?? null,
		clinicName: dashboard?.clinicSettings?.profile?.clinicName ?? "",
		firstName: documentPatient?.fullName?.split(" ")[1] ?? "",
		inn: documentPatient?.administrativeProfile?.taxpayerInn ?? "",
		lastName: documentPatient?.fullName?.split(" ")[0] ?? "",
		loyaltyTier: "standard",
		middleName: documentPatient?.fullName?.split(" ")[2] ?? "",
		mostLoadedResource: null,
		name: documentPatient?.fullName ?? "",
		noShowRisk: "low",
		patientId: documentPatient?.id ?? "",
		prices: dashboard?.serviceCatalog ?? [],
	};
}

// biome-ignore lint/suspicious/noExplicitAny: schedule & billing field bindings
export function buildLegacyFieldBindings(params: any): Record<string, any> {
	const { scheduleLogic, billingModal } = params;

	return {
		chairScheduleDirtyIds:
			scheduleLogic.chairScheduleDirtyIds instanceof Set
				? scheduleLogic.chairScheduleDirtyIds
				: new Set(scheduleLogic.chairScheduleDirtyIds ?? []),
		chairScheduleDrafts: scheduleLogic.chairScheduleDrafts ?? {},
		chairScheduleSaveStates: scheduleLogic.chairScheduleSaveStates ?? {},
		chairScheduleSavingId: scheduleLogic.chairScheduleSavingId ?? null,
		newAppointmentError: scheduleLogic.newAppointmentError,
		newChairHasMicroscope: scheduleLogic.newChairHasMicroscope,
		newChairHasSurgeryKit: scheduleLogic.newChairHasSurgeryKit,
		newChairHasXraySensor: scheduleLogic.newChairHasXraySensor,
		newChairName: scheduleLogic.newChairName,
		newStaffName: scheduleLogic.newStaffName,
		newStaffRole: scheduleLogic.newStaffRole,
		newStaffSpecialty: scheduleLogic.newStaffSpecialty,
		paymentAmount: billingModal.paymentAmount,
		paymentFeedback: billingModal.paymentFeedback,
		paymentFiscalCashierName: billingModal.paymentFiscalCashierName,
		paymentFiscalFd: billingModal.paymentFiscalFd,
		paymentFiscalFn: billingModal.paymentFiscalFn,
		paymentFiscalFpd: billingModal.paymentFiscalFpd,
		paymentFiscalReceiptIssuedAt: billingModal.paymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptNumber: billingModal.paymentFiscalReceiptNumber,
		paymentFiscalReceiptUrl: billingModal.paymentFiscalReceiptUrl,
		paymentMethod: billingModal.paymentMethod,
		paymentPayerBirthDate: billingModal.paymentPayerBirthDate,
		paymentPayerFullName: billingModal.paymentPayerFullName,
		paymentPayerIdentityDocument: billingModal.paymentPayerIdentityDocument,
		paymentPayerInn: billingModal.paymentPayerInn,
		paymentPayerRelationship: billingModal.paymentPayerRelationship,
		paymentTaxDeductionCode: billingModal.paymentTaxDeductionCode,
		setPaymentAmount: billingModal.setPaymentAmount,
		setPaymentFiscalCashierName: billingModal.setPaymentFiscalCashierName,
		setPaymentFiscalFd: billingModal.setPaymentFiscalFd,
		setPaymentFiscalFn: billingModal.setPaymentFiscalFn,
		setPaymentFiscalFpd: billingModal.setPaymentFiscalFpd,
		setPaymentFiscalReceiptIssuedAt: billingModal.setPaymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptNumber: billingModal.setPaymentFiscalReceiptNumber,
		setPaymentFiscalReceiptUrl: billingModal.setPaymentFiscalReceiptUrl,
		setPaymentMethod: billingModal.setPaymentMethod,
		setPaymentPayerBirthDate: billingModal.setPaymentPayerBirthDate,
		setPaymentPayerFullName: billingModal.setPaymentPayerFullName,
		setPaymentPayerIdentityDocument: billingModal.setPaymentPayerIdentityDocument,
		setPaymentPayerInn: billingModal.setPaymentPayerInn,
		setPaymentPayerRelationship: billingModal.setPaymentPayerRelationship,
		setPaymentTaxDeductionCode: billingModal.setPaymentTaxDeductionCode,
		setPaymentFeedback: billingModal.setPaymentFeedback,
		staffScheduleDirtyIds:
			scheduleLogic.staffScheduleDirtyIds instanceof Set
				? scheduleLogic.staffScheduleDirtyIds
				: new Set(scheduleLogic.staffScheduleDirtyIds ?? []),
		staffScheduleDrafts: scheduleLogic.staffScheduleDrafts,
		staffScheduleSaveStates: scheduleLogic.staffScheduleSaveStates,
		staffScheduleSavingId: scheduleLogic.staffScheduleSavingId,
		toggleChairWorkingDay: scheduleLogic.toggleChairWorkingDay,
		toggleClinicWorkingDay: scheduleLogic.toggleClinicWorkingDay,
		toggleStaffWorkingDay: scheduleLogic.toggleStaffWorkingDay,
		updateAppointmentScheduleDraft: scheduleLogic.updateAppointmentScheduleDraft,
		updateChairScheduleDay: scheduleLogic.updateChairScheduleDay,
		updateChairScheduleDraft: scheduleLogic.updateChairScheduleDraft,
		updateNewAppointmentDraft: scheduleLogic.updateNewAppointmentDraft,
		updateStaffScheduleDay: scheduleLogic.updateStaffScheduleDay,
		updateStaffScheduleDraft: scheduleLogic.updateStaffScheduleDraft,
	};
}

// biome-ignore lint/suspicious/noExplicitAny: appStore state bindings
export function buildLegacyAppStoreBindings(appStore: any): Record<string, any> {
	return {
		clinicProfileDraft: appStore.clinicProfileDraft,
		clinicProfileSaveState: appStore.clinicProfileSaveState,
		communicationNote: appStore.communicationNote,
		communicationSavingTaskId: appStore.communicationSavingTaskId,
		error: appStore.error,
		isClinicalRuleSaving: appStore.isClinicalRuleSaving,
		isPricelistAnalyzing: appStore.isPricelistAnalyzing,
		newRuleAction: appStore.newRuleAction,
		newRuleBlockedServiceId: appStore.newRuleBlockedServiceId,
		newRuleCategory: appStore.newRuleCategory,
		newRuleCompletedServiceId: appStore.newRuleCompletedServiceId,
		newRuleOwnerRole: appStore.newRuleOwnerRole,
		newRuleRequiredServiceId: appStore.newRuleRequiredServiceId,
		newRuleSeverity: appStore.newRuleSeverity,
		newRuleSpecialty: appStore.newRuleSpecialty,
		newRuleTitle: appStore.newRuleTitle,
		newRuleTriggerServiceId: appStore.newRuleTriggerServiceId,
		newRuleWarningText: appStore.newRuleWarningText,
		newRulePatientText: appStore.newRulePatientText,
		ohifBaseUrl: appStore.ohifBaseUrl,
		pricelistAnalysis: appStore.pricelistAnalysis,
		pricelistImageBase64: appStore.pricelistImageBase64,
		pricelistImageName: appStore.pricelistImageName,
		pricelistImageNote: appStore.pricelistImageNote,
		pricelistSourceKind: appStore.pricelistSourceKind,
		pricelistText: appStore.pricelistText,
		recognitionJob: appStore.recognitionJob,
		recognitionKind: appStore.recognitionKind,
		recognitionTarget: appStore.recognitionTarget,
		recognitionText: appStore.recognitionText,
		releaseProtectionNote: appStore.releaseProtectionNote,
		setCommunicationNote: appStore.setCommunicationNote,
		setError: appStore.setError,
		setNewRuleAction: appStore.newRuleAction,
		setNewRuleBlockedServiceId: appStore.newRuleBlockedServiceId,
		setNewRuleCategory: appStore.newRuleCategory,
		setNewRuleCompletedServiceId: appStore.newRuleCompletedServiceId,
		setNewRuleOwnerRole: appStore.newRuleOwnerRole,
		setNewRuleRequiredServiceId: appStore.newRuleRequiredServiceId,
		setNewRuleSeverity: appStore.newRuleSeverity,
		setNewRuleSpecialty: appStore.newRuleSpecialty,
		setNewRuleTitle: appStore.newRuleTitle,
		setNewRuleTriggerServiceId: appStore.newRuleTriggerServiceId,
		setNewRuleWarningText: appStore.newRuleWarningText,
		setNewRulePatientText: appStore.newRulePatientText,
		setPricelistAnalysis: appStore.setPricelistAnalysis,
		setPricelistSourceKind: appStore.setPricelistSourceKind,
		setPricelistText: appStore.setPricelistText,
		setRecognitionJob: appStore.recognitionJob,
		setRecognitionText: appStore.recognitionText,
		setReleaseProtectionNote: appStore.releaseProtectionNote,
		setUiLanguage: appStore.setUiLanguage,
		setUiPreferencesSyncError: appStore.setUiPreferencesSyncError,
		setUsePricelistAi: appStore.usePricelistAi,
		uiLanguage: appStore.uiLanguage,
		uiPreferencesSyncError: appStore.uiPreferencesSyncError,
		usePricelistAi: appStore.usePricelistAi,
	};
}

// biome-ignore lint/suspicious/noExplicitAny: navigation & clinical session bindings
export function buildLegacyNavigationAndClinicalBindings(clinicalSession: any, navigationState: any): Record<string, any> {
	return {
		currentView: navigationState.currentView,
		activeRolePolicy: navigationState.activeRolePolicy,
		activeRoleQueue: navigationState.activeRoleQueue,
		activeRoleRestrictedSections: navigationState.activeRoleRestrictedSections,
		activeRoleWritableSections: navigationState.activeRoleWritableSections,
		activeSettingsTabButtonRef: navigationState.activeSettingsTabButtonRef,
		setCurrentView: navigationState.setCurrentView,
		setSelectedWorkspaceRole: navigationState.setSelectedWorkspaceRole,
		setSettingsTab: navigationState.setSettingsTab,
		settingsTab: navigationState.settingsTab,
		showAdministrationTopActions: navigationState.showAdministrationTopActions,
		showDoctorVisitShortcut: navigationState.showDoctorVisitShortcut,
		isDoctorShiftCockpitOpen: navigationState.isDoctorShiftCockpitOpen,
		openDoctorShiftCockpit: navigationState.openDoctorShiftCockpit,
		closeDoctorShiftCockpit: navigationState.closeDoctorShiftCockpit,
		toggleDoctorShiftCockpit: navigationState.toggleDoctorShiftCockpit,
		visibleRecommendedActions: navigationState.visibleRecommendedActions,
		visibleScheduleSuggestions: navigationState.visibleScheduleSuggestions,
		acceptDraftToVisit: clinicalSession.acceptDraftToVisit,
		scrollToVisitArea: clinicalSession.scrollToVisitArea,
		toothRows: clinicalSession.toothRows,
		setToothState: clinicalSession.setToothState,
		updateVisitNoteField: clinicalSession.updateVisitNoteField,
		visitCloseChecklist: clinicalSession.visitCloseChecklist,
		visitDraftBuildMissingSteps: clinicalSession.visitDraftBuildMissingSteps,
		visitDraftReadyToBuild: clinicalSession.visitDraftReadyToBuild,
		visitDraftUserEditedRef: clinicalSession.visitDraftUserEditedRef,
		visitNoteAcceptMissingSteps: clinicalSession.visitNoteAcceptMissingSteps,
		visitNoteActionLabel: clinicalSession.visitNoteActionLabel,
		visitNoteForm: clinicalSession.visitNoteForm,
		visitNoteReadyToAccept: clinicalSession.visitNoteReadyToAccept,
		visitNoteStatusLabel: clinicalSession.visitNoteStatusLabel,
		visitWarnings: clinicalSession.visitWarnings,
		renderClinicalToothRowsEditor: clinicalSession.renderClinicalToothRowsEditor,
	};
}
