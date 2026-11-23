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
	onboardingFinishGuidanceId?: string | null | undefined;
	specialtyLabels: Record<DentalSpecialty, string>;
	selectedSpecialty: DentalSpecialty | string;
	setSelectedSpecialty: (spec: DentalSpecialty | string) => void;
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
	setNewStaffName: ((name: string) => void) | Dispatch<SetStateAction<string>>;
	newStaffRole: StaffRole;
	setNewStaffRole: ((role: StaffRole) => void) | Dispatch<SetStateAction<StaffRole>>;
	newStaffSpecialty: DentalSpecialty | string;
	setNewStaffSpecialty: ((specialty: string) => void) | ((specialty: DentalSpecialty) => void) | Dispatch<SetStateAction<string>> | Dispatch<SetStateAction<DentalSpecialty>>;
	addStaffMember: ((role?: StaffRole) => Promise<void>) | ((role: StaffRole) => Promise<void>) | (() => Promise<void>);
	newStaffReadyToCreate: boolean;
	onboardingStaffCreateGuidanceId?: string | null | undefined;
	newChairName: string;
	setNewChairName: ((name: string) => void) | Dispatch<SetStateAction<string>>;
	addChair: () => Promise<void>;
	newChairReadyToCreate: boolean;
	onboardingChairCreateGuidanceId?: string | null | undefined;
}
