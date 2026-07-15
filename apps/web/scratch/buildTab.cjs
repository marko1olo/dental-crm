const fs = require("fs");

let rawTab = fs.readFileSync("apps/web/scratch/clinic_tab.tsx", "utf8");
rawTab = rawTab.trim();
if (rawTab.startsWith('{settingsTab === "clinic" ? (')) {
	rawTab = rawTab.replace('{settingsTab === "clinic" ? (', "").trim();
}
if (rawTab.endsWith(") : null}")) {
	rawTab = rawTab.substring(0, rawTab.length - 9).trim();
}

const imports = `import React from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { ShieldCheck, Plus, ExternalLink, RefreshCw, Copy, CheckCircle2, Search, CalendarDays } from "lucide-react";
import { ClinicMode, StaffRole, Chair, RoleQueue, StaffMember, DentalSpecialty } from "@dental/shared";
type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
type WeekdayOption = { value: number; label: string };
`;

const componentStart = `
export function SettingsClinicTab({ props, settingsTab }: { props: Record<string, any>, settingsTab: string }) {
  const {
    dashboard,
    changeClinicMode,
    clinicProfileDraft,
    clinicProfileSaveState,
    updateClinicProfileDraft,
    saveClinicProfileFromDraft,
    toggleClinicWorkingDay,
    uiLanguage,
    setUiLanguage,
    normalizeUiLanguageInput,
    lookupClinicPublicProfile,
    isClinicPublicLookupLoading,
    clinicPublicLookup,
    applyClinicLookupSuggestion,
    newStaffName,
    setNewStaffName,
    addStaffMember,
    newStaffReadyToCreate,
    newStaffRole,
    setNewStaffRole,
    newStaffSpecialty,
    setNewStaffSpecialty,
    staffScheduleDrafts,
    staffScheduleDraftFromWorkingHours,
    staffScheduleSaveStates,
    staffScheduleDirtyIds,
    staffScheduleSavingId,
    updateStaffScheduleDraft,
    toggleStaffWorkingDay,
    updateStaffScheduleDay,
    saveStaffSchedule,
    newChairName,
    setNewChairName,
    addChair,
    newChairReadyToCreate,
    newChairHasXraySensor,
    setNewChairHasXraySensor,
    newChairHasMicroscope,
    setNewChairHasMicroscope,
    newChairHasSurgeryKit,
    setNewChairHasSurgeryKit,
    chairScheduleDrafts,
    chairScheduleSaveStates,
    chairScheduleDirtyIds,
    chairScheduleSavingId,
    updateChairScheduleDraft,
    toggleChairWorkingDay,
    updateChairScheduleDay,
    saveChairSchedule,
    clinicPublicLookupProviderStatusLabels,
    humanizeMigrationText,
    clinicPublicLookupBoundaryText,
    clinicPublicLookupSuggestionSourceLabels,
    clinicLookupSuggestionFieldEntries,
    clinicPublicLookupFieldLabels,
    clinicPublicLookupWarningText,
    clinicLookupSuggestionApplySummary,
    legalReadinessPercent,
    legalMissingFields,
    weekdayOptions,
    uiLanguageOptions,
    clinicModeLabels,
    staffRoleLabels,
    specialtyLabels
  } = props;

  if (settingsTab !== "clinic") return null;

  const typedClinicModes = Object.keys(clinicModeLabels) as ClinicMode[];
  const typedModeHints = dashboard.clinicSettings.modeHints as string[];
  const typedRoleQueues = dashboard.shiftIntelligence.roleQueues as RoleQueue[];
  
  const typedWeekdayOptions = weekdayOptions as WeekdayOption[];
  const typedUiLanguageOptions = uiLanguageOptions as Array<{ value: string; label: string; detail: string }>;
  const selectedUiLanguageOption = typedUiLanguageOptions.find((o) => o.value === uiLanguage) || typedUiLanguageOptions[0] || { detail: '' };

  const typedClinicPublicLookupSuggestions = clinicPublicLookup?.suggestions ?? [];
  const typedClinicPublicLookupTargets = clinicPublicLookup?.publicLookupTargets ?? [];
  const typedStaffMembers = dashboard.clinicSettings.staff as StaffMember[];
  const typedChairs = dashboard.clinicSettings.chairs as Chair[];
  const staffCreationRoles: StaffRole[] = ["doctor", "administrator", "assistant", "manager"];

  return (
`;

const componentEnd = `
  );
}
`;

fs.writeFileSync(
	"apps/web/src/components/settings/SettingsClinicTab.tsx",
	imports + componentStart + rawTab + componentEnd,
	"utf8",
);
console.log("Written to SettingsClinicTab.tsx");
