/**
 * TopBarClinicSelector — Идентификатор клиники, кабинет и селектор филиала (Мандат 8b, <= 120 строк).
 */

import React from "react";
import { Armchair, ChevronDown, Stethoscope } from "lucide-react";
import { formatDisplayClinicName } from "../../../workspaceShellModules/topBarModules";
import { workspaceTopbarLabels } from "../../../workspaceUiLabels";
import type { StaffRole } from "@dental/shared";

export interface TopBarClinicSelectorProps {
	clinicName: string;
	formattedDate?: string;
	cabinetName?: string;
	selectedWorkspaceRole?: StaffRole;
	staffRoleLabels?: Record<StaffRole, string>;
	availableRoles?: StaffRole[];
	onRoleChange?: (role: StaffRole) => void;
}

export function TopBarClinicSelector({
	clinicName,
	formattedDate,
	cabinetName = "Кабинет 1",
	selectedWorkspaceRole,
	staffRoleLabels,
	availableRoles = [],
	onRoleChange,
}: TopBarClinicSelectorProps) {
	return (
		<div className="topbar-context shrink-0 min-w-fit flex items-center flex-nowrap overflow-visible gap-2 sm:gap-3 z-10">
			{/* Бренд логотип DENTE */}
			<div className="topbar-brand flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
				<Stethoscope size={18} className="text-[var(--teal,#0d9488)]" aria-hidden="true" />
			</div>

			{/* Название клиники и дата */}
			<div className="topbar-clinic flex-1 sm:flex-initial min-w-0 sm:max-w-[360px] lg:max-w-[480px] max-w-full flex flex-col justify-center leading-tight">
				{formattedDate && (
					<p className="eyebrow truncate leading-none text-[10px] m-0 mb-0.5 text-[var(--muted)] hidden sm:block">
						{formattedDate.replace(" г.", "").replace(",", " ·")}
					</p>
				)}
				<h1
					className="truncate whitespace-nowrap text-ellipsis overflow-hidden text-xs sm:text-sm font-bold leading-tight m-0 text-[var(--text,#0f172a)]"
					title={formatDisplayClinicName(clinicName)}
				>
					<span>{formatDisplayClinicName(clinicName)}</span>
				</h1>
			</div>

			{/* Тихий индикатор кабинета для клиники 1-3 кресел */}
			<div className="topbar-chair-badge hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
				<Armchair size={12} className="text-[var(--teal,#0d9488)] opacity-80" aria-hidden="true" />
				<span>{cabinetName}</span>
			</div>

			{/* Селектор роли при наличии обработчика */}
			{selectedWorkspaceRole && staffRoleLabels && onRoleChange && availableRoles.length > 0 && (
				<details
					className="workspace-role-switcher hidden"
					aria-label={workspaceTopbarLabels.role.region}
				>
					<summary>
						<span className="hidden 2xl:inline">{workspaceTopbarLabels.role.caption}</span>
						<strong className="truncate max-w-[130px] 2xl:max-w-none inline-block align-middle">
							{staffRoleLabels[selectedWorkspaceRole]}
						</strong>
						<ChevronDown size={13} className="switcher-chevron opacity-60" aria-hidden="true" />
					</summary>
					<div className="role-switcher-options">
						{availableRoles.map((role) => (
							<button
								className={`min-h-[44px] flex items-center px-3 py-2 text-left w-full ${
									selectedWorkspaceRole === role ? "active" : ""
								}`}
								key={role}
								type="button"
								aria-pressed={selectedWorkspaceRole === role}
								aria-label={`${workspaceTopbarLabels.role.region}: ${staffRoleLabels[role]}`}
								onClick={(e) => {
									onRoleChange(role);
									e.currentTarget.closest("details")?.removeAttribute("open");
								}}
							>
								{staffRoleLabels[role]}
							</button>
						))}
					</div>
				</details>
			)}
		</div>
	);
}
