import type { Appointment } from "@dental/shared";
import React from "react";
import {
	CalendarCheck,
	CheckCircle2,
	Clock,
	CreditCard,
	FileText,
	RotateCcw,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { playIntercomChime } from "../../lib/intercomSound";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";

export interface AppointmentCardPrimaryActionsProps {
	appointment: Appointment;
	displayStatus: Appointment["status"];
	appointmentEditing: boolean;
	isQuickStatusUpdating: boolean;
	appointmentPatient: any;
	appointmentPatientName: string;
	onOpenVisit?: (() => void) | undefined;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	handleShiftAppointmentTime: (minutes: number) => Promise<void>;
	repeatAppointment: (appointment: Appointment) => void;
	openAppointmentEditor: (appointment: Appointment) => void;
}

export function AppointmentCardPrimaryActions({
	appointment,
	displayStatus,
	appointmentEditing,
	isQuickStatusUpdating,
	appointmentPatient,
	appointmentPatientName,
	onOpenVisit,
	handleQuickStatusChange,
	handleShiftAppointmentTime,
	repeatAppointment,
	openAppointmentEditor,
}: AppointmentCardPrimaryActionsProps) {
	if (appointmentEditing) return null;

	if (displayStatus === "planned" || displayStatus === "confirmed") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						playIntercomChime("urgent");
						void handleQuickStatusChange("arrived");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--good)] hover:opacity-90 active:scale-95 text-white font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Отметить прибытие пациента в клинику (Клавиша 1)"
					data-testid="appointment-action-arrived-btn"
				>
					<UserCheck size={14} />
					<span>Прибыл</span>
				</button>
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						playIntercomChime("normal");
						void handleQuickStatusChange("in_treatment");
						const pid = appointmentPatient?.id || appointment.patientId;
						if (pid) {
							usePatientStore.getState().setSelectedPatientId(pid);
						}
						if (typeof window !== "undefined") {
							window.location.hash = "#visit";
						}
						if (onOpenVisit) {
							onOpenVisit();
						} else {
							useAppStore.getState().setCurrentView("visit");
						}
						showToast("Пациент в кресле: открыта медицинская карта", "success");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Начать приём в кресле (Клавиша 2)"
					data-testid="appointment-action-in-treatment-btn"
				>
					<Stethoscope size={14} />
					<span>Начать приём</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "arrived") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						playIntercomChime("normal");
						void handleQuickStatusChange("in_treatment");
						const pid = appointmentPatient?.id || appointment.patientId;
						if (pid) {
							usePatientStore.getState().setSelectedPatientId(pid);
						}
						if (typeof window !== "undefined") {
							window.location.hash = "#visit";
						}
						if (onOpenVisit) {
							onOpenVisit();
						} else {
							useAppStore.getState().setCurrentView("visit");
						}
						showToast("Пациент в кресле: открыта медицинская карта", "success");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Пациент в кресле (Клавиша 2)"
					data-testid="appointment-action-in-treatment-btn"
				>
					<Stethoscope size={14} />
					<span>В кресло</span>
				</button>
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleShiftAppointmentTime(15);
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--warn-bg)] text-[var(--warn-fg)] border border-[var(--warn-fg)]/40 hover:opacity-90 active:scale-95 font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
					title="Сдвинуть запись на +15 минут при опоздании"
					data-testid="appointment-action-delay-btn"
				>
					<Clock size={14} />
					<span>+15 мин</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "in_treatment") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("completed");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 active:scale-95 font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Завершить приём (Клавиша 3)"
					data-testid="appointment-action-complete-btn"
				>
					<CheckCircle2 size={14} />
					<span>Завершить</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						const pid = appointmentPatient?.id || appointment.patientId;
						if (pid) {
							usePatientStore.getState().setSelectedPatientId(pid);
						}
						if (typeof window !== "undefined") {
							window.location.hash = "#visit";
						}
						if (onOpenVisit) {
							onOpenVisit();
						} else {
							useAppStore.getState().setCurrentView("visit");
						}
						showToast(`Открыта карта визита: ${appointmentPatientName}`, "info");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
					title="Открыть дневник приёма"
					data-testid="appointment-action-open-visit-btn"
				>
					<FileText size={14} className="text-[var(--teal)]" />
					<span>Медкарта</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "completed") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						const pid = appointmentPatient?.id || appointment.patientId;
						if (pid) {
							usePatientStore.getState().setSelectedPatientId(pid);
						}
						useAppStore.getState().setCurrentView("finance");
						showToast(`Касса: расчёт ${appointmentPatientName}`, "info");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--good-soft)] text-[var(--good-fg)] border border-[var(--good)]/40 hover:bg-[var(--good-surface)] active:scale-95 font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Принять оплату"
					data-testid="appointment-action-billing-btn"
				>
					<CreditCard size={14} className="text-[var(--good-fg)]" />
					<span>Оплата</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						repeatAppointment(appointment);
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
					title="Повторить запись (Клавиша R)"
					data-testid="appointment-action-repeat-btn"
				>
					<RotateCcw size={14} />
					<span>Повторить</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "cancelled") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("confirmed");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
					title="Восстановить отменённую запись"
					data-testid="appointment-action-restore-btn"
				>
					<RotateCcw size={14} />
					<span>Восстановить</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						repeatAppointment(appointment);
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-semibold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Записать на другое время (Клавиша R)"
					data-testid="appointment-action-repeat-btn"
				>
					<CalendarCheck size={14} />
					<span>Перезаписать</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "no_show") {
		return (
			<div className="flex items-center gap-1.5 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("arrived");
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--good)] hover:opacity-90 active:scale-95 text-white font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs whitespace-nowrap"
					title="Отметить пациента прибывшим"
					data-testid="appointment-action-arrived-btn"
				>
					<UserCheck size={14} />
					<span>Прибыл</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						openAppointmentEditor(appointment);
					}}
					className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-medium text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
					title="Перенести или изменить время записи"
					data-testid="appointment-action-reschedule-btn"
				>
					<Clock size={14} />
					<span>Перенести</span>
				</button>
			</div>
		);
	}

	return null;
}
