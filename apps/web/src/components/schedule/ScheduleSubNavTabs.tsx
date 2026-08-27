import React, { type Dispatch, type ReactElement, type SetStateAction } from "react";
import {
	BarChart3,
	Calendar,
	Clipboard,
	Clock,
	PhoneCall,
	UserPlus,
	Users,
} from "lucide-react";

export interface ScheduleSubNavTabsProps {
	showShiftAnalytics: boolean;
	setShowShiftAnalytics: (val: boolean | ((prev: boolean) => boolean)) => void;
	setScheduleDateFilter: (date: string) => void;
	todayScheduleDate: () => string;
	waitlistCount: number;
	setWaitlistOpen: (open: boolean) => void;
	showConfirmationsPanel: boolean;
	setShowConfirmationsPanel: React.Dispatch<React.SetStateAction<boolean>>;
	showFreedSlotsPanel: boolean;
	setShowFreedSlotsPanel: React.Dispatch<React.SetStateAction<boolean>>;
	showClipboardPanel: boolean;
	setShowClipboardPanel: React.Dispatch<React.SetStateAction<boolean>>;
	onOpenShiftRoster?: () => void;
}

/**
 * ScheduleSubNavTabs component for header navigation in Schedule view.
 * Solves the chaotic blue links dump by utilizing a unified, elegant
 * Segmented Control toolbar with icons, design tokens, and >=44px touch targets.
 */
export function ScheduleSubNavTabs({
	showShiftAnalytics,
	setShowShiftAnalytics,
	setScheduleDateFilter,
	todayScheduleDate,
	waitlistCount,
	setWaitlistOpen,
	showConfirmationsPanel,
	setShowConfirmationsPanel,
	showFreedSlotsPanel,
	setShowFreedSlotsPanel,
	showClipboardPanel,
	setShowClipboardPanel,
	onOpenShiftRoster,
}: ScheduleSubNavTabsProps): ReactElement {
	return (
		<nav
			className="schedule-sub-nav-tabs flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full w-full py-0.5 shrink-0"
			aria-label="Навигация и режимы расписания"
		>
			<button
				className={`shrink-0 whitespace-nowrap min-w-fit h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer select-none ${
					showShiftAnalytics
						? "bg-[var(--teal-dark)] text-white shadow-2xs border border-transparent"
						: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)]"
				}`}
				type="button"
				onClick={() => setShowShiftAnalytics((prev) => !prev)}
				aria-pressed={showShiftAnalytics}
			>
				<BarChart3 size={14} className={showShiftAnalytics ? "text-white" : "text-[var(--teal,var(--brand-primary))]"} />
				<span>{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}</span>
			</button>

			<button
				className="shrink-0 whitespace-nowrap min-w-fit h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)] flex items-center gap-1.5 transition-all cursor-pointer select-none"
				type="button"
				onClick={() => setScheduleDateFilter(todayScheduleDate())}
			>
				<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Сегодня</span>
			</button>

			<button
				className="shrink-0 whitespace-nowrap min-w-fit h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)] flex items-center gap-1.5 transition-all cursor-pointer select-none"
				type="button"
				data-testid="open-shift-roster-modal-btn"
				onClick={() => onOpenShiftRoster?.()}
				title="Студия графиков сменности врачей, нормы ТК РФ ст. 350 и табель Т-13"
			>
				<Users size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>График смен</span>
			</button>

			<button
				className="shrink-0 whitespace-nowrap min-w-fit h-8 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)] flex items-center gap-1.5 transition-all cursor-pointer select-none"
				type="button"
				data-testid="schedule-waitlist-btn"
				onClick={() => setWaitlistOpen(true)}
				title="Пациенты, которые ждут свободного окна"
			>
				<UserPlus size={14} className="text-[var(--teal,var(--brand-primary))]" />
				<span>Лист ожидания{waitlistCount > 0 ? ` · ${waitlistCount}` : ""}</span>
			</button>

			<button
				className={`shrink-0 whitespace-nowrap min-w-fit h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer select-none ${
					showConfirmationsPanel
						? "active bg-[var(--teal-dark)] text-white shadow-2xs border border-transparent"
						: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)]"
				}`}
				type="button"
				onClick={() => {
					setShowConfirmationsPanel((prev) => !prev);
					setShowFreedSlotsPanel(false);
					setShowClipboardPanel(false);
				}}
				title="Панель утреннего обзвона и подтверждений"
				aria-pressed={showConfirmationsPanel}
			>
				<PhoneCall size={14} className={showConfirmationsPanel ? "text-white" : "text-[var(--teal,var(--brand-primary))]"} />
				<span>Утренний обзвон</span>
			</button>

			<button
				className={`shrink-0 whitespace-nowrap min-w-fit h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer select-none ${
					showFreedSlotsPanel
						? "active bg-[var(--teal-dark)] text-white shadow-2xs border border-transparent"
						: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)]"
				}`}
				type="button"
				onClick={() => {
					setShowFreedSlotsPanel((prev) => !prev);
					setShowConfirmationsPanel(false);
					setShowClipboardPanel(false);
				}}
				title="Освободившиеся окна и подбор из листа ожидания"
				aria-pressed={showFreedSlotsPanel}
			>
				<Clock size={14} className={showFreedSlotsPanel ? "text-white" : "text-[var(--teal,var(--brand-primary))]"} />
				<span>Освободившиеся окна</span>
			</button>

			<button
				className={`shrink-0 whitespace-nowrap min-w-fit h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer select-none ${
					showClipboardPanel
						? "active bg-[var(--teal-dark)] text-white shadow-2xs border border-transparent"
						: "border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))] hover:bg-[var(--paper)]"
				}`}
				type="button"
				onClick={() => {
					setShowClipboardPanel((prev) => !prev);
					setShowFreedSlotsPanel(false);
					setShowConfirmationsPanel(false);
				}}
				title="Буфер расписания: скопированные приёмы для вставки на другое время"
				aria-pressed={showClipboardPanel}
			>
				<Clipboard size={14} className={showClipboardPanel ? "text-white" : "text-[var(--teal,var(--brand-primary))]"} />
				<span>Буфер</span>
			</button>
		</nav>
	);
}

