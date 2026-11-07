import type { Appointment } from "@dental/shared";
import {
	Armchair,
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	LayoutGrid,
	ListFilter,
	Plus,
	User,
	Users,
} from "lucide-react";
import React, { memo, useState } from "react";
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
				<Plus size={18} className="shrink-0 stroke-[2.5]" />
				<span>Новая запись</span>
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
		const [viewMode, setViewMode] = useState<"agenda" | "grid">("agenda");
		const {
			selectedMobileAppt,
			setSelectedMobileAppt,
			todayKey,
			tomorrowKey,
			effectiveDateKey,
			weekDays,
			monthHeaderTitle,
			handleShiftWeek,
			handleShiftDay,
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
				className="schedule-mobile-agenda w-full max-w-[100vw] overflow-x-clip min-h-screen bg-[var(--paper-soft)] pb-36 select-none"
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
								className="secondary-button schedule-mobile-today-chip min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] active:scale-95 transition-all"
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

				{/* 1.1 Apple HIG Segmented Controls: [ Сетка | Лента ] & [ Сегодня | Завтра | + День ] */}
				<div className="schedule-mobile-segmented-bar px-3 py-1.5 bg-[var(--paper)] border-b border-[var(--line-subtle)] flex flex-col items-center gap-1.5">
					<div
						className="flex w-full max-w-sm p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 shadow-2xs"
						role="tablist"
						aria-label="Режим отображения"
					>
						<button
							type="button"
							role="tab"
							aria-selected={viewMode === "grid"}
							onClick={() => setViewMode("grid")}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
								viewMode === "grid"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-view-mode-grid"
						>
							<LayoutGrid size={15} className="shrink-0" />
							<span>Сетка</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={viewMode === "agenda"}
							onClick={() => setViewMode("agenda")}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
								viewMode === "agenda"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-view-mode-agenda"
						>
							<ListFilter size={15} className="shrink-0" />
							<span>Лента</span>
						</button>
					</div>

					<div
						className="flex w-full max-w-sm p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1 shadow-2xs"
						role="group"
						aria-label="Быстрый выбор дня"
					>
						<button
							type="button"
							onClick={() => {
								useScheduleStore.getState().setScheduleDateFilter(todayKey);
								onDateChange(todayKey);
							}}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
								effectiveDateKey === todayKey
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-segment-today"
						>
							Сегодня
						</button>
						<button
							type="button"
							onClick={() => {
								useScheduleStore.getState().setScheduleDateFilter(tomorrowKey);
								onDateChange(tomorrowKey);
							}}
							className={`flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
								effectiveDateKey === tomorrowKey
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-bold"
									: "text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="schedule-mobile-segment-tomorrow"
						>
							Завтра
						</button>
						<button
							type="button"
							onClick={() => handleShiftDay(1)}
							className="flex-1 min-h-[44px] py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-[var(--ink)] hover:bg-[var(--paper)] active:scale-95 flex items-center justify-center gap-1"
							data-testid="schedule-mobile-segment-plus-day"
							title="Сдвиг на +1 день вперед"
						>
							<span>+ День</span>
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
							className={`schedule-mobile-day-cell flex-1 min-w-[44px] min-h-[56px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all ${
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
							className={`schedule-mobile-filter-chip min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
							<Users size={14} className="shrink-0" />
							<span>Все врачи и кабинеты</span>
						</button>

						{doctors.map((doc: any) => {
							const isSelected = selectedDoctorId === doc.id;
							return (
								<button
									key={doc.id}
									type="button"
									className={`schedule-mobile-filter-chip min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
									<User size={14} className="shrink-0" />
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
									className={`schedule-mobile-filter-chip min-h-[44px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
									<Armchair size={14} className="shrink-0" />
									<span>{chair.name}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* 4. Display Area: Grid vs Agenda */}
				{viewMode === "grid" ? (
					<div
						className="schedule-mobile-grid-mode p-3 flex flex-col gap-3"
						data-testid="schedule-mobile-grid-container"
					>
						{chairs.length === 0 ? (
							<div className="p-6 text-center text-sm text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
								Кабинеты ещё не настроены
							</div>
						) : (
							chairs.map((chair: any) => {
								const chairAppts = props.appointments.filter(
									(a) =>
										a.chairId === chair.id &&
										a.startsAt.startsWith(effectiveDateKey),
								);
								return (
									<div
										key={chair.id}
										className="schedule-mobile-chair-card p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2"
										data-testid={`schedule-mobile-chair-card-${chair.id}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className="w-7 h-7 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-xs">
													<Armchair size={15} />
												</div>
												<span className="text-sm font-bold text-[var(--ink)]">
													{chair.name}
												</span>
											</div>
											<span className="text-xs text-[var(--muted)] font-medium">
												Записей: {chairAppts.length}
											</span>
										</div>

										{chairAppts.length === 0 ? (
											<div className="py-3 px-3 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-dashed border-[var(--line)]">
												Свободно на весь день
											</div>
										) : (
											<div className="flex flex-col gap-1.5">
												{chairAppts.map((a) => (
													<div
														key={a.id}
														onClick={() => setSelectedMobileAppt(a)}
														className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between text-xs cursor-pointer active:scale-[0.99] transition-all"
													>
														<div className="flex items-center gap-2">
															<span className="font-mono font-bold text-[var(--teal,#0d9488)]">
																{a.startsAt.slice(11, 16)} – {a.endsAt.slice(11, 16)}
															</span>
															<span className="font-medium text-[var(--ink)]">
																{props.patientName(
																	props.dashboard?.patients ?? [],
																	a.patientId,
																)}
															</span>
														</div>
														<span className="text-[11px] text-[var(--muted)]">
															{props.appointmentLabels[a.status] || a.status}
														</span>
													</div>
												))}
											</div>
										)}

										<button
											type="button"
											onClick={() => {
												if (onSlotClick) {
													onSlotClick({
														dateKey: effectiveDateKey,
														doctorUserId: selectedDoctorId || null,
														chairId: chair.id,
														durationMinutes: 30,
													});
												} else if (onQuickBooking) {
													onQuickBooking();
												}
											}}
											className="mt-1 w-full min-h-[44px] py-2 px-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)] text-xs font-semibold text-[var(--ink)] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
										>
											<Plus size={14} className="text-[var(--teal,#0d9488)]" />
											<span>Записать в этот кабинет</span>
										</button>
									</div>
								);
							})
						)}
					</div>
				) : (
					/* 4. Vertical Agenda Timeline List */
					<div className="schedule-mobile-agenda-list p-3 flex flex-col gap-2.5">
						{timelineItems.length === 0 ? (
							<div className="schedule-mobile-empty-day flex flex-col items-center justify-center p-8 bg-[var(--paper)] border border-[var(--line)] rounded-2xl text-center gap-3 mt-4">
								<CalendarIcon
									size={36}
									className="text-[var(--muted)] opacity-50"
								/>
								<div className="text-sm font-semibold text-[var(--ink)]">
									На этот день нет записей
								</div>
								<p className="text-xs text-[var(--muted)] max-w-xs">
									Расписание свободно. Выберите свободный слот или нажмите кнопку
									ниже.
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
									key={
										item.type === "appointment"
											? item.appointment.id
											: `gap-${idx}`
									}
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
				)}

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
