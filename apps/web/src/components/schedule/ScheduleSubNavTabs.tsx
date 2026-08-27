import React, { type Dispatch, type ReactElement, type SetStateAction } from "react";

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
 * Solves Mobile Schedule Header Tabs Text Collapse by utilizing
 * a clean horizontal scroll bar with flex shrink-0 buttons and >=44px touch targets.
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
		<div className="schedule-sub-nav-tabs flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full w-full py-1 shrink-0">
			<button
				className="secondary-button shrink-0 whitespace-nowrap min-w-fit min-h-[44px] px-3.5 text-xs font-semibold"
				type="button"
				onClick={() => setShowShiftAnalytics((prev) => !prev)}
			>
				{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
			</button>
			<button
				className="text-button shrink-0 whitespace-nowrap min-w-fit min-h-[44px] px-3.5 text-xs font-semibold"
				type="button"
				onClick={() => setScheduleDateFilter(todayScheduleDate())}
			>
				Сегодня
			</button>
			<button
				className="text-button shrink-0 whitespace-nowrap min-w-fit min-h-[44px] px-3.5 text-xs font-semibold"
				type="button"
				data-testid="open-shift-roster-modal-btn"
				onClick={() => onOpenShiftRoster?.()}
				title="Студия графиков сменности врачей, нормы ТК РФ ст. 350 и табель Т-13"
			>
				График смен (ТК РФ ст. 350 / Табель Т-13)
			</button>
			<button
				className="text-button shrink-0 whitespace-nowrap min-w-fit min-h-[44px] px-3.5 text-xs font-semibold"
				type="button"
				data-testid="schedule-waitlist-btn"
				onClick={() => setWaitlistOpen(true)}
				title="Пациенты, которые ждут свободного окна"
			>
				Лист ожидания{waitlistCount > 0 ? ` · ${waitlistCount}` : ""}
			</button>
			<button
				className={`text-button shrink-0 whitespace-nowrap min-w-fit min-h-[44px] px-3.5 text-xs font-semibold ${showConfirmationsPanel ? "active" : ""}`}
				type="button"
				onClick={() => {
					setShowConfirmationsPanel((prev) => !prev);
					setShowFreedSlotsPanel(false);
					setShowClipboardPanel(false);
				}}
				title="Панель утреннего обзвона и подтверждений"
			>
				Утренний обзвон
			</button>
			<button
				className={`text-button shrink-0 whitespace-nowrap min-w-fit min-h-[44px] px-3.5 text-xs font-semibold ${showFreedSlotsPanel ? "active" : ""}`}
				type="button"
				onClick={() => {
					setShowFreedSlotsPanel((prev) => !prev);
					setShowConfirmationsPanel(false);
					setShowClipboardPanel(false);
				}}
				title="Освободившиеся окна и подбор из листа ожидания"
			>
				Освободившиеся окна
			</button>
			<button
				className={`text-button shrink-0 whitespace-nowrap min-w-fit min-h-[44px] px-3.5 text-xs font-semibold ${showClipboardPanel ? "active" : ""}`}
				type="button"
				onClick={() => {
					setShowClipboardPanel((prev) => !prev);
					setShowFreedSlotsPanel(false);
					setShowConfirmationsPanel(false);
				}}
				title="Буфер расписания: скопированные приёмы для вставки на другое время"
			>
				Буфер
			</button>
		</div>
	);
}
