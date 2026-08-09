import type { ReactElement } from "react";

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
}

/**
 * ScheduleSubNavTabs component for header navigation in Schedule view.
 * Solves Mobile Schedule Header Tabs Text Collapse (Defect 1) by utilizing
 * a clean horizontal scroll bar (`overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2`)
 * with flex `shrink-0` buttons to prevent overlapping and text stacking on 390px mobile viewports.
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
}: ScheduleSubNavTabsProps): ReactElement {
	return (
		<div className="schedule-sub-nav-tabs flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full w-full py-1 shrink-0">
			<button
				className="secondary-button shrink-0 whitespace-nowrap"
				type="button"
				onClick={() => setShowShiftAnalytics((prev) => !prev)}
				style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}
			>
				{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
			</button>
			<button
				className="text-button shrink-0 whitespace-nowrap"
				type="button"
				onClick={() => setScheduleDateFilter(todayScheduleDate())}
			>
				Сегодня
			</button>
			<button
				className="text-button shrink-0 whitespace-nowrap"
				type="button"
				onClick={() => setWaitlistOpen(true)}
				title="Пациенты, которые ждут свободного окна"
			>
				Лист ожидания{waitlistCount > 0 ? ` · ${waitlistCount}` : ""}
			</button>
			<button
				className={`text-button shrink-0 whitespace-nowrap ${showConfirmationsPanel ? "active" : ""}`}
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
				className={`text-button shrink-0 whitespace-nowrap ${showFreedSlotsPanel ? "active" : ""}`}
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
				className={`text-button shrink-0 whitespace-nowrap ${showClipboardPanel ? "active" : ""}`}
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
