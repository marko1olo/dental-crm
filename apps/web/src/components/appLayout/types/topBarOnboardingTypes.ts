import type { Dispatch, SetStateAction } from "react";
import type { StaffRole, DentalSpecialty, ClinicMode } from "@dental/shared";
import type {
	ClinicProfileDraft,
	OnboardingStepItem,
	UiLanguageOption,
	WeekdayOption,
} from "../../onboarding/wizard/types";

export interface TopBarOnboardingBaseProps {
	onboardingDismissed: boolean;
	showFullOnboardingGuide: boolean;
	isLocalOnboardingDismissed: boolean;
	isStripDismissedLocally: boolean;
	setIsStripDismissedLocally: Dispatch<SetStateAction<boolean>>;
	currentOnboardingIndex: number;
	onboardingSteps: readonly OnboardingStepItem[];
	legalReadinessPercent: number;
	continueOnboardingInDraftMode: (view?: string) => Promise<void> | void;
	openOnboardingGuide: () => void;
	dismissOnboarding: () => void;
	onboardingDraftMode: boolean;
	onboardingReadyToFinish: boolean;
	onboardingBlockingIssues: readonly string[];
	onboardingDocumentsReady: boolean;
	onboardingDocumentReadinessIssues: readonly string[];
	onboardingRoleChoices: readonly StaffRole[];
	moveOnboardingTo: (step: string | number) => Promise<void> | void;
	onboardingStep: string | number;
	onboardingFinishGuidanceId: string;
	specialtyLabels: Record<DentalSpecialty, string>;
	selectedSpecialty: DentalSpecialty;
	setSelectedSpecialty: (spec: DentalSpecialty) => void;
	clinicModeLabels: Record<ClinicMode, { title: string; detail: string }>;
	changeClinicMode: (mode: ClinicMode) => void;
	clinicProfileDraft: ClinicProfileDraft;
	updateClinicProfileDraft: (patch: Partial<ClinicProfileDraft> | string, value?: unknown) => void;
	uiLanguage: string;
	setUiLanguage: (lang: string) => void;
	normalizeUiLanguageInput: (input: string) => string;
	uiLanguageOptions: readonly UiLanguageOption[];
	selectedUiLanguageOption: UiLanguageOption | null;
	weekdayOptions: readonly WeekdayOption[];
	toggleClinicWorkingDay: (day: number) => void;
	legalMissingFields: readonly string[];
	newStaffName: string;
	setNewStaffName: Dispatch<SetStateAction<string>>;
	newStaffRole: StaffRole;
	setNewStaffRole: Dispatch<SetStateAction<StaffRole>>;
	newStaffSpecialty: DentalSpecialty;
	setNewStaffSpecialty: Dispatch<SetStateAction<DentalSpecialty>>;
	addStaffMember: () => Promise<void>;
	newStaffReadyToCreate: boolean;
	onboardingStaffCreateGuidanceId: string;
	newChairName: string;
	setNewChairName: Dispatch<SetStateAction<string>>;
	addChair: () => Promise<void>;
	newChairReadyToCreate: boolean;
	onboardingChairCreateGuidanceId: string;
}
