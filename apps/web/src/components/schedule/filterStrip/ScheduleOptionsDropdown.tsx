import {
	Calendar,
	Clock,
	MoreVertical,
	Plus,
} from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";
import { ScheduleOptionsMobileSection } from "./ScheduleOptionsMobileSection";
import { ScheduleOptionsToolsSection } from "./ScheduleOptionsToolsSection";
import type {
	ScheduleBranch,
	ScheduleChair,
	ScheduleStaffMember,
} from "./types";

export interface ScheduleOptionsDropdownProps {
	isOptionsMenuOpen: boolean;
	setIsOptionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	optionsMenuRef: React.RefObject<HTMLDivElement | null>;
	onQuickBooking?: () => void;
	setScheduleViewMode?: (mode: "timeline" | "grid" | "chairs") => void;
	scheduleViewMode?: "timeline" | "grid" | "chairs";
	hasMultipleBranches: boolean;
	selectedBranchId?: string | null;
	onSelectBranch?: (branchId: string | null) => void;
	activeBranches: ScheduleBranch[];
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	handleSelectMyChair: () => void;
	hasMultipleDoctors: boolean;
	activeDoctors: ScheduleStaffMember[];
	scheduleDoctorFilterId?: string | null;
	setScheduleDoctorFilterId?: (id: string | null) => void;
	displayChairs: readonly ScheduleChair[];
	scheduleChairFilterId?: string | null;
	setScheduleChairFilterId?: (id: string | null) => void;
	setScheduleDateFilter: (date: string) => void;
	tomorrowIso: string;
	scheduleStatusFilter?: string | null;
	setScheduleStatusFilter?: (status: string | null) => void;
	onSelectWholeWeek?: () => void;
	handleRepeatBookingOffset: (days: 7 | 14 | 30) => void;
	gridStepMinutes?: 15 | 30 | 60;
	onGridStepChange?: (step: 15 | 30 | 60) => void;
	handleOpenAddChair: () => void;
	onOpenPatientSearch?: () => void;
	onToggleSmartAi?: () => void;
	onOpenDoctorFreeSlots?: () => void;
	onOpenPreventiveInspection?: () => void;
	preventiveInspectionCount?: number;
	onOpenTomorrowReminders?: () => void;
	onEmergencyCitoBooking?: () => void;
	onToggleShiftAnalytics?: () => void;
	showShiftAnalytics?: boolean;
	onOpenShiftRoster?: () => void;
	onOpenWaitlist?: () => void;
	waitlistCount?: number;
	onToggleConfirmations?: () => void;
	showConfirmationsPanel?: boolean;
	onToggleFreedSlots?: () => void;
	showFreedSlotsPanel?: boolean;
	onToggleClipboard?: () => void;
	showClipboardPanel?: boolean;
	onOpenCalendarSync?: () => void;
}

