import { Plus } from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";
import { ScheduleOptionsDropdown } from "./ScheduleOptionsDropdown";
import { ScheduleViewModeSegmented } from "./ScheduleViewModeSegmented";
import type { ScheduleFilterStripProps } from "./types";
import type { useScheduleFilters } from "./useScheduleFilters";

export interface ScheduleToolbarActionsIslandProps {
	props: ScheduleFilterStripProps;
	filters: ReturnType<typeof useScheduleFilters>;
}

export function ScheduleToolbarActionsIsland({
	props,
	filters,
}: ScheduleToolbarActionsIslandProps): ReactElement {
	const { scheduleViewMode = "timeline", setScheduleViewMode, onQuickBooking } = props;

	return (
		<div className="schedule-toolbar-island-actions flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-[var(--line)] bg-[var(--paper)] relative z-10">
			{/* 1-Click View Mode Switcher: [ Лента | Сетка | По креслам ] */}
			<ScheduleViewModeSegmented
				scheduleViewMode={scheduleViewMode}
				setScheduleViewMode={setScheduleViewMode}
			/>

			{/* 1-Click Primary Quick Booking Action (Mandates 8am, 8ap) — ONLY Primary CTA button */}
			{onQuickBooking && (
				<button
					type="button"
					onClick={onQuickBooking}
					className="schedule-toolbar-primary-quick-booking-btn primary-button h-8 sm:h-9 min-h-[36px] px-3.5 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs whitespace-nowrap bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white"
					data-testid="schedule-toolbar-primary-quick-booking-btn"
					data-tour="schedule-booking"
					title="Быстрая запись (N) / Новая запись пациента на прием"
					aria-label="Быстрая запись (N)"
				>
					<Plus size={15} className="shrink-0 stroke-[2.5]" aria-hidden="true" />
					<span className="whitespace-nowrap font-bold">Запись</span>
				</button>
			)}

			{/* Secondary Actions Overflow Dropdown Menu */}
			<ScheduleOptionsDropdown
				isOptionsMenuOpen={filters.isOptionsMenuOpen}
				setIsOptionsMenuOpen={filters.setIsOptionsMenuOpen}
				optionsMenuRef={filters.optionsMenuRef}
				onQuickBooking={onQuickBooking || (() => {})}
				setScheduleViewMode={setScheduleViewMode}
				scheduleViewMode={scheduleViewMode}
				hasMultipleBranches={filters.hasMultipleBranches}
				selectedBranchId={props.selectedBranchId}
				onSelectBranch={props.onSelectBranch}
				activeBranches={filters.activeBranches}
				activeScheduleFilterCount={props.activeScheduleFilterCount}
				resetScheduleFilters={props.resetScheduleFilters}
				hasMultipleChairs={filters.hasMultipleChairs}
				myChair={filters.myChair}
				isMyChairActive={filters.isMyChairActive}
				handleSelectMyChair={filters.handleSelectMyChair}
				hasMultipleDoctors={filters.hasMultipleDoctors}
				activeDoctors={filters.activeDoctors}
				scheduleDoctorFilterId={props.scheduleDoctorFilterId}
				setScheduleDoctorFilterId={props.setScheduleDoctorFilterId}
				displayChairs={filters.displayChairs}
				scheduleChairFilterId={props.scheduleChairFilterId}
				setScheduleChairFilterId={props.setScheduleChairFilterId}
				setScheduleDateFilter={props.setScheduleDateFilter}
				tomorrowIso={filters.tomorrowIso}
				scheduleStatusFilter={props.scheduleStatusFilter}
				setScheduleStatusFilter={props.setScheduleStatusFilter}
				onSelectWholeWeek={props.onSelectWholeWeek}
				handleRepeatBookingOffset={filters.handleRepeatBookingOffset}
				gridStepMinutes={props.gridStepMinutes}
				onGridStepChange={props.onGridStepChange}
				handleOpenAddChair={filters.handleOpenAddChair}
				onOpenPatientSearch={props.onOpenPatientSearch}
				onToggleSmartAi={props.onToggleSmartAi}
				onOpenDoctorFreeSlots={props.onOpenDoctorFreeSlots}
				onOpenPreventiveInspection={props.onOpenPreventiveInspection}
				preventiveInspectionCount={props.preventiveInspectionCount}
				onOpenTomorrowReminders={props.onOpenTomorrowReminders}
				onEmergencyCitoBooking={props.onEmergencyCitoBooking}
				onToggleShiftAnalytics={props.onToggleShiftAnalytics}
				showShiftAnalytics={props.showShiftAnalytics}
				onOpenShiftRoster={props.onOpenShiftRoster}
				onOpenDoctorShiftDrawer={props.onOpenDoctorShiftDrawer}
				onOpenChairDateRangeModal={props.onOpenChairDateRangeModal}
				onOpenWaitlist={props.onOpenWaitlist}
				waitlistCount={props.waitlistCount}
				onToggleConfirmations={props.onToggleConfirmations}
				showConfirmationsPanel={props.showConfirmationsPanel}
				onToggleFreedSlots={props.onToggleFreedSlots}
				showFreedSlotsPanel={props.showFreedSlotsPanel}
				onToggleClipboard={props.onToggleClipboard}
				showClipboardPanel={props.showClipboardPanel}
				onOpenCalendarSync={props.onOpenCalendarSync}
			/>
		</div>
	);
}
