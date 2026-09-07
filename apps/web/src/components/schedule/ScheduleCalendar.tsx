import React from "react";
import {
	ScheduleView,
	type ScheduleViewProps,
} from "../../ScheduleView";

/**
 * ScheduleCalendar — Canonical schedule calendar interface conforming to StomX / IDENT parity.
 * Provides day/week/month navigation, chair/doctor views, real-time sync, and quick booking.
 */
export const ScheduleCalendar: React.FC<ScheduleViewProps> = (props) => {
	return <ScheduleView {...props} />;
};

export type { ScheduleViewProps, ScheduleCalendarProps };
type ScheduleCalendarProps = ScheduleViewProps;

export default ScheduleCalendar;
