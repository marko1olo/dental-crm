import React from "react";
import type { Appointment } from "@dental/shared";
import { AppointmentCard } from "../AppointmentCard";
import type { TimelineDayGroupProps } from "./TimelineTypes";

interface TimelineAppointmentRowProps extends TimelineDayGroupProps {
	appointment: Appointment;
}

export const TimelineAppointmentRow = React.memo(function TimelineAppointmentRow(
	props: TimelineAppointmentRowProps,
) {
	const {
		appointment,
		dashboard,
		appointmentScheduleDrafts,
		appointmentScheduleSaveStates,
		appointmentScheduleErrors,
		appointmentScheduleDirtyIds,
		editingAppointmentId,
		appointmentDraftFromAppointment,
		appointmentDraftMissingSteps,
		activeVisitLockedAppointmentStatuses,
		visibleScheduleSuggestions,
		appointmentReadinessById,
		appointmentLabels,
		openScheduleSuggestion,
		formatTime,
		patientName,
		openAppointmentEditor,
		repeatAppointment,
		copyAppointmentToBuffer,
		closeAppointmentEditor,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		onOpenVisit,
	} = props;

	const draft = appointmentScheduleDrafts[appointment.id] || appointmentDraftFromAppointment(appointment);
	const saveState = appointmentScheduleSaveStates[appointment.id] || "idle";
	const error = appointmentScheduleErrors[appointment.id] || null;
	const dirty = appointmentScheduleDirtyIds.has(appointment.id);
	const isEditing = editingAppointmentId === appointment.id;
	const hasOpenVisit = dashboard.activeVisit && dashboard.activeVisit.appointmentId === appointment.id;
	const missingSteps = appointmentDraftMissingSteps(draft);
	const readyToSave = missingSteps?.length === 0 && dirty;

	return (
		<div data-timeline-focusable="true" tabIndex={-1} className="focus:outline-none schedule-timeline-item">
			<AppointmentCard
				appointment={appointment}
				dashboard={dashboard}
				visibleScheduleSuggestions={visibleScheduleSuggestions}
				appointmentReadinessById={appointmentReadinessById}
				appointmentLabels={appointmentLabels}
				appointmentDraft={draft}
				appointmentSaveState={saveState}
				appointmentSaveError={error}
				appointmentDirty={dirty}
				appointmentEditing={isEditing}
				appointmentHasOpenVisit={Boolean(hasOpenVisit)}
				appointmentActiveVisitStatusLocked={Boolean(hasOpenVisit && activeVisitLockedAppointmentStatuses.has(draft.status))}
				appointmentMissingSteps={missingSteps as string[]}
				appointmentReadyToSave={readyToSave}
				openScheduleSuggestion={openScheduleSuggestion}
				formatTime={formatTime}
				patientName={patientName}
				openAppointmentEditor={openAppointmentEditor}
				repeatAppointment={repeatAppointment}
				{...(copyAppointmentToBuffer ? { copyAppointmentToBuffer } : {})}
				closeAppointmentEditor={closeAppointmentEditor}
				updateAppointmentScheduleDraft={updateAppointmentScheduleDraft as any}
				saveAppointmentSchedule={saveAppointmentSchedule}
				normalizedAppointmentStatus={normalizedAppointmentStatus}
				toDateTimeLocalValue={toDateTimeLocalValue}
				fromDateTimeLocalValue={fromDateTimeLocalValue}
				useManualSelects={useManualSelects}
				activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
				onOpenVisit={() => onOpenVisit?.(appointment)}
			/>
		</div>
	);
});
