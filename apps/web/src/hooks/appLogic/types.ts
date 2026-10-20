import type {
	CommunicationTaskOutcome,
	Dashboard,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	OdontogramViewMode,
	StaffRole,
	VisitCloseChecklistItem,
} from "@dental/shared";
import type React from "react";
import type {
	OnboardingStep,
	onboardingSteps,
	PersistenceHealth,
	PersistenceIntegrityReport,
	StaffScheduleDraft,
	toothRows,
	VisitNoteField,
	VisitNoteForm,
	visitDraftMissingFieldLabel,
	visitDraftQualityLabels,
	visitDraftSignalLabel,
	visitNoteFieldDefinitions,
	visitSaveReceiptText,
} from "../../AppHelpers";
import type { ImagingStore } from "../../store/imagingStore";
import type { BrowserContinuityStatus } from "../../browserContinuity";
import type {
	buildMprAxisGuidance,
	mprProjectionCompassLabels,
} from "../../mprControlMath";
import type { ToothState } from "../../store/visit/types";
import type { AppView, SettingsTab } from "../../utils/routeUtils";
import type { useClinicalVisitLogic } from "../domains/useClinicalVisitLogic";
import type { useDicomWorkbenchModule } from "../domains/useDicomWorkbenchModule";
import type { useDocumentWorkflowModule } from "../domains/useDocumentWorkflowModule";
import type { useFinanceLogic } from "../domains/useFinanceLogic";
import type { useModalOrchestrator } from "../domains/useModalOrchestrator";
import type { useNavigationRouter } from "../domains/useNavigationRouter";
import type { usePatientIntakeLogic } from "../domains/usePatientIntakeLogic";
import type { usePatientLogic } from "../domains/usePatientLogic";
import type { useScheduleFilterController } from "../domains/useScheduleFilterController";
import type { useScheduleLogic as useDomainScheduleLogic } from "../domains/useScheduleLogic";
import type { useScheduleSettingsLogic } from "../domains/useScheduleSettingsLogic";
import type { useTelegramModule } from "../domains/useTelegramModule";

type PatientLogicReturn = ReturnType<typeof usePatientLogic>;
type PatientIntakeLogicReturn = ReturnType<typeof usePatientIntakeLogic>;
type DomainScheduleLogicReturn = ReturnType<typeof useDomainScheduleLogic>;
type ScheduleFilterControllerReturn = ReturnType<
	typeof useScheduleFilterController
>;
type ScheduleSettingsLogicReturn = ReturnType<typeof useScheduleSettingsLogic>;
type ClinicalVisitLogicReturn = ReturnType<typeof useClinicalVisitLogic>;
type FinanceLogicReturn = ReturnType<typeof useFinanceLogic>;
type ModalOrchestratorReturn = ReturnType<typeof useModalOrchestrator>;
type DocumentWorkflowReturn = ReturnType<typeof useDocumentWorkflowModule>;
type DicomWorkbenchReturn = ReturnType<typeof useDicomWorkbenchModule>;
type TelegramModuleReturn = ReturnType<typeof useTelegramModule>;
type NavigationRouterReturn = ReturnType<typeof useNavigationRouter>;

export interface NavigationStateSlice {
	currentView: AppView;
	setCurrentView: (view: AppView | ((prev: AppView) => AppView)) => void;
	settingsTab: SettingsTab | string;
	setSettingsTab: (
		tab: SettingsTab | string | ((prev: string) => string),
	) => void;
	selectedWorkspaceRole: StaffRole;
	setSelectedWorkspaceRole: (role: StaffRole) => void;
	activeSettingsTabButtonRef: React.RefObject<HTMLButtonElement | null>;
	showAdministrationTopActions: boolean;
	showDoctorVisitShortcut: boolean;
	isDoctorShiftCockpitOpen: boolean;
	openDoctorShiftCockpit: () => void;
	closeDoctorShiftCockpit: () => void;
	toggleDoctorShiftCockpit: () => void;
	activeRolePolicy:
		| Dashboard["clinicSettings"]["roleAccessPolicies"][number]
		| undefined;
	activeRoleQueue:
		| Dashboard["shiftIntelligence"]["roleQueues"][number]
		| undefined;
	activeRoleWritableSections: Dashboard["clinicSettings"]["roleAccessPolicies"][number]["canWrite"];
	activeRoleRestrictedSections: Dashboard["clinicSettings"]["roleAccessPolicies"][number]["restricted"];
	uncoveredStaffRoles: string[];
	roleRecommendedActions: Dashboard["recommendedActions"];
	visibleRecommendedActions: Dashboard["recommendedActions"];
	roleScheduleSuggestions: Dashboard["scheduleSuggestions"];
	visibleScheduleSuggestions: Dashboard["scheduleSuggestions"];
	navigationRouter: NavigationRouterReturn;
}

