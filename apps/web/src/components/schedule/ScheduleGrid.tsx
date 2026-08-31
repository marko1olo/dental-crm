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
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useRef, useState, useEffect } from "react";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawer";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { formatPatientDisplayFio } from "./AppointmentCard";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import { calculateDailyChairDoctorTally } from "./doctorFreeSlotsEngine";
import { countLabel } from "../../lib/russianPlural";

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

function extractTeethList(appointment: Appointment): string[] {
	if (!appointment) return [];
	const explicitTeeth = (appointment as any)?.teeth;
	if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
		return explicitTeeth.map(String);
	}
	const singleTooth = (appointment as any)?.toothNumber || (appointment as any)?.tooth;
	if (singleTooth) {
		return [String(singleTooth)];
	}
	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	if (!text.trim()) return [];
	const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
	if (matches && matches.length > 0) {
		return Array.from(new Set(matches));
	}
	return [];
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

	const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);
	const [activeMenuApptId, setActiveMenuApptId] = useState<string | null>(null);
	const [selectedMobileAppt, setSelectedMobileAppt] = useState<Appointment | null>(null);
	const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleAppointmentMouseEnter = (apptId: string) => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			setHoveredApptId(apptId);
		}, 150);
	};

	const handleAppointmentMouseLeave = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setHoveredApptId(null);
	};

	useEffect(() => {
		return () => {
			if (hoverTimeoutRef.current) {
				clearTimeout(hoverTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
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
		<div className="space-y-3">
			{/* Daily Chair & Doctor Occupancy Summary Bar */}
			{dailyTally.totalAppointmentsCount > 0 && (
				<div className="p-3 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs">
					<div className="flex items-center gap-3">
						<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
							<CalendarCheck size={16} className="text-[var(--teal,var(--brand-primary))]" />
							Загрузка клиники: {countLabel(dailyTally.totalAppointmentsCount, "визит", "визита", "визитов")} ({dailyTally.clinicOccupancyPercent}%)
						</span>
						<span className="text-[var(--muted)]">·</span>
						<span className="text-[var(--muted)]">
							Общее время приема: {Math.floor(dailyTally.totalDurationMinutes / 60)} ч {dailyTally.totalDurationMinutes % 60} мин
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
				className="schedule-grid-container overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm p-4 sm:p-6 touch-pan-x"
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
										{countLabel(chairStat.appointmentsCount, "визит", "визита", "визитов")} ({chairStat.occupancyPercent}%)
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
														onMouseEnter={() => handleAppointmentMouseEnter(a.id)}
														onMouseLeave={handleAppointmentMouseLeave}
														onFocus={() => handleAppointmentMouseEnter(a.id)}
														onBlur={handleAppointmentMouseLeave}
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
														{/* macOS Hover HUD с задержкой 150ms без сдвига сетки расписания (Apple HIG Progressive Disclosure) */}
														{hoveredApptId === a.id && (
															<div
																className="appointment-patient-hover-preview absolute left-0 top-full mt-1.5 w-[330px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-50 pointer-events-auto"
																data-testid="schedule-grid-patient-hover-preview"
																onMouseEnter={() => {
																	if (hoverTimeoutRef.current) {
																		clearTimeout(hoverTimeoutRef.current);
																		hoverTimeoutRef.current = null;
																	}
																	setHoveredApptId(a.id);
																}}
																onMouseLeave={handleAppointmentMouseLeave}
															>
																{/* 1. Крупное ФИО пациента + Статус 54-ФЗ (Баланс / Долг / Аванс) */}
																<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
																	<span className="text-[17px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate">
																		<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
																		{pName || "Пациент"}
																	</span>
																	{pBalance !== null ? (
																		<span
																			className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 ${
																				pBalance > 0
																					? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
																					: pBalance < 0
																						? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
																						: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
																			}`}
																			title={
																				pBalance > 0
																					? "Аванс / Депозит (54-ФЗ)"
																					: pBalance < 0
																						? "Задолженность по 54-ФЗ"
																						: "Оплачено по 54-ФЗ"
																			}
																		>
																			{pBalance > 0
																				? `Депозит: +${pBalance.toLocaleString("ru-RU")} ₽`
																				: pBalance < 0
																					? `Долг: ${Math.abs(pBalance).toLocaleString("ru-RU")} ₽`
																					: "Оплата: 54-ФЗ (0 ₽)"}
																		</span>
																	) : (
																		<span className="px-2 py-0.5 rounded-lg text-[11px] font-medium font-mono text-slate-500 bg-slate-500/10 border border-slate-500/20">
																			54-ФЗ: Баланс 0 ₽
																		</span>
																	)}
																</div>

																{/* 2. Номер телефона с кнопкой WhatsApp и копированием SMS */}
																<div className="flex items-center justify-between gap-2">
																	<div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
																		<Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
																		<span>{patObj?.phone || "Телефон не указан"}</span>
																	</div>
																	{patObj?.phone && (
																		<div className="flex items-center gap-1">
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
																				className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
																				title="Открыть чат в WhatsApp"
																			>
																				<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
																				<span>WhatsApp</span>
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
																					if (typeof navigator !== "undefined" && navigator.clipboard) {
																						void navigator.clipboard.writeText(text);
																						showToast(`Текст напоминания для ${pName} скопирован в буфер`, "success");
																					}
																				}}
																				className="p-1 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer"
																				title="Скопировать SMS напоминание"
																			>
																				<Copy size={13} />
																			</button>
																		</div>
																	)}
																</div>

																{/* 3. Яркий янтарный алерт аллергий / противопоказаний */}
																{pAllergyAlert && (
																	<div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2 shadow-xs">
																		<AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
																		<span>{pAllergyAlert}</span>
																	</div>
																)}

																{/* 4. Процедура и список зубов */}
																<div className="pt-2 border-t border-[var(--line)] space-y-1.5">
																	<div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
																		<Clock size={13} className="text-[var(--teal)] shrink-0" />
																		<span className="font-semibold">
																			{a?.reason || (a as Record<string, any>)?.notes || a?.comment || "Консультация стоматолога"}
																		</span>
																	</div>
																	{/* Список зубов */}
																	{(() => {
																		const teeth = extractTeethList(a);
																		if (teeth.length === 0) return null;
																		return (
																			<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
																				<span className="text-[11px] font-bold text-[var(--muted)]">Зубы:</span>
																				{teeth.map((t) => (
																					<span
																						key={t}
																						className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30 text-[11px] font-bold font-mono"
																					>
																						{t}
																					</span>
																				))}
																			</div>
																		);
																	})()}
																</div>

																{/* 5. Врач, ассистент, кресло */}
																<div className="pt-2 border-t border-[var(--line)] space-y-1 text-[11px] text-[var(--muted)]">
																	<div className="flex items-center justify-between gap-1">
																		<span className="flex items-center gap-1 text-[var(--ink)] font-medium truncate">
																			<Stethoscope size={12} className="text-[var(--teal)] shrink-0" />
																			<span className="truncate">
																				{docObj?.fullName || "Врач не назначен"}
																			</span>
																		</span>
																		{docObj?.specialties && docObj.specialties.length > 0 && (
																			<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0">
																				{docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
																			</span>
																		)}
																	</div>
																	{/* Ассистент */}
																	<div className="flex items-center gap-1 text-[var(--muted)]">
																		<User size={12} className="shrink-0 opacity-70" />
																		<span>
																			Ассистент: {(() => {
																				const asstObj = a.assistantUserId ? dashboard.clinicSettings?.staff?.find((s) => s.id === a.assistantUserId) : null;
																				return asstObj?.fullName || "Не назначен";
																			})()}
																		</span>
																	</div>
																	{/* Кресло и время */}
																	<div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
																		<span>Кабинет: {chair.name}</span>
																		<span className="font-bold text-[var(--ink)]">{aStart} – {aEnd}</span>
																	</div>
																</div>

																{/* 6. Быстрая смена статуса в Hover HUD */}
																{onQuickStatusChange && (
																	<div className="pt-2 border-t border-[var(--line)]">
																		<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
																			Быстрый статус (Apple HIG)
																		</div>
																		<div className="grid grid-cols-3 gap-1">
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "confirmed");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "confirmed"
																						? "bg-emerald-600 text-white border-emerald-600"
																						: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
																				}`}
																			>
																				<PhoneCall size={11} />
																				<span>Подтвержден</span>
																			</button>
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "arrived");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "arrived"
																						? "bg-amber-500 text-white border-amber-500"
																						: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
																				}`}
																			>
																				<UserCheck size={11} />
																				<span>Пришел</span>
																			</button>
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					onQuickStatusChange(a.id, "in_treatment");
																					handleAppointmentMouseLeave();
																				}}
																				className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
																					a.status === "in_treatment"
																						? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)]"
																						: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
																				}`}
																			>
																				<CalendarCheck size={11} />
																				<span>В кресле</span>
																			</button>
																		</div>
																	</div>
																)}
															</div>
														)}

														{/* Карточка записи: 3 главных фокуса (ФИО, процедура, цветной маркер статуса) по стандарту Apple HIG */}
														<div
															onClick={() => {
																if (typeof window !== "undefined" && window.innerWidth < 768) {
																	setSelectedMobileAppt(a);
																} else {
																	onAppointmentClick(a);
																}
															}}
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
																{/* Фокус 1: ФИО */}
																<div className="font-bold flex items-center gap-1 leading-snug break-words text-xs">
																	<User size={12} className="shrink-0 text-[var(--teal)]" />
																	<span className="break-words" title={pName}>{formatPatientDisplayFio(pName)}</span>
																</div>
																{/* Фокус 2: Процедура и время */}
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
															{/* Фокус 3: Цветовой маркер статуса */}
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
													<span className="text-xs whitespace-nowrap shrink-0">Записать на {hour}</span>
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

	{/* Mobile Native Bottom Sheet for Progressive Disclosure on tap */}
	{selectedMobileAppt && (() => {
		const mPatName = patientName(dashboard.patients, selectedMobileAppt.patientId);
		const mPatObj = dashboard.patients?.find((p) => p.id === selectedMobileAppt.patientId);
		const mDocObj = dashboard.clinicSettings?.staff?.find((s) => s.id === selectedMobileAppt.doctorUserId);
		const mChairObj = dashboard.clinicSettings?.chairs?.find((c) => c.id === selectedMobileAppt.chairId);
		const mRawBal = mPatObj?.balanceRub ?? (mPatObj as { balance?: number | string | null } | undefined)?.balance;
		const mBalance = mRawBal !== undefined && mRawBal !== null && mRawBal !== "" && Number.isFinite(Number(mRawBal)) ? Number(mRawBal) : null;
		const mTeeth = extractTeethList(selectedMobileAppt);
		const mStart = toDateTimeLocalValue(selectedMobileAppt.startsAt, timezone).slice(11, 16);
		const mEnd = toDateTimeLocalValue(selectedMobileAppt.endsAt, timezone).slice(11, 16);
		const mAllergyAlert = (() => {
			const rawAllergies =
				(mPatObj as { allergies?: string | null } | undefined)?.allergies ||
				(mPatObj as { anamnesis?: { allergies?: string | null } } | undefined)?.anamnesis?.allergies;
			if (rawAllergies && typeof rawAllergies === "string" && rawAllergies.trim()) {
				return `⚠️ Внимание: ${rawAllergies.trim()}`;
			}
			const notes = mPatObj?.notes || "";
			const match = notes.match(/аллерги[яеи][^.;\n]*/i);
			if (match) {
				return `⚠️ Внимание: ${match[0].trim()}`;
			}
			if (
				/лидокаин/i.test(selectedMobileAppt?.reason || "") ||
				/аллерги/i.test(selectedMobileAppt?.reason || "")
			) {
				return "⚠️ Внимание: Аллергия на лидокаин";
			}
			return null;
		})();

		return (
			<div
				className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
				onClick={() => setSelectedMobileAppt(null)}
				role="dialog"
				aria-modal="true"
				aria-label="Подробности приёма"
				data-testid="schedule-grid-mobile-bottom-sheet"
			>
				<div
					className="bg-[var(--paper-strong)] rounded-t-3xl border-t border-[var(--line)] p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-xs text-[var(--ink)]"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Top Grab Handle */}
					<div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

					{/* Header */}
					<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
						<div className="min-w-0 flex-1">
							<div className="text-lg font-black text-[var(--ink)] truncate">
								{mPatName}
							</div>
							<div className="text-xs text-[var(--muted)] font-medium">
								{mStart} – {mEnd} · {selectedMobileAppt.reason || "Прием"}
							</div>
						</div>
						<button
							type="button"
							onClick={() => setSelectedMobileAppt(null)}
							className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>

					{/* 54-FZ Payment status & Balance banner */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
						<span className="font-bold text-[var(--muted)]">Статус 54-ФЗ / Баланс:</span>
						{mBalance !== null ? (
							<span
								className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
									mBalance > 0
										? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
										: mBalance < 0
											? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
											: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
								}`}
							>
								{mBalance > 0
									? `Депозит: +${mBalance.toLocaleString("ru-RU")} ₽`
									: mBalance < 0
										? `Долг: ${Math.abs(mBalance).toLocaleString("ru-RU")} ₽`
										: "0 ₽ (Оплачено 54-ФЗ)"}
							</span>
						) : (
							<span className="text-xs text-[var(--muted)]">0 ₽ (54-ФЗ)</span>
						)}
					</div>

					{/* Phone & WhatsApp */}
					{mPatObj?.phone && (
						<div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--ink)]">
								<Phone className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span>{mPatObj.phone}</span>
							</div>
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() => {
										const text = generateAppointmentWhatsAppMessage({
											patientName: mPatName,
											doctorName: mDocObj?.fullName,
											doctorSpecialty: mDocObj?.role,
											appointmentStartsAt: selectedMobileAppt.startsAt,
											clinicName: dashboard.clinicSettings?.profile?.clinicName,
											clinicAddress: dashboard.clinicSettings?.profile?.address,
											clinicPhone: dashboard.clinicSettings?.profile?.phone,
											treatmentReason: selectedMobileAppt.reason,
										});
										openWhatsAppChat(mPatObj.phone!, text);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
								>
									<MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
									<span>WhatsApp</span>
								</button>
								<button
									type="button"
									onClick={() => {
										const text = generateAppointmentWhatsAppMessage({
											patientName: mPatName,
											doctorName: mDocObj?.fullName,
											doctorSpecialty: mDocObj?.role,
											appointmentStartsAt: selectedMobileAppt.startsAt,
											clinicName: dashboard.clinicSettings?.profile?.clinicName,
											clinicAddress: dashboard.clinicSettings?.profile?.address,
											clinicPhone: dashboard.clinicSettings?.profile?.phone,
											treatmentReason: selectedMobileAppt.reason,
										});
										if (typeof navigator !== "undefined" && navigator.clipboard) {
											void navigator.clipboard.writeText(text);
											showToast(`Текст напоминания скопирован`, "success");
										}
									}}
									className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-center cursor-pointer"
									title="Скопировать SMS"
								>
									<Copy size={16} />
								</button>
							</div>
						</div>
					)}

					{/* Allergy alert */}
					{mAllergyAlert && (
						<div className="p-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2">
							<AlertTriangle size={16} className="text-amber-600 shrink-0 animate-bounce" />
							<span>{mAllergyAlert}</span>
						</div>
					)}

					{/* Teeth List */}
					{mTeeth.length > 0 && (
						<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
							<div className="font-bold text-[var(--muted)]">Список зубов:</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								{mTeeth.map((t) => (
									<span
										key={t}
										className="px-2 py-1 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 text-xs font-black font-mono"
									>
										Зуб {t}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Doctor & Assistant */}
					<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs text-[var(--ink)]">
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Врач:</span>
							<span className="font-bold">{mDocObj?.fullName || "Не назначен"}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Ассистент:</span>
							<span>
								{(() => {
									const asst = selectedMobileAppt.assistantUserId
										? dashboard.clinicSettings?.staff?.find((s) => s.id === selectedMobileAppt.assistantUserId)
										: null;
									return asst?.fullName || "Не назначен";
								})()}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[var(--muted)]">Кабинет:</span>
							<span className="font-mono font-semibold">{mChairObj?.name || "Кабинет 1"}</span>
						</div>
					</div>

					{/* Quick Status Buttons */}
					{onQuickStatusChange && (
						<div className="space-y-2">
							<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
								Сменить статус визита:
							</div>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "confirmed");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-violet-500/15 border border-violet-500/40 text-violet-800 dark:text-violet-200 flex items-center justify-center gap-2 cursor-pointer"
								>
									<PhoneCall size={14} />
									<span>Подтвержден</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "arrived");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer"
								>
									<UserCheck size={14} />
									<span>Пришел</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "in_treatment");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)] flex items-center justify-center gap-2 cursor-pointer"
								>
									<CalendarCheck size={14} />
									<span>В кресле</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(selectedMobileAppt.id, "completed");
										setSelectedMobileAppt(null);
									}}
									className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-slate-500/15 border border-slate-500/40 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
								>
									<CheckCircle2 size={14} />
									<span>Завершен</span>
								</button>
							</div>
						</div>
					)}

					{/* Primary Action Button */}
					<div className="pt-2">
						<button
							type="button"
							onClick={() => {
								setSelectedMobileAppt(null);
								onAppointmentClick(selectedMobileAppt);
							}}
							className="w-full min-h-[48px] rounded-2xl bg-[var(--teal,var(--brand-primary))] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
						>
							<User size={16} />
							<span>Открыть карту приема</span>
						</button>
					</div>
				</div>
			</div>
		);
	})()}
</div>
);
}
