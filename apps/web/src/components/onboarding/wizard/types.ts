import type {
	ClinicMode,
	Dashboard,
	DentalSpecialty,
	DenteTelegramBotStatus,
	DenteTelegramFeature,
	DenteTelegramPostVisitCheckupDelayHoursByTopic,
	DenteTelegramVisualCardKey,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImportSourceKind,
	PricelistSourceKind,
	SmartImportMode,
	StaffRole,
} from "@dental/shared";

export interface OnboardingStepItem {
	id: string;
	title: string;
	detail: string;
}

export interface WeekdayOption {
	value: number;
	label: string;
}

export interface UiLanguageOption {
	value: string;
	label: string;
	detail: string;
}

export interface TelegramPostVisitCheckupDelayField {
	key: keyof DenteTelegramPostVisitCheckupDelayHoursByTopic;
	label: string;
	help: string;
}

export interface TelegramVisualCardField {
	key: DenteTelegramVisualCardKey;
	label: string;
	placeholder: string;
	help: string;
}

export interface DocumentFactoryGroup {
	kinds: readonly unknown[] | unknown[];
}

export interface StaffScheduleDraft {
	start: string;
	end: string;
	workingDays: number[];
}

export interface ClinicProfileDraft {
	clinicName?: string;
	phone?: string;
	timezone?: string;
	defaultVisitMinutes?: string;
	workdayStart?: string;
	workdayEnd?: string;
	appointmentBufferMinutes?: string;
	workingDays?: number[];
	legalName?: string;
	inn?: string;
	kpp?: string;
	ogrn?: string;
	address?: string;
	medicalLicenseNumber?: string;
	medicalLicenseIssuedAt?: string;
	medicalLicenseIssuer?: string;
}

