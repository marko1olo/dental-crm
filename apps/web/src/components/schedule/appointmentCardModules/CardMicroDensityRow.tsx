import React from "react";
import { Stethoscope, Zap } from "lucide-react";
import type { Appointment, Dashboard, Patient, ScheduleSuggestion } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { AppointmentStatusBadgeSelector } from "../AppointmentPaymentBadges";
import { AppointmentCardContextMenu } from "../appointmentContextMenu/index";
import type { ScheduleStaffMember } from "./appointmentCardTypes";
import { CardPatientMetadata } from "./CardPatientMetadata";

export interface CardMicroDensityRowProps {
	appointment: Appointment;
	appointmentPatient?: { id?: string | undefined; fullName?: string | undefined; phone?: string | null | undefined; [key: string]: unknown } | null | undefined;
	appointmentPatientName: string;
	appointmentDoctor?: { id?: string | undefined; fullName?: string | undefined; role?: string | undefined; [key: string]: unknown } | null | undefined;
	patientBalance: number | null;
	isCito: boolean;
	displayStatus: Appointment["status"];
	isQuickStatusUpdating: boolean;
	isLockedStatus: boolean;
	formatTime: (iso: string) => string;
	onOpenVisit?: (() => void) | null | undefined;
	openAppointmentEditor: (appt: Appointment) => void;
	setIsMobileSheetOpen: (open: boolean) => void;
	handleQuickStatusChange: (status: Appointment["status"]) => Promise<void> | void;
	handleShiftAppointmentTime: (mins: number) => Promise<void> | void;
	appointmentLabels?: Record<string, string> | undefined;
	dashboard: Dashboard;
	appointmentSuggestions?: ScheduleSuggestion[] | undefined;
	openScheduleSuggestion?: ((section: string) => void) | undefined;
	repeatAppointment?: ((appt: Appointment) => void) | undefined;
	copyAppointmentToBuffer?: ((appt: Appointment) => void) | undefined;
	effectiveOnFreeSlotToWaitlist?: ((appt: Appointment) => void) | undefined;
}

export function CardMicroDensityRow(props: CardMicroDensityRowProps) {
	const {
		appointment, appointmentPatient, appointmentPatientName, appointmentDoctor,
		patientBalance, isCito, displayStatus, isQuickStatusUpdating, isLockedStatus,
		formatTime, onOpenVisit, openAppointmentEditor, setIsMobileSheetOpen,
		handleQuickStatusChange, handleShiftAppointmentTime, appointmentLabels,
		dashboard, appointmentSuggestions, openScheduleSuggestion, repeatAppointment,
		copyAppointmentToBuffer, effectiveOnFreeSlotToWaitlist,
	} = props;
	const navigateToVisit = () => {
		const pid = appointmentPatient?.id || appointment.patientId;
		if (pid) usePatientStore.getState().setSelectedPatientId(pid);
		if (typeof window !== "undefined") window.location.hash = "#visit";
		if (onOpenVisit) onOpenVisit();
		else useAppStore.getState().setCurrentView("visit");
	};

	return (
		<div
			className="appointment-card-micro-row flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full select-none"
			data-testid="appointment-card-micro-row"
			data-density="micro"
		>
			<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
				<span className="appointment-card-time font-bold text-xs text-[var(--ink)] shrink-0 font-mono tracking-tight">
					{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
				</span>
				<CardPatientMetadata
					patientName={appointmentPatientName}
					patientId={appointmentPatient?.id || appointment.patientId}
					doctorName={appointmentDoctor?.fullName}
					appointment={appointment}
					sizeVariant="micro"
					onOpenVisit={onOpenVisit}
					openAppointmentEditor={openAppointmentEditor}
					setIsMobileSheetOpen={setIsMobileSheetOpen}
				/>
				<span className="text-[var(--muted)] opacity-50 shrink-0 select-none">•</span>
				<span className="text-xs text-[var(--muted)] truncate flex-1 min-w-0 font-medium" title={appointment?.reason || "Осмотр"} data-testid="appointment-card-reason">
					{appointment?.reason || "Осмотр"}
				</span>
				{isCito && (
					<span className="text-[10px] px-1 py-0.2 rounded bg-rose-600 text-white font-extrabold shrink-0 animate-pulse inline-flex items-center gap-0.5" title="Срочный приём (острая боль)" data-testid="appointment-cito-badge">
						<Zap size={10} className="shrink-0" aria-hidden="true" />
						<span>Срочно</span>
					</span>
				)}
				{patientBalance !== null && patientBalance < 0 && (
					<span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shrink-0 whitespace-nowrap font-bold" title={`Задолженность: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`} data-testid="appointment-debt-badge">
						Долг: {Math.abs(patientBalance).toLocaleString("ru-RU")} ₽
					</span>
				)}
				{patientBalance !== null && patientBalance > 0 && (
					<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)] shrink-0 whitespace-nowrap font-bold" title={`Аванс: ${patientBalance.toLocaleString("ru-RU")} ₽`}>
						Аванс
					</span>
				)}
			</div>

			<div className="flex items-center gap-1 shrink-0">
				{displayStatus === "in_treatment" ? (
					<button type="button" onClick={(e) => { e.stopPropagation(); navigateToVisit(); showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info"); }} className="h-6 px-1.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/40 hover:bg-[var(--primary)] hover:text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-all shrink-0" title="Открыть карту приёма пациента (#visit)" data-testid="appointment-micro-open-visit-btn">
						<Stethoscope size={11} className="shrink-0" />
						<span className="hidden sm:inline">Приём</span>
					</button>
				) : (displayStatus === "arrived" || displayStatus === "planned" || displayStatus === "confirmed") ? (
					<button type="button" disabled={false} aria-busy={isQuickStatusUpdating || undefined} onClick={(e) => { e.stopPropagation(); if (isQuickStatusUpdating) return; void handleQuickStatusChange("in_treatment"); navigateToVisit(); showToast("Пациент в кресле: открыта медицинская карта", "success"); }} className="h-6 px-1.5 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-all shrink-0" title="Начать приём в кресле (#visit)" data-testid="appointment-micro-start-visit-btn">
						<Stethoscope size={11} className="shrink-0" />
						<span className="hidden sm:inline">В кресло</span>
					</button>
				) : null}
				<AppointmentStatusBadgeSelector appointmentId={appointment.id} displayStatus={displayStatus} appointmentLabels={appointmentLabels} isQuickStatusUpdating={isQuickStatusUpdating} isLocked={isLockedStatus} compactMicro={true} onStatusChange={(st) => void handleQuickStatusChange(st)} />
				<AppointmentCardContextMenu appointment={appointment} dashboard={dashboard} appointmentSuggestions={appointmentSuggestions} appointmentPatient={appointmentPatient} appointmentPatientName={appointmentPatientName} appointmentDoctor={appointmentDoctor} isQuickStatusUpdating={isQuickStatusUpdating} openScheduleSuggestion={openScheduleSuggestion} handleShiftAppointmentTime={handleShiftAppointmentTime} handleQuickStatusChange={handleQuickStatusChange} repeatAppointment={repeatAppointment} copyAppointmentToBuffer={copyAppointmentToBuffer} openAppointmentEditor={openAppointmentEditor} onFreeSlotToWaitlist={effectiveOnFreeSlotToWaitlist} />
			</div>
		</div>
	);
}
