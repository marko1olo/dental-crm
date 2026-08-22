import type { Appointment, Dashboard } from "@dental/shared";
import {
	AlertTriangle,
	CalendarCheck,
	CheckCircle2,
	Clock,
	MessageSquare,
	PhoneCall,
	Plus,
	User,
	UserCheck,
	UserX,
} from "lucide-react";
import React, { useMemo } from "react";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";

export interface ScheduleGridProps {
	dashboard: Dashboard;
	dateKey: string;
	appointments: Appointment[];
	onSlotClick: (slot: QuickBookingSlotInfo) => void;
	onAppointmentClick: (appointment: Appointment) => void;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
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
		onQuickStatusChange,
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

	// Calculate cross-chair and intra-chair collisions on the active date
	const collisionMap = useMemo(() => {
		const collisions = new Map<
			string,
			{
				sameDoctor: boolean;
				sameChair: boolean;
				sameAssistant: boolean;
				samePatient: boolean;
				conflictWith: string;
			}
		>();
		const occupyingAppointments = dayAppointments.filter(
			(a) => a.status !== "cancelled" && a.status !== "no_show",
		);

		for (let i = 0; i < occupyingAppointments.length; i++) {
			for (let j = i + 1; j < occupyingAppointments.length; j++) {
				const a1 = occupyingAppointments[i]!;
				const a2 = occupyingAppointments[j]!;

				const s1 = Date.parse(a1.startsAt);
				const e1 = Date.parse(a1.endsAt);
				const s2 = Date.parse(a2.startsAt);
				const e2 = Date.parse(a2.endsAt);

				if (
					Number.isFinite(s1) &&
					Number.isFinite(e1) &&
					Number.isFinite(s2) &&
					Number.isFinite(e2)
				) {
					const overlapMs = Math.min(e1, e2) - Math.max(s1, s2);
					if (overlapMs > 0) {
						const sameDoctor = Boolean(
							a1.doctorUserId && a1.doctorUserId === a2.doctorUserId,
						);
						const sameChair = Boolean(a1.chairId && a1.chairId === a2.chairId);
						const sameAssistant = Boolean(
							a1.assistantUserId && a1.assistantUserId === a2.assistantUserId,
						);
						const samePatient = Boolean(
							a1.patientId && a1.patientId === a2.patientId,
						);

						if (sameDoctor || sameChair || sameAssistant || samePatient) {
							const prev1 = collisions.get(a1.id);
							collisions.set(a1.id, {
								sameDoctor: Boolean(prev1?.sameDoctor || sameDoctor),
								sameChair: Boolean(prev1?.sameChair || sameChair),
								sameAssistant: Boolean(prev1?.sameAssistant || sameAssistant),
								samePatient: Boolean(prev1?.samePatient || samePatient),
								conflictWith: a2.id,
							});
							const prev2 = collisions.get(a2.id);
							collisions.set(a2.id, {
								sameDoctor: Boolean(prev2?.sameDoctor || sameDoctor),
								sameChair: Boolean(prev2?.sameChair || sameChair),
								sameAssistant: Boolean(prev2?.sameAssistant || sameAssistant),
								samePatient: Boolean(prev2?.samePatient || samePatient),
								conflictWith: a1.id,
							});
						}
					}
				}
			}
		}
		return collisions;
	}, [dayAppointments]);

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

												const patObj = dashboard.patients?.find((p) => p.id === a.patientId);
												const docObj = dashboard.clinicSettings?.staff?.find((s) => s.id === a.doctorUserId);
												const collision = collisionMap.get(a.id);

