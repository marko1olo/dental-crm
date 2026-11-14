import React from "react";
import type { Appointment, Dashboard } from "@dental/shared";
import {
	AppointmentHoverHud,
	AppointmentMobileBottomSheet,
} from "../AppointmentStatusPopup";
import { WaitlistDrawer } from "../waitlist/WaitlistDrawer";
import type { AppointmentCardPopupsProps } from "./types";

export function AppointmentCardHoverOverlay({
	appointment,
	dashboard,
	displayStatus,
	appointmentPatient,
	appointmentPatientName,
	patientBalance,
	appointmentDoctor,
	appointmentAssistant,
	appointmentChair,
	cardTeeth,
	allergyAlert,
	appointmentLabels,
	formatTime,
	handleQuickStatusChange,
	handleCardMouseLeave,
	hoverTimeoutRef,
	isHoverPreviewOpen,
	setIsHoverPreviewOpen,
	onOpenVisit,
}: Pick<
	AppointmentCardPopupsProps,
	| "appointment"
	| "dashboard"
	| "displayStatus"
	| "appointmentPatient"
	| "appointmentPatientName"
	| "patientBalance"
	| "appointmentDoctor"
	| "appointmentAssistant"
	| "appointmentChair"
	| "cardTeeth"
	| "allergyAlert"
	| "appointmentLabels"
	| "formatTime"
	| "handleQuickStatusChange"
	| "handleCardMouseLeave"
	| "hoverTimeoutRef"
	| "isHoverPreviewOpen"
	| "setIsHoverPreviewOpen"
	| "onOpenVisit"
>) {
	if (!isHoverPreviewOpen) return null;

	return (
		<AppointmentHoverHud
			appointment={appointment}
			dashboard={dashboard}
			displayStatus={displayStatus}
			appointmentPatient={appointmentPatient}
			appointmentPatientName={appointmentPatientName}
			patientBalance={patientBalance ?? null}
			appointmentDoctor={appointmentDoctor}
			appointmentAssistant={appointmentAssistant}
			appointmentChair={appointmentChair}
			cardTeeth={cardTeeth}
			allergyAlert={allergyAlert ?? null}
			appointmentLabels={appointmentLabels}
			formatTime={formatTime}
			handleQuickStatusChange={handleQuickStatusChange}
			onCloseHover={handleCardMouseLeave}
			onKeepHover={() => {
				if (hoverTimeoutRef.current) {
					clearTimeout(hoverTimeoutRef.current);
					hoverTimeoutRef.current = null;
				}
				setIsHoverPreviewOpen(true);
			}}
			onOpenVisit={onOpenVisit}
		/>
	);
}

export function AppointmentCardBottomPopups({
	appointment,
	dashboard,
	isMobileSheetOpen,
	setIsMobileSheetOpen,
	displayStatus,
	appointmentPatient,
	appointmentPatientName,
	patientBalance,
	appointmentDoctor,
	appointmentAssistant,
	appointmentChair,
	cardTeeth,
	allergyAlert,
	appointmentLabels,
	formatTime,
	handleQuickStatusChange,
	openAppointmentEditor,
	isSmartRecoveryOpen,
	setIsSmartRecoveryOpen,
}: Pick<
	AppointmentCardPopupsProps,
	| "appointment"
	| "dashboard"
	| "isMobileSheetOpen"
	| "setIsMobileSheetOpen"
	| "displayStatus"
	| "appointmentPatient"
	| "appointmentPatientName"
	| "patientBalance"
	| "appointmentDoctor"
	| "appointmentAssistant"
	| "appointmentChair"
	| "cardTeeth"
	| "allergyAlert"
	| "appointmentLabels"
	| "formatTime"
	| "handleQuickStatusChange"
	| "openAppointmentEditor"
	| "isSmartRecoveryOpen"
	| "setIsSmartRecoveryOpen"
>) {
	return (
		<>
			{/* Mobile Native Bottom Sheet for Progressive Disclosure on tap */}
			<AppointmentMobileBottomSheet
				appointment={appointment}
				dashboard={dashboard}
				isOpen={isMobileSheetOpen}
				onClose={() => setIsMobileSheetOpen(false)}
				displayStatus={displayStatus}
				appointmentPatient={appointmentPatient}
				appointmentPatientName={appointmentPatientName}
				patientBalance={patientBalance ?? null}
				appointmentDoctor={appointmentDoctor}
				appointmentAssistant={appointmentAssistant}
				appointmentChair={appointmentChair}
				cardTeeth={cardTeeth}
				allergyAlert={allergyAlert ?? null}
				appointmentLabels={appointmentLabels}
				formatTime={formatTime}
				handleQuickStatusChange={handleQuickStatusChange}
				onCloseHover={() => {}}
				onKeepHover={() => {}}
				openAppointmentEditor={openAppointmentEditor}
			/>

			{isSmartRecoveryOpen && (
				<WaitlistDrawer
					isOpen={isSmartRecoveryOpen}
					onClose={() => setIsSmartRecoveryOpen(false)}
					targetSlot={{
						appointmentId: appointment.id,
						startsAt: appointment.startsAt,
						endsAt: appointment.endsAt,
						doctorUserId: appointment.doctorUserId,
						doctorName: (appointmentDoctor as { fullName?: string | null })?.fullName || null,
						chairId: appointment.chairId,
						chairName: (appointmentChair as { name?: string | null })?.name || null,
						freedBecause: appointment.reason || "Отмена приёма",
						patientName: appointmentPatientName,
					}}
					dashboard={dashboard}
				/>
			)}
		</>
	);
}
