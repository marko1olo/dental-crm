/**
 * @file apps/web/src/views/settingsView/settingsNavigationMenu.tsx
 * @description Top navigation bar with role switcher and overflow menu.
 */
import React from "react";
import { Building2, SlidersHorizontal, Stethoscope, UserCheck } from "lucide-react";
import type { SettingsRoleMode } from "./types.js";
import { SettingsMoreActionsDropdown } from "./SettingsMoreActionsDropdown.js";

export interface SettingsNavigationMenuProps {
	roleMode: SettingsRoleMode;
	setRoleMode: (mode: SettingsRoleMode) => void;
	selectSettingsTab: (tabId: string) => void;
	reopenOnboarding?: (() => void) | undefined;
	activeStaffUser?: any;
}

export const SettingsNavigationMenu: React.FC<SettingsNavigationMenuProps> = ({
	roleMode,
	setRoleMode,
	selectSettingsTab,
	reopenOnboarding,
	activeStaffUser,
}) => {
	return (
		<div
			className="settings-heading col-span-full flex items-center justify-between gap-3 min-h-[48px] max-h-[52px] pb-2.5 border-b border-[var(--line)] mb-3 flex-nowrap"
			style={{ gridColumn: "1 / -1" }}
		>
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center shrink-0">
					<SlidersHorizontal
						size={18}
						className="w-5 h-5 text-[var(--primary)] shrink-0"
						aria-hidden="true"
					/>
				</div>
				<h2
					className="text-lg font-bold tracking-tight text-[var(--ink)] m-0 whitespace-nowrap"
					title="Раздел административных настроек: управление персоналом, прайс-листом, интеграцией с ЕГИСЗ/ОФД и бланками"
				>
					Настройки клиники
				</h2>
			</div>

			<div className="flex items-center gap-2.5 shrink-0">
				<div
					className="settings-segmented-strip h-9 min-h-[36px] max-h-[36px] p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hidden md:flex items-center gap-1"
					role="tablist"
					aria-label="Режим настроек"
				>
					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "doctor"}
						onClick={() => { setRoleMode("doctor"); selectSettingsTab("preferences"); }}
						className={`settings-segment-btn h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold ${roleMode === "doctor" ? "active bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"}`}
						data-testid="btn-settings-role-doctor"
					>
						<Stethoscope size={14} className="shrink-0" />
						<span>Врач</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "admin"}
						onClick={() => {
							setRoleMode("admin");
							selectSettingsTab("staff");
						}}
						className={`settings-segment-btn h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold ${roleMode === "admin" ? "active bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"}`}
						data-testid="btn-settings-role-admin"
					>
						<UserCheck size={14} className="shrink-0" />
						<span>Администратор</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "owner"}
						onClick={() => {
							setRoleMode("owner");
							selectSettingsTab("clinic");
						}}
						className={`settings-segment-btn h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold ${roleMode === "owner" ? "active bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"}`}
						data-testid="btn-settings-role-owner"
					>
						<Building2 size={14} className="shrink-0" />
						<span>Владелец</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "all"}
						onClick={() => setRoleMode("all")}
						className={`settings-segment-btn h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold ${roleMode === "all" ? "active bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--muted)]"}`}
						title="Показать все настройки единым классическим каталогом"
						data-testid="btn-settings-role-all"
					>
						<SlidersHorizontal size={14} className="shrink-0" />
						<span>Все</span>
					</button>
				</div>

				<SettingsMoreActionsDropdown
					reopenOnboarding={reopenOnboarding}
					activeStaffUser={activeStaffUser}
				/>
			</div>
		</div>
	);
};

export default SettingsNavigationMenu;
