import type { Appointment, Dashboard } from "@dental/shared";
import {
	CalendarCheck,
	CheckCircle2,
	Clock,
	CreditCard,
	MessageSquare,
	Phone,
	Stethoscope,
	User,
	UserCheck,
} from "lucide-react";
import React from "react";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";

export interface AppointmentTimelineHoverHudProps {
	appointment: Appointment;
	appointmentPatientName: string;
	patientBalance: number | null;
	appointmentPatient?: any;
	appointmentDoctor?: any;
	appointmentChair?: any;
	displayStatus: Appointment["status"];
	appointmentLabels: Record<Appointment["status"], string>;
	cardTeeth: string[];
	dashboard: Dashboard;
	formatTime: (value: string) => string;
	onKeepHovered: () => void;
	onMouseLeave: () => void;
	handleQuickStatusChange: (status: Appointment["status"]) => Promise<void>;
	onCloseHoverPreview: () => void;
	onOpenVisit?: () => void;
}

export function AppointmentTimelineHoverHud(props: AppointmentTimelineHoverHudProps) {
	const {
		appointment,
		appointmentPatientName,
		patientBalance,
		appointmentPatient,
		appointmentDoctor,
		appointmentChair,
		displayStatus,
		appointmentLabels,
		cardTeeth,
		dashboard,
		formatTime,
		onKeepHovered,
		onMouseLeave,
		handleQuickStatusChange,
		onCloseHoverPreview,
		onOpenVisit,
	} = props;

	return (
		<div
			className="appointment-patient-hover-preview absolute top-full left-0 mt-1.5 w-[330px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-50 pointer-events-auto select-none"
			data-testid="timeline-appointment-hover-preview"
			onMouseEnter={onKeepHovered}
			onMouseLeave={onMouseLeave}
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
							showToast(`Касса 54-ФЗ: расчёт ${appointmentPatientName}`, "info");
						}}
						className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
							patientBalance > 0
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
								: patientBalance < 0
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500/25"
									: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
						}`}
						title="Касса 54-ФЗ: расчёт пациента"
						data-testid={`timeline-hover-balance-btn-${appointment.id}`}
					>
						<CreditCard size={11} className="shrink-0" />
						<span>
							{patientBalance > 0
								? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
								: patientBalance < 0
									? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
									: "54-ФЗ: 0 ₽"}
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

			{/* 3. Быстрый просмотр жалоб и услуг */}
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

			{/* 5. Оперативная очередь StomX: 1-кликовое перемещение между этапами */}
			<div className="pt-2 border-t border-[var(--line)]">
				<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center justify-between">
					<span>Очередь смены (StomX 3-Stage Queue)</span>
					<span className="text-[10px] font-semibold text-[var(--teal,var(--brand-primary))]">
						{appointmentLabels?.[displayStatus] || displayStatus}
					</span>
				</div>
				<div className="grid grid-cols-3 gap-1 mb-2">
					<button
						type="button"
						data-testid={`timeline-hover-status-arrived-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							void handleQuickStatusChange("arrived");
							onCloseHoverPreview();
						}}
						className={`min-h-[30px] px-1.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
							displayStatus === "arrived"
								? "bg-amber-500 text-white border-amber-500 shadow-2xs"
								: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
						}`}
						title="Перевести в статус «Ожидает приёма»"
					>
						<UserCheck size={12} className="shrink-0" />
						<span className="truncate">Ожидает</span>
					</button>
					<button
						type="button"
						data-testid={`timeline-hover-status-in-treatment-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							void handleQuickStatusChange("in_treatment");
							onCloseHoverPreview();
						}}
						className={`min-h-[30px] px-1.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
							displayStatus === "in_treatment"
								? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)] shadow-2xs"
								: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
						}`}
						title="Перевести в статус «На приёме»"
					>
						<CalendarCheck size={12} className="shrink-0" />
						<span className="truncate">На приёме</span>
					</button>
					<button
						type="button"
						data-testid={`timeline-hover-status-completed-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							void handleQuickStatusChange("completed");
							onCloseHoverPreview();
						}}
						className={`min-h-[30px] px-1.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
							displayStatus === "completed"
								? "bg-slate-700 dark:bg-slate-600 text-white border-slate-700 shadow-2xs"
								: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
						}`}
						title="Перевести в статус «Ожидает оплаты»"
					>
						<CheckCircle2 size={12} className="shrink-0" />
						<span className="truncate">На оплату</span>
					</button>
				</div>

				{/* 1-кликовые главные действия приёма: «Начать приём» и «Быстрый чек 54-ФЗ» (Мандаты 8e, 8n) */}
				<div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--line)]">
					<button
						type="button"
						data-testid="hover-start-visit-btn"
						id={`timeline-hover-start-visit-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onCloseHoverPreview();
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
						className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
						title="Начать приём: перевести в статус «На приёме» и открыть карту приёма 043/у (1 клик)"
					>
						<Stethoscope size={13} className="shrink-0" />
						<span className="whitespace-nowrap">Начать приём</span>
					</button>

					<button
						type="button"
						data-testid="hover-pay-54fz-btn"
						id={`timeline-hover-pay-54fz-${appointment.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onCloseHoverPreview();
							if (displayStatus === "in_treatment") {
								void handleQuickStatusChange("completed");
							}
							if (appointmentPatient?.id) {
								usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(`Быстрый чек 54-ФЗ: расчёт ${appointmentPatientName}`, "info");
						}}
						className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
						title="Быстрый чек 54-ФЗ: перейти к кассовому расчёту (1 клик)"
					>
						<CreditCard size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="whitespace-nowrap">Быстрый чек 54-ФЗ</span>
					</button>
				</div>
			</div>
		</div>
	);
}
