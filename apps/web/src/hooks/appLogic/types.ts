import type {
	CommunicationTaskOutcome,
	Dashboard,
	DentalPricelistAnalysisResponse,
	DenteTelegramChatLinkPublic,
	ImagingStudyKind,
	ImportCommitResponse,
	ImportIntakeResponse,
	LocalBridgeReadinessResponse,
	LocalBridgeUsePlansResponse,
	StaffRole,
} from "@dental/shared";
import type {
	AppointmentScheduleDraft,
	ClinicProfileDraft,
	OnboardingStep,
	PersistenceHealth,
	PersistenceIntegrityReport,
	StaffScheduleDraft,
	UiPreferences,
	VisitNoteForm,
} from "../../AppHelpers";
import type { AppView } from "../../utils/routeUtils";

export type UseAppLogicReturn = Record<string, any>;

export interface NavigationStateSlice {
	currentView: AppView;
	setCurrentView: (view: AppView) => void;
	settingsTab: string;
	setSettingsTab: (tab: string) => void;
	selectedWorkspaceRole: StaffRole | "all";
	setSelectedWorkspaceRole: (role: StaffRole | "all") => void;
	activeSettingsTabButtonRef: React.RefObject<HTMLButtonElement | null>;
	showAdministrationTopActions: boolean;
	showDoctorVisitShortcut: boolean;
	isDoctorShiftCockpitOpen: boolean;
	openDoctorShiftCockpit: () => void;
	closeDoctorShiftCockpit: () => void;
	toggleDoctorShiftCockpit: () => void;
	activeRolePolicy: any;
	activeRoleQueue: any;
	activeRoleWritableSections: any;
	activeRoleRestrictedSections: any;
	uncoveredStaffRoles: any[];
	roleRecommendedActions: any[];
	visibleRecommendedActions: any[];
	roleScheduleSuggestions: any[];
	visibleScheduleSuggestions: any[];
	navigationRouter: any;
}

export interface PatientSelectionStateSlice {
	query: string;
	setQuery: (query: string) => void;
	selectedPatientId: string | null;
	setSelectedPatientId: (id: any) => void;
	selectedPatient: any;
	activePatient: any;
	activeVisitPatient: any;
	activePatientCallablePhone: string;
	activePatientHasCallablePhone: boolean;
	activePatientInsight: any;
	savePatientCore: (payload: any) => Promise<any>;
	createPatient: (payload: any) => Promise<any>;
	updatePatientCoreDraft: any;
	updatePatientAdministrativeProfileDraft: any;
	patient: any;
	patientIntakeLogic: any;
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
	activeAppointment: any;
	activeDoctor: any;
	todayDoctorSlots: any[];
	activeChair: any;
	sortedAppointments: any[];
	appointmentReadinessById: Record<string, any>;
	scheduleAdminSecretDraft: string;
	scheduleAdminSecretSession: string;
	updateAppointmentScheduleDraft: any;
	updateChairScheduleDay: any;
	updateChairScheduleDraft: any;
	updateNewAppointmentDraft: any;
	updateStaffScheduleDay: any;
	updateStaffScheduleDraft: any;
	toggleChairWorkingDay: any;
	toggleClinicWorkingDay: any;
	toggleStaffWorkingDay: any;
	staffScheduleDrafts: Record<string, StaffScheduleDraft>;
	staffScheduleSaveStates: Record<string, any>;
	staffScheduleSavingId: string | null;
	saveStaffSchedule: any;
	schedule: any;
	scheduleFilterController: any;
}

