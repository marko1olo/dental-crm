import {
	type ScheduleTimelineProps,
	TimelineDayGroup,
	TimelineEmptyState,
	useTimelineNavigation,
} from "./timelineModules";

export * from "./timelineModules";

export function ScheduleTimeline(props: ScheduleTimelineProps) {
	const {
		visibleDayGroups,
		onEmptySlotClick,
		onNewAppointmentClick,
		stepScheduleDay,
		clinicToday,
		activeScheduleFilterCount,
		resetScheduleFilters,
		setScheduleDateFilter,
		todayScheduleDate,
		onOpenVisit,
	} = props;

	const {
		rowLimitByDay,
		containerRef,
		handleRowLimitIncrease,
		handleRowLimitShowAll,
	} = useTimelineNavigation(visibleDayGroups);

	if (!visibleDayGroups || visibleDayGroups.length === 0) {
		return (
			<TimelineEmptyState
				onNewAppointmentClick={onNewAppointmentClick}
				activeScheduleFilterCount={activeScheduleFilterCount}
				resetScheduleFilters={resetScheduleFilters}
				stepScheduleDay={stepScheduleDay}
				setScheduleDateFilter={setScheduleDateFilter}
				todayScheduleDate={todayScheduleDate}
				clinicToday={clinicToday}
			/>
		);
	}

	return (
		<div
			ref={containerRef}
			className="schedule-timeline-container space-y-4 px-2 sm:px-4 py-2 pb-36"
			style={{ scrollPaddingBottom: "144px" }}
			data-testid="schedule-timeline"
		>
			{visibleDayGroups.map((group) => {
				const rowLimit = rowLimitByDay[group.dateKey] ?? 30;
				return (
					<TimelineDayGroup
						key={group.dateKey}
						group={group}
						rowLimit={rowLimit}
						onRowLimitIncrease={() => handleRowLimitIncrease(group.dateKey)}
						onRowLimitShowAll={() =>
							handleRowLimitShowAll(group.dateKey, group.rows?.length ?? 0)
						}
						onEmptySlotClick={onEmptySlotClick}
						onOpenVisit={onOpenVisit}
						dashboard={props.dashboard}
						appointmentScheduleDrafts={props.appointmentScheduleDrafts}
						appointmentScheduleSaveStates={props.appointmentScheduleSaveStates}
						appointmentScheduleErrors={props.appointmentScheduleErrors}
						appointmentScheduleDirtyIds={props.appointmentScheduleDirtyIds}
						editingAppointmentId={props.editingAppointmentId}
						appointmentDraftFromAppointment={
							props.appointmentDraftFromAppointment
						}
						appointmentDraftMissingSteps={props.appointmentDraftMissingSteps}
						activeVisitLockedAppointmentStatuses={
							props.activeVisitLockedAppointmentStatuses
						}
						visibleScheduleSuggestions={props.visibleScheduleSuggestions}
						appointmentReadinessById={props.appointmentReadinessById}
						appointmentLabels={props.appointmentLabels}
						openScheduleSuggestion={props.openScheduleSuggestion}
						formatTime={props.formatTime}
						patientName={props.patientName}
						openAppointmentEditor={props.openAppointmentEditor}
						repeatAppointment={props.repeatAppointment}
						copyAppointmentToBuffer={props.copyAppointmentToBuffer}
						closeAppointmentEditor={props.closeAppointmentEditor}
						updateAppointmentScheduleDraft={
							props.updateAppointmentScheduleDraft
						}
						saveAppointmentSchedule={props.saveAppointmentSchedule}
						normalizedAppointmentStatus={props.normalizedAppointmentStatus}
						toDateTimeLocalValue={props.toDateTimeLocalValue}
						fromDateTimeLocalValue={props.fromDateTimeLocalValue}
						useManualSelects={props.useManualSelects}
					/>
				);
			})}
		</div>
	);
}
