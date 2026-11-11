import type { TopBarOnboardingBaseProps } from "./topBarOnboardingTypes";
import type {
	DenteTelegramBotStatus,
	DenteTelegramFeature,
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImportSourceKind,
	PricelistSourceKind,
	SmartImportMode,
} from "@dental/shared";
import type {
	DocumentFactoryGroup,
	OnboardingStepItem,
	StaffScheduleDraft,
	TelegramPostVisitCheckupDelayField,
	TelegramVisualCardField,
} from "../../onboarding/wizard/types";

export interface TopBarOnboardingDraftProps {
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
	saveClinicProfileFromDraft: () => Promise<void> | void;
	clinicProfileSaveState: string;
	onboardingTelegramRecommendations?: readonly string[];
	previousOnboardingStep: OnboardingStepItem | null;
	nextOnboardingStep: OnboardingStepItem | null;
}

export interface TopBarOnboardingProps
	extends TopBarOnboardingBaseProps,
		TopBarOnboardingDraftProps {}