export function ScheduleOptionsDropdown({
	isOptionsMenuOpen,
	setIsOptionsMenuOpen,
	optionsMenuRef,
	onQuickBooking,
	setScheduleViewMode,
	scheduleViewMode = "timeline",
	hasMultipleBranches,
	selectedBranchId,
	onSelectBranch,
	activeBranches,
	activeScheduleFilterCount,
	resetScheduleFilters,
	hasMultipleChairs,
	myChair,
	isMyChairActive,
	handleSelectMyChair,
	hasMultipleDoctors,
	activeDoctors,
	scheduleDoctorFilterId,
	setScheduleDoctorFilterId,
	displayChairs,
	scheduleChairFilterId,
	setScheduleChairFilterId,
	setScheduleDateFilter,
	tomorrowIso,
	scheduleStatusFilter,
	setScheduleStatusFilter,
	onSelectWholeWeek,
	handleRepeatBookingOffset,
	gridStepMinutes = 30,
	onGridStepChange,
	handleOpenAddChair,
	onOpenPatientSearch,
	onToggleSmartAi,
	onOpenDoctorFreeSlots,
	onOpenPreventiveInspection,
	preventiveInspectionCount = 0,
	onOpenTomorrowReminders,
	onEmergencyCitoBooking,
	onToggleShiftAnalytics,
	showShiftAnalytics = false,
	onOpenShiftRoster,
	onOpenWaitlist,
	waitlistCount = 0,
	onToggleConfirmations,
	showConfirmationsPanel = false,
	onToggleFreedSlots,
	showFreedSlotsPanel = false,
	onToggleClipboard,
	showClipboardPanel = false,
	onOpenCalendarSync,
}: ScheduleOptionsDropdownProps): ReactElement {
	return (
		<div
			className="relative inline-flex items-center shrink-0 flex-shrink-0 min-w-fit"
			ref={optionsMenuRef}
			style={{ flexShrink: 0, minWidth: "fit-content" }}
		>
			<button
				type="button"
				onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
				className="schedule-toolbar-options-btn secondary-button h-8 min-h-[32px] max-h-8 px-2.5 rounded-lg text-[13px] font-medium shrink-0 flex-shrink-0 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
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
				{/* Quick Booking Option in Dropdown */}
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

				{/* Mobile filters & view switchers */}
				<ScheduleOptionsMobileSection
					setScheduleViewMode={setScheduleViewMode}
					scheduleViewMode={scheduleViewMode}
					setIsOptionsMenuOpen={setIsOptionsMenuOpen}
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
				/>

				{/* Quick dates */}
				<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
					Навигация по датам
				</div>
				<button
					type="button"
					onClick={() => {
						setScheduleDateFilter("");
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Сегодня</span>
				</button>

				<button
					type="button"
					onClick={() => {
						setScheduleDateFilter(tomorrowIso);
						setIsOptionsMenuOpen(false);
					}}
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
					title="Перейти на сводку смены и оперативные очереди"
				>
					<Clock size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Оперативная сводка смены</span>
				</button>

				{/* Shift Queue Statuses in Options Menu */}
				{setScheduleStatusFilter && (
					<div className="px-2 py-1.5 border-t border-[var(--line)] mt-1 pt-1.5">
						<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
							Очередь смены
						</div>
						<div className="grid grid-cols-2 gap-1">
							<button
								type="button"
								onClick={() => {
									setScheduleStatusFilter("all");
									setIsOptionsMenuOpen(false);
								}}
								className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
									!scheduleStatusFilter || scheduleStatusFilter === "all"
										? "bg-[var(--teal,var(--brand-primary))] text-white"
										: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--teal-soft)]"
								}`}
							>
								Все статусы
							</button>
							<button
								type="button"
								onClick={() => {
									setScheduleStatusFilter("arrived");
									setIsOptionsMenuOpen(false);
								}}
								className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
									scheduleStatusFilter === "arrived"
										? "bg-amber-500 text-white"
										: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
								}`}
							>
								Ожидает приёма
							</button>
							<button
								type="button"
								onClick={() => {
									setScheduleStatusFilter("in_treatment");
									setIsOptionsMenuOpen(false);
								}}
								className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
									scheduleStatusFilter === "in_treatment"
										? "bg-[var(--teal,var(--brand-primary))] text-white"
										: "bg-[var(--teal-soft)] text-[var(--teal-dark)] hover:bg-[var(--teal-surface)]"
								}`}
							>
								На приёме
							</button>
							<button
								type="button"
								onClick={() => {
									setScheduleStatusFilter("completed");
									setIsOptionsMenuOpen(false);
								}}
								className={`px-2 py-1 rounded-md text-xs font-semibold text-left transition-colors ${
									scheduleStatusFilter === "completed"
										? "bg-slate-700 text-white"
										: "bg-slate-500/10 text-slate-700 dark:text-slate-300 hover:bg-slate-500/20"
								}`}
							>
								Ожидает оплаты
							</button>
						</div>
					</div>
				)}

				<button
					type="button"
					onClick={() => {
						if (onSelectWholeWeek) {
							onSelectWholeWeek();
						} else if (setScheduleViewMode) {
							setScheduleViewMode("timeline");
						}
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					role="menuitem"
				>
					<Calendar size={14} className="text-[var(--teal,var(--brand-primary))]" />
					<span>Вся неделя</span>
				</button>

				{/* Repeat booking offsets */}
				<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
					Повторный прием (+Повтор)
				</div>
				<button
					type="button"
					onClick={() => {
						handleRepeatBookingOffset(7);
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
					role="menuitem"
				>
					<span>Через 7 дней</span>
					<span className="text-[10px] font-mono opacity-70">+7д</span>
				</button>
				<button
					type="button"
					onClick={() => {
						handleRepeatBookingOffset(14);
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
					role="menuitem"
				>
					<span>Через 14 дней</span>
					<span className="text-[10px] font-mono opacity-70">+14д</span>
				</button>
				<button
					type="button"
					onClick={() => {
						handleRepeatBookingOffset(30);
						setIsOptionsMenuOpen(false);
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center justify-between cursor-pointer"
					role="menuitem"
				>
					<span>Через 1 месяц</span>
					<span className="text-[10px] font-mono opacity-70">+30д</span>
				</button>

				{/* Actions & Utilities */}
				<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1.5">
					Инструменты расписания
				</div>

				{/* Переключатель шага сетки (15 / 30 / 60 мин) */}
				<div className="flex items-center justify-between px-2.5 py-1 text-xs">
					<span className="font-semibold text-[var(--muted)]">Шаг сетки:</span>
					<div
						className="schedule-grid-step-segmented shrink-0 select-none"
						role="group"
						aria-label="Шаг сетки расписания"
						data-testid="schedule-filter-grid-step-selector"
					>
						{([15, 30, 60] as const).map((step) => (
							<button
								key={step}
								type="button"
								onClick={() => {
									onGridStepChange?.(step);
									setIsOptionsMenuOpen(false);
								}}
								className={`schedule-grid-step-btn ${
									(gridStepMinutes ?? 30) === step ? "active" : ""
								}`}
								data-testid={`filter-strip-step-${step}`}
							>
								{step}м
							</button>
						))}
					</div>
				</div>

				<button
					type="button"
					onClick={() => {
						setIsOptionsMenuOpen(false);
						handleOpenAddChair();
					}}
					className="w-full min-h-[44px] sm:min-h-0 sm:py-1.5 py-2.5 text-left px-2.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] transition-colors flex items-center gap-2 cursor-pointer"
					style={{ minHeight: "44px" }}
					role="menuitem"
					data-testid="schedule-options-add-chair-btn"
					title="Быстрое добавление кресла или кабинета в расписание"
				>
					<Plus size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" aria-hidden="true" />
					<span>Добавить кресло (+ Кресло)</span>
				</button>

				{/* Secondary tools & panels section */}
				<ScheduleOptionsToolsSection
					setIsOptionsMenuOpen={setIsOptionsMenuOpen}
					onOpenPatientSearch={onOpenPatientSearch}
					onToggleSmartAi={onToggleSmartAi}
					setScheduleViewMode={setScheduleViewMode}
					scheduleViewMode={scheduleViewMode}
					onOpenDoctorFreeSlots={onOpenDoctorFreeSlots}
					onOpenPreventiveInspection={onOpenPreventiveInspection}
					preventiveInspectionCount={preventiveInspectionCount}
					onOpenTomorrowReminders={onOpenTomorrowReminders}
					onEmergencyCitoBooking={onEmergencyCitoBooking}
					onToggleShiftAnalytics={onToggleShiftAnalytics}
					showShiftAnalytics={showShiftAnalytics}
					onOpenShiftRoster={onOpenShiftRoster}
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
		</div>
	);
}
