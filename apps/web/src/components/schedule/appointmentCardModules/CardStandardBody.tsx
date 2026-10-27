import React from "react";
import { AppointmentMedicalBadges } from "../AppointmentPaymentBadges";
import { AppointmentCardPrimaryActions } from "../AppointmentCardPrimaryActions";
import { AppointmentCardContextMenu } from "../AppointmentCardContextMenu";
import { CardPatientMetadata } from "./CardPatientMetadata";
import { CardStatusBadgeContainer } from "./CardStatusBadgeContainer";

export interface CardStandardBodyProps {
	appointment: any;
	appointmentPatient: any;
	appointmentPatientName: string;
	appointmentDoctor: any;
	appointmentChair: any;
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

export function CardStandardBody({
	appointment,
	appointmentPatient,
	appointmentPatientName,
	appointmentDoctor,
	appointmentChair,
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
}: CardStandardBodyProps) {
	return (
		<div className="appointment-card-expanded flex flex-col gap-1.5 min-w-0 max-w-full w-full" data-testid="appointment-card-expanded" data-density="expanded">
			<div className="appointment-card-header border-b border-[var(--line)] pb-2 mb-1 flex justify-between items-center gap-2 min-w-0 flex-wrap">
				<div className="appointment-card-time font-semibold text-sm text-[var(--ink)] flex items-center gap-2 shrink-0">
					{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
					<span className="font-normal text-[var(--muted)]">{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}</span>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					<CardStatusBadgeContainer appointmentId={appointment.id} displayStatus={displayStatus} appointmentLabels={appointmentLabels} isQuickStatusUpdating={isQuickStatusUpdating} isLocked={isLockedStatus} showSelector={!appointmentEditing} onStatusChange={(st) => void handleQuickStatusChange(st)} patientBalance={patientBalance} isCito={isCito} collisionMessage={activeScheduleCollision?.message ?? null} hasOpenVisit={appointmentHasOpenVisit} />
					<AppointmentCardPrimaryActions appointment={appointment} displayStatus={displayStatus} appointmentEditing={appointmentEditing} isQuickStatusUpdating={isQuickStatusUpdating} appointmentPatient={appointmentPatient} appointmentPatientName={appointmentPatientName} onOpenVisit={onOpenVisit} handleQuickStatusChange={handleQuickStatusChange} handleShiftAppointmentTime={handleShiftAppointmentTime} repeatAppointment={repeatAppointment} openAppointmentEditor={openAppointmentEditor} />
					<AppointmentCardContextMenu appointment={appointment} dashboard={dashboard} appointmentSuggestions={appointmentSuggestions} appointmentPatient={appointmentPatient} appointmentPatientName={appointmentPatientName} appointmentDoctor={appointmentDoctor} isQuickStatusUpdating={isQuickStatusUpdating} openScheduleSuggestion={openScheduleSuggestion} handleShiftAppointmentTime={handleShiftAppointmentTime} handleQuickStatusChange={handleQuickStatusChange} repeatAppointment={repeatAppointment} copyAppointmentToBuffer={copyAppointmentToBuffer} openAppointmentEditor={openAppointmentEditor} onFreeSlotToWaitlist={effectiveOnFreeSlotToWaitlist} />
				</div>
			</div>

			<div className="appointment-card-body min-w-0 max-w-full">
				<CardPatientMetadata patientName={appointmentPatientName} patientId={appointmentPatient?.id || appointment.patientId} doctorName={appointmentDoctor?.fullName} chairName={appointmentChair?.name} appointment={appointment} sizeVariant="expanded" onOpenVisit={onOpenVisit} openAppointmentEditor={openAppointmentEditor} setIsMobileSheetOpen={setIsMobileSheetOpen} />
				<div className="flex items-center gap-1.5 min-w-0 max-w-full mt-0.5 flex-wrap">
					<span className="chip chip-reason text-xs font-medium text-[var(--muted)] max-w-full min-w-0 inline-flex items-center justify-start text-left" title={appointment?.reason || "Консультация"}>
						<span className="truncate block min-w-0">{appointment?.reason || "Консультация"}</span>
					</span>
					<AppointmentMedicalBadges cardTeeth={cardTeeth} allergyAlert={allergyAlert} somaticAlert={somaticAlert} labReadinessAlert={labReadinessAlert} />
				</div>
			</div>
		</div>
	);
}
