/**
 * apps/web/src/components/settings/clinicTabModules/ClinicChairsAndCabinetsSection.tsx
 *
 * Clinic chairs, cabinets, equipment sets, and quick team/staff setup panel.
 * Facade <= 120 lines.
 */

import React from "react";
import { ChevronRight, Users } from "lucide-react";
import { SettingsClinicChairsSection } from "../clinic/SettingsClinicChairsSection";
import { DoctorCbctPreferencesCard } from "../DoctorCbctPreferencesCard";
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
			<article className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col justify-between gap-4">
				<div className="panel-heading flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<Users size={18} aria-hidden="true" />
						</div>
						<div>
							<h3 className="font-bold text-base text-[var(--ink)] m-0">Команда клиники</h3>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">Врачи, ассистенты, администраторы и ставки</p>
						</div>
					</div>
					<span className="status-pill status-arrived px-2.5 py-1 rounded-full text-xs font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
						{typedStaffMembers.length} сотрудников
					</span>
				</div>
				<p className="text-xs text-[var(--ink-muted)] m-0">
					Каноническое управление персоналом, графиками смен, ставками и полномочиями вынесено на специализированную вкладку «Сотрудники».
				</p>
				<div className="pt-3 border-t border-[var(--line)] flex items-center justify-end">
					<button
						type="button"
						className="secondary-button compact-button inline-flex items-center gap-1.5 px-3.5 h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer whitespace-nowrap"
						onClick={onNavigateToStaffTab}
					>
						<span>Вкладка «Сотрудники»</span>
						<ChevronRight size={14} aria-hidden="true" />
					</button>
				</div>
			</article>

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