export interface PatientSelectionStateSlice {
	query: string;
	setQuery: (query: string) => void;
	selectedPatientId: PatientLogicReturn["selectedPatientId"];
	setSelectedPatientId: PatientLogicReturn["setSelectedPatientId"];
	selectedPatient: PatientLogicReturn["selectedPatient"];
	activePatient: PatientLogicReturn["activePatient"];
	activeVisitPatient: PatientLogicReturn["activeVisitPatient"];
	activePatientCallablePhone: string;
	activePatientHasCallablePhone: boolean;
	activePatientInsight: PatientLogicReturn["activePatientInsight"];
	savePatientCore: PatientLogicReturn["savePatientCore"];
	createPatient: PatientLogicReturn["createPatient"];
	updatePatientCoreDraft: PatientLogicReturn["updatePatientCoreDraft"];
	updatePatientAdministrativeProfileDraft: PatientLogicReturn["updatePatientAdministrativeProfileDraft"];
	patient: PatientLogicReturn;
	patientIntakeLogic: PatientIntakeLogicReturn;
}

export interface ScheduleLogicSlice {
	editingAppointmentId: string | null;
	setEditingAppointmentId: (id: string | null) => void;
	newAppointmentError: string | null;
	setNewAppointmentError: (err: string | null) => void;
	newChairName: string;
	setNewChairName: (name: string) => void;
	newChairHasXraySensor: boolean;
	setNewChairHasXraySensor: (val: boolean) => void;
	newChairHasMicroscope: boolean;
	setNewChairHasMicroscope: (val: boolean) => void;
	newChairHasSurgeryKit: boolean;
	setNewChairHasSurgeryKit: (val: boolean) => void;
	newStaffName: string;
	setNewStaffName: (name: string) => void;
	newStaffRole: StaffRole;
	setNewStaffRole: (role: StaffRole) => void;
	newStaffSpecialty: string;
	setNewStaffSpecialty: (spec: string) => void;
	activeAppointment: Dashboard["appointments"][number] | null;
	activeDoctor: Dashboard["clinicSettings"]["staff"][number] | null;
	todayDoctorSlots: Array<{ endsAt: string }>;
	activeChair: Dashboard["clinicSettings"]["chairs"][number] | null;
	sortedAppointments: Dashboard["appointments"];
	appointmentReadinessById: Record<string, { isReady: boolean }>;
	scheduleAdminSecretDraft: string;
	scheduleAdminSecretSession: string;
	updateAppointmentScheduleDraft: DomainScheduleLogicReturn["updateAppointmentScheduleDraft"];
	updateChairScheduleDay: DomainScheduleLogicReturn["updateChairScheduleDay"];
	updateChairScheduleDraft: DomainScheduleLogicReturn["updateChairScheduleDraft"];
	updateNewAppointmentDraft: DomainScheduleLogicReturn["updateNewAppointmentDraft"];
	updateStaffScheduleDay: DomainScheduleLogicReturn["updateStaffScheduleDay"];
	updateStaffScheduleDraft: DomainScheduleLogicReturn["updateStaffScheduleDraft"];
	toggleChairWorkingDay: ScheduleSettingsLogicReturn["toggleChairWorkingDay"];
	toggleClinicWorkingDay: ScheduleSettingsLogicReturn["toggleClinicWorkingDay"];
	toggleStaffWorkingDay: ScheduleSettingsLogicReturn["toggleStaffWorkingDay"];
	staffScheduleDrafts: Record<string, StaffScheduleDraft>;
	staffScheduleSaveStates: DomainScheduleLogicReturn["staffScheduleSaveStates"];
	staffScheduleSavingId: string | null;
	saveStaffSchedule: DomainScheduleLogicReturn["saveStaffSchedule"];
	schedule: DomainScheduleLogicReturn;
	scheduleFilterController: ScheduleFilterControllerReturn;
}

