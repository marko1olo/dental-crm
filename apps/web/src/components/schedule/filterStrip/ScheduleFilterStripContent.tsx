import { Armchair, CalendarRange, Clock, LayoutGrid, List, Plus, Users } from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";
import { QuickAddChairModal } from "../QuickAddChairModal";
import { CabinetFilterBar } from "./CabinetFilterBar";
import { DateRangeQuickButtons } from "./DateRangeQuickButtons";
import { ScheduleOptionsDropdown } from "./ScheduleOptionsDropdown";
import { StatusFilterToggleGroup } from "./StatusFilterToggleGroup";
import type { ScheduleFilterStripProps } from "./types";
import { useScheduleFilters } from "./useScheduleFilters";

export function ScheduleFilterStripContent(props: ScheduleFilterStripProps): ReactElement {
	const {
		scheduleDateFilter,
		setScheduleDateFilter,
		stepScheduleDay,
		activeScheduleFilterCount,
		resetScheduleFilters,
		selectedBranchId = null,
		onSelectBranch,
		scheduleDoctorFilterId = null,
		setScheduleDoctorFilterId,
		scheduleChairFilterId = null,
		setScheduleChairFilterId,
		scheduleViewMode = "timeline",
		setScheduleViewMode,
		onQuickBooking,
		onToggleSmartAi,
		onOpenDoctorFreeSlots,
		onOpenPreventiveInspection,
		preventiveInspectionCount = 0,
		onOpenPatientSearch,
		onSelectWholeWeek,
		onEmergencyCitoBooking,
		onOpenTomorrowReminders,
		onToggleShiftAnalytics,
		showShiftAnalytics = false,
		onOpenShiftRoster,
		onOpenDoctorShiftDrawer,
		onOpenChairDateRangeModal,
		onOpenWaitlist,
		waitlistCount = 0,
		onToggleConfirmations,
		showConfirmationsPanel = false,
		onToggleFreedSlots,
		showFreedSlotsPanel = false,
		onToggleClipboard,
		showClipboardPanel = false,
		onOpenCalendarSync,
		onOpenAddChair,
		onAddChair,
		gridStepMinutes = 30,
		onGridStepChange,
		activeFilterSummary,
		scheduleStatusFilter,
		setScheduleStatusFilter,
		queueCounts,
		chairs = [],
	} = props;

	const {
		todayIso,
		tomorrowIso,
		currentDateIso,
		formattedCurrentDate,
		displayChairs,
		activeBranches,
		hasMultipleBranches,
		activeDoctors,
		hasMultipleDoctors,
		hasMultipleChairs,
		myChair,
		isMyChairActive,
		handleSelectMyChair,
		isOptionsMenuOpen,
		setIsOptionsMenuOpen,
		optionsMenuRef,
		isAddChairModalOpen,
		setIsAddChairModalOpen,
		handleOpenAddChair,
		handleRepeatBookingOffset,
	} = useScheduleFilters(props);

	return (
		<>
			<section
				className="schedule-filter-strip min-h-[48px] h-12 max-h-12 sm:h-9 sm:max-h-9 flex flex-nowrap items-center justify-start sm:justify-between gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 border-b border-[var(--line)] bg-[var(--paper)] max-w-full overflow-hidden shrink-0 select-none"
				aria-label="Сохраненные фильтры расписания"
				data-testid="schedule-toolbar"
				role="toolbar"
			>
				{/* 1. Левый остров (Навигация): Степер даты (< ДД.ММ.ГГГГ >) + кнопка «Сегодня» */}
				<div className="schedule-toolbar-island-nav flex items-center gap-1 shrink-0">
					<DateRangeQuickButtons
						currentDateIso={currentDateIso}
						formattedCurrentDate={formattedCurrentDate}
						todayIso={todayIso}
						stepScheduleDay={stepScheduleDay}
						setScheduleDateFilter={setScheduleDateFilter}
					/>
				</div>

				{/* 2. Центральный остров (Оперативный фильтр смены): Очередь дня + компактный селектор смены */}
				<div className="schedule-toolbar-island-center flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden px-1">
					<StatusFilterToggleGroup
						scheduleStatusFilter={scheduleStatusFilter ?? null}
						setScheduleStatusFilter={setScheduleStatusFilter ?? (() => {})}
						queueCounts={queueCounts}
						activeScheduleFilterCount={activeScheduleFilterCount}
						resetScheduleFilters={resetScheduleFilters}
					/>

					<CabinetFilterBar
						activeScheduleFilterCount={activeScheduleFilterCount}
						scheduleStatusFilter={scheduleStatusFilter ?? null}
						resetScheduleFilters={resetScheduleFilters}
						setScheduleStatusFilter={setScheduleStatusFilter ?? (() => {})}
						queueCounts={queueCounts}
						hasMultipleBranches={hasMultipleBranches}
						selectedBranchId={selectedBranchId}
						onSelectBranch={onSelectBranch}
						activeBranches={activeBranches}
						hasMultipleChairs={hasMultipleChairs}
						myChair={myChair}
						isMyChairActive={isMyChairActive}
						handleSelectMyChair={handleSelectMyChair}
						hasMultipleDoctors={hasMultipleDoctors}
						activeDoctors={activeDoctors}
						scheduleDoctorFilterId={scheduleDoctorFilterId}
						setScheduleDoctorFilterId={setScheduleDoctorFilterId}
						displayChairs={displayChairs}
						scheduleChairFilterId={scheduleChairFilterId}
						setScheduleChairFilterId={setScheduleChairFilterId}
						handleOpenAddChair={handleOpenAddChair}
						activeFilterSummary={activeFilterSummary}
					/>
				</div>

				{/* 3. Правый остров (Действия и режимы): Сегментированный переключатель [ ≡ Лента | ☷ Сетка | 🖨 Кресла ], главная кнопка [ + Запись ] (Primary CTA) и меню вторичных инструментов [ ⋮ Опции ] */}
				<div className="schedule-toolbar-island-actions flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-[var(--line)] bg-[var(--paper)] relative z-10">
					{/* 1-Click View Mode Switcher: [ Лента | Сетка | По креслам ] */}
					{setScheduleViewMode && (
						<div
							className="schedule-view-mode-segmented dente-segmented-bar hidden sm:inline-flex shrink-0 select-none h-8 min-h-[32px] max-h-8 p-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] gap-0.5 items-center"
							role="group"
							aria-label="Режим отображения"
						>
							<button
								type="button"
								onClick={() => setScheduleViewMode("timeline")}
								className={`schedule-view-mode-btn dente-segmented-item ${
									scheduleViewMode === "timeline" ? "active font-semibold" : ""
								} h-7 min-h-[26px] max-h-7 rounded-md px-2 text-[12px] font-medium inline-flex items-center gap-1.5`}
								title="Лента приемов по дням"
								aria-label="Лента по дням"
								aria-pressed={scheduleViewMode === "timeline"}
								data-testid="schedule-view-mode-timeline"
							>
								<List size={13} className="shrink-0 opacity-80" aria-hidden="true" />
								<span className="hidden 2xl:inline">Лента</span>
							</button>
							<button
								type="button"
								onClick={() => setScheduleViewMode("grid")}
								className={`schedule-view-mode-btn dente-segmented-item ${
									scheduleViewMode === "grid" ? "active font-semibold" : ""
								} h-7 min-h-[26px] max-h-7 rounded-md px-2 text-[12px] font-medium inline-flex items-center gap-1.5`}
								title="Сетка по кабинетам и креслам"
								aria-label="Сетка по кабинетам"
								aria-pressed={scheduleViewMode === "grid"}
								data-testid="schedule-view-mode-grid"
							>
								<LayoutGrid size={13} className="shrink-0 opacity-80" aria-hidden="true" />
								<span className="hidden 2xl:inline">Сетка</span>
							</button>
							<button
								type="button"
								onClick={() => setScheduleViewMode("chairs")}
								className={`schedule-view-mode-btn dente-segmented-item ${
									scheduleViewMode === "chairs" ? "active font-semibold" : ""
								} h-7 min-h-[26px] max-h-7 rounded-md px-2 text-[12px] font-medium inline-flex items-center gap-1.5`}
								title="Режим расписания по креслам"
								aria-label="По креслам"
								aria-pressed={scheduleViewMode === "chairs"}
								data-testid="schedule-view-mode-chairs"
							>
								<Armchair size={13} className="shrink-0 opacity-80" aria-hidden="true" />
								<span className="hidden 2xl:inline">Кресла</span>
							</button>
						</div>
					)}

					{/* 1-Click Primary Quick Booking Action */}
					{onQuickBooking && (
						<button
							type="button"
							onClick={onQuickBooking}
							className="schedule-toolbar-primary-quick-booking-btn primary-button h-8 min-h-[32px] max-h-8 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
							data-testid="schedule-toolbar-primary-quick-booking-btn"
							data-tour="schedule-booking"
							title="Быстрая запись (N) / Новая запись пациента на прием"
							aria-label="Быстрая запись (+ Запись)"
						>
							<Plus size={14} className="shrink-0" aria-hidden="true" />
							<span className="whitespace-nowrap font-semibold">Запись</span>
						</button>
					)}

					{/* 1-Click Shift & Chair Range Actions (Desktop High-Resolution View) */}
					{onOpenDoctorShiftDrawer && (
						<button
							type="button"
							onClick={onOpenDoctorShiftDrawer}
							className="schedule-toolbar-shift-drawer-btn hidden 2xl:inline-flex items-center gap-1.5 h-8 min-h-[32px] max-h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] text-xs font-semibold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
							data-testid="schedule-toolbar-doctor-shift-btn"
							title="Назначить смену врача"
							aria-label="График смен"
						>
							<Users size={13} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
							<span>График смен</span>
						</button>
					)}
					{onOpenChairDateRangeModal && (
						<button
							type="button"
							onClick={onOpenChairDateRangeModal}
							className="schedule-toolbar-chair-range-btn hidden 2xl:inline-flex items-center gap-1.5 h-8 min-h-[32px] max-h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] text-xs font-semibold cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
							data-testid="schedule-toolbar-chair-range-btn"
							title="Назначить период кресел"
							aria-label="Период кресел"
						>
							<CalendarRange size={13} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
							<span>Период кресел</span>
						</button>
					)}

					{/* Secondary Actions Overflow Dropdown Menu */}
					<ScheduleOptionsDropdown
						isOptionsMenuOpen={isOptionsMenuOpen}
						setIsOptionsMenuOpen={setIsOptionsMenuOpen}
						optionsMenuRef={optionsMenuRef}
						onQuickBooking={onQuickBooking || (() => {})}
						setScheduleViewMode={setScheduleViewMode}
						scheduleViewMode={scheduleViewMode}
						hasMultipleBranches={hasMultipleBranches}
						selectedBranchId={selectedBranchId}
						onSelectBranch={onSelectBranch}
						activeBranches={activeBranches}
						activeScheduleFilterCount={activeScheduleFilterCount}
						resetScheduleFilters={resetScheduleFilters}
						hasMultipleChairs={hasMultipleChairs}
						myChair={myChair}
						isMyChairActive={isMyChairActive}
						handleSelectMyChair={handleSelectMyChair}
						hasMultipleDoctors={hasMultipleDoctors}
						activeDoctors={activeDoctors}
						scheduleDoctorFilterId={scheduleDoctorFilterId}
						setScheduleDoctorFilterId={setScheduleDoctorFilterId}
						displayChairs={displayChairs}
						scheduleChairFilterId={scheduleChairFilterId}
						setScheduleChairFilterId={setScheduleChairFilterId}
						setScheduleDateFilter={setScheduleDateFilter}
						tomorrowIso={tomorrowIso}
						scheduleStatusFilter={scheduleStatusFilter}
						setScheduleStatusFilter={setScheduleStatusFilter}
						onSelectWholeWeek={onSelectWholeWeek}
						handleRepeatBookingOffset={handleRepeatBookingOffset}
						gridStepMinutes={gridStepMinutes}
						onGridStepChange={onGridStepChange}
						handleOpenAddChair={handleOpenAddChair}
						onOpenPatientSearch={onOpenPatientSearch}
						onToggleSmartAi={onToggleSmartAi}
						onOpenDoctorFreeSlots={onOpenDoctorFreeSlots}
						onOpenPreventiveInspection={onOpenPreventiveInspection}
						preventiveInspectionCount={preventiveInspectionCount}
						onOpenTomorrowReminders={onOpenTomorrowReminders}
						onEmergencyCitoBooking={onEmergencyCitoBooking}
						onToggleShiftAnalytics={onToggleShiftAnalytics}
						showShiftAnalytics={showShiftAnalytics}
						onOpenShiftRoster={onOpenShiftRoster}
						onOpenDoctorShiftDrawer={onOpenDoctorShiftDrawer}
						onOpenChairDateRangeModal={onOpenChairDateRangeModal}
						onOpenWaitlist={onOpenWaitlist}
						waitlistCount={waitlistCount}
						onToggleConfirmations={onToggleConfirmations}
						showConfirmationsPanel={showConfirmationsPanel}
						onToggleFreedSlots={onToggleFreedSlots}
						showFreedSlotsPanel={showFreedSlotsPanel}
						onToggleClipboard={onToggleClipboard}
						showClipboardPanel={showClipboardPanel}
						onOpenCalendarSync={onOpenCalendarSync}
					/>
				</div>
			</section>

			{!onOpenAddChair && isAddChairModalOpen && (
				<QuickAddChairModal
					isOpen={isAddChairModalOpen}
					onClose={() => setIsAddChairModalOpen(false)}
					existingChairsCount={chairs.length || displayChairs.length}
					{...(onAddChair ? { onAddChair } : {})}
				/>
			)}
		</>
	);
}
