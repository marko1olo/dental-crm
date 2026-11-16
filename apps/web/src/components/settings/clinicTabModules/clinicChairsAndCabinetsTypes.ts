import type React from "react";
import type { Chair, ClinicMode, ClinicPublicLookupResponse, DentalSpecialty, StaffMember, StaffRole } from "@dental/shared";
import type { ChairDayHours, ChairScheduleDraft } from "../clinic/chairsModules/clinicChairsTypes";
import type { ClinicLegalProfile, ClinicProfileDraft, UpdateClinicProfileDraftFn } from "../clinic/legalModules/clinicLegalTypes";

export interface ArtSettings {
	enabled: boolean;
	pack: "nature" | "dental-epic" | "abstract" | "all";
	dynamicByTimeOfDay: boolean;
}

export interface SettingsClinicTabPropsBag {
	dashboard?: {
		clinicSettings?: {
			profile?: {
				clinicName?: string;
				legalName?: string;
				address?: string;
				timezone?: string;
				mode?: ClinicMode | string;
			};
			staff?: StaffMember[];
			chairs?: Chair[];
		};
		[key: string]: unknown;
	} | null | undefined;
	changeClinicMode?: ((mode: ClinicMode) => void) | undefined;
	clinicProfileDraft?: ClinicProfileDraft | Record<string, unknown> | undefined;
	clinicProfileSaveState?: string | undefined;
	updateClinicProfileDraft?: UpdateClinicProfileDraftFn | undefined;
	saveClinicProfileFromDraft?: (() => void | Promise<void>) | undefined;
	toggleClinicWorkingDay?: ((day: number) => void) | undefined;
	uiLanguage?: string | undefined;
	setUiLanguage?: ((lang: string) => void) | undefined;
	normalizeUiLanguageInput?: ((v: string) => string) | undefined;
	lookupClinicPublicProfile?: (() => void | Promise<void>) | undefined;
	isClinicPublicLookupLoading?: boolean | undefined;
	clinicPublicLookup?: ClinicPublicLookupResponse | null | undefined;
	applyClinicLookupSuggestion?: ((fields: Record<string, unknown> | Partial<ClinicLegalProfile>) => void) | undefined;
	newStaffName?: string | undefined;
	setNewStaffName?: ((name: string) => void) | undefined;
	addStaffMember?: ((role: string, name: string) => void) | undefined;
	deleteChair?: ((chairId: string) => void | Promise<void>) | undefined;
	newStaffRole?: StaffRole | string | undefined;
	setNewStaffRole?: ((role: StaffRole) => void) | undefined;
	newStaffSpecialty?: DentalSpecialty | string | undefined;
	setNewStaffSpecialty?: ((spec: DentalSpecialty) => void) | undefined;
	staffScheduleDraftFromWorkingHours?: ((h: unknown) => ChairScheduleDraft) | undefined;
	newChairName?: string | undefined;
	setNewChairName?: ((name: string) => void) | undefined;
	addChair?: ((name?: string) => void) | undefined;
	newChairReadyToCreate?: boolean | undefined;
	newChairHasXraySensor?: boolean | undefined;
	setNewChairHasXraySensor?: (React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void)) | undefined;
	newChairHasMicroscope?: boolean | undefined;
	setNewChairHasMicroscope?: (React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void)) | undefined;
	newChairHasSurgeryKit?: boolean | undefined;
	setNewChairHasSurgeryKit?: (React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void)) | undefined;
	chairScheduleDrafts?: Record<string, Partial<ChairScheduleDraft> | Record<string, unknown>> | undefined;
	chairScheduleSaveStates?: Record<string, string> | undefined;
	chairScheduleDirtyIds?: Set<string> | ReadonlySet<string> | string[] | Record<string, boolean> | unknown;
	chairScheduleSavingId?: string | null | undefined;
	updateChairScheduleDraft?: ((chairId: string, patch: Partial<ChairScheduleDraft> | Partial<Chair>) => void) | undefined;
	toggleChairWorkingDay?: ((chairId: string, day: number) => void) | undefined;
	updateChairScheduleDay?: ((chairId: string, day: number, hours: Partial<ChairDayHours>) => void) | undefined;
	saveChairSchedule?: ((chairId: string) => void | Promise<void>) | undefined;
	humanizeMigrationText?: ((t: string) => string) | undefined;
	clinicLookupSuggestionFieldEntries?: ((f: unknown) => [string, unknown][]) | undefined;
	clinicPublicLookupFieldLabels?: Record<string, string> | undefined;
	clinicPublicLookupWarningText?: ((w: string) => string) | undefined;
	clinicLookupSuggestionApplySummary?: ((fields: unknown) => string) | undefined;
	legalReadinessPercent?: number | undefined;
	legalMissingFields?: string[] | undefined;
	weekdayOptions?: Array<{ value: number; label: string }> | undefined;
	uiLanguageOptions?: Array<{ value: string; label: string; detail: string }> | undefined;
	staffRoleLabels?: Record<string, string> | undefined;
	specialtyLabels?: Record<string, string> | undefined;
	setSettingsTab?: ((tab: string) => void) | undefined;
	chairs?: Chair[] | undefined;
	hideScalePresets?: boolean | undefined;
	[key: string]: unknown;
}

