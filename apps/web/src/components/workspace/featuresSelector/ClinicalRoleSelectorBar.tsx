import React from "react";
import type { DoctorSpecialtyKey } from "../../../store/doctorPreferencesStore";
import type { ClinicalRolePreset } from "../workspaceRolePresetTypes";

export interface ClinicalRoleSelectorBarProps {
	readonly presets: readonly ClinicalRolePreset[];
	readonly selectedRoleKey: DoctorSpecialtyKey;
	readonly currentDoctorSpecialty?: DoctorSpecialtyKey | null | undefined;
	readonly onSelectRole: (roleKey: DoctorSpecialtyKey) => void;
}

export function ClinicalRoleSelectorBar({
	presets,
	selectedRoleKey,
	currentDoctorSpecialty,
	onSelectRole,
}: ClinicalRoleSelectorBarProps) {
	return (
		<div
			className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 p-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
			data-testid="clinical-role-selector-bar"
			role="tablist"
			aria-label="Выбор клинической специализации врача"
		>
			{presets.map((preset) => {
				const isSelected = selectedRoleKey === preset.key;
				const isCurrentDoctorRole = currentDoctorSpecialty === preset.key;
				return (
					<button
						key={preset.key}
						type="button"
						role="tab"
						aria-selected={isSelected}
						data-testid={`clinical-role-btn-${preset.key}`}
						onClick={() => onSelectRole(preset.key)}
						className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold tracking-tight transition-all select-none cursor-pointer ${
							isSelected
								? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700 font-bold"
								: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50"
						}`}
						style={{ minHeight: "44px" }}
					>
						<span
							className="w-2 h-2 rounded-full shrink-0"
							style={{
								background: preset.color,
								boxShadow: isSelected ? `0 0 8px 1px ${preset.color}` : "none",
							}}
							aria-hidden="true"
						/>
						<span className="whitespace-nowrap">{preset.shortTitle}</span>
						{isCurrentDoctorRole && (
							<span
								className="text-[10px] px-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold shrink-0"
								title="Текущая роль в профиле врача"
							>
								✓
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
