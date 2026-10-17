import type { StaffAuthorityFlagKey } from "@dental/shared";
import React from "react";
import { Lock, Shield, ShieldCheck } from "lucide-react";
import { staffRoleTitle } from "../../settingsInviteRoles";
import { FLAG_HINTS, FLAG_TITLES, type RowState, type SaveState } from "./authorityTypes";

interface StaffAuthorityRowProps {
	row: RowState;
	save: SaveState;
	onToggleFlag: (row: RowState, flag: StaffAuthorityFlagKey, next: boolean) => void;
}

const FLAGS: StaffAuthorityFlagKey[] = ["canSignMedicalRecords", "canManageMoney", "canManageImports"];

export const StaffAuthorityRow: React.FC<StaffAuthorityRowProps> = ({ row, save, onToggleFlag }) => {
	return (
		<div className="p-3.5 border border-[var(--line)] rounded-xl bg-[var(--paper)] flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="min-w-0">
					<h5 className="m-0 text-sm font-semibold text-[var(--ink)] truncate">{row.name}</h5>
					<span className="text-xs text-[var(--muted)]">{staffRoleTitle(row.role)}</span>
				</div>
			</div>

			<div className="grid gap-2 sm:grid-cols-3">
				{FLAGS.map((flag) => {
					const isDerived = row.roleDerived[flag];
					const isEffective = row.effective[flag];
					const isSaving = save.kind === "saving" && save.staffId === row.staffId && save.flag === flag;

					return (
						<button
							key={flag}
							type="button"
							onClick={() => onToggleFlag(row, flag, !isEffective)}
							disabled={isSaving || isDerived}
							title={FLAG_HINTS[flag]}
							className={`p-2.5 min-h-[44px] rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
								isEffective
									? "bg-[var(--teal-soft)] border-[var(--teal)]/40 text-[var(--teal)]"
									: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)]"
							} ${isDerived ? "opacity-85 cursor-not-allowed" : ""}`}
						>
							<div className="flex items-center justify-between w-full mb-1">
								<span className="text-xs font-semibold">{FLAG_TITLES[flag]}</span>
								{isDerived ? (
									<Lock size={12} className="text-[var(--muted)]" title="Задано ролью" />
								) : isEffective ? (
									<ShieldCheck size={14} className="text-[var(--teal)]" />
								) : (
									<Shield size={14} className="text-[var(--muted)]" />
								)}
							</div>
							<span className="text-[11px] text-[var(--muted)] leading-tight">
								{isDerived ? "Задано ролью" : isEffective ? "Включено" : "Отключено"}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