												return (
													<div
														key={a.id}
														className={`w-full text-left p-2 rounded-xl border text-xs font-semibold shadow-xs flex flex-col justify-between gap-1.5 transition-all min-h-[52px] ${
															collision
																? "bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/50"
																: a.status === "arrived"
																	? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
																	: a.status === "in_treatment"
																		? "bg-sky-500/15 border-sky-500/30 text-sky-800 dark:text-sky-200"
																		: a.status === "completed"
																			? "bg-teal-500/15 border-teal-500/30 text-teal-800 dark:text-teal-200"
																			: a.status === "confirmed"
																				? "bg-violet-500/15 border-violet-500/30 text-violet-800 dark:text-violet-200"
																				: a.status === "cancelled" || a.status === "no_show"
																					? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 opacity-70"
																					: "bg-[var(--paper)] border-[var(--line-strong)] text-[var(--ink)]"
														}`}
													>
														<div
															onClick={() => onAppointmentClick(a)}
															className="cursor-pointer flex items-center justify-between gap-2"
															role="button"
															tabIndex={0}
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	e.preventDefault();
																	onAppointmentClick(a);
																}
															}}
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
														</div>

														{/* Collision Alert Pill if overlapping */}
														{collision && (
															<div
																className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-[10px] font-bold flex items-center gap-1"
																title={
																	collision.sameDoctor && collision.sameChair
																		? "Коллизия: один врач и одно кресло в одно время!"
																		: collision.sameDoctor
																			? "Коллизия: врач записан в другое кресло одновременно!"
																			: collision.sameChair
																				? "Коллизия: два пациента в одном кресле одновременно!"
																				: collision.sameAssistant
																					? "Коллизия: ассистент занят в другом приеме!"
																					: "Коллизия: пациент записан на два приема одновременно!"
																}
															>
																<AlertTriangle size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
																<span>
																	{collision.sameDoctor && collision.sameChair
																		? "Накладка: врач + кресло"
																		: collision.sameDoctor
																			? "Коллизия врача"
																			: collision.sameChair
																				? "Накладка кресла"
																				: collision.sameAssistant
																					? "Накладка ассистента"
																					: "Накладка пациента"}
																</span>
															</div>
														)}

														{/* Mini Quick Action Toggles */}
														<div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--line)]/50 mt-1">
															{onQuickStatusChange && (
																<>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			onQuickStatusChange(a.id, "confirmed");
																		}}
																		className={`p-2 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer ${
																			a.status === "confirmed"
																				? "bg-violet-500 text-white border-violet-600 font-bold shadow-xs"
																				: "bg-[var(--paper-soft)] border-[var(--line)] text-violet-700 dark:text-violet-300 hover:bg-violet-500/20"
																		}`}
																		title="Подтвержден"
																		aria-label={`Отметить статус Подтвержден для ${pName}`}
																	>
																		<PhoneCall size={16} />
																	</button>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			onQuickStatusChange(a.id, "arrived");
																		}}
																		className={`p-2 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer ${
																			a.status === "arrived"
																				? "bg-emerald-500 text-white border-emerald-600 font-bold shadow-xs"
																				: "bg-[var(--paper-soft)] border-[var(--line)] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
																		}`}
																		title="Пришел"
																		aria-label={`Отметить статус Пришел для ${pName}`}
																	>
																		<UserCheck size={16} />
																	</button>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			onQuickStatusChange(a.id, "in_treatment");
																		}}
																		className={`p-2 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer ${
																			a.status === "in_treatment"
																				? "bg-sky-500 text-white border-sky-600 font-bold shadow-xs"
																				: "bg-[var(--paper-soft)] border-[var(--line)] text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
																		}`}
																		title="В кресле"
																		aria-label={`Отметить статус В кресле для ${pName}`}
																	>
																		<CalendarCheck size={16} />
																	</button>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			onQuickStatusChange(a.id, "completed");
																		}}
																		className={`p-2 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer ${
																			a.status === "completed"
																				? "bg-teal-500 text-white border-teal-600 font-bold shadow-xs"
																				: "bg-[var(--paper-soft)] border-[var(--line)] text-teal-700 dark:text-teal-300 hover:bg-teal-500/20"
																		}`}
																		title="Завершен"
																		aria-label={`Отметить статус Завершен для ${pName}`}
																	>
																		<CheckCircle2 size={16} />
																	</button>
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			onQuickStatusChange(a.id, "no_show");
																		}}
																		className={`p-2 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer ${
																			a.status === "no_show"
																				? "bg-rose-500 text-white border-rose-600 font-bold shadow-xs"
																				: "bg-[var(--paper-soft)] border-[var(--line)] text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
																		}`}
																		title="Не явился"
																		aria-label={`Отметить статус Не явился для ${pName}`}
																	>
																		<UserX size={16} />
																	</button>
																</>
															)}

															{patObj?.phone && (
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		const text = generateAppointmentWhatsAppMessage({
																			patientName: pName,
																			doctorName: docObj?.fullName,
																			doctorSpecialty: docObj?.role,
																			appointmentStartsAt: a.startsAt,
																			clinicName: dashboard.clinicSettings?.profile?.clinicName,
																			clinicAddress: dashboard.clinicSettings?.profile?.address,
																			clinicPhone: dashboard.clinicSettings?.profile?.phone,
																			treatmentReason: a.reason,
																		});
																		openWhatsAppChat(patObj.phone!, text);
																	}}
																	className="p-2 ml-auto rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer"
																	title={`Отправить WhatsApp напоминание (${pName})`}
																	aria-label={`WhatsApp напоминание для ${pName}`}
																>
																	<MessageSquare size={16} />
																</button>
															)}
														</div>
													</div>
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