export interface OnboardingWizardModalProps {
	currentOnboardingIndex: number;
	onboardingSteps: readonly OnboardingStepItem[];
	legalReadinessPercent: number;
	continueOnboardingInDraftMode: (targetView?: string) => Promise<void> | void;
	moveOnboardingTo: (step: string) => Promise<void> | void;
	onboardingStep: string;
	onboardingReadyToFinish: boolean;
	onboardingFinishGuidanceId: string;
	onboardingRoleChoices: readonly StaffRole[];
	selectedWorkspaceRole: StaffRole;
	setSelectedWorkspaceRole: (role: StaffRole) => void;
	staffRoleLabels: Record<StaffRole, string>;
	specialtyLabels: Record<DentalSpecialty, string>;
	selectedSpecialty: DentalSpecialty;
	setSelectedSpecialty: (specialty: DentalSpecialty) => void;
	dashboard: Dashboard | null;
	clinicModeLabels: Record<ClinicMode, { title: string; detail: string }>;
	changeClinicMode: (mode: ClinicMode) => void;
	clinicProfileDraft: ClinicProfileDraft;
	updateClinicProfileDraft: (field: string, value: any) => void;
	uiLanguage: string;
	setUiLanguage: (lang: string) => void;
	normalizeUiLanguageInput: (val: string) => string;
	uiLanguageOptions: readonly UiLanguageOption[];
	selectedUiLanguageOption: UiLanguageOption;
	weekdayOptions: readonly WeekdayOption[];
	toggleClinicWorkingDay: (day: number) => void;
	legalMissingFields: readonly string[];
	newStaffName: string;
	setNewStaffName: (name: string) => void;
	newStaffRole: StaffRole;
	setNewStaffRole: (role: StaffRole) => void;
	newStaffSpecialty: DentalSpecialty;
	setNewStaffSpecialty: (specialty: DentalSpecialty) => void;
	addStaffMember: (role?: StaffRole, name?: string) => Promise<void> | void;
	newStaffReadyToCreate: boolean;
	onboardingStaffCreateGuidanceId: string;
	newChairName: string;
	setNewChairName: (name: string) => void;
	addChair: (name?: string) => Promise<void> | void;
	newChairReadyToCreate: boolean;
	onboardingChairCreateGuidanceId: string;
	staffScheduleDrafts: Record<string, StaffScheduleDraft>;
	staffScheduleDraftFromWorkingHours: (hours: unknown) => StaffScheduleDraft;
	staffScheduleSaveStates: Record<string, string>;
	staffScheduleDirtyIds: Set<string>;
	staffScheduleSavingId: string | null;
	updateStaffScheduleDraft: (
		staffId: string,
		patch: Partial<StaffScheduleDraft>,
	) => void;
	toggleStaffWorkingDay: (staffId: string, day: number) => void;
	saveStaffSchedule: (staffId: string) => Promise<void> | void;
	chairScheduleDrafts: Record<string, StaffScheduleDraft>;
	chairScheduleSaveStates: Record<string, string>;
	chairScheduleDirtyIds: Set<string>;
	chairScheduleSavingId: string | null;
	updateChairScheduleDraft: (
		chairId: string,
		patch: Partial<StaffScheduleDraft>,
	) => void;
	toggleChairWorkingDay: (chairId: string, day: number) => void;
	saveChairSchedule: (chairId: string) => Promise<void> | void;
	pricelistSourceKindLabels: Record<PricelistSourceKind, string>;
	pricelistSourceKind: PricelistSourceKind;
	setPricelistSourceKind: (kind: PricelistSourceKind) => void;
	clearPricelistImage: () => void;
	setPricelistAnalysis: (analysis: unknown) => void;
	importSourceLabels: Record<
		ImportSourceKind,
		{ title: string; detail?: string }
	>;
	importSourceKind: ImportSourceKind;
	setImportSourceKind: (kind: ImportSourceKind) => void;
	setImportPreview: (preview: unknown) => void;
	setImportCommit: (commit: unknown) => void;
	smartImportModeLabels: Record<
		SmartImportMode,
		{ title: string; detail?: string }
	>;
	smartImportMode: SmartImportMode;
	setSmartImportMode: (mode: SmartImportMode) => void;
	setSmartImportPreview: (preview: unknown) => void;
	setSmartImportCommit: (commit: unknown) => void;
	ingestionTargetLabels: Record<DocumentIngestionTarget, string>;
	documentIngestionTarget: DocumentIngestionTarget;
	setDocumentIngestionTarget: (target: DocumentIngestionTarget) => void;
	imagingSourceChoices: readonly ImagingSourceKind[];
	imagingImportSourceKind: ImagingSourceKind;
	imagingSourceLabels: Record<ImagingSourceKind, string>;
	setImagingImportSourceKind: (kind: ImagingSourceKind) => void;
	setImagingImportPreview: (preview: unknown) => void;
	setImagingImportCommit: (commit: unknown) => void;
	setDicomSeriesPreview: (preview: unknown) => void;
	dicomWebEndpointUrl: string;
	setDicomWebEndpointUrl: (url: string) => void;
	setDicomWebCheck: (check: unknown) => void;
	setDicomViewerLaunchManifest: (manifest: unknown) => void;
	setDicomViewerToolStateBundle: (bundle: unknown) => void;
	setDicomViewerWorkbenchManifest: (manifest: unknown) => void;
	ohifBaseUrl: string;
	setOhifBaseUrl: (url: string) => void;
	setSettingsTab: (tab: string) => void;
	telegramStatus: DenteTelegramBotStatus | null;
	telegramBotUsernameDraft: string;
	setTelegramBotUsernameDraft: (name: string) => void;
	markTelegramSettingsDirty: () => void;
	telegramPatientPortalBaseUrlDraft: string;
	setTelegramPatientPortalBaseUrlDraft: (url: string) => void;
	telegramWelcomeImageUrlDraft: string;
	setTelegramWelcomeImageUrlDraft: (url: string) => void;
	telegramReviewUrlDraft: string;
	setTelegramReviewUrlDraft: (url: string) => void;
	telegramMapsUrlDraft: string;
	setTelegramMapsUrlDraft: (url: string) => void;
	telegramTokenTtlDraft: string | number;
	setTelegramTokenTtlDraft: (ttl: string) => void;
	telegramReminderLeadTimesDraft: string;
	setTelegramReminderLeadTimesDraft: (times: string) => void;
	telegramReviewRequestDelayDraft: string | number;
	setTelegramReviewRequestDelayDraft: (delay: string) => void;
	telegramPostVisitCheckupDelayFields: readonly TelegramPostVisitCheckupDelayField[];
	telegramPostVisitCheckupDelayDrafts: Record<string, string | number>;
	updateTelegramPostVisitCheckupDelayDraft: (
		key: string,
		value: string | number,
	) => void;
	telegramAdminSecretDraft: string;
	setTelegramAdminSecretDraft: (secret: string) => void;
	unlockTelegramAdminSession: (scope?: string) => Promise<void> | void;
	telegramAdminSecretSession: boolean;
	telegramPrivacyModeDraft: string;
	setTelegramPrivacyModeDraft: (mode: string) => void;
	normalizedTelegramPrivacyMode: (mode: string) => string;
	telegramPrivacyModeLabels: Record<string, string>;
	telegramVisualCardFields: readonly TelegramVisualCardField[];
	onboardingTelegramVisualCardKeys: readonly string[];
	telegramVisualCardUrlDrafts: Record<string, string>;
	updateTelegramVisualCardUrlDraft: (key: string, url: string) => void;
	telegramFeatureOptions: readonly (DenteTelegramFeature | string)[];
	telegramEnabledFeaturesDraft: readonly string[];
	toggleTelegramFeature: (feature: string) => void;
	telegramFeatureLabel: (feature: string) => string;
	saveTelegramSettings: () => Promise<void> | void;
	isTelegramSettingsSaving: boolean;
	telegramSettingsSaveState: string;
	telegramSettingsSaveError: string | null;
	telegramSettingsDirty: boolean;
	documentFactoryGroups: readonly DocumentFactoryGroup[];
	onboardingDocumentsReady: boolean;
	onboardingBlockingIssues: readonly string[];
	onboardingDocumentReadinessIssues: readonly string[];
	onboardingTelegramRecommendations: readonly string[];
	dismissOnboarding: () => void;
	saveClinicProfileFromDraft: () => Promise<void> | void;
	clinicProfileSaveState: string;
	previousOnboardingStep: OnboardingStepItem | null;
	nextOnboardingStep: OnboardingStepItem | null;
	initialShowRapidWizard?: boolean;
}

