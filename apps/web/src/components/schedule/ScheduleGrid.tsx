import {
	type Appointment,
	type Dashboard,
	type DentalSpecialty,
	calculateEmergencyReserveSlots,
	type DoctorShiftSchedule,
	type EmergencyReserveSlot,
} from "@dental/shared";
import {
	AlertTriangle,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	MessageSquare,
	MoreVertical,
	Phone,
	PhoneCall,
	Plus,
	Stethoscope,
	User,
	UserCheck,
	UserX,
	Zap,
} from "lucide-react";
import React, { useMemo } from "react";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { formatPatientDisplayFio } from "./AppointmentCard";
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

	const [hoveredApptId, setHoveredApptId] = React.useState<string | null>(null);
	const [activeMenuApptId, setActiveMenuApptId] = React.useState<string | null>(null);

	React.useEffect(() => {
		const handleGlobalClick = () => {
			setActiveMenuApptId(null);
		};
		if (activeMenuApptId) {
			window.addEventListener("click", handleGlobalClick);
		}
		return () => window.removeEventListener("click", handleGlobalClick);
	}, [activeMenuApptId]);

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

	// Calculate dedicated 30-min emergency reserve buffers per doctor shift
	const emergencyReserveSlots = useMemo(() => {
		const staff = dashboard?.clinicSettings?.staff ?? [];
		const doctors = staff.filter((s) => s.role === "doctor" || !s.role);
		const targetDocs = selectedDoctorId ? doctors.filter((d) => d.id === selectedDoctorId) : doctors;

		const slots: EmergencyReserveSlot[] = [];
		for (const doc of targetDocs) {
			const shift: DoctorShiftSchedule = {
				id: `shift-${doc.id}-${dateKey}`,
				clinicId: dashboard?.clinicSettings?.profile?.organizationId || "clinic-1",
				doctorId: doc.id,
				doctorFullName: doc.fullName,
				shiftDate: dateKey,
				startTime: `${dateKey}T08:00:00.000Z`,
				endTime: `${dateKey}T20:00:00.000Z`,
				isEmergencyReserveEnabled: true,
				emergencyReserveMinutes: 30,
			};
			const res = calculateEmergencyReserveSlots(
				shift,
				dayAppointments.map((a) => ({
					id: a.id,
					clinicId: dashboard?.clinicSettings?.profile?.organizationId || "clinic-1",
					doctorId: a.doctorUserId || "doc-1",
					cabinetId: a.chairId || "chair-1",
					patientId: a.patientId || "pat-1",
					startTime: a.startsAt,
					endTime: a.endsAt,
					status: a.status === "cancelled" ? "cancelled" : "scheduled",
					isEmergency: Boolean((a as any)?.isCito || (a as any)?.isEmergency),
				})),
			);
			slots.push(...res);
		}
		return slots;
	}, [dashboard?.clinicSettings?.staff, dashboard?.clinicSettings?.profile, selectedDoctorId, dateKey, dayAppointments]);

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
		<div className="space-y-3 pb-32 sm:pb-8">
			{/* Daily Chair & Doctor Occupancy Summary Bar */}
			{dailyTally.totalAppointmentsCount > 0 && (
				<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex items-center gap-3">
						<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<CalendarCheck size={16} className="text-[var(--teal,var(--brand-primary))]" />
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
				className="schedule-grid-container overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm pb-40 pr-6 sm:pb-28 sm:pr-48 touch-pan-x"
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
									<span className="text-[10px] font-normal font-sans lowercase px-2 py-0.5 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20">
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
												const isCito = Boolean(
													(a as any)?.isCito ||
													(a as any)?.cito ||
													(a?.reason ?? "").toLowerCase().includes("cito") ||
													(a?.reason ?? "").toLowerCase().includes("острая боль") ||
													(a?.reason ?? "").toLowerCase().includes("срочн")
												);
												const rawBal = patObj?.balanceRub ?? (patObj as { balance?: number | string | null } | undefined)?.balance;
												const pBalance = rawBal !== undefined && rawBal !== null && rawBal !== "" && Number.isFinite(Number(rawBal)) ? Number(rawBal) : null;
												const pAllergyAlert = (() => {
													const rawAllergies =
														(patObj as { allergies?: string | null } | undefined)?.allergies ||
														(patObj as { anamnesis?: { allergies?: string | null } } | undefined)?.anamnesis?.allergies;
													if (rawAllergies && typeof rawAllergies === "string" && rawAllergies.trim()) {
														return `⚠️ Внимание: ${rawAllergies.trim()}`;
													}
													const notes = patObj?.notes || "";
													const match = notes.match(/аллерги[яеи][^.;\n]*/i);
													if (match) {
														return `⚠️ Внимание: ${match[0].trim()}`;
													}
													if (
														/лидокаин/i.test(a?.reason || "") ||
														/аллерги/i.test(a?.reason || "")
													) {
														return "⚠️ Внимание: Аллергия на лидокаин";
													}
													return null;
												})();

												return (
													<div
														key={a.id}
														draggable
														onMouseEnter={() => setHoveredApptId(a.id)}
														onMouseLeave={() => setHoveredApptId(null)}
														onFocus={() => setHoveredApptId(a.id)}
														onBlur={() => setHoveredApptId(null)}
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
														className={`w-full text-left p-2 rounded-xl border text-xs font-semibold shadow-xs flex flex-col justify-between gap-1.5 transition-all min-h-[52px] cursor-grab active:cursor-grabbing relative ${
															collision
																? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/50"
																: isCito
																	? "bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/60 font-bold"
																	: a.status === "confirmed"
																		? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200"
																		: a.status === "in_treatment"
																			? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))]/50 text-[var(--teal-dark,var(--teal))]"
																			: a.status === "arrived"
																				? "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200"
																				: a.status === "completed"
																					? "bg-slate-500/10 border-slate-400/30 text-slate-600 dark:text-slate-400"
																					: a.status === "cancelled" || a.status === "no_show"
																						? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 opacity-70"
																						: "bg-[var(--paper)] border-[var(--line-strong)] text-[var(--ink)]"
														}`}
													>
														{/* Крупное всплывающее превью пациента по наведению */}
														{hoveredApptId === a.id && (
															<div
																className="appointment-patient-hover-preview p-3.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-30"
																data-testid="schedule-grid-patient-hover-preview"
															>
																{/* 1. Крупное ФИО пациента (18px bold) */}
																<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
																	<span className="text-[18px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate">
																		<User className="w-5 h-5 text-[var(--teal,var(--brand-primary))] shrink-0" />
																		{pName || "Пациент"}
																	</span>
																	{pBalance !== null && (
																		<span
																			className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 ${
																				pBalance > 0
																					? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
																					: pBalance < 0
																						? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
																						: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
																			}`}
																		>
																			{pBalance > 0
																				? `Депозит: +${pBalance.toLocaleString("ru-RU")} ₽`
																				: pBalance < 0
																					? `Долг: ${Math.abs(pBalance).toLocaleString("ru-RU")} ₽`
																					: "Баланс: 0 ₽"}
																		</span>
																	)}
																</div>

																{/* 2. Номер телефона с кнопкой WhatsApp */}
																<div className="flex items-center justify-between gap-2">
																	<div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
																		<Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
																		<span>{patObj?.phone || "Телефон не указан"}</span>
																	</div>
																	{patObj?.phone && (
																		<button
																			type="button"
																			onClick={(e) => {
																				e.stopPropagation();
																				openWhatsAppChat(patObj.phone!, `Здравствуйте, ${pName}! Напоминаем о вашем визите в стоматологию.`);
																			}}
																			className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
																			title="Открыть чат в WhatsApp"
																		>
																			<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
																			<span>WhatsApp</span>
																		</button>
																	)}
																</div>

																{/* 3. Яркий янтарный алерт аллергий / противопоказаний */}
																{pAllergyAlert && (
																	<div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2 shadow-xs">
																		<AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
																		<span>{pAllergyAlert}</span>
																	</div>
																)}

																{/* 4. Название запланированной процедуры */}
																<div className="pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
																	<Clock size={13} className="text-slate-400 shrink-0" />
																	<span className="font-semibold text-slate-800 dark:text-slate-200">
																		{a?.reason || (a as Record<string, any>)?.notes || a?.comment || "Консультация стоматолога"}
																	</span>
																</div>
															</div>
														)}
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
															<div className="flex-1 min-w-0">
																<div className="font-bold flex items-center gap-1 leading-snug break-words">
																	<User size={12} className="shrink-0 text-[var(--teal)]" />
																	<span className="break-words" title={pName}>{formatPatientDisplayFio(pName)}</span>
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
															<div className="flex items-center gap-1 shrink-0">
																{isCito && (
																	<span
																		className="text-xs px-1.5 py-0.5 rounded-md bg-rose-600 text-white font-extrabold flex items-center gap-0.5 animate-pulse shrink-0"
																		title="CITO! Прием по острой боли"
																		data-testid="schedule-grid-cito-badge"
																	>
																		<Zap size={11} className="fill-white" />
																		<span>CITO</span>
																	</span>
																)}
																<span className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1 ${
																	a.status === "in_treatment"
																		? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
																		: a.status === "arrived"
																			? "bg-amber-500 text-white shadow-xs"
																			: a.status === "confirmed"
																				? "bg-emerald-600 text-white shadow-xs"
																				: a.status === "completed"
																					? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
																					: "bg-[var(--paper)]/80 text-[var(--ink)]"
																}`}>
																	{a.status === "in_treatment" && (
																		<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
																	)}
																	{a.status === "completed" && (
																		<Check size={11} className="shrink-0 text-current" />
																	)}
																	<span>{appointmentLabels[a.status] || a.status}</span>
																</span>
															</div>
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

														{/* Compact 2-Button Action Bar (📞 Позвонить, 👤 Профиль) + More Options Dropdown (...) */}
														<div className="flex items-center gap-1.5 pt-1.5 border-t border-[var(--line)]/50 mt-1">
															{patObj?.phone ? (
																<a
																	href={`tel:${patObj.phone}`}
																	onClick={(e) => e.stopPropagation()}
																	className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																	title={`Позвонить ${pName}: ${patObj.phone}`}
																	aria-label={`Позвонить ${pName}`}
																>
																	<Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
																	<span className="hidden sm:inline whitespace-nowrap">Позвонить</span>
																</a>
															) : (
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		onAppointmentClick(a);
																	}}
																	className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																	title={`Открыть прием ${pName}`}
																	aria-label={`Открыть прием ${pName}`}
																>
																	<User size={14} className="text-[var(--teal)] shrink-0" />
																	<span className="hidden sm:inline whitespace-nowrap">Прием</span>
																</button>
															)}

															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	onAppointmentClick(a);
																}}
																className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-[var(--teal,var(--brand-primary))]/40 bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
																title={`Открыть профиль ${pName}`}
																aria-label={`Открыть профиль ${pName}`}
															>
																<User size={14} className="text-[var(--teal)] shrink-0" />
																<span className="whitespace-nowrap">Профиль</span>
															</button>

															{/* Overflow Actions Dropdown Menu (...) */}
															<div className="relative ml-auto">
																<button
																	type="button"
																	onClick={(e) => {
																		e.stopPropagation();
																		setActiveMenuApptId((prev) => (prev === a.id ? null : a.id));
																	}}
																	className="min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 p-2 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none"
																	title="Все действия и статусы визита"
																	aria-label="Дополнительные действия визита"
																	aria-expanded={activeMenuApptId === a.id}
																>
																	<MoreVertical size={16} />
																</button>

																{activeMenuApptId === a.id && (
																	<div
																		className="absolute right-0 bottom-full mb-1 z-50 p-1.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[210px] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
																		onClick={(e) => e.stopPropagation()}
																	>
																		<div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
																			Статус визита
																		</div>
																		{onQuickStatusChange && (
																			<div className="space-y-0.5">
																				<button
																					type="button"
																					title="Подтвержден"
																					onClick={() => {
																						onQuickStatusChange(a.id, "confirmed");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "confirmed"
																							? "bg-violet-500 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-violet-700 dark:text-violet-300"
																					}`}
																				>
																					<PhoneCall size={14} />
																					<span>Подтвержден</span>
																				</button>
																				<button
																					type="button"
																					title="Пришел"
																					onClick={() => {
																						onQuickStatusChange(a.id, "arrived");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "arrived"
																							? "bg-emerald-500 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
																					}`}
																				>
																					<UserCheck size={14} />
																					<span>Пришел</span>
																				</button>
																				<button
																					type="button"
																					title="В кресле"
																					onClick={() => {
																						onQuickStatusChange(a.id, "in_treatment");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "in_treatment"
																							? "bg-[var(--teal,var(--brand-primary))] text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]"
																					}`}
																				>
																					<CalendarCheck size={14} />
																					<span>В кресле</span>
																				</button>
																				<button
																					type="button"
																					title="Завершен"
																					onClick={() => {
																						onQuickStatusChange(a.id, "completed");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "completed"
																							? "bg-slate-600 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
																					}`}
																				>
																					<CheckCircle2 size={14} />
																					<span>Завершен</span>
																				</button>
																				<button
																					type="button"
																					title="Не явился"
																					onClick={() => {
																						onQuickStatusChange(a.id, "no_show");
																						setActiveMenuApptId(null);
																					}}
																					className={`w-full text-left min-h-[48px] min-w-[48px] sm:min-h-[36px] sm:min-w-0 px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
																						a.status === "no_show"
																							? "bg-rose-500 text-white font-bold"
																							: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300"
																					}`}
																				>
																					<UserX size={14} />
																					<span>Не явился</span>
																				</button>
																			</div>
																		)}

																		{patObj?.phone && (
																			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
																				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
																					Связь
																				</div>
																				<button
																					type="button"
																					onClick={() => {
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
																						setActiveMenuApptId(null);
																					}}
																					className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 font-bold transition-colors cursor-pointer"
																				>
																					<MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
																					<span>WhatsApp напоминание</span>
																				</button>

																				<button
																					type="button"
																					onClick={() => {
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
																						setActiveMenuApptId(null);
																					}}
																					className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium transition-colors cursor-pointer"
																				>
																					<Copy size={14} className="text-[var(--teal)]" />
																					<span>Скопировать SMS</span>
																				</button>
																			</div>
																		)}
																	</div>
																)}
															</div>
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
										{(() => {
											const isEmergencyBuffer = emergencyReserveSlots.some((r) => {
												const rHour = toDateTimeLocalValue(r.startTime, timezone).slice(11, 13);
												return rHour === hour.slice(0, 2);
											});

											if (isEmergencyBuffer) {
												return (
													<button
														type="button"
														onClick={() =>
															onSlotClick({
																dateKey,
																startTime: hour,
																chairId: chair.id !== "default-chair" ? chair.id : null,
																doctorUserId: selectedDoctorId || null,
																durationMinutes: 30,
																reason: "Острая боль (CITO Резерв)",
															})
														}
														className="w-full h-full min-h-[48px] rounded-xl border border-dashed border-amber-400/80 dark:border-amber-600 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs whitespace-nowrap shrink-0"
														title={`Экстренный резерв (CITO): ${hour} (${chair.name}). Буфер 30 мин для пациентов с острой болью`}
														aria-label={`Экстренный резерв на ${hour}, кресло ${chair.name}. Буфер 30 минут по острой боли`}
														data-testid="schedule-emergency-buffer-slot"
													>
														<Zap size={14} className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
														<span className="text-xs whitespace-nowrap shrink-0">Резерв: Острая боль ({hour})</span>
													</button>
												);
											}

											return (
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
													className="w-full h-full min-h-[48px] rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] dark:bg-[rgba(255,255,255,0.03)] hover:border-[var(--teal)] hover:bg-[var(--teal-surface)] text-[var(--muted)] hover:text-[var(--teal-dark)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:ring-2 focus:ring-[var(--teal)] focus:outline-none whitespace-nowrap shrink-0"
													title={`Записать на ${hour} (${chair.name})`}
													aria-label={`Свободно на ${hour}, кресло ${chair.name}. Нажмите для быстрой записи`}
												>
													<Plus size={14} className="text-[var(--teal)] opacity-60 group-hover:opacity-100 shrink-0" />
													<span className="text-xs whitespace-nowrap shrink-0">+ Записать на {hour}</span>
												</button>
											);
										})()}
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
