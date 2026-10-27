import React from "react";
import { AppointmentRefusalBanner } from "../AppointmentPaymentBadges";
import { AppointmentCardEditor } from "../AppointmentCardEditor";
import { useAppointmentCardState } from "../useAppointmentCardState";
import type { AppointmentCardProps } from "../AppointmentCardTypes";
import { AppointmentCardVisualBody } from "./AppointmentCardVisualBody";
import { AppointmentCardWaitlistRecovery } from "./AppointmentCardWaitlistRecovery";
import { AppointmentCardHoverOverlay, AppointmentCardBottomPopups } from "./AppointmentCardPopups";
import { useAppointmentCardContainerInteractions } from "./useAppointmentCardContainerInteractions";
import { getAppointmentCardClassName, getAppointmentCardStyle } from "./appointmentCardContainerStyles";

export function AppointmentCardContainer(props: AppointmentCardProps) {
	const { appointment, dashboard, appointmentLabels, appointmentDraft, appointmentSaveState, appointmentSaveError, appointmentDirty, appointmentEditing, appointmentHasOpenVisit, appointmentMissingSteps, appointmentReadyToSave, formatTime, openAppointmentEditor, repeatAppointment, closeAppointmentEditor, updateAppointmentScheduleDraft, saveAppointmentSchedule, normalizedAppointmentStatus, toDateTimeLocalValue, fromDateTimeLocalValue, useManualSelects, activeVisitLockedAppointmentStatuses, onOpenVisit } = props;
	const state = useAppointmentCardState(props);
	const { appointmentDoctor, appointmentAssistant, appointmentChair, appointmentPatient, appointmentPatientName, patientBalance, durationMinutes, isMultiHour, slotSpan, collision, activePatients, activeDoctors, activeAssistants, activeChairs, isQuickStatusUpdating, isHoverPreviewOpen, setIsHoverPreviewOpen, isMobileSheetOpen, setIsMobileSheetOpen, hoverTimeoutRef, cardTeeth, allergyAlert, handleQuickStatusChange, handleCardKeyDown, displayStatus, isCito } = state;

	const { isSmartRecoveryOpen, setIsSmartRecoveryOpen, handleCardMouseEnter, handleCardMouseLeave, handleCardDoubleClick, handleFreeSlotToWaitlist, isMicroDensity, isTwoLineMode, proportionalHeight, appointmentSuggestions, readiness } = useAppointmentCardContainerInteractions(props, state);

	const styleParams = { isMicroDensity, isTwoLineMode, patientBalance, isCito, displayStatus, readinessState: readiness?.state, proportionalHeight };

	return (
		<div className="timeline-node min-w-0 max-w-full" key={appointment.id}>
			<div className="timeline-line" />
			<div className="timeline-time shrink-0 font-medium">{formatTime(appointment.startsAt)}</div>
			<div className="timeline-content min-w-0 max-w-full">
				<p style={{ display: "none" }}>{appointment.reason}</p>
				<article data-testid="appointment-card" data-appointment-id={appointment.id} data-duration-minutes={durationMinutes} data-density={isMicroDensity ? "micro" : isTwoLineMode ? "compact-2line" : "expanded"} data-proportional-height={proportionalHeight} data-multi-hour-block={isMultiHour ? "true" : "false"} data-slot-span={slotSpan} tabIndex={0} onKeyDown={handleCardKeyDown} onDoubleClick={handleCardDoubleClick} onMouseEnter={handleCardMouseEnter} onMouseLeave={handleCardMouseLeave} onFocus={handleCardMouseEnter} onBlur={handleCardMouseLeave} aria-label={`Карточка приема: ${appointmentPatientName}, ${formatTime(appointment.startsAt)} - ${formatTime(appointment.endsAt)}`} className={getAppointmentCardClassName(styleParams)} style={getAppointmentCardStyle(styleParams)}>
					<AppointmentCardHoverOverlay appointment={appointment} dashboard={dashboard} displayStatus={displayStatus} appointmentPatient={appointmentPatient} appointmentPatientName={appointmentPatientName} patientBalance={patientBalance} appointmentDoctor={appointmentDoctor} appointmentAssistant={appointmentAssistant} appointmentChair={appointmentChair} cardTeeth={cardTeeth} allergyAlert={allergyAlert} appointmentLabels={appointmentLabels} formatTime={formatTime} handleQuickStatusChange={handleQuickStatusChange} handleCardMouseLeave={handleCardMouseLeave} hoverTimeoutRef={hoverTimeoutRef} isHoverPreviewOpen={isHoverPreviewOpen} setIsHoverPreviewOpen={setIsHoverPreviewOpen} onOpenVisit={onOpenVisit} />
					<AppointmentCardVisualBody props={props} state={state} isMicroDensity={isMicroDensity} isTwoLineMode={isTwoLineMode} appointmentSuggestions={appointmentSuggestions} onOpenVisit={onOpenVisit} openAppointmentEditor={openAppointmentEditor} setIsMobileSheetOpen={setIsMobileSheetOpen} onFreeSlotToWaitlist={handleFreeSlotToWaitlist} />
					{appointmentHasOpenVisit && <p className="appointment-handoff-note text-xs" id={`appointment-handoff-note-${appointment?.id ?? ""}`}>Пациент и закрывающий статус этой записи меняются только после закрытия приема.</p>}
					<AppointmentRefusalBanner appointment={appointment} isQuickStatusUpdating={isQuickStatusUpdating} appointmentHasOpenVisit={appointmentHasOpenVisit} onQuickStatusChange={handleQuickStatusChange} />
					<AppointmentCardWaitlistRecovery appointment={appointment} onOpenSmartRecovery={() => setIsSmartRecoveryOpen(true)} />
					{appointmentEditing && <AppointmentCardEditor appointment={appointment} dashboard={dashboard} appointmentDraft={appointmentDraft} appointmentSaveState={appointmentSaveState} appointmentSaveError={appointmentSaveError} appointmentDirty={appointmentDirty} appointmentHasOpenVisit={appointmentHasOpenVisit} appointmentMissingSteps={appointmentMissingSteps} appointmentReadyToSave={appointmentReadyToSave} activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses} appointmentLabels={appointmentLabels} appointmentPatientName={appointmentPatientName} appointmentPatient={appointmentPatient} appointmentDoctor={appointmentDoctor} appointmentChair={appointmentChair} activePatients={activePatients} activeDoctors={activeDoctors} activeAssistants={activeAssistants} activeChairs={activeChairs} useManualSelects={useManualSelects} collision={collision} toDateTimeLocalValue={toDateTimeLocalValue} fromDateTimeLocalValue={fromDateTimeLocalValue} updateAppointmentScheduleDraft={updateAppointmentScheduleDraft} saveAppointmentSchedule={saveAppointmentSchedule} closeAppointmentEditor={closeAppointmentEditor} normalizedAppointmentStatus={normalizedAppointmentStatus} />}
				</article>
				<AppointmentCardBottomPopups appointment={appointment} dashboard={dashboard} isMobileSheetOpen={isMobileSheetOpen} setIsMobileSheetOpen={setIsMobileSheetOpen} displayStatus={displayStatus} appointmentPatient={appointmentPatient} appointmentPatientName={appointmentPatientName} patientBalance={patientBalance} appointmentDoctor={appointmentDoctor} appointmentAssistant={appointmentAssistant} appointmentChair={appointmentChair} cardTeeth={cardTeeth} allergyAlert={allergyAlert} appointmentLabels={appointmentLabels} formatTime={formatTime} handleQuickStatusChange={handleQuickStatusChange} openAppointmentEditor={openAppointmentEditor} isSmartRecoveryOpen={isSmartRecoveryOpen} setIsSmartRecoveryOpen={setIsSmartRecoveryOpen} />
			</div>
		</div>
	);
}