export type WizardIntroStepProps = Record<string, never>;

export interface WizardRoleStepProps {
	onboardingRoleChoices: readonly StaffRole[];
	selectedWorkspaceRole: StaffRole;
	setSelectedWorkspaceRole: (role: StaffRole) => void;
	staffRoleLabels: Record<StaffRole, string>;
	specialtyLabels: Record<DentalSpecialty, string>;
	selectedSpecialty: DentalSpecialty;
	setSelectedSpecialty: (specialty: DentalSpecialty) => void;
}

export interface WizardClinicStepProps {
	clinicProfileDraft: ClinicProfileDraft;
	updateClinicProfileDraft: (field: string, value: any) => void;
	changeClinicMode: (mode: ClinicMode) => void;
	uiLanguage: string;
	setUiLanguage: (lang: string) => void;
	normalizeUiLanguageInput: (val: string) => string;
	uiLanguageOptions: readonly UiLanguageOption[];
	selectedUiLanguageOption: UiLanguageOption;
	weekdayOptions: readonly WeekdayOption[];
	toggleClinicWorkingDay: (day: number) => void;
}

export interface WizardLegalStepProps {
	clinicProfileDraft: ClinicProfileDraft;
	updateClinicProfileDraft: (field: string, value: any) => void;
	legalReadinessPercent: number;
	legalMissingFields: readonly string[];
}

