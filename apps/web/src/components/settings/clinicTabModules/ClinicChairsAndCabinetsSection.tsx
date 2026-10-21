/**
 * apps/web/src/components/settings/clinicTabModules/ClinicChairsAndCabinetsSection.tsx
 *
 * Clinic chairs, cabinets, equipment sets, and quick team/staff setup panel.
 * Mandates 8b, 8c, 8d, 8e: desktop density, <= 500 lines, WCAG AAA.
 */

import React, { type ChangeEvent } from "react";
import type { Chair, DentalSpecialty, StaffMember, StaffRole } from "@dental/shared";
import { ChevronRight, Plus } from "lucide-react";
import { SettingsClinicChairsSection } from "../clinic/SettingsClinicChairsSection";
import { DoctorCbctPreferencesCard } from "../DoctorCbctPreferencesCard";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface ClinicChairsAndCabinetsSectionProps {
	// Staff Props
	typedStaffMembers: StaffMember[];
	newStaffName?: string;
	setNewStaffName?: (name: string) => void;
	newStaffRole?: StaffRole;
	setNewStaffRole?: (role: StaffRole) => void;
	newStaffSpecialty?: DentalSpecialty;
	setNewStaffSpecialty?: (spec: DentalSpecialty) => void;
	handleAddStaff: () => void;
	staffRoleLabels?: Record<string, string>;
	specialtyLabels?: Record<string, string>;
	onNavigateToStaffTab?: () => void;

	// Chairs Props
	typedChairs: Chair[];
	newChairName?: string;
	setNewChairName?: (name: string) => void;
	handleAddChair: (overrideName?: string) => void;
	newChairReadyToCreate?: boolean;
	newChairHasXraySensor?: boolean;
	setNewChairHasXraySensor?: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasMicroscope?: boolean;
	setNewChairHasMicroscope?: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasSurgeryKit?: boolean;
	setNewChairHasSurgeryKit?: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	chairScheduleDrafts?: Record<string, any>;
	chairScheduleSaveStates?: Record<string, any>;
	chairScheduleDirtyIds?: Set<string>;
	chairScheduleSavingId?: string | null;
	staffScheduleDraftFromWorkingHours?: (h: any) => any;
	updateChairScheduleDraft?: (chairId: string, patch: any) => void;
	toggleChairWorkingDay?: (chairId: string, day: number) => void;
	updateChairScheduleDay?: (chairId: string, day: number, hours: any) => void;
	saveChairSchedule?: (chairId: string) => Promise<void> | void;
	deleteChair?: (chairId: string) => Promise<void> | void;
	typedWeekdayOptions?: Array<{ value: number; label: string }>;
	setChairPresetDays?: (chairId: string, days: number[]) => void;
	applyChairHoursToAll?: (chairId: string) => void;
	showToast?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const ClinicChairsAndCabinetsSection: React.FC<ClinicChairsAndCabinetsSectionProps> = ({
	typedStaffMembers,
	newStaffName = "",
	setNewStaffName,
	newStaffRole = "doctor",
	setNewStaffRole,
	newStaffSpecialty = "therapist",
	setNewStaffSpecialty,
	handleAddStaff,
	staffRoleLabels = {
		doctor: "Врач",
		administrator: "Администратор",
		assistant: "Ассистент",
		manager: "Управляющий",
	},
	specialtyLabels = {
		therapist: "Терапевт",
		surgeon: "Хирург",
		orthopedist: "Ортопед",
		orthodontist: "Ортодонт",
		hygienist: "Гигиенист",
		universal: "Универсал",
	},
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
	const staffCreationRoles: StaffRole[] = [
		"doctor",
		"administrator",
		"assistant",
		"manager",
	];

	return (
		<div className="clinic-config-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
			{/* Staff Quick-Create Panel */}
			<article className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
				<div className="panel-heading flex items-center justify-between">
					<div>
						<h3 className="font-bold text-base text-[var(--ink)] m-0">Команда и права</h3>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Быстрое добавление сотрудника и выбор врачебной роли
						</p>
					</div>
					<span className="status-pill status-arrived px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
						{typedStaffMembers.length} сотрудников
					</span>
				</div>

				<div className="quick-create flex items-center gap-2">
					<input
						aria-label="Новый сотрудник"
						placeholder="ФИО сотрудника"
						value={newStaffName}
						onChange={(event: TextInputChangeEvent) =>
							setNewStaffName?.(event.target.value)
						}
						className="flex-1 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
					/>
					<button
						aria-label="Добавить сотрудника"
						className="icon-button flex items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer shrink-0 h-8 min-h-[32px] w-8 min-w-[32px]"
						style={{ minHeight: "44px", minWidth: "44px" }}
						type="button"
						onClick={handleAddStaff}
					>
						<Plus aria-hidden="true" size={18} />
					</button>
				</div>

				{/* Staff Quick Templates */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] text-[var(--muted)] font-semibold">
						Шаблоны:
					</span>
					<button
						type="button"
						className="compact-button secondary-button px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center"
						onClick={() => {
							setNewStaffName?.("Дежурный врач (терапевт)");
							setNewStaffRole?.("doctor");
							setNewStaffSpecialty?.("therapist");
						}}
						title="Быстро подставить дежурного терапевта"
					>
						+ Дежурный терапевт
					</button>
					<button
						type="button"
						className="compact-button secondary-button px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center"
						onClick={() => {
							setNewStaffName?.("Сменный ассистент");
							setNewStaffRole?.("assistant");
							setNewStaffSpecialty?.("universal");
						}}
						title="Быстро подставить сменного ассистента"
					>
						+ Сменный ассистент
					</button>
					<button
						type="button"
						className="compact-button secondary-button px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center"
						onClick={() => {
							setNewStaffName?.("Администратор смены");
							setNewStaffRole?.("administrator");
						}}
						title="Быстро подставить администратора смены"
					>
						+ Регистратор смены
					</button>
				</div>

				{/* Role Picker */}
				<div
					role="toolbar"
					className="role-picker flex items-center gap-1.5 flex-wrap"
					aria-label="Роль нового сотрудника"
				>
					{staffCreationRoles.map((role) => (
						<button
							className={`px-3 h-8 min-h-[32px] rounded-lg text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${
								newStaffRole === role
									? "bg-teal-600 text-white border-teal-600 shadow-xs"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"
							}`}
							key={role}
							type="button"
							aria-pressed={newStaffRole === role}
							onClick={() => setNewStaffRole?.(role)}
						>
							{staffRoleLabels[role] ?? role}
						</button>
					))}
				</div>

				{/* Specialty Strip */}
				{(newStaffRole === "doctor" || newStaffRole === "assistant") && (
					<div
						role="toolbar"
						className="specialty-strip staff-specialty-picker flex items-center gap-1.5 flex-wrap"
						aria-label="Специальность нового сотрудника"
					>
						{(Object.keys(specialtyLabels || {}) as DentalSpecialty[]).map(
							(specialty) => (
								<button
									className={`px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${
										newStaffSpecialty === specialty
											? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
									: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"
									}`}
									key={specialty}
									type="button"
									aria-pressed={newStaffSpecialty === specialty}
									onClick={() => setNewStaffSpecialty?.(specialty)}
								>
									{specialtyLabels?.[specialty] ?? specialty}
								</button>
							),
						)}
					</div>
				)}

				{/* Navigation to Full Staff Tab */}
				<div className="pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div className="space-y-0.5">
						<span className="text-xs font-semibold text-[var(--ink)] block">
							Управление полным списком персонала ({typedStaffMembers.length})
						</span>
						<p className="text-[11px] text-[var(--muted)] m-0">
							Детальные графики смен, телефоны и PIN-пароли на отдельной вкладке
						</p>
					</div>
					<button
						type="button"
						className="secondary-button compact-button inline-flex items-center gap-1 px-3 h-8 min-h-[32px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer whitespace-nowrap"
						onClick={onNavigateToStaffTab}
					>
						<span>Вкладка «Сотрудники»</span>
						<ChevronRight size={14} aria-hidden="true" />
					</button>
				</div>
			</article>

			{/* Doctor CBCT Preferences Card */}
			<DoctorCbctPreferencesCard />

			{/* Chairs & Installation Shifts Panel */}
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
				specialtyLabels={specialtyLabels}
				typedWeekdayOptions={typedWeekdayOptions}
				setChairPresetDays={setChairPresetDays}
				applyChairHoursToAll={applyChairHoursToAll}
				showToast={showToast}
			/>
		</div>
	);
};

export default ClinicChairsAndCabinetsSection;
