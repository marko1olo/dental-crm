import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ScheduleSuggestion,
} from "@dental/shared";
import {
	AlertTriangle,
	Calendar,
	Clock,
	Plus,
} from "lucide-react";
import type React from "react";
import { Fragment, useCallback, useEffect, useRef } from "react";
import { EmptyState } from "../EmptyState";
import { AppointmentCard } from "./AppointmentCard";
import {
	type DayGroupingAppointment,
	type ScheduleDayGroup,
	formatMinutesForHumans,
} from "./scheduleDayGrouping";

import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";

export interface ScheduleTimelineProps {
	visibleDayGroups: ScheduleDayGroup[];
	dashboard: Dashboard;
	visibleScheduleSuggestions: ScheduleSuggestion[];
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentScheduleDrafts: Record<
		string,
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		any
	>;
	appointmentScheduleSaveStates: Record<string, string>;
	appointmentScheduleErrors: Record<string, string | null>;
	appointmentScheduleDirtyIds: Set<string>;
	editingAppointmentId: string | null;
	appointmentDraftFromAppointment: (
		appointment: Appointment,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	) => any;
	appointmentDraftMissingSteps: (
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		draft: any,
	) => string[];
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	openScheduleSuggestion: (section: string) => void;
	formatTime: (value: string) => string;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	openAppointmentEditor: (appointment: Appointment) => void;
	repeatAppointment: (appointment: Appointment) => void;
	copyAppointmentToBuffer?:
		| ((appointment: Appointment) => void)
		| undefined;
	closeAppointmentEditor: (appointmentId: string) => void;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: unknown,
	) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	onEmptySlotClick?:
		| ((slot: QuickBookingSlotInfo) => void)
		| undefined;
	onNewAppointmentClick?: (() => void) | undefined;
	stepScheduleDay?: ((delta: number) => void) | undefined;
	scheduleDateFilter?: string | undefined;
	clinicToday?: string | undefined;
	activeScheduleFilterCount?: number | undefined;
	resetScheduleFilters?: (() => void) | undefined;
	setScheduleDateFilter?: ((date: string) => void) | undefined;
	todayScheduleDate?: (() => string) | undefined;
}

