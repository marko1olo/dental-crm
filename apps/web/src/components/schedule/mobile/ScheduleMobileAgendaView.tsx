import type { Appointment } from "@dental/shared";
import {
	Armchair,
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	Plus,
	User,
	Users,
} from "lucide-react";
import React, { memo } from "react";
import { useScheduleStore } from "../../../store/scheduleStore";
import { formatDoctorShortName } from "../appointmentCardHelpers";
import "../scheduleMobileAgenda.css";
import { ScheduleMobileDrawerContainer } from "./ScheduleMobileDrawerContainer";
import {
	extractToothBadge,
	type ScheduleMobileAgendaViewProps,
} from "./scheduleMobileAgendaTypes";
import { ScheduleMobileTimelineRow } from "./ScheduleMobileTimelineRow";
import { useScheduleMobileAgendaState } from "./useScheduleMobileAgendaState";

export { extractToothBadge };
export type { ScheduleMobileAgendaViewProps };

/**
 * ScheduleMobileBottomBar — Apple HIG Sticky Floating Action Bar.
 * Anchored in Natural Thumb Zone with safe-area-inset-bottom padding.
 */
export const ScheduleMobileBottomBar: React.FC<{
	isVisible: boolean;
	onAction: () => void;
}> = ({ isVisible, onAction }) => {
	if (!isVisible) return null;
	return (
		<div className="schedule-mobile-bottom-bar fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 w-full z-40 p-3 bg-[var(--paper)]/90 backdrop-blur-md border-t border-[var(--line)] box-border">
			<button
				type="button"
				className="primary-button schedule-mobile-primary-action-btn w-full h-[52px] min-h-[44px] rounded-2xl bg-[var(--teal,#0d9488)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-700/20 active:scale-[0.98] transition-all cursor-pointer"
				onClick={onAction}
				data-testid="schedule-mobile-add-btn"
			>
				<span>+ Записать визит</span>
			</button>
		</div>
	);
};

/**
 * ScheduleMobileAgendaView — Canonical SSOT for Mobile Schedule Agenda (Mandate 8b, Apple HIG).
 * Dedicated vertical timeline with 7-day Apple calendar strip, horizontal filter chips,
 * 44x44px touch targets, floating bottom action bar, and strictly 0px horizontal drift.
 */
