/**
 * DENTE Dental CRM — Schedule Unified Single-Row Toolbar (SSOT)
 *
 * Consolidates navigation, doctor/chair filters, view modes, and primary CTA into
 * STRICTLY 1 COMPACT ROW (36-40px, sm:h-9) per Apple macOS & Linear standards.
 * Eliminates 27-button clutter landfill and direct prop-drilling by connecting to useScheduleStore.
 *
 * Architecture (Mandate 8b: Modular Orchestrator <= 300 lines):
 * - Island 1 (Left): DateNavigator (Date Stepper + "Сегодня" + Mini-Calendar)
 * - Island 2 (Center): ScheduleFilterChips (Wheel Scrollable Doctor & Chair Chips + Моё кресло + Автодозвон)
 * - Island 3 (Right): Exactly 1 Primary CTA ("+ Запись", #0d9488) + ScheduleViewModeSwitch + ScheduleOptionsMenu
 *
 * Invariants:
 * - Desktop height: sm:min-h-[36px] sm:h-9 sm:max-h-9
 * - Horizontal wheel scroll: e.currentTarget.scrollLeft += e.deltaY
 * - Tools & Chips: Автодозвон, Моё кресло
 * - Zero multi-row wrapping (flex-nowrap, overflow-hidden)
 * - Zero hardcoded hex colors, 100% design tokens (var(--paper), var(--ink), var(--line), var(--teal))
 */

import React, { useRef, useState, useEffect, useMemo, type ReactElement } from "react";
import { Plus } from "lucide-react";
import { useScheduleStore } from "../../store/scheduleStore";
import { QuickAddChairModal } from "./QuickAddChairModal";
import { DEFAULT_CLINIC_CHAIRS } from "./filterStrip/constants";
import type { ScheduleFilterStripProps, ScheduleChair } from "./filterStrip/types";

// Toolbar decomposed modules (Mandate 8b Sweet Spot)
import { DateNavigator } from "./toolbarModules/DateNavigator";
import { ScheduleFilterChips } from "./toolbarModules/ScheduleFilterChips";
import { ScheduleViewModeSwitch } from "./toolbarModules/ScheduleViewModeSwitch";
import { ScheduleOptionsMenu } from "./toolbarModules/ScheduleOptionsMenu";

export interface ScheduleUnifiedToolbarProps extends Partial<ScheduleFilterStripProps> {
	className?: string;
}