export interface WizardTeamStepProps {
	dashboard: Dashboard | null;
	newStaffName: string;
	setNewStaffName: (name: string) => void;
	newStaffRole: StaffRole;
	setNewStaffRole: (role: StaffRole) => void;
	newStaffSpecialty: DentalSpecialty;
	setNewStaffSpecialty: (specialty: DentalSpecialty) => void;
	handleAddStaff: () => void;
	newStaffReadyToCreate: boolean;
	onboardingStaffCreateGuidanceId: string;
	staffRoleLabels: Record<StaffRole, string>;
	specialtyLabels: Record<DentalSpecialty, string>;
	newChairName: string;
	setNewChairName: (name: string) => void;
	handleAddChair: () => void;
	newChairReadyToCreate: boolean;
	onboardingChairCreateGuidanceId: string;
	staffScheduleDrafts: Record<string, StaffScheduleDraft>;
	staffScheduleDraftFromWorkingHours: (hours: unknown) => StaffScheduleDraft;
	staffScheduleSaveStates: Record<string, string>;
	staffScheduleDirtyIds: Set<string>;
	staffScheduleSavingId: string | null;
	updateStaffScheduleDraft: (
		staffId: string,
		patch: Partial<StaffScheduleDraft>,
	) => void;
	toggleStaffWorkingDay: (staffId: string, day: number) => void;
	saveStaffSchedule: (staffId: string) => Promise<void> | void;
	chairScheduleDrafts: Record<string, StaffScheduleDraft>;
	chairScheduleSaveStates: Record<string, string>;
	chairScheduleDirtyIds: Set<string>;
	chairScheduleSavingId: string | null;
	updateChairScheduleDraft: (
		chairId: string,
		patch: Partial<StaffScheduleDraft>,
	) => void;
	toggleChairWorkingDay: (chairId: string, day: number) => void;
	saveChairSchedule: (chairId: string) => Promise<void> | void;
	weekdayOptions: readonly WeekdayOption[];
}

export interface WizardSourcesStepProps {
	pricelistSourceKindLabels: Record<PricelistSourceKind, string>;
	pricelistSourceKind: PricelistSourceKind;
	setPricelistSourceKind: (kind: PricelistSourceKind) => void;
	clearPricelistImage: () => void;
	setPricelistAnalysis: (analysis: unknown) => void;
	importSourceLabels: Record<
		ImportSourceKind,
		{ title: string; detail?: string }
	>;
	importSourceKind: ImportSourceKind;
	setImportSourceKind: (kind: ImportSourceKind) => void;
	setImportPreview: (preview: unknown) => void;
	setImportCommit: (commit: unknown) => void;
	smartImportModeLabels: Record<
		SmartImportMode,
		{ title: string; detail?: string }
	>;
	smartImportMode: SmartImportMode;
	setSmartImportMode: (mode: SmartImportMode) => void;
	setSmartImportPreview: (preview: unknown) => void;
	setSmartImportCommit: (commit: unknown) => void;
	ingestionTargetLabels: Record<DocumentIngestionTarget, string>;
	documentIngestionTarget: DocumentIngestionTarget;
	setDocumentIngestionTarget: (target: DocumentIngestionTarget) => void;
	imagingSourceChoices: readonly ImagingSourceKind[];
	imagingImportSourceKind: ImagingSourceKind;
	imagingSourceLabels: Record<ImagingSourceKind, string>;
	setImagingImportSourceKind: (kind: ImagingSourceKind) => void;
	setImagingImportPreview: (preview: unknown) => void;
	setImagingImportCommit: (commit: unknown) => void;
	setDicomSeriesPreview: (preview: unknown) => void;
	dicomWebEndpointUrl: string;
	setDicomWebEndpointUrl: (url: string) => void;
	setDicomWebCheck: (check: unknown) => void;
	setDicomViewerLaunchManifest: (manifest: unknown) => void;
	setDicomViewerToolStateBundle: (bundle: unknown) => void;
	setDicomViewerWorkbenchManifest: (manifest: unknown) => void;
	ohifBaseUrl: string;
	setOhifBaseUrl: (url: string) => void;
	setSettingsTab: (tab: string) => void;
}