export interface ClinicalSessionLogicSlice {
	clinicalVisitLogic: ClinicalVisitLogicReturn;
	odontogramUseSurfaces: boolean;
	setOdontogramUseSurfaces: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	odontogramViewMode: OdontogramViewMode;
	setOdontogramViewMode: (
		mode: OdontogramViewMode | ((prev: OdontogramViewMode) => OdontogramViewMode),
	) => void;
	toothRows: typeof toothRows;
	toothStateByCode: Record<string, ToothState>;
	setToothState: (code: string, state: ToothState) => void;
	renderClinicalToothRowsEditor: (
		props?: Record<string, unknown>,
	) => React.ReactNode;
	visitNoteForm: VisitNoteForm;
	updateVisitNoteField: (field: VisitNoteField | string, value: string) => void;
	visitWarnings: VisitCloseChecklistItem[];
	visitCloseChecklist: Dashboard["visitCloseChecklist"] | null;
	visitDraftBuildMissingSteps: string[];
	visitDraftMissingFieldLabel: typeof visitDraftMissingFieldLabel;
	visitDraftQualityLabels: typeof visitDraftQualityLabels;
	visitDraftReadyToBuild: boolean;
	visitDraftSignalLabel: typeof visitDraftSignalLabel;
	visitDraftUserEditedRef: { current: boolean };
	visitNoteAcceptMissingSteps: string[];
	visitNoteActionLabel: string;
	visitNoteFieldDefinitions: typeof visitNoteFieldDefinitions;
	visitNoteReadyToAccept: boolean;
	visitNoteStatusLabel: string;
	visitSaveReceiptText: typeof visitSaveReceiptText;
	acceptDraftToVisit: () => Promise<void>;
	scrollToVisitArea: (areaId: string) => void;
}

export interface BillingModalLogicSlice {
	finance: FinanceLogicReturn;
	paymentAmount: FinanceLogicReturn["paymentAmount"];
	setPaymentAmount: FinanceLogicReturn["setPaymentAmount"];
	paymentMethod: FinanceLogicReturn["paymentMethod"];
	setPaymentMethod: FinanceLogicReturn["setPaymentMethod"];
	paymentFeedback: FinanceLogicReturn["paymentFeedback"];
	setPaymentFeedback: FinanceLogicReturn["setPaymentFeedback"];
	activePayments: Dashboard["payments"];
	activeTreatmentPlanItems: Dashboard["treatmentPlanItems"];
	paymentFiscalCashierName: string;
	setPaymentFiscalCashierName: (val: string) => void;
	paymentFiscalFd: string;
	setPaymentFiscalFd: (val: string) => void;
	paymentFiscalFn: string;
	setPaymentFiscalFn: (val: string) => void;
	paymentFiscalFpd: string;
	setPaymentFiscalFpd: (val: string) => void;
	paymentFiscalReceiptIssuedAt: string;
	setPaymentFiscalReceiptIssuedAt: (val: string) => void;
	paymentFiscalReceiptNumber: string;
	setPaymentFiscalReceiptNumber: (val: string) => void;
	paymentFiscalReceiptUrl: string;
	setPaymentFiscalReceiptUrl: (val: string) => void;
	paymentPayerBirthDate: string;
	setPaymentPayerBirthDate: (val: string) => void;
	paymentPayerFullName: string;
	setPaymentPayerFullName: (val: string) => void;
	paymentPayerIdentityDocument: string;
	setPaymentPayerIdentityDocument: (val: string) => void;
	paymentPayerInn: string;
	setPaymentPayerInn: (val: string) => void;
	paymentPayerRelationship: string;
	setPaymentPayerRelationship: (val: string) => void;
	paymentTaxDeductionCode: FinanceLogicReturn["paymentTaxDeductionCode"];
	setPaymentTaxDeductionCode: FinanceLogicReturn["setPaymentTaxDeductionCode"];
	selectedPaymentReceiptTotalRub: number;
	selectedTaxPaymentTotalRub: number;
}