export interface ClinicChairsAndCabinetsSectionProps {
	// Staff Props
	typedStaffMembers: StaffMember[];
	newStaffName?: string | undefined;
	setNewStaffName?: ((name: string) => void) | undefined;
	newStaffRole?: StaffRole | string | undefined;
	setNewStaffRole?: ((role: StaffRole) => void) | undefined;
	newStaffSpecialty?: DentalSpecialty | string | undefined;
	setNewStaffSpecialty?: ((spec: DentalSpecialty) => void) | undefined;
	handleAddStaff: () => void;
	staffRoleLabels?: Record<string, string> | undefined;
	specialtyLabels?: Record<string, string> | undefined;
	onNavigateToStaffTab?: (() => void) | undefined;

	// Chairs Props
	typedChairs: Chair[];
	newChairName?: string | undefined;
	setNewChairName?: ((name: string) => void) | undefined;
	handleAddChair: (overrideName?: string) => void;
	newChairReadyToCreate?: boolean | undefined;
	newChairHasXraySensor?: boolean | undefined;
	setNewChairHasXraySensor?: (React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void)) | undefined;
	newChairHasMicroscope?: boolean | undefined;
	setNewChairHasMicroscope?: (React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void)) | undefined;
	newChairHasSurgeryKit?: boolean | undefined;
	setNewChairHasSurgeryKit?: (React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean | ((prev: boolean) => boolean)) => void)) | undefined;
	chairScheduleDrafts?: Record<string, Partial<ChairScheduleDraft> | Record<string, unknown>> | undefined;
	chairScheduleSaveStates?: Record<string, string> | undefined;
	chairScheduleDirtyIds?: Set<string> | ReadonlySet<string> | string[] | Record<string, boolean> | unknown;
	chairScheduleSavingId?: string | null | undefined;
	staffScheduleDraftFromWorkingHours?: ((h: unknown) => ChairScheduleDraft) | undefined;
	updateChairScheduleDraft?: ((chairId: string, patch: Partial<ChairScheduleDraft> | Partial<Chair>) => void) | undefined;
	toggleChairWorkingDay?: ((chairId: string, day: number) => void) | undefined;
	updateChairScheduleDay?: ((chairId: string, day: number, hours: Partial<ChairDayHours>) => void) | undefined;
	saveChairSchedule?: ((chairId: string) => Promise<void> | void) | undefined;
	deleteChair?: ((chairId: string) => Promise<void> | void) | undefined;
	typedWeekdayOptions?: Array<{ value: number; label: string }> | undefined;
	setChairPresetDays?: ((chairId: string, days: number[]) => void) | undefined;
	applyChairHoursToAll?: ((chairId: string) => void) | undefined;
	showToast?: ((msg: string, type?: "info" | "success" | "warning" | "error") => void) | undefined;
}
