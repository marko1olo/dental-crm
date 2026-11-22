/**
 * DENTE CRM — App Logic Legacy Bridge (Layer 2)
 *
 * Adapters, normalizers, and fallback signatures for backward compatibility.
 */

import type { CommunicationTask, Dashboard, Patient, DocumentIngestionTarget } from "@dental/shared";
import type { AppStore } from "../../../../store/appStore.js";
import type { ClinicalSessionLogicSlice, NavigationStateSlice } from "../../types.js";
import {
	type ClinicProfileDraft,
	clinicLegalMissingFields,
	clinicLegalReadinessPercent,
} from "../../../../AppHelpers";
import type { LegacyStubsAndFallbacks, ProfileAndLegalCompatibility, AppLogicCompatibilityInputParams } from "./appLogicCompatibilityTypes.js";

export function buildProfileAndLegalHelpers(
	appStore: AppStore | Record<string, unknown>,
): ProfileAndLegalCompatibility {
	const store = appStore as Record<string, unknown>;
	const dashboard = store.dashboard as Dashboard | null | undefined;
	const setClinicProfileDraft = store.setClinicProfileDraft as ((updater: (prev: ClinicProfileDraft) => ClinicProfileDraft) => void) | undefined;
	const setClinicProfileDirty = store.setClinicProfileDirty as ((dirty: boolean) => void) | undefined;

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
		if (typeof setClinicProfileDraft === "function") {
			setClinicProfileDraft((prev: ClinicProfileDraft) => ({ ...prev, [field]: value }));
		}
		if (typeof setClinicProfileDirty === "function") {
			setClinicProfileDirty(true);
		}
	};

	return {
		legalMissingFields,
		legalReadinessPercent,
		updateClinicProfileDraft,
	};
}