export function ScheduleTimeline(props: ScheduleTimelineProps) {
	const {
		visibleDayGroups,
		dashboard,
		visibleScheduleSuggestions,
		appointmentReadinessById,
		appointmentLabels,
		appointmentScheduleDrafts,
		appointmentScheduleSaveStates,
		appointmentScheduleErrors,
		appointmentScheduleDirtyIds,
		editingAppointmentId,
		appointmentDraftFromAppointment,
		appointmentDraftMissingSteps,
		activeVisitLockedAppointmentStatuses,
		openScheduleSuggestion,
		formatTime,
		patientName,
		openAppointmentEditor,
		repeatAppointment,
		copyAppointmentToBuffer,
		closeAppointmentEditor,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		onEmptySlotClick,
		onNewAppointmentClick,
		stepScheduleDay,
		scheduleDateFilter = "",
		clinicToday = "",
		activeScheduleFilterCount = 0,
		resetScheduleFilters,
		setScheduleDateFilter,
		todayScheduleDate,
	} = props;

	const timelineContainerRef = useRef<HTMLDivElement>(null);

	// Global keyboard shortcuts for timeline
	const handleGlobalKeyDown = useCallback(
		(e: KeyboardEvent) => {
			const activeTag = document.activeElement?.tagName.toLowerCase();
			if (
				activeTag === "input" ||
				activeTag === "textarea" ||
				activeTag === "select" ||
				document.activeElement?.getAttribute("contenteditable") === "true"
			) {
				return;
			}

			// Key 'N' or 'n' or 'т' or 'Т': open new appointment
			if ((e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") && !e.ctrlKey && !e.metaKey && !e.altKey) {
				e.preventDefault();
				if (typeof onNewAppointmentClick === "function") {
					onNewAppointmentClick();
				}
				return;
			}

			// Arrow Left: Previous Day
			if (e.key === "ArrowLeft" && typeof stepScheduleDay === "function") {
				e.preventDefault();
				stepScheduleDay(-1);
				return;
			}

			// Arrow Right: Next Day
			if (e.key === "ArrowRight" && typeof stepScheduleDay === "function") {
				e.preventDefault();
				stepScheduleDay(1);
				return;
			}

			// Arrow Down / Arrow Up: sequential item focus in timeline
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				if (!timelineContainerRef.current) return;
				const focusables = Array.from(
					timelineContainerRef.current.querySelectorAll<HTMLElement>(
						'[data-timeline-focusable="true"]',
					),
				);
				if (focusables.length === 0) return;

				const currentFocusedIndex = focusables.findIndex(
					(el) => el === document.activeElement || el.contains(document.activeElement),
				);

				e.preventDefault();
				if (currentFocusedIndex === -1) {
					if (e.key === "ArrowDown") {
						focusables[0]?.focus();
					} else {
						focusables[focusables.length - 1]?.focus();
					}
					return;
				}

				if (e.key === "ArrowDown") {
					const nextIndex =
						currentFocusedIndex < focusables.length - 1
							? currentFocusedIndex + 1
							: 0;
					focusables[nextIndex]?.focus();
				} else {
					const prevIndex =
						currentFocusedIndex > 0
							? currentFocusedIndex - 1
							: focusables.length - 1;
					focusables[prevIndex]?.focus();
				}
			}
		},
		[onNewAppointmentClick, stepScheduleDay],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [handleGlobalKeyDown]);

	const visibleAppointmentCount = visibleDayGroups.reduce(
		(sum, group) => sum + group.appointmentCount,
		0,
	);

	return (
		<div
			ref={timelineContainerRef}
			className="schedule-timeline timeline focus:outline-none"
			data-testid="schedule-timeline-container"
			tabIndex={-1}
		>
			{(visibleDayGroups ?? []).map((group) => (
				<Fragment key={group.dateKey}>
					{/* Day Header */}
					<div
						className="schedule-day-heading"
						data-testid="schedule-day-heading"
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "baseline",
							gap: "8px",
							margin: "18px 0 10px",
							paddingBottom: "6px",
							borderBottom: "1px solid var(--line)",
						}}
					>
						<strong
							style={{
								fontSize: "15px",
								color: "var(--ink)",
								textTransform: "capitalize",
							}}
						>
							{group.title}
						</strong>
						{group.relativeLabel ? (
							<span
								className={`status-pill ${group.relation === "today" ? "status-confirmed" : "status-planned"}`}
							>
								{group.relativeLabel}
							</span>
						) : null}
						<span style={{ fontSize: "12px", color: "var(--muted)" }}>
							записей: {group.appointmentCount} · занято{" "}
							{formatMinutesForHumans(group.bookedMinutes)}
							{group.freeGapMinutes > 0
								? ` · свободно ${formatMinutesForHumans(group.freeGapMinutes)}`
								: ""}
						</span>
					</div>

					{/* Rows: gaps, overlaps, appointments */}
					{(group?.rows ?? []).map((row) => {
						// 1. Free Slot / Gap
						if (row.kind === "gap") {
							const gapStartLabel = row.startsAt
								? toDateTimeLocalValue(
										row.startsAt,
										dashboard?.clinicSettings?.profile?.timezone,
									).slice(11, 16)
								: null;
							const gapEndLabel = row.endsAt
								? toDateTimeLocalValue(
										row.endsAt,
										dashboard?.clinicSettings?.profile?.timezone,
									).slice(11, 16)
								: null;

							return (
								<div
									key={`gap-${group.dateKey}-${row.afterAppointmentId ?? "start"}-${row.minutes}`}
									data-timeline-focusable="true"
									tabIndex={0}
									role="button"
									onClick={() => {
										if (typeof onEmptySlotClick === "function") {
											const slotPayload: { dateKey: string; startsAt?: string; endsAt?: string; durationMinutes?: number } = {
												dateKey: group.dateKey,
											};
											if (row.startsAt) slotPayload.startsAt = row.startsAt;
											if (row.endsAt) slotPayload.endsAt = row.endsAt;
											if (row.minutes) slotPayload.durationMinutes = row.minutes;
											onEmptySlotClick(slotPayload);
										}
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											if (typeof onEmptySlotClick === "function") {
												const slotPayload: { dateKey: string; startsAt?: string; endsAt?: string; durationMinutes?: number } = {
													dateKey: group.dateKey,
												};
												if (row.startsAt) slotPayload.startsAt = row.startsAt;
												if (row.endsAt) slotPayload.endsAt = row.endsAt;
												if (row.minutes) slotPayload.durationMinutes = row.minutes;
												onEmptySlotClick(slotPayload);
											}
										}
									}}
									className="schedule-day-gap group my-2 ml-3 p-2.5 rounded-xl border border-dashed border-[var(--teal)]/40 hover:border-[var(--teal)] bg-[var(--paper-soft)] hover:bg-[var(--teal-surface)] transition-all cursor-pointer flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-h-[44px]"
									data-testid="schedule-day-gap"
									aria-label={`Свободное окно: ${formatMinutesForHumans(row.minutes)}. Нажмите для быстрой записи`}
								>
									<div className="flex items-center gap-2">
										<Clock size={14} className="text-[var(--teal)] shrink-0" />
										<span>
											Свободно {formatMinutesForHumans(row.minutes)}
											{gapStartLabel && gapEndLabel
												? ` (${gapStartLabel} - ${gapEndLabel})`
												: ""}
										</span>
									</div>
									<span className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--teal-dark)] text-white text-xs font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
										<Plus size={14} />
										<span>Записать</span>
									</span>
								</div>
							);
						}

						// 2. Overlap warning
						if (row.kind === "overlap") {
							const overlapReason =
								row.sameDoctor && row.sameChair
									? "один врач и одно кресло"
									: row.sameDoctor
										? "один и тот же врач"
										: row.sameChair
											? "одно и то же кресло"
											: row.sameAssistant
												? "один и тот же ассистент"
												: "один и тот же пациент";

							return (
								<div
									key={`overlap-${group.dateKey}-${row.withAppointmentId}`}
									className="schedule-day-overlap my-2 ml-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2"
									data-testid="schedule-day-overlap"
									role="alert"
								>
									<AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
									<span>
										Две записи на одно время ({overlapReason}), пересечение{" "}
										{formatMinutesForHumans(row.minutes)}. Кого-то придётся перенести.
									</span>
								</div>
							);
						}

						// 3. Appointment Card
						const appointment = row.appointment as Appointment;
						const draft =
							appointmentScheduleDrafts[appointment.id] ||
							appointmentDraftFromAppointment(appointment);
						const saveState =
							appointmentScheduleSaveStates[appointment.id] || "idle";
						const error = appointmentScheduleErrors[appointment.id] || null;
						const dirty = appointmentScheduleDirtyIds.has(appointment.id);
						const isEditing = editingAppointmentId === appointment.id;
						const hasOpenVisit =
							dashboard.activeVisit &&
							dashboard.activeVisit.appointmentId === appointment.id;

						const missingSteps = appointmentDraftMissingSteps(draft);
						const readyToSave = missingSteps?.length === 0 && dirty;

						return (
							<div
								key={appointment.id}
								data-timeline-focusable="true"
								tabIndex={-1}
								className="focus:outline-none"
							>
								<AppointmentCard
									appointment={appointment}
									dashboard={dashboard}
									visibleScheduleSuggestions={visibleScheduleSuggestions}
									appointmentReadinessById={appointmentReadinessById}
									appointmentLabels={appointmentLabels}
									appointmentDraft={draft}
									appointmentSaveState={saveState}
									appointmentSaveError={error}
									appointmentDirty={dirty}
									appointmentEditing={isEditing}
									appointmentHasOpenVisit={Boolean(hasOpenVisit)}
									appointmentActiveVisitStatusLocked={Boolean(
										hasOpenVisit &&
											activeVisitLockedAppointmentStatuses.has(draft.status),
									)}
									appointmentMissingSteps={missingSteps as string[]}
									appointmentReadyToSave={readyToSave}
									openScheduleSuggestion={openScheduleSuggestion}
									formatTime={formatTime}
									patientName={patientName}
									openAppointmentEditor={openAppointmentEditor}
									repeatAppointment={repeatAppointment}
									{...(copyAppointmentToBuffer ? { copyAppointmentToBuffer } : {})}
									closeAppointmentEditor={closeAppointmentEditor}
									updateAppointmentScheduleDraft={
										// biome-ignore lint/suspicious/noExplicitAny: automated suppression
										updateAppointmentScheduleDraft as any
									}
									saveAppointmentSchedule={saveAppointmentSchedule}
									normalizedAppointmentStatus={normalizedAppointmentStatus}
									toDateTimeLocalValue={toDateTimeLocalValue}
									fromDateTimeLocalValue={fromDateTimeLocalValue}
									useManualSelects={useManualSelects}
									activeVisitLockedAppointmentStatuses={
										activeVisitLockedAppointmentStatuses
									}
								/>
							</div>
						);
					})}
				</Fragment>
			))}

			{/* Empty State when no appointments found */}
			{visibleAppointmentCount === 0 && (
				<EmptyState
					icon={<Calendar size={32} />}
					title={
						(dashboard.appointments ?? []).length === 0
							? "Записей пока нет ни одной"
							: activeScheduleFilterCount > 0
								? scheduleDateFilter.trim()
									? "На этот день записей нет"
									: "Всё скрыто фильтрами"
								: "Записей нет"
					}
					description={
						(dashboard.appointments ?? []).length === 0
							? "Первая запись появится здесь, как только вы запишете пациента — кнопка «Записать пациента» ниже или быстрая клавиша 'N'."
							: activeScheduleFilterCount > 0
								? scheduleDateFilter.trim()
									? "Расписание не сломалось: на выбранный день записей нет. Полистайте дни стрелками рядом с датой или запишите пациента на свободное время."
									: "Расписание не сломалось: записи есть, но их скрывают выбранные фильтры. Снимите фильтры кнопкой «Снять все фильтры»."
								: "Расписание не сломалось: записей действительно нет. Запишите первого пациента кнопкой ниже."
					}
					glass={true}
					action={
						<div
							className="schedule-empty-actions flex flex-wrap gap-2 justify-center mt-3"
						>
							{scheduleDateFilter.trim() &&
							clinicToday &&
							scheduleDateFilter.trim() !== clinicToday &&
							typeof setScheduleDateFilter === "function" &&
							typeof todayScheduleDate === "function" ? (
								<button
									className="secondary-button min-h-[44px] px-3.5 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={() => setScheduleDateFilter(todayScheduleDate())}
								>
									Вернуться на сегодня
								</button>
							) : null}
							{activeScheduleFilterCount > 0 &&
							typeof resetScheduleFilters === "function" ? (
								<button
									className="text-button min-h-[44px] px-3.5 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
									type="button"
									onClick={resetScheduleFilters}
								>
									Снять все фильтры
								</button>
							) : null}
							<button
								className="primary-button min-h-[44px] px-4 flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
								type="button"
								onClick={onNewAppointmentClick}
							>
								<Plus aria-hidden="true" /> Записать пациента (N)
							</button>
						</div>
					}
				/>
			)}
		</div>
	);
}
