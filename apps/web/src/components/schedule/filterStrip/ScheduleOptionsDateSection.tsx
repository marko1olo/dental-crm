import { Calendar, Clock } from "lucide-react";
import React from "react";

interface ScheduleOptionsDateSectionProps {
	setScheduleDateFilter: (date: string) => void;
	tomorrowIso: string;
	setIsOptionsMenuOpen: (open: boolean) => void;
	onSelectWholeWeek?: (() => void) | undefined;
	setScheduleViewMode?: ((mode: "timeline" | "grid" | "chairs") => void) | undefined;
	handleRepeatBookingOffset: (days: 7 | 14 | 30) => void;
}

const OFFSETS = [
	{ days: 7 as const, label: "Через 7 дней", badge: "+7д" },
	{ days: 14 as const, label: "Через 14 дней", badge: "+14д" },
	{ days: 30 as const, label: "Через 1 месяц", badge: "+30д" },
];

export const ScheduleOptionsDateSection: React.FC<ScheduleOptionsDateSectionProps> = ({
	setScheduleDateFilter,
	tomorrowIso,
	setIsOptionsMenuOpen,
	onSelectWholeWeek,
	setScheduleViewMode,
	handleRepeatBookingOffset,
}) => {
	const selectDate = (date: string) => {
		setScheduleDateFilter(date);
		setIsOptionsMenuOpen(false);
	};

	const selectWeek = () => {
		if (onSelectWholeWeek) {
			onSelectWholeWeek();
		} else if (setScheduleViewMode) {
			setScheduleViewMode("timeline");
		}
		setIsOptionsMenuOpen(false);
	};

	const selectOffset = (days: 7 | 14 | 30) => {
		handleRepeatBookingOffset(days);
		setIsOptionsMenuOpen(false);
	};

	return (
		<>
			<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Навигация по датам
			</div>
			<button
				type="button"
				onClick={() => selectDate("")}
				className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
			>
				<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Сегодня</span>
			</button>

			<button
				type="button"
				onClick={() => selectDate(tomorrowIso)}
				className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
			>
				<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Завтра</span>
			</button>

			<button
				type="button"
				onClick={() => {
					window.location.hash = "shift";
					setIsOptionsMenuOpen(false);
				}}
				className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
				title="Перейти в журнал приёмов и очередей за смену"
			>
				<Clock size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Журнал приёмов за смену</span>
			</button>

			<button
				type="button"
				onClick={selectWeek}
				className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
				role="menuitem"
			>
				<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Вся неделя</span>
			</button>

			<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
				Повторный прием (+Повтор)
			</div>
			{OFFSETS.map(({ days, label, badge }) => (
				<button
					key={days}
					type="button"
					onClick={() => selectOffset(days)}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
					role="menuitem"
				>
					<span>{label}</span>
					<span className="text-[10px] font-mono opacity-70">{badge}</span>
				</button>
			))}
		</>
	);
};
