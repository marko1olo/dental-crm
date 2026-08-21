import type { Appointment, Dashboard } from "@dental/shared";
import { Clock, Plus, User } from "lucide-react";
import React, { useMemo } from "react";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";

export interface ScheduleGridProps {
	dashboard: Dashboard;
	dateKey: string;
	appointments: Appointment[];
	onSlotClick: (slot: QuickBookingSlotInfo) => void;
	onAppointmentClick: (appointment: Appointment) => void;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	formatTime: (iso: string) => string;
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	selectedChairId?: string | null;
	selectedDoctorId?: string | null;
}

const HOURS = [
	"08:00",
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
	"17:00",
	"18:00",
	"19:00",
	"20:00",
];

export function ScheduleGrid(props: ScheduleGridProps) {
	const {
		dashboard,
		dateKey,
		appointments,
		onSlotClick,
		onAppointmentClick,
		patientName,
		toDateTimeLocalValue,
		appointmentLabels,
		selectedChairId,
		selectedDoctorId,
	} = props;

	const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

	const chairs = useMemo(() => {
		const all = (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active);
		if (selectedChairId) {
			return all.filter((c) => c.id === selectedChairId);
		}
		return all.length > 0 ? all : [{ id: "default-chair", name: "Кабинет 1" }];
	}, [dashboard?.clinicSettings?.chairs, selectedChairId]);

	// Group appointments by chair and day
	const dayAppointments = useMemo(() => {
		return appointments.filter((a) => {
			const localDate = toDateTimeLocalValue(a.startsAt, timezone).slice(0, 10);
			return localDate === dateKey;
		});
	}, [appointments, dateKey, toDateTimeLocalValue, timezone]);

	return (
		<div
			className="schedule-grid-container overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm"
			data-testid="schedule-grid-view"
			role="region"
			aria-label="Сетка расписания по креслам и времени"
		>
			<div
				className="grid min-w-[700px] border-b border-[var(--line)] bg-[var(--paper-soft)] sticky top-0 z-10"
				style={{
					gridTemplateColumns: `80px repeat(${chairs.length}, minmax(180px, 1fr))`,
				}}
			>
				{/* Time corner header */}
				<div className="p-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-r border-[var(--line)] flex items-center justify-center gap-1">
					<Clock size={14} className="text-[var(--teal)]" />
					<span>Время</span>
				</div>

				{/* Chair Column Headers */}
				{chairs.map((chair) => (
					<div
						key={chair.id}
						className="p-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--ink)] border-r border-[var(--line)] last:border-r-0 flex items-center justify-center gap-1.5"
					>
						<span>{chair.name}</span>
					</div>
				))}
			</div>

			{/* Time Rows */}
			<div className="divide-y divide-[var(--line)]">
				{HOURS.map((hour) => {
					return (
						<div
							key={hour}
							className="grid min-w-[700px] hover:bg-[var(--paper-soft)]/50 transition-colors"
							style={{
								gridTemplateColumns: `80px repeat(${chairs.length}, minmax(180px, 1fr))`,
							}}
						>
							{/* Time label */}
							<div className="p-3 text-center text-xs font-bold text-[var(--muted)] border-r border-[var(--line)] flex items-center justify-center select-none">
								{hour}
							</div>

							{/* Chair Cells */}
							{chairs.map((chair) => {
								const slotStartIso = `${dateKey}T${hour}:00.000Z`;
								const cellAppointments = dayAppointments.filter((a) => {
									if (chair.id !== "default-chair" && a.chairId !== chair.id) {
										return false;
									}
									const aTime = toDateTimeLocalValue(a.startsAt, timezone).slice(
										11,
										16,
									);
									return aTime.startsWith(hour.slice(0, 2));
								});

								if (cellAppointments.length > 0) {
									return (
										<div
											key={chair.id}
											className="p-1.5 border-r border-[var(--line)] last:border-r-0 space-y-1.5 min-h-[56px] flex flex-col justify-center"
										>
											{cellAppointments.map((a) => {
												const pName = patientName(
													dashboard.patients,
													a.patientId,
												);
												const aStart = toDateTimeLocalValue(
													a.startsAt,
													timezone,
												).slice(11, 16);
												const aEnd = toDateTimeLocalValue(
													a.endsAt,
													timezone,
												).slice(11, 16);

												return (
													<button
														key={a.id}
														type="button"
														onClick={() => onAppointmentClick(a)}
														className={`w-full text-left p-2 rounded-xl border text-xs font-semibold shadow-xs flex items-center justify-between gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-h-[44px] ${
															a.status === "arrived"
																? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
																: a.status === "in_treatment"
																	? "bg-sky-500/15 border-sky-500/30 text-sky-800 dark:text-sky-200"
																	: a.status === "completed"
																		? "bg-teal-500/15 border-teal-500/30 text-teal-800 dark:text-teal-200"
																		: a.status === "cancelled" || a.status === "no_show"
																			? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 opacity-70"
																			: "bg-[var(--paper)] border-[var(--line-strong)] text-[var(--ink)]"
														}`}
														title={`${pName}: ${aStart} - ${aEnd} (${appointmentLabels[a.status] || a.status})`}
													>
														<div className="truncate">
															<div className="font-bold truncate flex items-center gap-1">
																<User size={12} className="shrink-0 text-[var(--teal)]" />
																<span>{pName}</span>
															</div>
															<div className="text-[10px] opacity-75 font-normal">
																{aStart} - {aEnd} · {a.reason || "Прием"}
															</div>
														</div>
														<span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--paper)]/80 shrink-0">
															{appointmentLabels[a.status] || a.status}
														</span>
													</button>
												);
											})}
										</div>
									);
								}

								// Empty cell with 1-click booking
								return (
									<div
										key={chair.id}
										className="p-1 border-r border-[var(--line)] last:border-r-0 min-h-[56px] flex items-center justify-center"
									>
										<button
											type="button"
											onClick={() =>
												onSlotClick({
													dateKey,
													startTime: hour,
													chairId: chair.id !== "default-chair" ? chair.id : null,
													doctorUserId: selectedDoctorId || null,
													durationMinutes: 30,
												})
											}
											className="w-full h-full min-h-[44px] rounded-xl border border-transparent hover:border-dashed hover:border-[var(--teal)] hover:bg-[var(--teal-surface)]/60 text-transparent hover:text-[var(--teal-dark)] text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
											title={`Записать на ${hour} (${chair.name})`}
											aria-label={`Свободно на ${hour}, кресло ${chair.name}. Нажмите для быстрой записи`}
										>
											<Plus size={14} />
											<span>+ Записать на {hour}</span>
										</button>
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}
