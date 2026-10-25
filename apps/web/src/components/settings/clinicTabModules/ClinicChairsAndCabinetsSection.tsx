/**
 * apps/web/src/components/settings/clinicTabModules/ClinicChairsAndCabinetsSection.tsx
 *
 * Clinic chairs, cabinets, equipment sets, and quick team/staff setup panel.
 * Facade <= 120 lines.
 */

import React from "react";
import { SettingsClinicChairsSection } from "../clinic/SettingsClinicChairsSection";
import { DoctorCbctPreferencesCard } from "../DoctorCbctPreferencesCard";
import { StaffQuickCreatePanel } from "./StaffQuickCreatePanel";
import type { ClinicChairsAndCabinetsSectionProps } from "./clinicChairsAndCabinetsTypes";

export type { ClinicChairsAndCabinetsSectionProps } from "./clinicChairsAndCabinetsTypes";

export const ClinicChairsAndCabinetsSection: React.FC<ClinicChairsAndCabinetsSectionProps> = ({
	typedStaffMembers,
	newStaffName = "",
	setNewStaffName,
	newStaffRole = "doctor",
	setNewStaffRole,
	newStaffSpecialty = "therapist",
	setNewStaffSpecialty,
	handleAddStaff,
	staffRoleLabels,
	specialtyLabels,
	onNavigateToStaffTab,
	typedChairs,
	newChairName = "",
	setNewChairName = () => {},
	handleAddChair,
	newChairReadyToCreate = true,
	newChairHasXraySensor = true,
	setNewChairHasXraySensor = () => {},
	newChairHasMicroscope = false,
	setNewChairHasMicroscope = () => {},
	newChairHasSurgeryKit = false,
	setNewChairHasSurgeryKit = () => {},
	chairScheduleDrafts = {},
	chairScheduleSaveStates = {},
	chairScheduleDirtyIds = new Set<string>(),
	chairScheduleSavingId = null,
	staffScheduleDraftFromWorkingHours = (h: any) => ({
		start: h?.start || "08:00",
		end: h?.end || "20:00",
		workingDays: h?.workingDays || [1, 2, 3, 4, 5, 6],
		perDay: h?.perDay || {},
	}),
	updateChairScheduleDraft = () => {},
	toggleChairWorkingDay = () => {},
	updateChairScheduleDay = () => {},
	saveChairSchedule = () => {},
	deleteChair = () => {},
	typedWeekdayOptions = [
		{ value: 1, label: "Пн" },
		{ value: 2, label: "Вт" },
		{ value: 3, label: "Ср" },
		{ value: 4, label: "Чт" },
		{ value: 5, label: "Пт" },
		{ value: 6, label: "Сб" },
		{ value: 7, label: "Вс" },
	],
	setChairPresetDays = () => {},
	applyChairHoursToAll = () => {},
	showToast = () => {},
}) => {
	return (
		<div className="clinic-config-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
			<StaffQuickCreatePanel
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
				onNavigateToStaffTab={onNavigateToStaffTab}
			/>

			<DoctorCbctPreferencesCard />

			<SettingsClinicChairsSection
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
				chairScheduleDirtyIds={chairScheduleDirtyIds}
				chairScheduleSavingId={chairScheduleSavingId}
				staffScheduleDraftFromWorkingHours={staffScheduleDraftFromWorkingHours}
				updateChairScheduleDraft={updateChairScheduleDraft}
				toggleChairWorkingDay={toggleChairWorkingDay}
				updateChairScheduleDay={updateChairScheduleDay}
				saveChairSchedule={saveChairSchedule}
				deleteChair={deleteChair}
				specialtyLabels={specialtyLabels || {}}
				typedWeekdayOptions={typedWeekdayOptions}
				setChairPresetDays={setChairPresetDays}
				applyChairHoursToAll={applyChairHoursToAll}
				showToast={showToast}
			/>
		</div>
	);
};

export default ClinicChairsAndCabinetsSection;
