/**
 * @file apps/web/src/views/settingsView/SettingsMoreActionsDropdown.tsx
 * @description Dropdown menu for onboarding wizard and interactive tour triggers.
 */

import React, { useState } from "react";
import { ClipboardCheck, GraduationCap, MoreHorizontal } from "lucide-react";
import { startInteractiveTour } from "../../components/tutorial/InteractiveGuideTour";

export interface SettingsMoreActionsDropdownProps {
	reopenOnboarding?: (() => void) | undefined;
	activeStaffUser?: any;
}

export function SettingsMoreActionsDropdown({
	reopenOnboarding,
	activeStaffUser,
}: SettingsMoreActionsDropdownProps) {
	const [isOpen, setIsOpen] = useState(false);

	const handleStartTour = () => {
		setIsOpen(false);
		const currentRole =
			activeStaffUser?.role === "admin" || activeStaffUser?.role === "receptionist"
				? "admin"
				: activeStaffUser?.role === "director" || activeStaffUser?.role === "owner"
					? "director"
					: "doctor";
		startInteractiveTour(currentRole);
	};

	return (
		<div className="settings-heading-actions relative">
			<button
				className="secondary-button min-h-[36px] min-w-[36px] h-9 w-9 p-0 flex items-center justify-center rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] shrink-0 cursor-pointer transition-all"
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				aria-expanded={isOpen}
				aria-label="Дополнительные действия"
				title="Дополнительные действия"
				data-testid="btn-settings-more-actions"
			>
				<MoreHorizontal
					size={16}
					className="w-4 h-4 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
				/>
			</button>
			{isOpen && (
				<div
					className="absolute right-0 top-full mt-1.5 w-60 py-1.5 px-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-50 flex flex-col gap-1 text-left animate-in fade-in zoom-in-95 duration-100"
					role="menu"
				>
					<button
						type="button"
						onClick={() => {
							setIsOpen(false);
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
						onClick={handleStartTour}
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
	);
}