export const ScheduleMobileAgendaView: React.FC<ScheduleMobileAgendaViewProps> =
	memo(function ScheduleMobileAgendaView(props) {
		const {
			onDateChange,
			onSlotClick,
			selectedChairId = null,
			onSelectChair,
			selectedDoctorId = null,
			onSelectDoctor,
			onQuickBooking,
		} = props;

		const state = useScheduleMobileAgendaState(props);
		const {
			selectedMobileAppt,
			setSelectedMobileAppt,
			todayKey,
			effectiveDateKey,
			weekDays,
			monthHeaderTitle,
			handleShiftWeek,
			doctors,
			chairs,
			timelineItems,
		} = state;

		const handleCreateBooking = () => {
			if (onSlotClick) {
				onSlotClick({
					dateKey: effectiveDateKey,
					doctorUserId: selectedDoctorId || null,
					chairId: selectedChairId || null,
					durationMinutes: 30,
				});
			} else if (onQuickBooking) {
				onQuickBooking();
			}
		};

		return (
			<div
				className="schedule-mobile-agenda w-full max-w-[100vw] overflow-x-clip min-h-screen bg-[var(--paper-soft)] pb-28 select-none"
				data-testid="schedule-mobile-agenda-view"
				role="region"
				aria-label="Расписание: мобильная повестка дня (Agenda View)"
				style={{ maxWidth: "100vw", overflowX: "clip" }}
			>
				{/* 1. Month Navigation Bar */}
				<div className="schedule-mobile-month-nav flex items-center justify-between px-3 py-2 bg-[var(--paper)] border-b border-[var(--line)]">
					<div className="schedule-mobile-month-title text-base font-bold text-[var(--ink)]">
						{monthHeaderTitle}
					</div>
					<div className="schedule-mobile-nav-buttons flex items-center gap-1">
						{effectiveDateKey !== todayKey && (
							<button
								type="button"
								className="secondary-button schedule-mobile-today-chip min-h-[36px] px-2.5 py-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] active:scale-95 transition-all"
								onClick={() => onDateChange(todayKey)}
								aria-label="Перейти на сегодня"
							>
								Сегодня
							</button>
						)}
						<button
							type="button"
							className="secondary-button schedule-mobile-nav-btn min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all"
							onClick={() => handleShiftWeek(-7)}
							aria-label="Предыдущая неделя"
							title="Неделя назад"
						>
							<ChevronLeft size={20} />
						</button>
						<button
							type="button"
							className="secondary-button schedule-mobile-nav-btn min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all"
							onClick={() => handleShiftWeek(7)}
							aria-label="Следующая неделя"
							title="Неделя вперёд"
						>
							<ChevronRight size={20} />
						</button>
					</div>
				</div>

				{/* 2. Apple iOS 7-Day Week Strip */}
				<div
					className="schedule-mobile-day-strip flex items-center justify-between px-2 py-1.5 bg-[var(--paper)] border-b border-[var(--line)] overflow-x-auto scrollbar-none"
					role="tablist"
					aria-label="Выбор дня недели"
				>
					{weekDays.map((day) => (
						<button
							key={day.dateIso}
							type="button"
							role="tab"
							aria-selected={day.isSelected}
							className={`schedule-mobile-day-cell flex-1 min-w-[42px] min-h-[54px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all ${
								day.isSelected
									? "is-selected bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: day.isToday
										? "is-today bg-[var(--paper-soft)] text-[var(--teal,#0d9488)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
							onClick={() => {
								useScheduleStore.getState().setScheduleDateFilter(day.dateIso);
								onDateChange(day.dateIso);
							}}
						>
							<span className="schedule-mobile-day-label text-[11px] opacity-80">
								{day.isToday ? `★ ${day.dayLabel}` : day.dayLabel}
							</span>
							<span className="schedule-mobile-day-num text-sm font-bold font-mono">
								{day.dayNumber}
							</span>
							{day.hasAppointments ? (
								<span
									className={`schedule-mobile-day-dot w-1.5 h-1.5 rounded-full ${
										day.isSelected ? "bg-white" : "bg-[var(--teal,#0d9488)]"
									}`}
									title={`Записей: ${day.appointmentCount}`}
								/>
							) : (
								<span className="schedule-mobile-day-dot-empty w-1.5 h-1.5" />
							)}
						</button>
					))}
				</div>

				{/* 3. Horizontal Filter Chips for Doctors and Chairs */}
				<div className="schedule-mobile-chips-wrapper py-2 px-3 overflow-x-auto scrollbar-none bg-[var(--paper)] border-b border-[var(--line)]">
					<div className="schedule-mobile-chips-scroller flex items-center gap-1.5 min-w-max">
						<button
							type="button"
							className={`schedule-mobile-filter-chip min-h-[36px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
								!selectedDoctorId && !selectedChairId
									? "active bg-[var(--teal,#0d9488)] text-white font-bold shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
							}`}
							onClick={() => {
								useScheduleStore.getState().setScheduleDoctorFilterId(null);
								useScheduleStore.getState().setScheduleChairFilterId(null);
								if (onSelectDoctor) onSelectDoctor(null);
								if (onSelectChair) onSelectChair(null);
							}}
						>
							<Users size={13} className="shrink-0" />
							<span>Все врачи и кабинеты</span>
						</button>

						{doctors.map((doc: any) => {
							const isSelected = selectedDoctorId === doc.id;
							return (
								<button
									key={doc.id}
									type="button"
									className={`schedule-mobile-filter-chip min-h-[36px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
										isSelected
											? "active bg-[var(--teal,#0d9488)] text-white font-bold shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
									}`}
									onClick={() => {
										const nextVal = isSelected ? null : doc.id;
										useScheduleStore.getState().setScheduleDoctorFilterId(nextVal);
										if (onSelectDoctor) onSelectDoctor(nextVal);
									}}
								>
									<User size={13} className="shrink-0" />
									<span>{formatDoctorShortName(doc.fullName)}</span>
								</button>
							);
						})}

						{chairs.map((chair: any) => {
							const isSelected = selectedChairId === chair.id;
							return (
								<button
									key={chair.id}
									type="button"
									className={`schedule-mobile-filter-chip min-h-[36px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
										isSelected
											? "active bg-[var(--teal,#0d9488)] text-white font-bold shadow-xs"
											: "bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
									}`}
									onClick={() => {
										const nextVal = isSelected ? null : chair.id;
										useScheduleStore.getState().setScheduleChairFilterId(nextVal);
										if (onSelectChair) onSelectChair(nextVal);
									}}
								>
									<Armchair size={13} className="shrink-0" />
									<span>{chair.name}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* 4. Vertical Agenda Timeline List */}
				<div className="schedule-mobile-agenda-list p-3 flex flex-col gap-2.5">
					{timelineItems.length === 0 ? (
						<div className="schedule-mobile-empty-day flex flex-col items-center justify-center p-8 bg-[var(--paper)] border border-[var(--line)] rounded-2xl text-center gap-3 mt-4">
							<CalendarIcon size={36} className="text-[var(--muted)] opacity-50" />
							<div className="text-sm font-semibold text-[var(--ink)]">
								На этот день нет записей
							</div>
							<p className="text-xs text-[var(--muted)] max-w-xs">
								Расписание свободно. Выберите свободный слот или нажмите кнопку ниже.
							</p>
							<button
								type="button"
								onClick={handleCreateBooking}
								className="mt-2 min-h-[44px] px-4 rounded-xl bg-[var(--teal,#0d9488)] text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
							>
								<Plus size={15} /> Записать первого пациента
							</button>
						</div>
					) : (
						timelineItems.map((item, idx) => (
							<ScheduleMobileTimelineRow
								key={item.type === "appointment" ? item.appointment.id : `gap-${idx}`}
								item={item}
								effectiveDateKey={effectiveDateKey}
								selectedDoctorId={selectedDoctorId}
								selectedChairId={selectedChairId}
								dashboard={props.dashboard}
								patientName={props.patientName}
								appointmentLabels={props.appointmentLabels}
								onSlotClick={onSlotClick}
								onSelectMobileAppt={setSelectedMobileAppt}
								onQuickStatusChange={props.onQuickStatusChange}
								onOpenVisit={props.onOpenVisit}
							/>
						))
					)}
				</div>

				{/* 5. Apple HIG Sticky Floating Bottom Bar */}
				<ScheduleMobileBottomBar
					isVisible={!selectedMobileAppt}
					onAction={handleCreateBooking}
				/>

				{/* 6. Mobile Appointment Detail & Quick Booking Drawer Container */}
				<ScheduleMobileDrawerContainer props={props} state={state} />
			</div>
		);
	});