export function buildLegacyStubsAndFallbacks(): LegacyStubsAndFallbacks {
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
		documentIngestionTarget: "smart_import",
		setDocumentIngestionTarget: (_target: DocumentIngestionTarget) => {},
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

export function buildLegacyNormalizers(
	appLogicBag: Record<string, unknown>,
): Record<string, (val: unknown) => unknown> {
	const getFn = (name: string): ((val: unknown) => unknown) => {
		const fn = appLogicBag[name];
		if (typeof fn === "function") {
			return fn as (val: unknown) => unknown;
		}
		return (v: unknown) => v;
	};

	return {
		normalizeOptionalWorkingDaysDraft: getFn("normalizeOptionalWorkingDaysDraft"),
		normalizeUiLanguageInput: getFn("normalizeUiLanguageInput"),
		normalizedAppointmentStatus: getFn("normalizedAppointmentStatus"),
		normalizedAppointmentStatusFilter: getFn("normalizedAppointmentStatusFilter"),
		normalizedClinicalRuleAction: getFn("normalizedClinicalRuleAction"),
		normalizedClinicalRuleSeverity: getFn("normalizedClinicalRuleSeverity"),
		normalizedDentalSpecialty: getFn("normalizedDentalSpecialty"),
		normalizedDocumentIssueSignatureMode: getFn("normalizedDocumentIssueSignatureMode"),
		normalizedDocumentKind: getFn("normalizedDocumentKind"),
		normalizedDocumentVoidReasonCode: getFn("normalizedDocumentVoidReasonCode"),
		normalizedMedicalDocumentReleaseChannel: getFn("normalizedMedicalDocumentReleaseChannel"),
		normalizedPatientIntakePregnancyStatus: getFn("normalizedPatientIntakePregnancyStatus"),
		normalizedPaymentRefundCorrectionAction: getFn("normalizedPaymentRefundCorrectionAction"),
		normalizedPaymentRefundCorrectionMethod: getFn("normalizedPaymentRefundCorrectionMethod"),
		normalizedPostVisitCareTopic: getFn("normalizedPostVisitCareTopic"),
		normalizedProcedureSpecificConsentProcedure: getFn("normalizedProcedureSpecificConsentProcedure"),
		normalizedServiceCategory: getFn("normalizedServiceCategory"),
		normalizedStaffRole: getFn("normalizedStaffRole"),
		normalizedTaxApplicationDeliveryChannel: getFn("normalizedTaxApplicationDeliveryChannel"),
		normalizedTaxApplicationForm: getFn("normalizedTaxApplicationForm"),
		normalizedTaxApplicationRelationshipSelect: getFn("normalizedTaxApplicationRelationshipSelect"),
		normalizedTreatmentPlanAcceptanceVariant: getFn("normalizedTreatmentPlanAcceptanceVariant"),
		normalizedXrayPregnancyStatus: getFn("normalizedXrayPregnancyStatus"),
		normalizedXrayPriority: getFn("normalizedXrayPriority"),
		normalizedXrayStudyType: getFn("normalizedXrayStudyType"),
	};
}

export function sortCommunicationTasks(
	tasks: CommunicationTask[] | null | undefined,
): CommunicationTask[] {
	const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
	return (tasks ?? []).slice().sort((a, b) => {
		const pA = priorityOrder[a.priority ?? ""] ?? 2;
		const pB = priorityOrder[b.priority ?? ""] ?? 2;
		if (pA !== pB) return pA - pB;
		return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
	});
}

export function buildLegacyPatientFields(
	documentPatient: Patient | null | undefined,
	dashboard: Dashboard | null | undefined,
): Record<string, unknown> {
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

export function buildLegacyFieldBindings(params: AppLogicCompatibilityInputParams | {
	readonly scheduleLogic?: Record<string, unknown> | null | undefined;
	readonly billingModal?: Record<string, unknown> | null | undefined;
	readonly [key: string]: unknown;
}): Record<string, unknown> {
	const scheduleLogic = (params.scheduleLogic ?? {}) as Record<string, unknown>;
	const billingModal = (params.billingModal ?? {}) as Record<string, unknown>;
	const chairScheduleDirty = scheduleLogic.chairScheduleDirtyIds;
	const chairScheduleDirtyIds =
		chairScheduleDirty instanceof Set
			? chairScheduleDirty
			: new Set(Array.isArray(chairScheduleDirty) ? chairScheduleDirty : []);

	const staffScheduleDirty = scheduleLogic.staffScheduleDirtyIds;
	const staffScheduleDirtyIds =
		staffScheduleDirty instanceof Set
			? staffScheduleDirty
			: new Set(Array.isArray(staffScheduleDirty) ? staffScheduleDirty : []);

	return {
		chairScheduleDirtyIds,
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
		staffScheduleDirtyIds,
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

export function buildLegacyAppStoreBindings(appStore: AppStore | Record<string, unknown>): Record<string, unknown> {
	const store = appStore as Record<string, unknown>;
	return {
		clinicProfileDraft: store.clinicProfileDraft,
		clinicProfileSaveState: store.clinicProfileSaveState,
		communicationNote: store.communicationNote,
		communicationSavingTaskId: store.communicationSavingTaskId,
		error: store.error,
		isClinicalRuleSaving: store.isClinicalRuleSaving,
		isPricelistAnalyzing: store.isPricelistAnalyzing,
		newRuleAction: store.newRuleAction,
		newRuleBlockedServiceId: store.newRuleBlockedServiceId,
		newRuleCategory: store.newRuleCategory,
		newRuleCompletedServiceId: store.newRuleCompletedServiceId,
		newRuleOwnerRole: store.newRuleOwnerRole,
		newRuleRequiredServiceId: store.newRuleRequiredServiceId,
		newRuleSeverity: store.newRuleSeverity,
		newRuleSpecialty: store.newRuleSpecialty,
		newRuleTitle: store.newRuleTitle,
		newRuleTriggerServiceId: store.newRuleTriggerServiceId,
		newRuleWarningText: store.newRuleWarningText,
		newRulePatientText: store.newRulePatientText,
		ohifBaseUrl: store.ohifBaseUrl,
		pricelistAnalysis: store.pricelistAnalysis,
		pricelistImageBase64: store.pricelistImageBase64,
		pricelistImageName: store.pricelistImageName,
		pricelistImageNote: store.pricelistImageNote,
		pricelistSourceKind: store.pricelistSourceKind,
		pricelistText: store.pricelistText,
		recognitionJob: store.recognitionJob,
		recognitionKind: store.recognitionKind,
		recognitionTarget: store.recognitionTarget,
		recognitionText: store.recognitionText,
		releaseProtectionNote: store.releaseProtectionNote,
		setCommunicationNote: store.setCommunicationNote,
		setError: store.setError,
		setNewRuleAction: store.newRuleAction,
		setNewRuleBlockedServiceId: store.newRuleBlockedServiceId,
		setNewRuleCategory: store.newRuleCategory,
		setNewRuleCompletedServiceId: store.newRuleCompletedServiceId,
		setNewRuleOwnerRole: store.newRuleOwnerRole,
		setNewRuleRequiredServiceId: store.newRuleRequiredServiceId,
		setNewRuleSeverity: store.newRuleSeverity,
		setNewRuleSpecialty: store.newRuleSpecialty,
		setNewRuleTitle: store.newRuleTitle,
		setNewRuleTriggerServiceId: store.newRuleTriggerServiceId,
		setNewRuleWarningText: store.newRuleWarningText,
		setNewRulePatientText: store.newRulePatientText,
		setPricelistAnalysis: store.setPricelistAnalysis,
		setPricelistSourceKind: store.setPricelistSourceKind,
		setPricelistText: store.setPricelistText,
		setRecognitionJob: store.recognitionJob,
		setRecognitionText: store.recognitionText,
		setReleaseProtectionNote: store.releaseProtectionNote,
		setUiLanguage: store.setUiLanguage,
		setUiPreferencesSyncError: store.setUiPreferencesSyncError,
		setUsePricelistAi: store.usePricelistAi,
		uiLanguage: store.uiLanguage,
		uiPreferencesSyncError: store.uiPreferencesSyncError,
		usePricelistAi: store.usePricelistAi,
	};
}

export function buildLegacyNavigationAndClinicalBindings(
	clinicalSession: ClinicalSessionLogicSlice | Record<string, unknown>,
	navigationState: NavigationStateSlice | Record<string, unknown>,
): Record<string, unknown> {
	const session = clinicalSession as Record<string, unknown>;
	const nav = navigationState as Record<string, unknown>;
	return {
		currentView: nav.currentView,
		activeRolePolicy: nav.activeRolePolicy,
		activeRoleQueue: nav.activeRoleQueue,
		activeRoleRestrictedSections: nav.activeRoleRestrictedSections,
		activeRoleWritableSections: nav.activeRoleWritableSections,
		activeSettingsTabButtonRef: nav.activeSettingsTabButtonRef,
		setCurrentView: nav.setCurrentView,
		setSelectedWorkspaceRole: nav.setSelectedWorkspaceRole,
		setSettingsTab: nav.setSettingsTab,
		settingsTab: nav.settingsTab,
		showAdministrationTopActions: nav.showAdministrationTopActions,
		showDoctorVisitShortcut: nav.showDoctorVisitShortcut,
		isDoctorShiftCockpitOpen: nav.isDoctorShiftCockpitOpen,
		openDoctorShiftCockpit: nav.openDoctorShiftCockpit,
		closeDoctorShiftCockpit: nav.closeDoctorShiftCockpit,
		toggleDoctorShiftCockpit: nav.toggleDoctorShiftCockpit,
		visibleRecommendedActions: nav.visibleRecommendedActions,
		visibleScheduleSuggestions: nav.visibleScheduleSuggestions,
		acceptDraftToVisit: session.acceptDraftToVisit,
		scrollToVisitArea: session.scrollToVisitArea,
		toothRows: session.toothRows,
		setToothState: session.setToothState,
		updateVisitNoteField: session.updateVisitNoteField,
		visitCloseChecklist: session.visitCloseChecklist,
		visitDraftBuildMissingSteps: session.visitDraftBuildMissingSteps,
		visitDraftReadyToBuild: session.visitDraftReadyToBuild,
		visitDraftUserEditedRef: session.visitDraftUserEditedRef,
		visitNoteAcceptMissingSteps: session.visitNoteAcceptMissingSteps,
		visitNoteActionLabel: session.visitNoteActionLabel,
		visitNoteForm: session.visitNoteForm,
		visitNoteReadyToAccept: session.visitNoteReadyToAccept,
		visitNoteStatusLabel: session.visitNoteStatusLabel,
		visitWarnings: session.visitWarnings,
		renderClinicalToothRowsEditor: session.renderClinicalToothRowsEditor,
	};
}
