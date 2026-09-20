import {
	type Appointment,
	type Dashboard,
	type DentalSpecialty,
	getStomxWorkplacePalette,
} from "@dental/shared";
import {
	AlertTriangle,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	FastForward,
	MessageSquare,
	MoreVertical,
	Phone,
	PhoneCall,
	Stethoscope,
	User,
	UserCheck,
	UserMinus,
	UserX,
	Zap,
} from "lucide-react";
import React, { memo } from "react";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { extractTeethList, formatPatientDisplayFio } from "./AppointmentCard";
import { showToast } from "../GlobalToast";

export function formatDoctorShortName(fullName?: string | null): string {
	if (!fullName) return "";
	const cleaned = fullName.trim();
	const parts = cleaned.split(/\s+/);
	const firstPart = parts[0];
	const nameParts =
		parts.length > 1 && firstPart && /^(д-р|доктор|врач)\.?$/i.test(firstPart)
			? parts.slice(1)
			: parts;
	if (nameParts.length === 0) return cleaned || "";
	const surname = nameParts[0] || "";
	if (!surname) return cleaned;
	if (nameParts.length === 1) return surname;

	const initials = nameParts
		.slice(1)
		.map((p) => {
			if (!p) return "";
			const matched = p.match(/[a-zA-Zа-яА-ЯёЁ]/g);
			if (!matched || matched.length === 0) return "";
			if (p.includes(".")) {
				return matched.map((l) => `${l.toUpperCase()}.`).join("");
			}
			const firstLetter = matched[0];
			return firstLetter ? `${firstLetter.toUpperCase()}.` : "";
		})
		.join("");

	return initials ? `${surname} ${initials}` : surname;
}

export function isAppointmentInChair(status: string | undefined | null): boolean {
	if (!status) return false;
	const s = String(status).toLowerCase();
	return s === "in_treatment" || s === "in_progress";
}

export function getNormalizedAppointmentStatusLabel(
	status: string | undefined | null,
	labels?: Record<string, string>,
): string {
	if (!status) return "";
	const s = String(status).toLowerCase();
	if (s === "in_treatment" || s === "in_progress") return "В кресле";
	if (labels) {
		if (labels[s]) return labels[s];
		if (labels[status]) return labels[status];
	}
	return status;
}

export interface GridAppointmentCardProps {
	appointment: Appointment;
	chair: { id: string; name: string };
	effectiveChairs: Array<{ id: string; name: string; color?: string; colorId?: string | number }>;
	doctors: Array<{ id: string; fullName: string; specialties?: string[]; role?: string }>;
	patientLookupMap: Map<string, any>;
	staffLookupMap: Map<string, any>;
	collisionMap: Map<string, any>;
	patientNameFn?: (patients: any, patientId?: string | null) => string;
	getPatientName?: (patients: any, patientId?: string | null) => string;
	dashboard: Dashboard;
	timezone?: string | null;
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	isHovered: boolean;
	isStatusPickerOpen: boolean;
	isMenuOpen: boolean;
	isNearBottom: boolean;
	isNearRightEdge: boolean;
	onAppointmentClick: (appt: Appointment) => void;
	onSelectMobileAppt: (appt: Appointment) => void;
	onQuickStatusChange?: (id: string, status: any) => void;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onReassignChair: (appt: Appointment, chairId: string) => void;
	onReassignDoctor: (appt: Appointment, doctorId: string) => void;
	onFreeSlotToWaitlist: (appt: Appointment) => void;
	onMouseEnter: (apptId: string) => void;
	onMouseLeave: () => void;
	onKeepHovered: (apptId: string) => void;
	onToggleStatusPicker: (apptId: string) => void;
	onToggleMenu: (apptId: string) => void;
	onCloseStatusPicker: () => void;
	onCloseMenu: () => void;
}