export interface WizardTelegramStepProps {
	telegramStatus: DenteTelegramBotStatus | null;
	telegramBotUsernameDraft: string;
	setTelegramBotUsernameDraft: (name: string) => void;
	markTelegramSettingsDirty: () => void;
	telegramPatientPortalBaseUrlDraft: string;
	setTelegramPatientPortalBaseUrlDraft: (url: string) => void;
	telegramWelcomeImageUrlDraft: string;
	setTelegramWelcomeImageUrlDraft: (url: string) => void;
	telegramReviewUrlDraft: string;
	setTelegramReviewUrlDraft: (url: string) => void;
	telegramMapsUrlDraft: string;
	setTelegramMapsUrlDraft: (url: string) => void;
	telegramTokenTtlDraft: string | number;
	setTelegramTokenTtlDraft: (ttl: string) => void;
	telegramReminderLeadTimesDraft: string;
	setTelegramReminderLeadTimesDraft: (times: string) => void;
	telegramReviewRequestDelayDraft: string | number;
	setTelegramReviewRequestDelayDraft: (delay: string) => void;
	telegramPostVisitCheckupDelayFields: readonly TelegramPostVisitCheckupDelayField[];
	telegramPostVisitCheckupDelayDrafts: Record<string, string | number>;
	updateTelegramPostVisitCheckupDelayDraft: (
		key: string,
		value: string | number,
	) => void;
	telegramAdminSecretDraft: string;
	setTelegramAdminSecretDraft: (secret: string) => void;
	unlockTelegramAdminSession: (scope?: string) => Promise<void> | void;
	telegramAdminSecretSession: boolean;
	telegramPrivacyModeDraft: string;
	setTelegramPrivacyModeDraft: (mode: string) => void;
	normalizedTelegramPrivacyMode: (mode: string) => string;
	telegramPrivacyModeLabels: Record<string, string>;
	telegramVisualCardFields: readonly TelegramVisualCardField[];
	onboardingTelegramVisualCardKeys: readonly string[];
	telegramVisualCardUrlDrafts: Record<string, string>;
	updateTelegramVisualCardUrlDraft: (key: string, url: string) => void;
	telegramFeatureOptions: readonly (DenteTelegramFeature | string)[];
	telegramEnabledFeaturesDraft: readonly string[];
	toggleTelegramFeature: (feature: string) => void;
	telegramFeatureLabel: (feature: string) => string;
	saveTelegramSettings: () => Promise<void> | void;
	isTelegramSettingsSaving: boolean;
	telegramSettingsSaveState: string;
	telegramSettingsSaveError: string | null;
	telegramSettingsDirty: boolean;
	setSettingsTab: (tab: string) => void;
}

export interface WizardDoneStepProps {
	legalReadinessPercent: number;
	dashboard: Dashboard | null;
	clinicModeLabels: Record<ClinicMode, { title: string; detail: string }>;
	staffRoleLabels: Record<StaffRole, string>;
	selectedWorkspaceRole: StaffRole;
	specialtyLabels: Record<DentalSpecialty, string>;
	selectedSpecialty: DentalSpecialty;
	telegramStatus: DenteTelegramBotStatus | null;
	telegramEnabledFeaturesDraft: readonly string[];
	documentFactoryGroups: readonly DocumentFactoryGroup[];
	onboardingDocumentsReady: boolean;
	onboardingReadyToFinish: boolean;
	onboardingBlockingIssues: readonly string[];
	onboardingDocumentReadinessIssues: readonly string[];
	onboardingTelegramRecommendations: readonly string[];
}

export interface WizardStepperNavProps {
	onboardingSteps: readonly OnboardingStepItem[];
	onboardingStep: string;
	currentOnboardingIndex: number;
	moveOnboardingTo: (step: string) => Promise<void> | void;
}

export const ONBOARDING_WIZARD_ACCESSIBILITY_LABELS = {
	modalDialog: 'aria-label="Первичная настройка клиники"',
	closeButton: 'aria-label="Скрыть мастер настройки"',
	fastStartSection: 'aria-label="Быстрый старт работы"',
} as const;

