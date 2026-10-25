/**
 * apps/web/src/components/settings/SettingsClinicTab.tsx
 * Facade container for Clinic settings: working hours, chairs, legal profile.
 */
import React, { useState } from "react";
import type { Chair, StaffMember } from "@dental/shared";
import { safeLocalStorageGetItem, safeLocalStorageSetItem } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { loadUiPreferences, saveUiPreferences } from "../../utils/preferencesUtils";
import { showToast } from "../GlobalToast";
import { SettingsClinicLegalSection } from "./clinic/SettingsClinicLegalSection";
import { SettingsClinicScheduleSection } from "./clinic/SettingsClinicScheduleSection";
import { TaxationAndFiscalizationCard } from "./clinic/TaxationAndFiscalizationCard";
import { useClinicCapabilities } from "../../hooks/useClinicCapabilities";
import { ClinicGeneralInfoSection } from "./clinicTabModules/ClinicGeneralInfoSection";
import { ClinicChairsAndCabinetsSection } from "./clinicTabModules/ClinicChairsAndCabinetsSection";

export function SettingsClinicTab({
	props = {},
	settingsTab,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props?: Record<string, any>;
	settingsTab?: string;
}) {
	const p = props || {};
	const {
		dashboard,
		changeClinicMode,
		clinicProfileDraft: rawClinicProfileDraft,
		clinicProfileSaveState = "saved",
		updateClinicProfileDraft,
		saveClinicProfileFromDraft,
		toggleClinicWorkingDay,
		uiLanguage = "ru",
		setUiLanguage,
		normalizeUiLanguageInput = (v: string) => v,
		lookupClinicPublicProfile,
		isClinicPublicLookupLoading = false,
		clinicPublicLookup,
		applyClinicLookupSuggestion,
		newStaffName = "",
		setNewStaffName,
		addStaffMember,
		deleteChair,
		newStaffRole = "doctor",
		setNewStaffRole,
		newStaffSpecialty = "therapist",
		setNewStaffSpecialty,
		staffScheduleDraftFromWorkingHours = (h: any) => ({
			start: h?.start || "08:00",
			end: h?.end || "20:00",
			workingDays: h?.workingDays || [1, 2, 3, 4, 5, 6],
			perDay: h?.perDay || {},
		}),
		newChairName = "",
		setNewChairName,
		addChair,
		newChairReadyToCreate = true,
		newChairHasXraySensor = true,
		setNewChairHasXraySensor,
		newChairHasMicroscope = false,
		setNewChairHasMicroscope,
		newChairHasSurgeryKit = false,
		setNewChairHasSurgeryKit,
		chairScheduleDrafts = {},
		chairScheduleSaveStates = {},
		chairScheduleDirtyIds = new Set<string>(),
		chairScheduleSavingId = null,
		updateChairScheduleDraft = () => {},
		toggleChairWorkingDay = () => {},
		updateChairScheduleDay = () => {},
		saveChairSchedule = () => {},
		humanizeMigrationText = (t: string) => t,
		clinicLookupSuggestionFieldEntries = (f: any) => Object.entries(f || {}),
		clinicPublicLookupFieldLabels = {},
		clinicPublicLookupWarningText = (w: string) => w,
		clinicLookupSuggestionApplySummary = () => "",
		legalReadinessPercent = 100,
		legalMissingFields = [],
		weekdayOptions = [
			{ value: 1, label: "Пн" },
			{ value: 2, label: "Вт" },
			{ value: 3, label: "Ср" },
			{ value: 4, label: "Чт" },
			{ value: 5, label: "Пт" },
			{ value: 6, label: "Сб" },
			{ value: 7, label: "Вс" },
		],
		uiLanguageOptions = [{ value: "ru", label: "Русский", detail: "Основной язык интерфейса" }],
		staffRoleLabels,
		specialtyLabels,
		setSettingsTab,
	} = p;

	const capabilities = useClinicCapabilities(dashboard?.clinicSettings?.profile?.mode);
	const odontogramViewMode = useAppStore((state) => state.odontogramViewMode);
	const setOdontogramViewMode = useAppStore((state) => state.setOdontogramViewMode);

	const [artSettings, setArtSettings] = useState<{
		enabled: boolean;
		pack: "nature" | "dental-epic" | "abstract" | "all";
		dynamicByTimeOfDay: boolean;
	}>(() => {
		const saved = safeLocalStorageGetItem("dente_auth_art_settings");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return { enabled: parsed.enabled !== false, pack: parsed.pack || "nature", dynamicByTimeOfDay: parsed.dynamicByTimeOfDay !== false };
			} catch { /* fallback */ }
		}
		return { enabled: true, pack: "nature", dynamicByTimeOfDay: true };
	});

	const updateArtSettings = (partial: any) => {
		setArtSettings((prev) => {
			const next = { ...prev, ...partial };
			safeLocalStorageSetItem("dente_auth_art_settings", JSON.stringify(next));
			return next;
		});
	};

	if (settingsTab !== "clinic") return null;

	const clinicProfileDraft = rawClinicProfileDraft || {};
	const typedWeekdayOptions = (weekdayOptions ?? []) as Array<{ value: number; label: string }>;
	const typedUiLanguageOptions = (uiLanguageOptions ?? []) as Array<{ value: string; label: string; detail: string }>;
	const selectedUiLanguageOption = typedUiLanguageOptions.find((o) => o.value === uiLanguage) || typedUiLanguageOptions[0] || { detail: "" };
	const typedStaffMembers = (dashboard?.clinicSettings?.staff ?? []) as StaffMember[];
	const typedChairs = (dashboard?.clinicSettings?.chairs ?? p.chairs ?? []) as Chair[];

	const handleAddStaff = () => {
		const role = newStaffRole || "doctor";
		const name = newStaffName?.trim() || (role === "doctor" ? "Врач-терапевт" : role === "administrator" ? "Администратор" : "Ассистент");
		addStaffMember?.(role, name);
	};

	const handleAddChair = (overrideName?: string) => {
		const name = (typeof overrideName === "string" && overrideName.trim())
			? overrideName.trim()
			: (newChairName?.trim() || `Кресло ${(typedChairs.length || 0) + 1}`);
		addChair?.(name);
		setNewChairName?.("");
	};

	return (
		<section className="clinic-config space-y-6" aria-label="Аккаунт клиники и команда">
			<ClinicGeneralInfoSection
				dashboard={dashboard}
				clinicProfileDraft={clinicProfileDraft}
				capabilities={capabilities}
				changeClinicMode={changeClinicMode || p?.changeClinicMode}
				hideScalePresets={p?.hideScalePresets ?? true}
			/>

			{/* 1. Legal Profile, DaData Lookup & Document Requisites */}
			<SettingsClinicLegalSection
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				saveClinicProfileFromDraft={saveClinicProfileFromDraft}
				clinicProfileSaveState={clinicProfileSaveState}
				lookupClinicPublicProfile={lookupClinicPublicProfile}
				isClinicPublicLookupLoading={isClinicPublicLookupLoading}
				clinicPublicLookup={clinicPublicLookup}
				applyClinicLookupSuggestion={applyClinicLookupSuggestion}
				legalReadinessPercent={legalReadinessPercent}
				legalMissingFields={legalMissingFields}
				humanizeMigrationText={humanizeMigrationText}
				clinicLookupSuggestionFieldEntries={clinicLookupSuggestionFieldEntries}
				clinicPublicLookupFieldLabels={clinicPublicLookupFieldLabels}
				clinicPublicLookupWarningText={clinicPublicLookupWarningText}
				clinicLookupSuggestionApplySummary={clinicLookupSuggestionApplySummary}
				uiLanguage={uiLanguage}
				setUiLanguage={setUiLanguage}
				normalizeUiLanguageInput={normalizeUiLanguageInput}
				typedUiLanguageOptions={typedUiLanguageOptions}
				selectedUiLanguageOption={selectedUiLanguageOption}
				odontogramViewMode={odontogramViewMode}
				setOdontogramViewMode={setOdontogramViewMode}
				odontogramViewModeOptions={[]}
				artSettings={artSettings}
				updateArtSettings={updateArtSettings}
				saveUiPreferences={saveUiPreferences}
				loadUiPreferences={loadUiPreferences}
				showToast={showToast}
			/>

			{/* 2. Taxation System (СНО) & 54-FZ Fiscalization */}
			<TaxationAndFiscalizationCard />

			{/* 3. Working Hours & Schedule */}
			<SettingsClinicScheduleSection
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				toggleClinicWorkingDay={toggleClinicWorkingDay}
				typedWeekdayOptions={typedWeekdayOptions}
				showToast={showToast}
			/>

			<div className="sr-only" aria-hidden="true">
				<a href="/#lounge-display">Открыть ТВ-табло зоны ожидания (/lounge-display)</a>
			</div>

			{/* 4. Team, CBCT & Chairs Grid */}
			<ClinicChairsAndCabinetsSection
				typedStaffMembers={typedStaffMembers}
				newStaffName={newStaffName}
				setNewStaffName={setNewStaffName}
				newStaffRole={newStaffRole}
				setNewStaffRole={setNewStaffRole}
				newStaffSpecialty={newStaffSpecialty}
				setNewStaffSpecialty={setNewStaffSpecialty}
				handleAddStaff={handleAddStaff}
				staffRoleLabels={staffRoleLabels}
				specialtyLabels={specialtyLabels}
				onNavigateToStaffTab={() => (p?.setSettingsTab || setSettingsTab)?.("staff")}
				typedChairs={typedChairs}
				newChairName={newChairName}
				setNewChairName={setNewChairName}
				handleAddChair={handleAddChair}
				newChairReadyToCreate={newChairReadyToCreate}
				newChairHasXraySensor={newChairHasXraySensor}
				setNewChairHasXraySensor={setNewChairHasXraySensor}
				newChairHasMicroscope={newChairHasMicroscope}
				setNewChairHasMicroscope={setNewChairHasMicroscope}
				newChairHasSurgeryKit={newChairHasSurgeryKit}
				setNewChairHasSurgeryKit={setNewChairHasSurgeryKit}
				chairScheduleDrafts={chairScheduleDrafts}
				chairScheduleSaveStates={chairScheduleSaveStates}
				chairScheduleDirtyIds={chairScheduleDirtyIds instanceof Set ? chairScheduleDirtyIds : new Set(Array.isArray(chairScheduleDirtyIds) ? chairScheduleDirtyIds : [])}
				chairScheduleSavingId={chairScheduleSavingId}
				staffScheduleDraftFromWorkingHours={staffScheduleDraftFromWorkingHours}
				updateChairScheduleDraft={updateChairScheduleDraft}
				toggleChairWorkingDay={toggleChairWorkingDay}
				updateChairScheduleDay={updateChairScheduleDay}
				saveChairSchedule={saveChairSchedule}
				deleteChair={deleteChair}
				typedWeekdayOptions={typedWeekdayOptions}
				showToast={showToast}
			/>
		</section>
	);
}

export default SettingsClinicTab;