function areGridAppointmentCardPropsEqual(
	prev: GridAppointmentCardProps,
	next: GridAppointmentCardProps,
): boolean {
	if (prev.appointment !== next.appointment) return false;
	if (prev.isHovered !== next.isHovered) return false;
	if (prev.isStatusPickerOpen !== next.isStatusPickerOpen) return false;
	if (prev.isMenuOpen !== next.isMenuOpen) return false;
	if (prev.isNearBottom !== next.isNearBottom) return false;
	if (prev.isNearRightEdge !== next.isNearRightEdge) return false;
	if (prev.chair.id !== next.chair.id || prev.chair.name !== next.chair.name) return false;
	if (prev.effectiveChairs !== next.effectiveChairs) return false;
	if (prev.doctors !== next.doctors) return false;
	if (prev.patientLookupMap !== next.patientLookupMap) return false;
	if (prev.staffLookupMap !== next.staffLookupMap) return false;
	if (prev.collisionMap !== next.collisionMap) return false;
	if (prev.appointmentLabels !== next.appointmentLabels) return false;
	if (prev.timezone !== next.timezone) return false;
	if (prev.dashboard.clinicSettings !== next.dashboard.clinicSettings) return false;
	return true;
}

export const GridAppointmentCard = memo(function GridAppointmentCard(props: GridAppointmentCardProps) {
	const {
		appointment: a,
		chair,
		effectiveChairs,
		doctors,
		patientLookupMap,
		staffLookupMap,
		collisionMap,
		patientNameFn,
		getPatientName,
		dashboard,
		timezone,
		toDateTimeLocalValue,
		appointmentLabels,
		isHovered,
		isStatusPickerOpen,
		isMenuOpen,
		isNearBottom,
		isNearRightEdge,
		onAppointmentClick,
		onSelectMobileAppt,
		onQuickStatusChange,
		onAdjustDuration,
		onShiftLateness,
		onReassignChair,
		onReassignDoctor,
		onFreeSlotToWaitlist,
		onMouseEnter,
		onMouseLeave,
		onKeepHovered,
		onToggleStatusPicker,
		onToggleMenu,
		onCloseStatusPicker,
		onCloseMenu,
	} = props;

	const resolveNameFn = getPatientName || patientNameFn || ((_patients: any, _id?: string | null) => "Пациент");
	const pName = resolveNameFn(dashboard.patients, a.patientId ?? null);
	const aStart = toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16);
	const aEnd = toDateTimeLocalValue(a.endsAt, timezone).slice(11, 16);

	const patObj = a.patientId ? patientLookupMap.get(a.patientId) : undefined;
	const docObj = a.doctorUserId ? staffLookupMap.get(a.doctorUserId) : undefined;
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
			return `Внимание: ${rawAllergies.trim()}`;
		}
		const notes = patObj?.notes || "";
		const match = notes.match(/аллерги[яеи][^.;\n]*/i);
		if (match) {
			return `Внимание: ${match[0].trim()}`;
		}
		if (
			/лидокаин/i.test(a?.reason || "") ||
			/аллерги/i.test(a?.reason || "")
		) {
			return "Внимание: Аллергия на лидокаин";
		}
		return null;
	})();

	return (
		<div
			key={a.id}
			data-testid={`appointment-card-${a.id}`}
			draggable
			onMouseEnter={() => onMouseEnter(a.id)}
			onMouseLeave={onMouseLeave}
			onFocus={() => onMouseEnter(a.id)}
			onBlur={onMouseLeave}
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
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 52px" }}
			className={`w-full text-left p-2 rounded-xl border text-xs font-semibold shadow-xs flex flex-col justify-between gap-1.5 transition-all min-h-[52px] cursor-grab active:cursor-grabbing relative ${
				collision
					? "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-100 ring-1 ring-amber-500/50"
					: isCito
						? "bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/60 font-bold"
						: a.status === "confirmed"
							? "bg-emerald-500/15 border-emerald-500/50 text-emerald-800 dark:text-emerald-200"
							: isAppointmentInChair(a.status)
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
			{isHovered && (
				<div
					className={`appointment-patient-hover-preview absolute ${isNearRightEdge ? "right-0 left-auto" : "left-0"} ${isNearBottom ? "bottom-full mb-1.5 top-auto" : "top-full mt-1.5"} w-[330px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-50 pointer-events-auto`}
					data-testid="schedule-grid-patient-hover-preview"
					onMouseEnter={() => {
						onKeepHovered(a.id);
					}}
					onMouseLeave={onMouseLeave}
				>
					{/* 1. Крупное ФИО пациента + Статус 54-ФЗ (Баланс / Долг / Аванс) */}
					<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
						<span className="text-[17px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate">
							<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
							{pName || "Пациент"}
						</span>
						{pBalance !== null ? (
							<span
								className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap ${
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
							<span className="px-2 py-0.5 rounded-lg text-[11px] font-medium font-mono text-slate-500 bg-slate-500/10 border border-slate-500/20 shrink-0 whitespace-nowrap">
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
									className="min-h-[44px] min-w-[44px] sm:min-h-[44px] sm:min-w-[44px] p-2 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer flex items-center justify-center"
									style={{ minHeight: "44px", minWidth: "44px" }}
									title="Скопировать SMS напоминание"
									aria-label="Скопировать SMS напоминание"
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
								<span
									className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 truncate max-w-[120px]"
									title={docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
								>
									{docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
								</span>
							)}
						</div>
						{/* Ассистент */}
						<div className="flex items-center gap-1 text-[var(--muted)]">
							<User size={12} className="shrink-0 opacity-70" />
							<span>
								Ассистент: {(() => {
									const asstObj = a.assistantUserId ? staffLookupMap.get(a.assistantUserId) : null;
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
							<div className="grid grid-cols-2 sm:grid-cols-5 gap-1">
								<button
									type="button"
									data-testid={`hover-status-confirmed-${a.id}`}
									onClick={(e) => {
										e.stopPropagation();
										onQuickStatusChange(a.id, "confirmed");
										onMouseLeave();
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
									data-testid={`hover-status-arrived-${a.id}`}
									onClick={(e) => {
										e.stopPropagation();
										onQuickStatusChange(a.id, "arrived");
										onMouseLeave();
									}}
									className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
										a.status === "arrived"
											? "bg-amber-500 text-white border-amber-500"
											: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
									}`}
								>
									<UserCheck size={11} />
									<span>Прибыл</span>
								</button>
								<button
									type="button"
									data-testid={`hover-status-in-treatment-${a.id}`}
									onClick={(e) => {
										e.stopPropagation();
										onQuickStatusChange(a.id, "in_treatment");
										onMouseLeave();
									}}
									className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
										isAppointmentInChair(a.status)
											? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)]"
											: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
									}`}
								>
									<CalendarCheck size={11} />
									<span>В кресле</span>
								</button>
								<button
									type="button"
									data-testid={`hover-status-completed-${a.id}`}
									onClick={(e) => {
										e.stopPropagation();
										onQuickStatusChange(a.id, "completed");
										onMouseLeave();
									}}
									className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
										a.status === "completed"
											? "bg-slate-600 text-white border-slate-600"
											: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
									}`}
								>
									<CheckCircle2 size={11} />
									<span>Завершен</span>
								</button>
								<button
									type="button"
									data-testid={`hover-status-no-show-${a.id}`}
									onClick={(e) => {
										e.stopPropagation();
										onQuickStatusChange(a.id, "no_show");
										onMouseLeave();
									}}
									className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
										a.status === "no_show"
											? "bg-rose-500 text-white border-rose-500"
											: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
									}`}
								>
									<UserX size={11} />
									<span>Не явился</span>
								</button>
							</div>
						</div>
					)}

					{/* 7. Быстрое изменение длительности и сдвиг при опоздании (Wave 58) */}
					<div className="pt-2 border-t border-[var(--line)]">
						<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center justify-between">
							<span>Длительность и сдвиг (1 клик)</span>
						</div>
						<div className="grid grid-cols-4 gap-1">
							<button
								type="button"
								data-testid={`hover-duration-plus-15-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onAdjustDuration(a, 15);
								}}
								className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Увеличить длительность на 15 минут"
							>
								<Clock size={11} className="text-[var(--teal)] shrink-0" />
								<span>+15 мин</span>
							</button>
							<button
								type="button"
								data-testid={`hover-duration-plus-30-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onAdjustDuration(a, 30);
								}}
								className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Увеличить длительность на 30 минут"
							>
								<Clock size={11} className="text-[var(--teal)] shrink-0" />
								<span>+30 мин</span>
							</button>
							<button
								type="button"
								data-testid={`hover-duration-minus-15-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onAdjustDuration(a, -15);
								}}
								className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Уменьшить длительность на 15 минут"
							>
								<Clock size={11} className="text-[var(--teal)] shrink-0" />
								<span>-15 мин</span>
							</button>
							<button
								type="button"
								data-testid={`hover-shift-late-15-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onShiftLateness(a, 15);
								}}
								className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/40 flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Сдвинуть прием на 15 минут вперед при опоздании"
							>
								<FastForward size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span>Сдвиг +15 мин</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Карточка записи: 3 главных фокуса (ФИО, процедура, цветной маркер статуса) по стандарту Apple HIG */}
			<div
				data-testid={`appointment-card-clickable-${a.id}`}
				onClick={() => {
					if (typeof window !== "undefined" && window.innerWidth < 768) {
						onSelectMobileAppt(a);
					} else {
						onAppointmentClick(a);
					}
				}}
				className="cursor-pointer flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-1.5 sm:gap-2 min-w-0"
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
					<div className="font-bold flex items-center gap-1 leading-snug text-xs min-w-0">
						<User size={12} className="shrink-0 text-[var(--teal)]" />
						<span className="truncate min-w-0" title={pName}>{formatPatientDisplayFio(pName)}</span>
					</div>
					{/* Фокус 2: Процедура и время */}
					<div className="text-xs opacity-75 font-normal truncate min-w-0">
						{aStart} - {aEnd} · {a.reason || "Прием"}
					</div>
					{docObj && (
						<div className="text-xs opacity-85 font-medium truncate flex items-center gap-1 mt-0.5 min-w-0">
							<Stethoscope size={12} className="shrink-0 text-[var(--teal)]" />
							<span className="truncate min-w-0">
								{docObj.fullName
									?.split(" ")
									.map((part: string, index: number) => (index === 0 ? part : `${part[0]}.`))
									.join(" ") || docObj.fullName}
							</span>
							{docObj.specialties && docObj.specialties.length > 0 && (
								<span
									className="text-xs px-1 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0 max-w-[110px] truncate"
									title={docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
								>
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
							title="CITO! Прием по острой боли (овербукинг)"
							data-testid="appointment-cito-overbooking-badge"
						>
							<Zap size={11} className="fill-white" />
							<span>CITO</span>
						</span>
					)}
					<div className="relative">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								if (onQuickStatusChange) {
									onToggleStatusPicker(a.id);
								}
							}}
							className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition-all cursor-pointer hover:opacity-90 active:scale-95 max-w-[120px] sm:max-w-none truncate ${
								isAppointmentInChair(a.status)
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
									: a.status === "arrived"
										? "bg-amber-500 text-white shadow-xs"
										: a.status === "confirmed"
											? "bg-emerald-600 text-white shadow-xs"
											: a.status === "completed"
												? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
												: "bg-[var(--paper)]/80 text-[var(--ink)]"
							}`}
							title={`Статус: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}. Нажмите для быстрой смены в 1 клик`}
							aria-label={`Сменить статус визита, текущий: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}`}
							data-testid={`appointment-card-status-badge-${a.id}`}
						>
							{isAppointmentInChair(a.status) && (
								<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
							)}
							{String(a.status).toLowerCase() === "completed" && (
								<Check size={11} className="shrink-0 text-current" />
							)}
							<span className="truncate">{getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}</span>
						</button>

						{isStatusPickerOpen && onQuickStatusChange && (
							<div
								className="absolute right-0 top-full mt-1 z-50 p-1.5 rounded-xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[190px] max-w-[calc(100vw-32px)] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
								onClick={(e) => e.stopPropagation()}
								data-testid={`appointment-status-picker-popover-${a.id}`}
							>
								<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
									Статус визита (1 клик)
								</div>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(a.id, "confirmed");
										onCloseStatusPicker();
									}}
									className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
										a.status === "confirmed"
											? "bg-emerald-600 text-white font-bold"
											: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
									}`}
									data-testid={`quick-status-picker-confirmed-${a.id}`}
								>
									<PhoneCall size={13} />
									<span>Подтвержден</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(a.id, "arrived");
										onCloseStatusPicker();
									}}
									className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
										a.status === "arrived"
											? "bg-amber-500 text-white font-bold"
											: "hover:bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300"
									}`}
									data-testid={`quick-status-picker-arrived-${a.id}`}
								>
									<UserCheck size={13} />
									<span>Прибыл</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(a.id, "in_treatment");
										onCloseStatusPicker();
									}}
									className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
										isAppointmentInChair(a.status)
											? "bg-[var(--teal,var(--brand-primary))] text-white font-bold"
											: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]"
									}`}
									data-testid={`quick-status-picker-in-treatment-${a.id}`}
								>
									<CalendarCheck size={13} />
									<span>В кресле</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(a.id, "completed");
										onCloseStatusPicker();
									}}
									className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
										a.status === "completed"
											? "bg-slate-600 text-white font-bold"
											: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
									}`}
									data-testid={`quick-status-picker-completed-${a.id}`}
								>
									<CheckCircle2 size={13} />
									<span>Завершен</span>
								</button>
								<button
									type="button"
									onClick={() => {
										onQuickStatusChange(a.id, "no_show");
										onCloseStatusPicker();
									}}
									className={`w-full text-left min-h-[36px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
										a.status === "no_show"
											? "bg-rose-500 text-white font-bold"
											: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300"
									}`}
									data-testid={`quick-status-picker-no-show-${a.id}`}
								>
									<UserX size={13} />
									<span>Не явился</span>
								</button>
							</div>
						)}
					</div>
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
							? "Коллизия: врач записан в два кабинета одновременно"
							: collision.sameDoctor && collision.sameChair
								? "Коллизия: врач и кабинет"
								: collision.sameChair
									? "Коллизия: кабинет занят"
									: collision.sameAssistant
										? "Коллизия: ассистент"
										: "Коллизия: пациент"}
					</span>
				</div>
			)}

			{/* Compact Action Bar (Позвонить, Профиль, Меню ...) — Compact 24px height to avoid distorting 15-30 min grid slots */}
			<div className="flex items-center gap-1 pt-1 border-t border-[var(--line)]/50 mt-1">
				{patObj?.phone ? (
					<a
						href={`tel:${patObj.phone}`}
						onClick={(e) => e.stopPropagation()}
						className="h-6 min-h-[24px] max-h-[24px] px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
						title={`Позвонить ${pName}: ${patObj.phone}`}
						aria-label={`Позвонить ${pName}`}
					>
						<Phone size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap">Позвонить</span>
					</a>
				) : (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onAppointmentClick(a);
						}}
						className="h-6 min-h-[24px] max-h-[24px] px-2 py-0.5 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
						title={`Открыть прием ${pName}`}
						aria-label={`Открыть прием ${pName}`}
					>
						<User size={12} className="text-[var(--teal)] shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap">Прием</span>
					</button>
				)}

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onAppointmentClick(a);
					}}
					className="h-6 min-h-[24px] max-h-[24px] px-2 py-0.5 rounded-md border border-[var(--teal,var(--brand-primary))]/40 bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-surface)] text-[var(--teal-dark,var(--teal))] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
					title={`Открыть профиль ${pName}`}
					aria-label={`Открыть профиль ${pName}`}
				>
					<User size={12} className="text-[var(--teal)] shrink-0" />
					<span className="whitespace-nowrap">Профиль</span>
				</button>

				{/* Overflow Actions Dropdown Menu (...) */}
				<div className="relative ml-auto">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggleMenu(a.id);
						}}
						className="h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none"
						title="Все действия и статусы визита"
						aria-label="Дополнительные действия визита"
						aria-expanded={isMenuOpen}
					>
						<MoreVertical size={13} />
					</button>

					{isMenuOpen && (
						<div
							className="absolute right-0 bottom-full mb-1 z-50 p-1.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[210px] max-w-[calc(100vw-32px)] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
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
											onCloseMenu();
										}}
										className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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
											onCloseMenu();
										}}
										className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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
											onCloseMenu();
										}}
										className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
											isAppointmentInChair(a.status)
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
											onCloseMenu();
										}}
										className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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
											onCloseMenu();
										}}
										className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
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
											onCloseMenu();
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
											onCloseMenu();
										}}
										className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium transition-colors cursor-pointer"
									>
										<Copy size={14} className="text-[var(--teal)]" />
										<span>Скопировать SMS</span>
									</button>
								</div>
							)}

							{/* Блок «Длительность (1 клик)» */}
							<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
								<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
									Длительность (1 клик)
								</div>
								<div className="grid grid-cols-3 gap-1 px-1">
									<button
										type="button"
										data-testid={`menu-duration-plus-15-${a.id}`}
										onClick={() => {
											onAdjustDuration(a, 15);
											onCloseMenu();
										}}
										className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
										title="+15 минут"
									>
										<Clock size={12} className="text-[var(--teal)] shrink-0" />
										<span>+15 мин</span>
									</button>
									<button
										type="button"
										data-testid={`menu-duration-plus-30-${a.id}`}
										onClick={() => {
											onAdjustDuration(a, 30);
											onCloseMenu();
										}}
										className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
										title="+30 минут"
									>
										<Clock size={12} className="text-[var(--teal)] shrink-0" />
										<span>+30 мин</span>
									</button>
									<button
										type="button"
										data-testid={`menu-duration-minus-15-${a.id}`}
										onClick={() => {
											onAdjustDuration(a, -15);
											onCloseMenu();
										}}
										className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
										title="-15 минут"
									>
										<Clock size={12} className="text-[var(--teal)] shrink-0" />
										<span>-15 мин</span>
									</button>
								</div>
							</div>

							{/* Блок «Опоздание» */}
							<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
								<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
									Опоздание
								</div>
								<button
									type="button"
									data-testid={`menu-shift-late-15-${a.id}`}
									onClick={() => {
										onShiftLateness(a, 15);
										onCloseMenu();
									}}
									className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 font-bold transition-colors cursor-pointer"
									title="Сдвинуть на +15 мин (опоздание)"
								>
									<FastForward size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
									<span>Сдвинуть на +15 мин (опоздание)</span>
								</button>
							</div>

							{/* Сменить кресло (1 клик без модального ада) */}
							{effectiveChairs.length > 1 && (
								<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
									<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
										Сменить кресло (1 клик)
									</div>
									<div className="flex items-center gap-1 px-1 flex-wrap">
										{effectiveChairs.map((ch, chIdx) => {
											const chPalette = getStomxWorkplacePalette((ch as any).colorId ?? ch.id ?? chIdx);
											const chAccent = ch.color || chPalette.bright_code;
											const isCurrent = a.chairId === ch.id;
											return (
												<button
													key={ch.id}
													type="button"
													data-testid={`menu-reassign-chair-${a.id}-${ch.id}`}
													onClick={() => onReassignChair(a, ch.id)}
													className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
														isCurrent
															? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
															: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
													}`}
													title={`Переместить прием на кресло «${ch.name}» (${chPalette.nameRu})`}
												>
													<span
														className="w-2 h-2 rounded-full shrink-0"
														style={{ backgroundColor: chAccent }}
													/>
													<span className="truncate">{ch.name}</span>
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* Сменить врача (1 клик без модального ада) */}
							{doctors.length > 1 && (
								<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
									<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
										Сменить врача (1 клик)
									</div>
									<div className="flex items-center gap-1 px-1 flex-wrap">
										{doctors.slice(0, 4).map((doc) => {
											const isCurrent = a.doctorUserId === doc.id;
											return (
												<button
													key={doc.id}
													type="button"
													data-testid={`menu-reassign-doctor-${a.id}-${doc.id}`}
													onClick={() => onReassignDoctor(a, doc.id)}
													className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
														isCurrent
															? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
															: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
													}`}
													title={`Передать прием врачу ${doc.fullName}`}
												>
													<span className="truncate">{formatDoctorShortName(doc.fullName)}</span>
												</button>
											);
										})}
										{doctors.length > 4 && (
											<select
												value={a.doctorUserId || ""}
												onChange={(e) => {
													if (e.target.value) {
														onReassignDoctor(a, e.target.value);
													}
												}}
												className="min-h-[36px] text-xs font-semibold border border-[var(--line)] rounded-lg px-2 bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer max-w-[130px] truncate"
												title="Выбрать другого врача"
												data-testid={`menu-reassign-doctor-select-${a.id}`}
											>
												<option value="" disabled>Все врачи...</option>
												{doctors.map((d) => (
													<option key={d.id} value={d.id}>
														{formatDoctorShortName(d.fullName)}
													</option>
												))}
											</select>
										)}
									</div>
								</div>
							)}

							{/* Освободить слот -> в лист ожидания */}
							<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
								<button
									type="button"
									data-testid={`menu-free-slot-waitlist-${a.id}`}
									onClick={() => {
										onFreeSlotToWaitlist(a);
									}}
									className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 font-bold transition-colors cursor-pointer"
									title="Освободить слот -> в лист ожидания"
								>
									<UserMinus size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
									<span>Освободить слот -&gt; в лист ожидания</span>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}, areGridAppointmentCardPropsEqual);
