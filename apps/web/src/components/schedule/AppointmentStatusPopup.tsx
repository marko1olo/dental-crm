import type { Appointment, Dashboard } from "@dental/shared";
import React from "react";
import {
	AlertTriangle,
	CalendarCheck,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	MessageSquare,
	Phone,
	PhoneCall,
	Stethoscope,
	User,
	UserCheck,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";

export interface AppointmentStatusPopupProps {
	appointment: Appointment;
	dashboard: Dashboard;
	displayStatus: Appointment["status"];
	appointmentPatient: any;
	appointmentPatientName: string;
	patientBalance: number | null;
	appointmentDoctor: any;
	appointmentAssistant: any;
	appointmentChair: any;
	cardTeeth: string[];
	allergyAlert: string | null;
	appointmentLabels: Record<Appointment["status"], string>;
	formatTime: (iso: string) => string;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	onCloseHover: () => void;
	onKeepHover: () => void;
	onOpenVisit?: (() => void) | undefined;
	isNearRightEdge?: boolean | undefined;
	isNearBottom?: boolean | undefined;
}

export function AppointmentHoverHud({
	appointment,
	dashboard,
	displayStatus,
	appointmentPatient,
	appointmentPatientName,
	patientBalance,
	appointmentDoctor,
	appointmentChair,
	cardTeeth,
	allergyAlert,
	appointmentLabels,
	formatTime,
	handleQuickStatusChange,
	onCloseHover,
	onKeepHover,
	onOpenVisit,
	isNearRightEdge,
	isNearBottom,
}: AppointmentStatusPopupProps) {
	const hudRef = React.useRef<HTMLDivElement>(null);
	const [alignRight, setAlignRight] = React.useState(Boolean(isNearRightEdge));
	const [flipUp, setFlipUp] = React.useState(Boolean(isNearBottom));

	React.useEffect(() => {
		if (hudRef.current && typeof window !== "undefined") {
			const rect = hudRef.current.getBoundingClientRect();
			if (!isNearRightEdge && rect.right > window.innerWidth - 16) {
				setAlignRight(true);
			}
			if (!isNearBottom && rect.bottom > window.innerHeight - 16 && rect.top > 320) {
				setFlipUp(true);
			}
		}
	}, [isNearRightEdge, isNearBottom]);

	const rightClass = (isNearRightEdge || alignRight) ? "right-0 left-auto" : "left-0";
	const verticalClass = (isNearBottom || flipUp) ? "bottom-full mb-1.5 top-auto" : "top-full mt-1.5";

	return (
		<div
			ref={hudRef}
			className={`appointment-patient-hover-preview absolute ${verticalClass} ${rightClass} w-[340px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-[100] pointer-events-auto select-none`}
			style={{ contain: "layout style" }}
			data-testid="timeline-appointment-hover-preview"
			onMouseEnter={onKeepHover}
			onMouseLeave={onCloseHover}
		>
			{/* 1. ФИО пациента + Статус 54-ФЗ (Баланс / Долг / Аванс) */}
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
				<span className="text-[15px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate">
					<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
					{appointmentPatientName || "Пациент"}
				</span>
				{patientBalance !== null ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (appointmentPatient?.id) {
								usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(`Касса: расчёт ${appointmentPatientName}`, "info");
						}}
						className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
							patientBalance > 0
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
								: patientBalance < 0
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500/25"
									: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
						}`}
						title="Касса: расчёт пациента"
						data-testid={`timeline-hover-balance-btn-${appointment.id}`}
					>
						<CreditCard size={11} className="shrink-0" />
						<span>
							{patientBalance > 0
								? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
								: patientBalance < 0
									? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
									: "Оплата: 0 ₽"}
						</span>
					</button>
				) : (
					<span className="text-[11px] text-[var(--muted)] font-mono">Баланс: 0 ₽</span>
				)}
			</div>

			{/* 2. Телефон */}
			{appointmentPatient?.phone && (
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
						<Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span>{appointmentPatient.phone}</span>
					</div>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const text = generateAppointmentWhatsAppMessage({
								patientName: appointmentPatientName,
								doctorName: appointmentDoctor?.fullName,
								doctorSpecialty: appointmentDoctor?.role,
								appointmentStartsAt: appointment.startsAt,
								clinicName: dashboard?.clinicSettings?.profile?.clinicName,
								clinicAddress: dashboard?.clinicSettings?.profile?.address,
								clinicPhone: dashboard?.clinicSettings?.profile?.phone,
								treatmentReason: appointment.reason,
							});
							openWhatsAppChat(appointmentPatient.phone!, text);
						}}
						className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
						title="Открыть чат в WhatsApp"
					>
						<MessageSquare size={12} className="text-emerald-600 dark:text-emerald-400" />
						<span>WhatsApp</span>
					</button>
				</div>
			)}

			{/* 3. Яркий янтарный алерт аллергий / противопоказаний */}
			{allergyAlert && (
				<div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2 shadow-xs">
					<AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
					<span>{allergyAlert}</span>
				</div>
			)}

			{/* 4. Быстрый просмотр жалоб и услуг */}
			<div className="pt-2 border-t border-[var(--line)] space-y-1">
				<div className="flex items-center gap-1.5 text-xs text-[var(--ink)]">
					<Clock size={13} className="text-[var(--teal)] shrink-0" />
					<span className="font-semibold text-[var(--ink)]">
						<span className="text-[var(--muted)] font-medium">Жалобы / Услуги: </span>
						{appointment?.reason || (appointment as Record<string, any>)?.notes || appointment?.comment || "Первичный осмотр и консультация"}
					</span>
				</div>
				{cardTeeth.length > 0 && (
					<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
						<span className="text-[11px] font-bold text-[var(--muted)]">Зубы:</span>
						{cardTeeth.map((t) => (
							<span
								key={t}
								className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30 text-[11px] font-bold font-mono"
							>
								{t}
							</span>
						))}
					</div>
				)}
			</div>

			{/* 4. Врач, кресло и время */}
			<div className="pt-2 border-t border-[var(--line)] space-y-1 text-[11px] text-[var(--muted)]">
				<div className="flex items-center justify-between gap-1">
					<span className="flex items-center gap-1 text-[var(--ink)] font-medium truncate">
						<Stethoscope size={12} className="text-[var(--teal)] shrink-0" />
						<span className="truncate">{appointmentDoctor?.fullName || "Врач не назначен"}</span>
					</span>
					<span>{appointmentChair?.name || "Кресло"}</span>
				</div>
				<div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
					<span>Время визита:</span>
					<span className="font-bold text-[var(--ink)]">
						{formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}
					</span>
				</div>
			</div>

			{/* 5. Оперативная очередь StomX: 4-кликовое перемещение между этапами (Запланирован -> В клинике -> В кресле -> Завершен) */}
			<div className="pt-2 border-t border-[var(--line)]">
				<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center justify-between">
					<span>Очередь смены</span>
					<span className="text-[10px] font-semibold text-[var(--teal,var(--brand-primary))]">
						{appointmentLabels?.[displayStatus] || displayStatus}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-1.5 mb-2">
					<button
						type="button"
						data-testid={`timeline-hover-status-planned-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							void handleQuickStatusChange("planned");
							onCloseHover();
						}}
						className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
							displayStatus === "planned"
								? "bg-sky-500 text-white border-sky-500 shadow-2xs"
								: "bg-sky-500/10 text-sky-800 dark:text-sky-200 border-sky-500/30 hover:bg-sky-500/20"
						}`}
						title="Перевести в статус «Запланирован»"
					>
						<Clock size={14} className="shrink-0" />
						<span className="truncate">Запланирован</span>
					</button>
					<button
						type="button"
						data-testid={`timeline-hover-status-arrived-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							void handleQuickStatusChange("arrived");
							onCloseHover();
						}}
						className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
							displayStatus === "arrived"
								? "bg-amber-500 text-white border-amber-500 shadow-2xs"
								: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
						}`}
						title="Перевести в статус «Пациент в клинике / Ожидает»"
					>
						<UserCheck size={14} className="shrink-0" />
						<span className="truncate">В клинике</span>
					</button>
					<button
						type="button"
						data-testid={`timeline-hover-status-in-treatment-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							void handleQuickStatusChange("in_treatment");
							onCloseHover();
						}}
						className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
							displayStatus === "in_treatment"
								? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)] shadow-2xs"
								: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
						}`}
						title="Перевести в статус «В кресле / На приёме»"
					>
						<CalendarCheck size={14} className="shrink-0" />
						<span className="truncate">В кресле</span>
					</button>
					<button
						type="button"
						data-testid={`timeline-hover-status-completed-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							void handleQuickStatusChange("completed");
							onCloseHover();
						}}
						className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
							displayStatus === "completed"
								? "bg-slate-700 dark:bg-slate-600 text-white border-slate-700 shadow-2xs"
								: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
						}`}
						title="Перевести в статус «Завершен / На оплату»"
					>
						<CheckCircle2 size={14} className="shrink-0" />
						<span className="truncate">Завершен</span>
					</button>
				</div>

				{/* 1-кликовые главные действия приёма */}
				<div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--line)]">
					<button
						type="button"
						data-testid="hover-start-visit-btn"
						id={`timeline-hover-start-visit-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onCloseHover();
							void handleQuickStatusChange("in_treatment");
							if (appointmentPatient?.id) {
								usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							}
							if (onOpenVisit) {
								onOpenVisit();
							} else {
								useAppStore.getState().setCurrentView("visit");
							}
							showToast(`Приём начат: ${appointmentPatientName} в кресле`, "success");
						}}
						className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
						title="Начать приём: перевести в статус «В кресле» и открыть медицинскую карту (1 клик)"
					>
						<Stethoscope size={14} className="shrink-0" />
						<span className="whitespace-nowrap">Начать приём</span>
					</button>

					<button
						type="button"
						data-testid="hover-pay-54fz-btn"
						id={`timeline-hover-pay-54fz-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onCloseHover();
							if (displayStatus === "in_treatment") {
								void handleQuickStatusChange("completed");
							}
							if (appointmentPatient?.id) {
								usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(`Быстрый расчёт: ${appointmentPatientName}`, "info");
						}}
						className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
						title="Быстрый расчёт: перейти к оплате (1 клик)"
					>
						<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="whitespace-nowrap">Быстрый расчёт</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export interface AppointmentMobileBottomSheetProps extends AppointmentStatusPopupProps {
	isOpen: boolean;
	onClose: () => void;
	openAppointmentEditor: (appointment: Appointment) => void;
}

export function AppointmentMobileBottomSheet({
	appointment,
	dashboard,
	isOpen,
	onClose,
	appointmentPatient,
	appointmentPatientName,
	patientBalance,
	appointmentDoctor,
	appointmentAssistant,
	appointmentChair,
	allergyAlert,
	formatTime,
	handleQuickStatusChange,
	openAppointmentEditor,
}: AppointmentMobileBottomSheetProps) {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Подробности приёма"
			data-testid="appointment-mobile-bottom-sheet"
		>
			<div
				className="bg-[var(--paper-strong)] rounded-t-3xl border-t border-[var(--line)] p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200 text-xs text-[var(--ink)]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Top Grab Handle */}
				<div className="w-12 h-1.5 bg-[var(--line-strong)] rounded-full mx-auto mb-2" />

				{/* Header */}
				<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
					<div className="min-w-0 flex-1">
						<div className="text-lg font-black text-[var(--ink)] truncate" title={appointmentPatientName}>
							{appointmentPatientName}
						</div>
						<div
							className="text-xs text-[var(--muted)] font-medium truncate min-w-0"
							title={`${formatTime(appointment.startsAt)} – ${formatTime(appointment.endsAt)} · ${appointment.reason || "Прием"}`}
						>
							{formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)} · {appointment.reason || "Прием"}
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Payment status & Balance banner */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-2">
					<span className="font-bold text-[var(--muted)]">Статус оплаты / Баланс:</span>
					{patientBalance !== null ? (
						<span
							className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono whitespace-nowrap shrink-0 ${
								patientBalance > 0
									? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
									: patientBalance < 0
										? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40"
										: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
							}`}
						>
							{patientBalance > 0
								? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
								: patientBalance < 0
									? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
									: "0 ₽ (Оплачено)"}
						</span>
					) : (
						<span className="text-xs text-[var(--muted)] whitespace-nowrap shrink-0">0 ₽ (Оплачено)</span>
					)}
				</div>

				{/* Phone & WhatsApp */}
				{appointmentPatient?.phone && (
					<div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="flex items-center gap-2 font-mono text-sm font-semibold text-[var(--ink)]">
							<Phone className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span>{appointmentPatient.phone}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => {
									const text = generateAppointmentWhatsAppMessage({
										patientName: appointmentPatientName,
										doctorName: appointmentDoctor?.fullName,
										doctorSpecialty: appointmentDoctor?.role,
										appointmentStartsAt: appointment.startsAt,
										clinicName: dashboard?.clinicSettings?.profile?.clinicName,
										clinicAddress: dashboard?.clinicSettings?.profile?.address,
										clinicPhone: dashboard?.clinicSettings?.profile?.phone,
										treatmentReason: appointment.reason,
									});
									openWhatsAppChat(appointmentPatient.phone!, text);
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
										patientName: appointmentPatientName,
										doctorName: appointmentDoctor?.fullName,
										doctorSpecialty: appointmentDoctor?.role,
										appointmentStartsAt: appointment.startsAt,
										clinicName: dashboard?.clinicSettings?.profile?.clinicName,
										clinicAddress: dashboard?.clinicSettings?.profile?.address,
										clinicPhone: dashboard?.clinicSettings?.profile?.phone,
										treatmentReason: appointment.reason,
									});
									if (typeof navigator !== "undefined" && navigator.clipboard) {
										void navigator.clipboard.writeText(text);
										showToast("Текст напоминания скопирован", "success");
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
				{allergyAlert && (
					<div className="p-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2">
						<AlertTriangle size={16} className="text-amber-600 shrink-0 animate-bounce" />
						<span>{allergyAlert}</span>
					</div>
				)}

				{/* Doctor & Assistant */}
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs text-[var(--ink)]">
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted)]">Врач:</span>
						<span className="font-bold">{appointmentDoctor?.fullName || "Не назначен"}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted)]">Ассистент:</span>
						<span>{appointmentAssistant?.fullName || "Не назначен"}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted)]">Кабинет:</span>
						<span className="font-mono font-semibold">{appointmentChair?.name || "Кабинет 1"}</span>
					</div>
				</div>

				{/* Quick Status Buttons */}
				<div className="space-y-2">
					<div className="font-bold text-[var(--muted)] uppercase text-[10px] tracking-wider">
						Сменить статус визита:
					</div>
					<div className="grid grid-cols-2 gap-2">
						<button
							type="button"
							data-testid="mobile-sheet-status-planned"
							onClick={() => {
								void handleQuickStatusChange("planned");
								onClose();
							}}
							className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-sky-500/15 border border-sky-500/40 text-sky-800 dark:text-sky-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
						>
							<Clock size={14} />
							<span>Запланирован</span>
						</button>
						<button
							type="button"
							data-testid="mobile-sheet-status-confirmed"
							onClick={() => {
								void handleQuickStatusChange("confirmed");
								onClose();
							}}
							className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-violet-500/15 border border-violet-500/40 text-violet-800 dark:text-violet-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
						>
							<PhoneCall size={14} />
							<span>Подтвержден</span>
						</button>
						<button
							type="button"
							data-testid="mobile-sheet-status-arrived"
							onClick={() => {
								void handleQuickStatusChange("arrived");
								onClose();
							}}
							className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
						>
							<UserCheck size={14} />
							<span>В клинике</span>
						</button>
						<button
							type="button"
							data-testid="mobile-sheet-status-in-treatment"
							onClick={() => {
								void handleQuickStatusChange("in_treatment");
								onClose();
							}}
							className="min-h-[44px] px-3 rounded-xl text-xs font-bold bg-[var(--teal-soft)] border border-[var(--teal)]/40 text-[var(--teal-dark)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
						>
							<CalendarCheck size={14} />
							<span>В кресле</span>
						</button>
						<button
							type="button"
							data-testid="mobile-sheet-status-completed"
							onClick={() => {
								void handleQuickStatusChange("completed");
								onClose();
							}}
							className="col-span-2 min-h-[44px] px-3 rounded-xl text-xs font-bold bg-slate-500/15 border border-slate-500/40 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
						>
							<CheckCircle2 size={14} />
							<span>Завершен</span>
						</button>
					</div>
				</div>

				{/* Primary Action Button */}
				<div className="pt-2 space-y-2">
					<button
						type="button"
						onClick={() => {
							onClose();
							openAppointmentEditor(appointment);
						}}
						className="w-full min-h-[48px] rounded-2xl bg-[var(--teal,var(--brand-primary))] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 transition-all"
					>
						<User size={16} />
						<span>Настроить запись</span>
					</button>
				</div>
			</div>
		</div>
	);
}