export interface ModalControllerSlice {
	modalOrchestrator: ModalOrchestratorReturn;
	accessUnlockRequired: boolean;
	setAccessUnlockRequired: (val: boolean) => void;
	accessUnlockMessage: string;
	setAccessUnlockMessage: (val: string) => void;
	clinicalAdminSecretDraft: string;
	setClinicalAdminSecretDraft: (val: string) => void;
	settingsAdminSecretDraft: string;
	setSettingsAdminSecretDraft: (val: string) => void;
	settingsAdminSecretSession: string;
	onboardingDismissed: boolean;
	setOnboardingDismissed: (val: boolean) => void;
	onboardingDismissedAt: string | null;
	setOnboardingDismissedAt: (val: string | null) => void;
	onboardingStep: OnboardingStep;
	setOnboardingStep: (step: OnboardingStep) => void;
	onboardingDraftMode: boolean;
	setOnboardingDraftMode: (val: boolean) => void;
	onboardingGuideExpanded: boolean;
	setOnboardingGuideExpanded: (val: boolean) => void;
	dismissOnboarding: () => Promise<void> | void;
	continueOnboardingInDraftMode: (targetView?: AppView) => Promise<void> | void;
	moveOnboardingTo: (step: OnboardingStep) => Promise<void> | void;
	reopenOnboarding: () => void;
	openOnboardingGuide: (step?: OnboardingStep) => void;
	showFullOnboardingGuide: boolean;
	onboardingFirstAppointmentIssues: string[];
	onboardingDocumentReadinessIssues: string[];
	onboardingBlockingIssues: string[];
	onboardingTelegramRecommendations: string[];
	onboardingReadyToFinish: boolean;
	onboardingDocumentsReady: boolean;
	onboardingStaffCreateGuidanceId: string | null;
	onboardingChairCreateGuidanceId: string | null;
	onboardingFinishGuidanceId: string | null;
	currentOnboardingIndex: number;
	previousOnboardingStep:
		| (typeof onboardingSteps)[number]
		| null
		| undefined;
	nextOnboardingStep: (typeof onboardingSteps)[number] | null | undefined;
}

export interface OfflineSyncLogicSlice {
	isOnline: boolean;
	setIsOnline: (val: boolean | ((prev: boolean) => boolean)) => void;
	localAutosaveReady: boolean;
	setLocalAutosaveReady: (val: boolean) => void;
	lastLocalSavedAt: string | null;
	setLastLocalSavedAt: (val: string | null) => void;
	browserContinuity: BrowserContinuityStatus | null;
	setBrowserContinuity: (val: BrowserContinuityStatus | null) => void;
	persistenceHealth: PersistenceHealth | null;
	setPersistenceHealth: (val: PersistenceHealth | null) => void;
	persistenceIntegrity: PersistenceIntegrityReport | null;
	setPersistenceIntegrity: (val: PersistenceIntegrityReport | null) => void;
	isPersistenceExporting: boolean;
	setIsPersistenceExporting: (val: boolean) => void;
	loadPersistenceHealth: (options?: {
		silent?: boolean;
		adminSecret?: string | undefined;
	}) => Promise<void>;
	loadPersistenceIntegrity: (options?: { silent?: boolean }) => Promise<void>;
	downloadPersistenceExport: () => Promise<void>;
	refreshBrowserContinuity: (options?: { silent?: boolean }) => Promise<void>;
	requestBrowserStoragePersistence: () => Promise<void>;
	localBridgeReadiness: LocalBridgeReadinessResponse | null;
	setLocalBridgeReadiness: (val: LocalBridgeReadinessResponse | null) => void;
	localBridgeUsePlans: LocalBridgeUsePlansResponse | null;
	setLocalBridgeUsePlans: (val: LocalBridgeUsePlansResponse | null) => void;
	loadLocalBridgeUsePlans: (options?: { silent?: boolean }) => Promise<void>;
}

export interface SettingsAndIntegrationsLogicSlice {
	saveClinicProfileFromDraft: () => Promise<boolean>;
	saveClinicProfileIfDirty: () => Promise<boolean>;
	analyzePricelist: () => Promise<void>;
	completeCommunicationTask: (
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) => Promise<void>;
	createClinicalRuleFromSettings: () => Promise<void>;
	documentWorkflow: DocumentWorkflowReturn;
	dicomWorkbenchModule: DicomWorkbenchReturn;
	telegram: TelegramModuleReturn;
	telegramSettingsModule: TelegramModuleReturn["telegramSettingsModule"];
	visibleImagingStudies: Dashboard["imagingStudies"];
	imagingToothFilter: string | "all";
	setImagingToothFilter: (val: string | "all") => void;
	imagingViewerState: ImagingStore["imagingViewerState"];
	setImagingViewerState: ImagingStore["setImagingViewerState"];
	mprProjectionCompass: ReturnType<typeof mprProjectionCompassLabels>;
	mprAxisGuidance: ReturnType<typeof buildMprAxisGuidance>;
}

export type UseAppLogicReturn = NavigationStateSlice &
	PatientSelectionStateSlice &
	ScheduleLogicSlice &
	ClinicalSessionLogicSlice &
	BillingModalLogicSlice &
	ModalControllerSlice &
	OfflineSyncLogicSlice &
	SettingsAndIntegrationsLogicSlice &
	Record<string, unknown>;
