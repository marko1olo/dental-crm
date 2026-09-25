import type { Appointment } from "@dental/shared";
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
import React from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";

export interface AppointmentPrimaryActionsProps {
	appointment: Appointment;
	appointmentEditing: boolean;
	appointmentHasOpenVisit: boolean;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	displayStatus: Appointment["status"];
	isQuickStatusUpdating: boolean;
	appointmentPatient?: any;
	appointmentPatientName: string;
	onOpenVisit?: () => void;
	openAppointmentEditor: (appointment: Appointment) => void;
	repeatAppointment: (appointment: Appointment) => void;
	handleQuickStatusChange: (status: Appointment["status"]) => Promise<void>;
	handleShiftAppointmentTime: (minutes: number) => Promise<void>;
}

export function AppointmentPrimaryActions(props: AppointmentPrimaryActionsProps) {
	const {
		appointment,
		appointmentEditing,
		displayStatus,
		isQuickStatusUpdating,
		appointmentPatient,
		appointmentPatientName,
		onOpenVisit,
		openAppointmentEditor,
		repeatAppointment,
		handleQuickStatusChange,
		handleShiftAppointmentTime,
	} = props;

	if (appointmentEditing) return null;

	if (displayStatus === "planned" || displayStatus === "confirmed") {
		return (
			<div className="flex items-center gap-1 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("arrived");
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--good)] hover:opacity-90 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
					title="Отметить прибытие пациента в клинику (Клавиша 1)"
					data-testid="appointment-action-arrived-btn"
				>
					<UserCheck size={13} />
					<span>Прибыл</span>
				</button>
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("in_treatment");
						if (appointmentPatient?.id) {
							usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
						}
						if (onOpenVisit) {
							onOpenVisit();
						} else {
							useAppStore.getState().setCurrentView("visit");
						}
						showToast("Пациент в кресле: открыта карта 043/у", "success");
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
					title="Начать приём в кресле (Клавиша 2)"
					data-testid="appointment-action-in-treatment-btn"
				>
					<Stethoscope size={13} />
					<span>Начать приём</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "arrived") {
		return (
			<div className="flex items-center gap-1 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("in_treatment");
						if (appointmentPatient?.id) {
							usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
						}
						if (onOpenVisit) {
							onOpenVisit();
						} else {
							useAppStore.getState().setCurrentView("visit");
						}
						showToast("Пациент в кресле: открыта карта 043/у", "success");
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
					title="Пациент в кресле (Клавиша 2)"
					data-testid="appointment-action-in-treatment-btn"
				>
					<Stethoscope size={13} />
					<span>В кресло</span>
				</button>
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleShiftAppointmentTime(15);
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2 py-1 rounded-lg bg-[var(--warn-bg)] text-[var(--warn-fg)] border border-[var(--warn-fg)]/40 hover:opacity-90 active:scale-95 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
					title="Сдвинуть запись на +15 минут при опоздании"
					data-testid="appointment-action-delay-btn"
				>
					<Clock size={13} />
					<span>+15 мин</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "in_treatment") {
		return (
			<div className="flex items-center gap-1 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("completed");
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 active:scale-95 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
					title="Завершить приём (Клавиша 3)"
					data-testid="appointment-action-complete-btn"
				>
					<CheckCircle2 size={13} />
					<span>Завершить</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						if (appointmentPatient?.id) {
							usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
						}
						useAppStore.getState().setCurrentView("visit");
						showToast(`Открыта карта визита: ${appointmentPatientName}`, "info");
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
					title="Открыть дневник приёма 043/у"
					data-testid="appointment-action-open-visit-btn"
				>
					<FileText size={13} className="text-[var(--teal)]" />
					<span>Карта 043/у</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "completed") {
		return (
			<div className="flex items-center gap-1 shrink-0" data-testid="card-primary-actions">
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
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--good-soft)] text-[var(--good-fg)] border border-[var(--good)]/40 hover:bg-[var(--good-surface)] active:scale-95 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
					title="Принять оплату по 54-ФЗ"
					data-testid="appointment-action-billing-btn"
				>
					<CreditCard size={13} className="text-[var(--good-fg)]" />
					<span>Оплата 54-ФЗ</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						repeatAppointment(appointment);
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2 py-1 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
					title="Повторить запись (Клавиша R)"
					data-testid="appointment-action-repeat-btn"
				>
					<RotateCcw size={13} />
					<span>Повторить</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "cancelled") {
		return (
			<div className="flex items-center gap-1 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("confirmed");
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
					title="Восстановить отменённую запись"
					data-testid="appointment-action-restore-btn"
				>
					<RotateCcw size={13} />
					<span>Восстановить</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						repeatAppointment(appointment);
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2 py-1 rounded-lg bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
					title="Записать на другое время (Клавиша R)"
					data-testid="appointment-action-repeat-btn"
				>
					<CalendarCheck size={13} />
					<span>Перезаписать</span>
				</button>
			</div>
		);
	}

	if (displayStatus === "no_show") {
		return (
			<div className="flex items-center gap-1 shrink-0" data-testid="card-primary-actions">
				<button
					type="button"
					disabled={isQuickStatusUpdating}
					onClick={(e) => {
						e.stopPropagation();
						void handleQuickStatusChange("arrived");
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 py-1 rounded-lg bg-[var(--good)] hover:opacity-90 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
					title="Отметить пациента прибывшим"
					data-testid="appointment-action-arrived-btn"
				>
					<UserCheck size={13} />
					<span>Прибыл</span>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						openAppointmentEditor(appointment);
					}}
					className="min-h-[44px] sm:min-h-0 sm:h-8 px-2 py-1 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
					title="Перенести или изменить время записи"
					data-testid="appointment-action-reschedule-btn"
				>
					<Clock size={13} />
					<span>Перенести</span>
				</button>
			</div>
		);
	}

	return null;
}