export interface ClinicalSessionLogicSlice {
	clinicalVisitLogic: any;
	odontogramUseSurfaces: boolean;
	setOdontogramUseSurfaces: (val: boolean) => void;
	odontogramViewMode: string;
	setOdontogramViewMode: (mode: any) => void;
	toothRows: any;
	toothStateByCode: Record<string, any>;
	setToothState: (code: string, state: any) => void;
	renderClinicalToothRowsEditor: (props: any) => React.ReactNode;
	visitNoteForm: VisitNoteForm;
	updateVisitNoteField: (field: string, value: any) => void;
	visitWarnings: any[];
	visitCloseChecklist: any[];
	visitDraftBuildMissingSteps: string[];
	visitDraftMissingFieldLabel: (field: string) => string;
	visitDraftQualityLabels: Record<string, string>;
	visitDraftReadyToBuild: boolean;
	visitDraftSignalLabel: (signal: string) => string;
	visitDraftUserEditedRef: React.RefObject<boolean>;
	visitNoteAcceptMissingSteps: string[];
	visitNoteActionLabel: string;
	visitNoteFieldDefinitions: any[];
	visitNoteReadyToAccept: boolean;
	visitNoteStatusLabel: string;
	visitSaveReceiptText: any;
	acceptDraftToVisit: () => Promise<void>;
	scrollToVisitArea: (areaId: string) => void;
}

export interface BillingModalLogicSlice {
	finance: any;
	paymentAmount: any;
	setPaymentAmount: any;
	paymentMethod: any;
	setPaymentMethod: any;
	paymentFeedback: any;
	setPaymentFeedback: any;
	activePayments: any[];
	activeTreatmentPlanItems: any[];
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
	paymentTaxDeductionCode: any;
	setPaymentTaxDeductionCode: any;
	selectedPaymentReceiptTotalRub: number;
	selectedTaxPaymentTotalRub: number;
}

export interface ModalControllerSlice {
	modalOrchestrator: any;
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
	dismissOnboarding: () => void;
	continueOnboardingInDraftMode: () => void;
	moveOnboardingTo: (step: OnboardingStep) => void;
	reopenOnboarding: () => void;
	openOnboardingGuide: () => void;
	showFullOnboardingGuide: boolean;
	onboardingFirstAppointmentIssues: any[];
	onboardingDocumentReadinessIssues: any[];
	onboardingBlockingIssues: any[];
	onboardingTelegramRecommendations: any[];
	onboardingReadyToFinish: boolean;
	onboardingDocumentsReady: boolean;
	onboardingStaffCreateGuidanceId: string | null;
	onboardingChairCreateGuidanceId: string | null;
	onboardingFinishGuidanceId: string | null;
	currentOnboardingIndex: number;
	previousOnboardingStep: any;
	nextOnboardingStep: any;
}

export interface OfflineSyncLogicSlice {
	isOnline: boolean;
	setIsOnline: (val: boolean) => void;
	localAutosaveReady: boolean;
	setLocalAutosaveReady: (val: boolean) => void;
	lastLocalSavedAt: string | null;
	setLastLocalSavedAt: (val: string | null) => void;
	browserContinuity: any;
	setBrowserContinuity: (val: any) => void;
	persistenceHealth: PersistenceHealth | null;
	setPersistenceHealth: (val: PersistenceHealth | null) => void;
	persistenceIntegrity: PersistenceIntegrityReport | null;
	setPersistenceIntegrity: (val: PersistenceIntegrityReport | null) => void;
	isPersistenceExporting: boolean;
	setIsPersistenceExporting: (val: boolean) => void;
	loadPersistenceHealth: () => Promise<void>;
	loadPersistenceIntegrity: () => Promise<void>;
	downloadPersistenceExport: () => Promise<void>;
	refreshBrowserContinuity: () => Promise<void>;
	requestBrowserStoragePersistence: () => Promise<void>;
	localBridgeReadiness: LocalBridgeReadinessResponse | null;
	setLocalBridgeReadiness: (val: LocalBridgeReadinessResponse | null) => void;
	localBridgeUsePlans: LocalBridgeUsePlansResponse | null;
	setLocalBridgeUsePlans: (val: LocalBridgeUsePlansResponse | null) => void;
	loadLocalBridgeUsePlans: () => Promise<void>;
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
	documentWorkflow: any;
	dicomWorkbenchModule: any;
	telegram: any;
	telegramSettingsModule: any;
	visibleImagingStudies: any[];
	mprProjectionCompass: any;
	mprAxisGuidance: any;
}
