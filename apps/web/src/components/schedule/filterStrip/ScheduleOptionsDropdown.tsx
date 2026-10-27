import { MoreVertical, Plus } from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";
import { ScheduleOptionsDateSection } from "./ScheduleOptionsDateSection";
import type { ScheduleOptionsDropdownProps } from "./scheduleOptionsDropdownTypes";
import { ScheduleOptionsGridStepSection } from "./ScheduleOptionsGridStepSection";
import { ScheduleOptionsMobileSection } from "./ScheduleOptionsMobileSection";
import { ScheduleOptionsQueueSection } from "./ScheduleOptionsQueueSection";
import { ScheduleOptionsToolsSection } from "./ScheduleOptionsToolsSection";

export type { ScheduleOptionsDropdownProps } from "./scheduleOptionsDropdownTypes";

export function ScheduleOptionsDropdown(props: ScheduleOptionsDropdownProps): ReactElement {
	const {
		isOptionsMenuOpen,
		setIsOptionsMenuOpen,
		optionsMenuRef,
		onQuickBooking,
		setScheduleDateFilter,
		tomorrowIso,
		onSelectWholeWeek,
		setScheduleViewMode,
		handleRepeatBookingOffset,
		scheduleStatusFilter,
		setScheduleStatusFilter,
		gridStepMinutes = 30,
		onGridStepChange,
		handleOpenAddChair,
	} = props;

	return (
		<div
			className="relative inline-flex items-center shrink-0 flex-shrink-0 min-w-fit"
			ref={optionsMenuRef}
			style={{ flexShrink: 0, minWidth: "fit-content" }}
		>
			<button
				type="button"
				onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
				className="schedule-toolbar-options-btn secondary-button h-8 min-h-[32px] sm:h-9 sm:min-h-[36px] max-h-8 sm:max-h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-[13px] font-medium shrink-0 flex-shrink-0 inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
				style={{ flexShrink: 0, minWidth: "fit-content", whiteSpace: "nowrap" }}
				title="Дополнительные режимы и списки расписания"
				aria-label="Опции расписания"
				aria-expanded={isOptionsMenuOpen}
				data-testid="schedule-toolbar-options-btn"
			>
				<MoreVertical
					size={14}
					className="shrink-0 flex-shrink-0"
					style={{ flexShrink: 0 }}
					aria-hidden="true"
				/>
				<span
					className="hidden sm:inline whitespace-nowrap shrink-0 flex-shrink-0 font-medium min-w-fit"
					style={{ whiteSpace: "nowrap", flexShrink: 0, minWidth: "fit-content" }}
				>
					Опции
				</span>
			</button>

			<div
				className={`schedule-options-dropdown absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[220px] max-w-[320px] max-h-[82vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-100 text-xs ${
					isOptionsMenuOpen ? "flex" : "hidden"
				}`}
				role="menu"
				aria-hidden={!isOptionsMenuOpen}
			>
				{onQuickBooking && (
					<button
						type="button"
						onClick={() => {
							setIsOptionsMenuOpen(false);
							onQuickBooking();
						}}
						className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white transition-colors flex items-center gap-2 cursor-pointer mb-1"
						role="menuitem"
						data-testid="schedule-options-quick-booking-btn"
						title="Быстрая запись на прием (+ Запись)"
					>
						<Plus size={14} className="shrink-0" />
						<span>Быстрая запись (+ Запись)</span>
					</button>
				)}

				<ScheduleOptionsMobileSection {...(props as any)} />

				<ScheduleOptionsDateSection
					setScheduleDateFilter={setScheduleDateFilter}
					tomorrowIso={tomorrowIso}
					setIsOptionsMenuOpen={setIsOptionsMenuOpen}
					onSelectWholeWeek={onSelectWholeWeek}
					setScheduleViewMode={setScheduleViewMode}
					handleRepeatBookingOffset={handleRepeatBookingOffset}
				/>

				<ScheduleOptionsQueueSection
					scheduleStatusFilter={scheduleStatusFilter}
					setScheduleStatusFilter={setScheduleStatusFilter}
					setIsOptionsMenuOpen={setIsOptionsMenuOpen}
				/>

				<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
					Инструменты расписания
				</div>

				<ScheduleOptionsGridStepSection
					gridStepMinutes={gridStepMinutes}
					onGridStepChange={onGridStepChange}
					handleOpenAddChair={handleOpenAddChair}
					setIsOptionsMenuOpen={setIsOptionsMenuOpen}
				/>

				<ScheduleOptionsToolsSection {...(props as any)} />
			</div>
		</div>
	);
}
