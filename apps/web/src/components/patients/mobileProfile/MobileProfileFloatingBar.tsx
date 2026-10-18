import React from "react";
import { Calendar, Stethoscope } from "lucide-react";

export interface MobileProfileFloatingBarProps {
	readonly onStartVisit: () => void;
	readonly onBookAppointment: () => void;
}

export const MobileProfileFloatingBar: React.FC<MobileProfileFloatingBarProps> = ({
	onStartVisit,
	onBookAppointment,
}) => {
	return (
		<div className="mobile-profile-floating-bar" data-testid="mobile-profile-floating-bar">
			<button
				type="button"
				onClick={onStartVisit}
				className="flex-1 min-h-[48px] h-12 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
				data-testid="mobile-floating-start-visit-btn"
			>
				<Stethoscope size={18} />
				<span>Начать приём</span>
			</button>
			<button
				type="button"
				onClick={onBookAppointment}
				className="min-h-[48px] h-12 px-4 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-bold text-sm inline-flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
				data-testid="mobile-floating-book-btn"
			>
				<Calendar size={18} className="text-teal-600 dark:text-teal-400" />
				<span>Запись</span>
			</button>
		</div>
	);
};
