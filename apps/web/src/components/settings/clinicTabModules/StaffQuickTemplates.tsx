import React from "react";
import type { DentalSpecialty, StaffRole } from "@dental/shared";

interface StaffQuickTemplatesProps {
	setNewStaffName?: ((name: string) => void) | undefined;
	setNewStaffRole?: ((role: StaffRole) => void) | undefined;
	setNewStaffSpecialty?: ((spec: DentalSpecialty) => void) | undefined;
}

export const StaffQuickTemplates: React.FC<StaffQuickTemplatesProps> = ({
	setNewStaffName,
	setNewStaffRole,
	setNewStaffSpecialty,
}) => {
	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			<span className="text-[11px] text-[var(--muted)] font-semibold">Шаблоны:</span>
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
	);
};
