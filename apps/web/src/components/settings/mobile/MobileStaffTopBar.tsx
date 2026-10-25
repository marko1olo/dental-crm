import React from "react";
import { ChevronLeft, Plus } from "lucide-react";

interface MobileStaffTopBarProps {
	onBackToSettings: () => void;
	staffCount: number;
	onOpenAddStaff: () => void;
}

export const MobileStaffTopBar: React.FC<MobileStaffTopBarProps> = ({
	onBackToSettings,
	staffCount,
	onOpenAddStaff,
}) => {
	return (
		<div className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] px-4 py-2.5 flex items-center justify-between">
			<button
				type="button"
				onClick={onBackToSettings}
				className="min-w-[44px] min-h-[44px] -ml-2 px-2 flex items-center gap-1 text-[15px] font-medium text-[var(--teal)] hover:opacity-80 active:scale-95 transition-transform cursor-pointer"
				aria-label="Назад в настройки"
				data-testid="btn-mobile-back-to-settings-from-staff"
			>
				<ChevronLeft size={20} className="shrink-0" />
				<span>Настройки</span>
			</button>

			<div className="text-center min-w-0 px-2 flex flex-col items-center">
				<h2 className="text-[17px] font-semibold text-[var(--ink)] tracking-tight truncate leading-tight">
					Персонал
				</h2>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					{staffCount} в штате
				</span>
			</div>

			<button
				type="button"
				onClick={onOpenAddStaff}
				className="min-w-[44px] min-h-[44px] -mr-2 w-11 h-11 rounded-full flex items-center justify-center text-[var(--teal)] hover:bg-[var(--teal-soft)] active:scale-95 transition-transform cursor-pointer"
				aria-label="Добавить сотрудника"
				data-testid="btn-mobile-add-staff-top"
			>
				<Plus size={22} />
			</button>
		</div>
	);
};
