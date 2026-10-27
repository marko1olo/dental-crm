import React from "react";
import { AppointmentMedicalBadges } from "../AppointmentPaymentBadges";
import { AppointmentCardPrimaryActions } from "../AppointmentCardPrimaryActions";
import { AppointmentCardContextMenu } from "../AppointmentCardContextMenu";
import { formatDoctorShortName } from "../appointmentCardHelpers";
import { CardPatientMetadata } from "./CardPatientMetadata";
import { CardStatusBadgeContainer } from "./CardStatusBadgeContainer";

export interface CardTwoLineBodyProps {
	appointment: any;
	appointmentPatient: any;
	appointmentPatientName: string;
	appointmentDoctor: any;
	patientBalance: number | null;
	isCito: boolean;
	displayStatus: any;
	isQuickStatusUpdating: boolean;
	isLockedStatus: boolean;
	formatTime: (iso: string) => string;
	onOpenVisit?: (() => void) | null;
	openAppointmentEditor: (appt: any) => void;
	setIsMobileSheetOpen: (open: boolean) => void;
	handleQuickStatusChange: (status: any) => Promise<void> | void;
	handleShiftAppointmentTime: (mins: number) => Promise<void> | void;
	appointmentLabels?: Record<string, string>;
	dashboard: any;
	appointmentSuggestions?: any[];
	openScheduleSuggestion: (s: any) => void;
	repeatAppointment: (appt: any) => void;
	copyAppointmentToBuffer: (appt: any) => void;
	effectiveOnFreeSlotToWaitlist?: (appt: any) => void;
	activeScheduleCollision?: any;
	appointmentHasOpenVisit?: boolean;
	appointmentEditing?: boolean;
	cardTeeth?: string[];
	allergyAlert?: string | null;
	somaticAlert?: string | null;
	labReadinessAlert?: any;
}

export function CardTwoLineBody({
	appointment,
	appointmentPatient,
	appointmentPatientName,
	appointmentDoctor,
	patientBalance,
	isCito,
	displayStatus,
	isQuickStatusUpdating,
	isLockedStatus,
	formatTime,
	onOpenVisit,
	openAppointmentEditor,
	setIsMobileSheetOpen,
	handleQuickStatusChange,
	handleShiftAppointmentTime,
	appointmentLabels,
	dashboard,
	appointmentSuggestions,
	openScheduleSuggestion,
	repeatAppointment,
	copyAppointmentToBuffer,
	effectiveOnFreeSlotToWaitlist,
	activeScheduleCollision,
	appointmentHasOpenVisit,
	appointmentEditing,
	cardTeeth,
	allergyAlert,
	somaticAlert,
	labReadinessAlert,
}: CardTwoLineBodyProps) {
	return (
		<div className="appointment-card-two-line flex flex-col gap-1 min-w-0 max-w-full w-full select-none" data-testid="appointment-card-two-line" data-density="compact-2line">
			<div className="flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full">
				<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
					<div className="appointment-card-time font-semibold text-xs text-[var(--ink)] flex items-center gap-1 shrink-0">
						{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
						<span className="font-normal text-[var(--muted)]">{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}</span>
					</div>
					<CardPatientMetadata patientName={appointmentPatientName} patientId={appointmentPatient?.id || appointment.patientId} doctorName={appointmentDoctor?.fullName} appointment={appointment} sizeVariant="two-line" onOpenVisit={onOpenVisit} openAppointmentEditor={openAppointmentEditor} setIsMobileSheetOpen={setIsMobileSheetOpen} />
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<CardStatusBadgeContainer appointmentId={appointment.id} displayStatus={displayStatus} appointmentLabels={appointmentLabels} isQuickStatusUpdating={isQuickStatusUpdating} isLocked={isLockedStatus} compactMicro={true} onStatusChange={(st) => void handleQuickStatusChange(st)} patientBalance={patientBalance} isCito={isCito} collisionMessage={activeScheduleCollision?.message ?? null} hasOpenVisit={appointmentHasOpenVisit} />
					<AppointmentCardPrimaryActions appointment={appointment} displayStatus={displayStatus} appointmentEditing={appointmentEditing} isQuickStatusUpdating={isQuickStatusUpdating} appointmentPatient={appointmentPatient} appointmentPatientName={appointmentPatientName} onOpenVisit={onOpenVisit} handleQuickStatusChange={handleQuickStatusChange} handleShiftAppointmentTime={handleShiftAppointmentTime} repeatAppointment={repeatAppointment} openAppointmentEditor={openAppointmentEditor} />
					<AppointmentCardContextMenu appointment={appointment} dashboard={dashboard} appointmentSuggestions={appointmentSuggestions} appointmentPatient={appointmentPatient} appointmentPatientName={appointmentPatientName} appointmentDoctor={appointmentDoctor} isQuickStatusUpdating={isQuickStatusUpdating} openScheduleSuggestion={openScheduleSuggestion} handleShiftAppointmentTime={handleShiftAppointmentTime} handleQuickStatusChange={handleQuickStatusChange} repeatAppointment={repeatAppointment} copyAppointmentToBuffer={copyAppointmentToBuffer} openAppointmentEditor={openAppointmentEditor} onFreeSlotToWaitlist={effectiveOnFreeSlotToWaitlist} />
				</div>
			</div>
			<div className="flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full text-xs pt-0.5 border-t border-[var(--line)]/50">
				<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
					<span className="text-xs text-[var(--muted)] font-medium truncate shrink-0 max-w-[180px]" title={appointment?.reason || "Консультация"}>{appointment?.reason || "Консультация"}</span>
					<AppointmentMedicalBadges cardTeeth={cardTeeth} allergyAlert={allergyAlert} somaticAlert={somaticAlert} labReadinessAlert={labReadinessAlert} />
				</div>
				{appointmentDoctor?.fullName && (
					<div className="flex items-center gap-1 text-[11px] text-[var(--muted)] font-medium shrink-0 ml-auto truncate max-w-[140px]" title={`Врач: ${appointmentDoctor.fullName}`}>
						<span className="truncate">{formatDoctorShortName(appointmentDoctor.fullName)}</span>
					</div>
				)}
			</div>
		</div>
	);
}
