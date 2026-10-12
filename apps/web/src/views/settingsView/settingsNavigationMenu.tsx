/**
 * apps/web/src/views/settingsView/settingsNavigationMenu.tsx
 *
 * Top navigation bar with role switcher (Doctor / Admin / Owner / All)
 * and overflow dropdown with Onboarding & Guide Tour triggers.
 *
 * Mandates 8b, 8c, 8d, 8e: desktop density, <= 500 lines, WCAG AAA.
 */

import React, { useState } from "react";
import {
	Building2,
	ClipboardCheck,
	GraduationCap,
	MoreHorizontal,
	SlidersHorizontal,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import { startInteractiveTour } from "../../components/tutorial/InteractiveGuideTour";
import { SETTINGS_ROLE_LABELS, type SettingsRoleMode } from "./types.js";

export interface SettingsNavigationMenuProps {
	roleMode: SettingsRoleMode;
	setRoleMode: (mode: SettingsRoleMode) => void;
	selectSettingsTab: (tabId: string) => void;
	reopenOnboarding?: () => void;
	activeStaffUser?: any;
}

export const SettingsNavigationMenu: React.FC<SettingsNavigationMenuProps> = ({
	roleMode,
	setRoleMode,
	selectSettingsTab,
	reopenOnboarding,
	activeStaffUser,
}) => {
	const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

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
				<div
					className="hidden xl:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)] whitespace-nowrap shrink-0"
					data-testid="badge-settings-role-mode"
				>
					<i className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0 block" />
					<b>{SETTINGS_ROLE_LABELS[roleMode]}</b>
				</div>
			</div>

			<div className="flex items-center gap-2.5 shrink-0">
				<div
					className="settings-segmented-strip h-9 min-h-[36px] max-h-[36px] p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
					role="tablist"
					aria-label="Режим настроек"
				>
					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "doctor"}
						onClick={() => {
							setRoleMode("doctor");
							selectSettingsTab("profile");
						}}
						className={`settings-segment-btn h-8 px-3 rounded-lg ${roleMode === "doctor" ? "active" : ""}`}
						data-testid="btn-settings-role-doctor"
					>
						<Stethoscope size={15} className="shrink-0" />
						<span className="whitespace-nowrap">Врач</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "admin"}
						onClick={() => {
							setRoleMode("admin");
							selectSettingsTab("staff");
						}}
						className={`settings-segment-btn h-8 px-3 rounded-lg ${roleMode === "admin" ? "active" : ""}`}
						data-testid="btn-settings-role-admin"
					>
						<UserCheck size={15} className="shrink-0" />
						<span className="whitespace-nowrap">Администратор</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "owner"}
						onClick={() => {
							setRoleMode("owner");
							selectSettingsTab("clinic");
						}}
						className={`settings-segment-btn h-8 px-3 rounded-lg ${roleMode === "owner" ? "active" : ""}`}
						data-testid="btn-settings-role-owner"
					>
						<Building2 size={15} className="shrink-0" />
						<span className="whitespace-nowrap">Владелец</span>
					</button>

					<div className="settings-segment-divider" aria-hidden="true" />

					<button
						type="button"
						role="tab"
						aria-selected={roleMode === "all"}
						onClick={() => setRoleMode("all")}
						className={`settings-segment-btn h-8 px-3 rounded-lg ${roleMode === "all" ? "active" : ""}`}
						title="Показать все настройки единым классическим каталогом"
						data-testid="btn-settings-role-all"
					>
						<SlidersHorizontal size={14} className="shrink-0" />
						<span className="whitespace-nowrap">Все разделы</span>
					</button>
				</div>

				<div className="settings-heading-actions relative">
					<button
						className="secondary-button min-h-[36px] min-w-[36px] h-9 w-9 p-0 flex items-center justify-center rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] shrink-0 cursor-pointer transition-all"
						type="button"
						onClick={() => setIsMoreActionsOpen((prev) => !prev)}
						aria-expanded={isMoreActionsOpen}
						aria-label="Дополнительные действия"
						title="Дополнительные действия"
						data-testid="btn-settings-more-actions"
					>
						<MoreHorizontal
							size={16}
							className="w-4 h-4 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
						/>
					</button>
					{isMoreActionsOpen && (
						<div
							className="absolute right-0 top-full mt-1.5 w-60 py-1.5 px-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-50 flex flex-col gap-1 text-left animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								onClick={() => {
									setIsMoreActionsOpen(false);
									reopenOnboarding?.();
								}}
								className="w-full h-9 text-left px-3 text-xs font-medium rounded-xl hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
								data-testid="btn-reopen-onboarding-menuitem"
							>
								<ClipboardCheck size={16} className="w-4 h-4 text-[var(--primary)] shrink-0" />
								<span>Мастер первого запуска</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsMoreActionsOpen(false);
									const currentRole =
										activeStaffUser?.role === "admin" || activeStaffUser?.role === "receptionist"
											? "admin"
											: activeStaffUser?.role === "director" || activeStaffUser?.role === "owner"
												? "director"
												: "doctor";
									startInteractiveTour(currentRole);
								}}
								className="w-full h-9 text-left px-3 text-xs font-medium rounded-xl hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
								data-testid="btn-start-interactive-tour-menuitem"
							>
								<GraduationCap size={16} className="w-4 h-4 text-[var(--primary)] shrink-0" />
								<span>Интерактивный тур обучения</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SettingsNavigationMenu;
