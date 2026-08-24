import type { Appointment, Dashboard, DentalSpecialty } from "@dental/shared";
import {
	AlertTriangle,
	CalendarCheck,
	CheckCircle2,
	Clock,
	Copy,
	MessageSquare,
	PhoneCall,
	Plus,
	Stethoscope,
	User,
	UserCheck,
	UserX,
} from "lucide-react";
import React, { useMemo } from "react";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import { calculateDailyChairDoctorTally } from "./doctorFreeSlotsEngine";

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

	const dailyTally = useMemo(() => {
		return calculateDailyChairDoctorTally({
			dateKey,
			appointments,
			chairs: dashboard?.clinicSettings?.chairs ?? [],
			doctors: ((dashboard?.clinicSettings as any)?.staff ?? []) as any[],
		});
	}, [dateKey, appointments, dashboard?.clinicSettings?.chairs, (dashboard?.clinicSettings as any)?.staff]);

	return (
		<div className="space-y-3">
			{/* Daily Chair & Doctor Occupancy Summary Bar */}
			{dailyTally.totalAppointmentsCount > 0 && (
				<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex items-center gap-3">
						<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<CalendarCheck size={16} className="text-teal-600" />
							Загрузка клиники: {dailyTally.totalAppointmentsCount} визитов ({dailyTally.clinicOccupancyPercent}%)
						</span>
						<span className="text-[var(--muted)]">·</span>
						<span className="text-[var(--muted)]">
							Общее время приема: {Math.floor(dailyTally.totalDurationMinutes / 60)}ч {dailyTally.totalDurationMinutes % 60}мин
						</span>
					</div>
					{dailyTally.totalRevenueRub > 0 && (
						<div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
							Выручка дня: {dailyTally.totalRevenueRub.toLocaleString("ru-RU")} ₽
						</div>
					)}
				</div>
			)}

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

					{/* Chair Column Headers with Visit Count & Occupancy */}
					{chairs.map((chair) => {
						const chairStat = dailyTally.chairs.find((c) => c.chairId === chair.id);
						return (
							<div
								key={chair.id}
								className="p-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--ink)] border-r border-[var(--line)] last:border-r-0 flex flex-col items-center justify-center gap-1"
							>
								<span>{chair.name}</span>
								{chairStat && chairStat.appointmentsCount > 0 && (
									<span className="text-[10px] font-normal font-sans lowercase px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
										{chairStat.appointmentsCount} виз. ({chairStat.occupancyPercent}%)
									</span>
								)}
							</div>
						);
					})}
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
														draggable
														onDragStart={(e) => {
															e.dataTransfer.setData(
																"application/json",
																JSON.stringify({
																	type: "appointment",
																	appointmentId: a.id,
																	doctorUserId: a.doctorUserId,
																	durationMinutes: Math.round((Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 60000) || 30,
																}),
															);
															e.dataTransfer.effectAllowed = "move";
														}}
														className={`w-full text-left p-2 rounded-xl border text-xs font-semibold shadow-xs flex flex-col justify-between gap-1.5 transition-all min-h-[52px] cursor-grab active:cursor-grabbing ${
															collision
																? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/50"
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
															<div className="truncate flex-1 min-w-0">
																<div className="font-bold truncate flex items-center gap-1">
																	<User size={12} className="shrink-0 text-[var(--teal)]" />
																	<span className="truncate">{pName}</span>
																</div>
																<div className="text-xs opacity-75 font-normal truncate">
																	{aStart} - {aEnd} · {a.reason || "Прием"}
																</div>
																{docObj && (
																	<div className="text-xs opacity-85 font-medium truncate flex items-center gap-1 mt-0.5">
																		<Stethoscope size={12} className="shrink-0 text-[var(--teal)]" />
																		<span className="truncate">
																			{docObj.fullName
																				?.split(" ")
																				.map((part, index) => (index === 0 ? part : `${part[0]}.`))
																				.join(" ") || docObj.fullName}
																		</span>
																		{docObj.specialties && docObj.specialties.length > 0 && (
																			<span className="text-xs px-1 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0">
																				{docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
																			</span>
																		)}
																	</div>
																)}
															</div>
															<span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--paper)]/80 shrink-0">
																{appointmentLabels[a.status] || a.status}
															</span>
														</div>

														{/* Collision Alert Pill if overlapping */}
														{collision && (
															<div
																className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center gap-1 shadow-xs animate-pulse"
																data-testid="schedule-grid-collision-badge"
																title={
																	collision.sameDoctor && !collision.sameChair
																		? "Коллизия: врач записан в два кабинета одновременно!"
																		: collision.sameDoctor && collision.sameChair
																			? "Коллизия: двойная запись у врача в одном кабинете!"
																			: collision.sameChair
																				? "Коллизия: два пациента в одном кресле одновременно!"
																				: collision.sameAssistant
																					? "Коллизия: ассистент занят в другом приеме!"
																					: "Коллизия: пациент записан на два приема одновременно!"
																}
															>
																<AlertTriangle size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
																<span className="truncate">
																	{collision.sameDoctor && !collision.sameChair
																		? "⚠️ Коллизия: врач записан в два кабинета одновременно"
																		: collision.sameDoctor && collision.sameChair
																			? "⚠️ Коллизия: врач и кабинет"
																			: collision.sameChair
																				? "⚠️ Коллизия: кабинет занят"
																				: collision.sameAssistant
																					? "⚠️ Коллизия: ассистент"
																					: "⚠️ Коллизия: пациент"}
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
																<div className="flex items-center gap-1 ml-auto">
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
																			if (typeof navigator !== "undefined" && navigator.clipboard) {
																				void navigator.clipboard.writeText(text);
																				showToast(`Текст напоминания для ${pName} скопирован в буфер`, "success");
																			}
																		}}
																		className="p-2 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer"
																		title={`Скопировать текст напоминания (SMS) для ${pName}`}
																		aria-label={`Скопировать SMS напоминание для ${pName}`}
																	>
																		<Copy size={16} />
																	</button>

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
																		className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all cursor-pointer"
																		title={`Отправить WhatsApp напоминание (${pName})`}
																		aria-label={`WhatsApp напоминание для ${pName}`}
																	>
																		<MessageSquare size={16} />
																	</button>
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									);
								}

								// Empty cell with 1-click booking & Drag-and-Drop collision safety
								return (
									<div
										key={chair.id}
										className="p-1 border-r border-[var(--line)] last:border-r-0 min-h-[56px] flex items-center justify-center"
										onDragOver={(e) => {
											e.preventDefault();
											e.dataTransfer.dropEffect = "move";
										}}
										onDrop={(e) => {
											e.preventDefault();
											try {
												const rawData = e.dataTransfer.getData("application/json");
												if (!rawData) return;
												const data = JSON.parse(rawData);
												if (data?.type === "appointment" && data.appointmentId) {
													const sourceAppt = (appointments ?? []).find((x) => x.id === data.appointmentId);
													if (!sourceAppt) return;
													const targetChairId = chair.id !== "default-chair" ? chair.id : null;
													const targetDoctorId = selectedDoctorId || sourceAppt.doctorUserId;
													const slotDuration = data.durationMinutes || 30;
													const targetStartIso = `${dateKey}T${hour}:00:00.000Z`;
													const targetEndIso = new Date(Date.parse(targetStartIso) + slotDuration * 60000).toISOString();

													// Pre-check collision before move to protect administrator from accidental double-booking
													const collisionCheck = checkAppointmentResourceCollision(
														{
															startsAt: targetStartIso,
															endsAt: targetEndIso,
															doctorUserId: targetDoctorId,
															chairId: targetChairId,
															patientId: sourceAppt.patientId,
														},
														appointments,
														{
															excludeAppointmentId: sourceAppt.id,
															staff: dashboard?.clinicSettings?.staff,
															chairs: dashboard?.clinicSettings?.chairs,
															patients: dashboard?.patients,
															formatTimeFn: (iso) => toDateTimeLocalValue(iso, timezone).slice(11, 16),
														},
													);

													if (collisionCheck.hasCollision) {
														showToast(`⛔ Перемещение заблокировано: ${collisionCheck.message}`, "error", 5000);
														return;
													}

													onSlotClick({
														dateKey,
														startTime: hour,
														chairId: targetChairId,
														doctorUserId: targetDoctorId,
														durationMinutes: slotDuration,
														patientId: sourceAppt.patientId,
														reason: sourceAppt.reason || undefined,
													});
												}
											} catch {
												// Ignore invalid JSON drop
											}
										}}
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
											className="w-full h-full min-h-[44px] rounded-xl border border-dashed border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
											title={`Записать на ${hour} (${chair.name})`}
											aria-label={`Свободно на ${hour}, кресло ${chair.name}. Нажмите для быстрой записи`}
										>
											<Plus size={14} className="text-[var(--teal)] opacity-60 group-hover:opacity-100" />
											<span className="text-xs">+ Записать на {hour}</span>
										</button>
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	</div>
	);
}