export function ScheduleUnifiedToolbar(props: ScheduleUnifiedToolbarProps): ReactElement {
	// 1. Direct integration with useScheduleStore for SSOT state (eliminates prop-drilling)
	const store = useScheduleStore();

	const dateFilter = props.scheduleDateFilter !== undefined ? props.scheduleDateFilter : (store.scheduleDateFilter ?? "");
	const setDateFilter = props.setScheduleDateFilter ?? store.setScheduleDateFilter;
	const doctorFilterId = props.scheduleDoctorFilterId !== undefined ? props.scheduleDoctorFilterId : store.scheduleDoctorFilterId;
	const setDoctorFilterId = props.setScheduleDoctorFilterId ?? store.setScheduleDoctorFilterId;
	const chairFilterId = props.scheduleChairFilterId !== undefined ? props.scheduleChairFilterId : store.scheduleChairFilterId;
	const setChairFilterId = props.setScheduleChairFilterId ?? store.setScheduleChairFilterId;
	const statusFilter = props.scheduleStatusFilter !== undefined ? props.scheduleStatusFilter : store.scheduleStatusFilter;
	const setStatusFilter = props.setScheduleStatusFilter ?? store.setScheduleStatusFilter;

	// Dates & Timestamps
	const localNow = useMemo(() => new Date(), []);
	const localTodayIso = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, "0")}-${String(localNow.getDate()).padStart(2, "0")}`;
	const todayIso = props.todayIso || localTodayIso;
	const currentDateIso = dateFilter || todayIso;
	const isToday = currentDateIso === todayIso;

	const formattedCurrentDate = useMemo(() => {
		const parts = currentDateIso.split("-");
		if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
			return `${parts[2]}.${parts[1]}.${parts[0]}`;
		}
		return currentDateIso;
	}, [currentDateIso]);

	// Stepper delta handler
	const handleStepDay = (delta: number) => {
		if (props.stepScheduleDay) {
			props.stepScheduleDay(delta);
			return;
		}
		const cur = new Date(currentDateIso);
		cur.setDate(cur.getDate() + delta);
		const nextIso = cur.toISOString().slice(0, 10);
		setDateFilter(nextIso);
	};

	// 2. Data items: Chairs & Doctors
	const activeChairs = (props.chairs || []).filter((c) => c?.active !== false);
	const displayChairs: readonly ScheduleChair[] = activeChairs.length > 0 ? activeChairs : DEFAULT_CLINIC_CHAIRS;
	const activeDoctors = useMemo(() => {
		return (props.staffMembers || []).filter(
			(m) => m?.active && (m?.role === "doctor" || m?.role === "owner")
		);
	}, [props.staffMembers]);

	const hasMultipleChairs = displayChairs.length > 1 && !props.isSoloDoctor;
	const hasMultipleDoctors = activeDoctors.length > 1 && !props.isSoloDoctor;

	// On-duty "Моё кресло" detection
	const myChair = useMemo(() => {
		if (displayChairs.length === 0) return null;
		if (props.currentDoctorId || doctorFilterId) {
			const effectiveDoc = props.currentDoctorId || doctorFilterId;
			if (props.chairDoctorAssignments) {
				const assignedChairId = Object.keys(props.chairDoctorAssignments).find(
					(cId) =>
						props.chairDoctorAssignments?.[cId]?.doctorId === effectiveDoc ||
						props.chairDoctorAssignments?.[cId]?.subShifts?.some((s) => s.doctorId === effectiveDoc)
				);
				if (assignedChairId) {
					return displayChairs.find((c) => c.id === assignedChairId) || null;
				}
			}
		}
		return displayChairs[0] || null;
	}, [displayChairs, props.chairDoctorAssignments, props.currentDoctorId, doctorFilterId]);

	const isMyChairActive = Boolean(myChair && chairFilterId === myChair.id);

	// 3. Dropdown Menu & Modals State
	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
	const [isAddChairModalOpen, setIsAddChairModalOpen] = useState(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOptionsMenuOpen(false);
		};
		if (isOptionsMenuOpen) {
			document.addEventListener("mousedown", handleOutside);
			document.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOptionsMenuOpen]);

	const isAllActive =
		(!doctorFilterId &&
			!chairFilterId &&
			(!statusFilter || statusFilter === "all") &&
			(props.activeScheduleFilterCount === undefined || props.activeScheduleFilterCount === 0));

	const handleResetAll = () => {
		props.resetScheduleFilters?.();
		setDoctorFilterId(null);
		setChairFilterId(null);
		setStatusFilter("all");
	};

	const handleSelectMyChair = () => {
		if (props.onSelectMyChair) {
			props.onSelectMyChair();
		} else if (myChair) {
			if (chairFilterId === myChair.id) {
				setChairFilterId(null);
			} else {
				setChairFilterId(myChair.id);
				const effectiveDoc =
					props.currentDoctorId ||
					doctorFilterId ||
					(props.staffMembers?.find((m) => m?.active && (m?.role === "doctor" || m?.role === "owner"))?.id ?? null);
				if (effectiveDoc) {
					setDoctorFilterId(effectiveDoc);
				}
			}
		}
	};

	const handleOpenAddChair = () => {
		if (props.onOpenAddChair) {
			props.onOpenAddChair();
		} else {
			setIsAddChairModalOpen(true);
		}
	};

	return (
		<>
			<section
				className={`schedule-unified-toolbar schedule-filter-strip min-h-[48px] h-12 max-h-12 sm:min-h-[36px] sm:h-9 sm:max-h-9 flex flex-nowrap items-center justify-between gap-1 sm:gap-2 px-2 sm:px-3 border-b border-[var(--line)] bg-[var(--paper)] max-w-full overflow-hidden shrink-0 select-none ${
					props.className || ""
				}`}
				aria-label="Панель инструментов расписания"
				data-testid="schedule-toolbar"
				role="toolbar"
			>
				{/* ══════ ОСТРОВ 1: НАВИГАЦИЯ И ДАТА ══════ */}
				<DateNavigator
					formattedCurrentDate={formattedCurrentDate}
					currentDateIso={currentDateIso}
					todayIso={todayIso}
					isToday={isToday}
					onStepDay={handleStepDay}
					onSetDate={setDateFilter}
				/>

				{/* ══════ ОСТРОВ 2: СКРОЛЛИРУЕМАЯ ПОЛОСА ЧИПОВ ВРАЧЕЙ И КРЕСЕЛ ══════ */}
				<ScheduleFilterChips
					isAllActive={isAllActive}
					onResetAll={handleResetAll}
					queueCounts={props.queueCounts}
					displayChairs={displayChairs}
					chairFilterId={chairFilterId}
					onSelectChair={(id) => setChairFilterId(id)}
					hasMultipleDoctors={hasMultipleDoctors}
					activeDoctors={activeDoctors}
					doctorFilterId={doctorFilterId}
					onSelectDoctor={(id) => setDoctorFilterId(id)}
					hasMultipleChairs={hasMultipleChairs}
					myChair={myChair}
					isMyChairActive={isMyChairActive}
					onSelectMyChair={handleSelectMyChair}
					onToggleConfirmations={props.onToggleConfirmations}
					onOpenAddChair={handleOpenAddChair}
					activeFilterSummary={props.activeFilterSummary}
				/>

				{/* ══════ ОСТРОВ 3: РЕЖИМ СЕТКИ, PRIMARY CTA И МЕНЮ «... ЕЩЁ» ══════ */}
				<div className="schedule-toolbar-island-actions flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-[var(--line)] bg-[var(--paper)] relative z-10">
					{/* Переключатель режимов: [ Лента | Сетка | Кресла ] */}
					<ScheduleViewModeSwitch
						viewMode={props.scheduleViewMode}
						onViewModeChange={props.setScheduleViewMode}
					/>

					{/* Ровно ОДНА Primary CTA кнопка («+ Новая запись», #0d9488, Мандат 8am) */}
					{props.onQuickBooking && (
						<button
							type="button"
							onClick={props.onQuickBooking}
							className="schedule-toolbar-primary-quick-booking-btn primary-button h-9 min-h-[36px] px-4 rounded-xl text-[13px] font-bold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-2xs whitespace-nowrap bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white transition-all"
							data-testid="schedule-toolbar-primary-quick-booking-btn"
							data-tour="schedule-booking"
							title="Новая запись на прием (+ Новая запись)"
							aria-label="Новая запись (N)"
						>
							<Plus size={15} className="shrink-0 stroke-[2.5]" aria-hidden="true" />
							<span className="whitespace-nowrap font-bold">Новая запись</span>
						</button>
					)}

					{/* Меню «... Ещё / Опции» (куда убраны все вторичные действия) */}
					<ScheduleOptionsMenu
						isOpen={isOptionsMenuOpen}
						onToggle={() => setIsOptionsMenuOpen((prev) => !prev)}
						onClose={() => setIsOptionsMenuOpen(false)}
						menuRef={optionsMenuRef}
						onQuickBooking={props.onQuickBooking}
						onSetDate={setDateFilter}
						localNow={localNow}
						onSelectWholeWeek={props.onSelectWholeWeek}
						statusFilter={statusFilter}
						onSetStatusFilter={setStatusFilter}
						queueCounts={props.queueCounts}
						onOpenAddChair={handleOpenAddChair}
						onOpenWaitlist={props.onOpenWaitlist}
						waitlistCount={props.waitlistCount}
						onOpenPendingOnlineBookings={props.onOpenPendingOnlineBookings}
						pendingOnlineBookingsCount={props.pendingOnlineBookingsCount}
						onToggleShiftAnalytics={props.onToggleShiftAnalytics}
						onOpenCalendarSync={props.onOpenCalendarSync}
						onOpenPatientSearch={props.onOpenPatientSearch}
						onEmergencyCitoBooking={props.onEmergencyCitoBooking}
						onOpenTomorrowReminders={props.onOpenTomorrowReminders}
						onGridStepChange={props.onGridStepChange}
						gridStepMinutes={props.gridStepMinutes}
					/>
				</div>
			</section>

			{/* Модалка добавления кресла при необходимости */}
			{!props.onOpenAddChair && isAddChairModalOpen && (
				<QuickAddChairModal
					isOpen={isAddChairModalOpen}
					onClose={() => setIsAddChairModalOpen(false)}
					existingChairsCount={props.chairs?.length || displayChairs.length}
					{...(props.onAddChair ? { onAddChair: props.onAddChair } : {})}
				/>
			)}
		</>
	);
}

export default ScheduleUnifiedToolbar;
