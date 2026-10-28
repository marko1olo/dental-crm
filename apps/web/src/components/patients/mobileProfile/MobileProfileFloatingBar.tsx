import React from "react";
import { Plus, Stethoscope } from "lucide-react";

export interface MobileProfileFloatingBarProps {
	readonly onStartVisit: () => void;
	readonly onBookAppointment: () => void;
}

export const MobileProfileFloatingBar: React.FC<MobileProfileFloatingBarProps> = ({
	onStartVisit,
	onBookAppointment,
}) => {
	return (
		<div
			className="mobile-profile-floating-bar fixed left-0 right-0 bottom-14 z-30 px-3.5 py-2.5 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] flex items-center gap-2 shadow-lg max-w-[480px] mx-auto"
			data-testid="mobile-profile-floating-bar"
		>
			<button
				type="button"
				onClick={onBookAppointment}
				className="flex-1 min-h-[44px] h-11 rounded-xl bg-[var(--teal,#0d9488)] hover:opacity-90 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
				data-testid="mobile-floating-book-btn"
			>
				<Plus size={18} />
				<span>Записать на приём</span>
			</button>
			<button
				type="button"
				onClick={onStartVisit}
				className="min-h-[44px] h-11 px-4 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] font-semibold text-sm inline-flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
				data-testid="mobile-floating-start-visit-btn"
			>
				<Stethoscope size={18} className="text-[var(--teal,#0d9488)]" />
				<span>Начать приём</span>
			</button>
		</div>
	);
};
