import type React from "react";
import type { TimelineItem } from "./scheduleMobileAgendaTypes";

interface ScheduleMobileTimeColProps {
	item: TimelineItem;
}

export const ScheduleMobileTimeCol: React.FC<ScheduleMobileTimeColProps> = ({ item }) => {
	return (
		<div className="schedule-mobile-time-col">
			<span className="schedule-mobile-time-start">{item.startsAtLocal}</span>
			<span className="schedule-mobile-time-end">– {item.endsAtLocal}</span>
			<span className="schedule-mobile-time-duration">
				{item.durationMinutes} мин
			</span>
		</div>
	);
};
