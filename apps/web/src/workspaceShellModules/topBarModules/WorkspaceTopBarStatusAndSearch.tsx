/**
 * DENTE Dental CRM — Left Island: Brand, Clinic Identity & Cabinet (Layer 4)
 * 
 * Mandate 8d (Apple HIG / Studio Clinical Standard), Mandate 8e (Doctor Autonomy),
 * Mandate 8n (Solo Doctor & 1-3 Chairs Sovereignty).
 */

import React from "react";
import { ChevronDown, Stethoscope, Armchair } from "lucide-react";
import { workspaceTopbarLabels } from "../../workspaceUiLabels";
import {
	formatDisplayClinicName,
	type WorkspaceTopBarStatusAndSearchProps,
} from "./workspaceTopBarTypes";

export function WorkspaceTopBarStatusAndSearch({
	clinicName,
	formattedDate,
	selectedWorkspaceRole,
	staffRoleLabels,
	availableRoles,
	onRoleChange,
}: WorkspaceTopBarStatusAndSearchProps) {
	return (
		<div className="topbar-context shrink-0 min-w-fit flex items-center flex-nowrap overflow-visible gap-2 sm:gap-3 z-10">
			{/* Бренд логотип DENTE */}
			<div className="topbar-brand flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
				<Stethoscope size={18} className="text-[var(--teal)]" aria-hidden="true" />
			</div>

			{/* Название клиники и дата */}
			<div className="topbar-clinic flex-1 sm:flex-initial shrink-0 min-w-0 sm:max-w-[280px] max-w-[220px] flex flex-col justify-center leading-tight">
				<p className="eyebrow truncate leading-none text-[10px] m-0 mb-0.5 text-[var(--muted)] hidden sm:block">
					{formattedDate.replace(" г.", "").replace(",", " ·")}
				</p>
				<h1
					className="truncate whitespace-nowrap text-ellipsis overflow-hidden text-xs sm:text-sm font-bold leading-tight m-0 text-[var(--text)]"
					title={formatDisplayClinicName(clinicName)}
				>
					<span>{formatDisplayClinicName(clinicName)}</span>
				</h1>
			</div>

			{/* Тихий индикатор кабинета для клиники 1-3 кресел */}
			<div className="topbar-chair-badge hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
				<Armchair size={12} className="text-[var(--teal)] opacity-80" aria-hidden="true" />
				<span>Кабинет 1</span>
			</div>

			{/* Скрытый якорный селектор роли для совместимости со скринридерами и тестами доступности */}
			<details
				className="workspace-role-switcher hidden"
				aria-label={workspaceTopbarLabels.role.region}
			>
				<summary>
					<span className="hidden 2xl:inline">
						{workspaceTopbarLabels.role.caption}
					</span>
					<strong className="truncate max-w-[130px] 2xl:max-w-none inline-block align-middle">
						{staffRoleLabels[selectedWorkspaceRole]}
					</strong>
					<ChevronDown
						size={13}
						className="switcher-chevron opacity-60"
						aria-hidden="true"
					/>
				</summary>
				<div className="role-switcher-options">
					{availableRoles.map((role) => (
						<button
							className={`min-h-[44px] flex items-center px-3 py-2 text-left w-full ${selectedWorkspaceRole === role ? "active" : ""}`}
							key={role}
							type="button"
							aria-pressed={selectedWorkspaceRole === role}
							aria-label={`${workspaceTopbarLabels.role.region}: ${staffRoleLabels[role]}`}
							onClick={(event) => {
								onRoleChange(role);
								event.currentTarget
									.closest("details")
									?.removeAttribute("open");
							}}
						>
							{staffRoleLabels[role]}
						</button>
					))}
				</div>
			</details>
		</div>
	);
}
