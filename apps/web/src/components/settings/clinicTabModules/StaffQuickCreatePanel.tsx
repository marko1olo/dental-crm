import React, { type ChangeEvent } from "react";
import type { DentalSpecialty, StaffMember, StaffRole } from "@dental/shared";
import { ChevronRight, Plus } from "lucide-react";
import { StaffQuickTemplates } from "./StaffQuickTemplates";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

interface StaffQuickCreatePanelProps {
	typedStaffMembers: StaffMember[];
	newStaffName?: string | undefined;
	setNewStaffName?: ((name: string) => void) | undefined;
	newStaffRole?: StaffRole | undefined;
	setNewStaffRole?: ((role: StaffRole) => void) | undefined;
	newStaffSpecialty?: DentalSpecialty | undefined;
	setNewStaffSpecialty?: ((spec: DentalSpecialty) => void) | undefined;
	handleAddStaff: () => void;
	staffRoleLabels?: Record<string, string> | undefined;
	specialtyLabels?: Record<string, string> | undefined;
	onNavigateToStaffTab?: (() => void) | undefined;
}

const DEFAULT_ROLES = { doctor: "Врач", administrator: "Администратор", assistant: "Ассистент", manager: "Управляющий" };
const DEFAULT_SPECS = { therapist: "Терапевт", surgeon: "Хирург", orthopedist: "Ортопед", orthodontist: "Ортодонт", hygienist: "Гигиенист", universal: "Универсал" };
const CREATION_ROLES: StaffRole[] = ["doctor", "administrator", "assistant", "manager"];

export const StaffQuickCreatePanel: React.FC<StaffQuickCreatePanelProps> = ({
	typedStaffMembers,
	newStaffName = "",
	setNewStaffName,
	newStaffRole = "doctor",
	setNewStaffRole,
	newStaffSpecialty = "therapist",
	setNewStaffSpecialty,
	handleAddStaff,
	staffRoleLabels = DEFAULT_ROLES,
	specialtyLabels = DEFAULT_SPECS,
	onNavigateToStaffTab,
}) => {
	return (
		<article className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-4">
			<div className="panel-heading flex items-center justify-between">
				<div>
					<h3 className="font-bold text-base text-[var(--ink)] m-0">Команда и права</h3>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5">Быстрое добавление сотрудника и выбор врачебной роли</p>
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
					onChange={(e: TextInputChangeEvent) => setNewStaffName?.(e.target.value)}
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

			<StaffQuickTemplates setNewStaffName={setNewStaffName} setNewStaffRole={setNewStaffRole} setNewStaffSpecialty={setNewStaffSpecialty} />

			<div role="toolbar" className="role-picker flex items-center gap-1.5 flex-wrap" aria-label="Роль нового сотрудника">
				{CREATION_ROLES.map((role) => (
					<button
						className={`px-3 h-8 min-h-[32px] rounded-lg text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newStaffRole === role ? "bg-teal-600 text-white border-teal-600 shadow-xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"}`}
						key={role}
						type="button"
						aria-pressed={newStaffRole === role}
						onClick={() => setNewStaffRole?.(role)}
					>
						{staffRoleLabels[role] ?? role}
					</button>
				))}
			</div>

			{(newStaffRole === "doctor" || newStaffRole === "assistant") && (
				<div role="toolbar" className="specialty-strip staff-specialty-picker flex items-center gap-1.5 flex-wrap" aria-label="Специальность нового сотрудника">
					{(Object.keys(specialtyLabels || {}) as DentalSpecialty[]).map((specialty) => (
						<button
							className={`px-2.5 h-8 min-h-[32px] rounded-lg text-xs font-semibold border cursor-pointer transition-all inline-flex items-center ${newStaffSpecialty === specialty ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:border-slate-400"}`}
							key={specialty}
							type="button"
							aria-pressed={newStaffSpecialty === specialty}
							onClick={() => setNewStaffSpecialty?.(specialty)}
						>
							{specialtyLabels?.[specialty] ?? specialty}
						</button>
					))}
				</div>
			)}

			<div className="pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<span className="text-xs font-semibold text-[var(--ink)] block">Управление персоналом ({typedStaffMembers.length})</span>
					<p className="text-[11px] text-[var(--muted)] m-0">Детальные графики смен, телефоны и PIN-пароли на отдельной вкладке</p>
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
	);
};
