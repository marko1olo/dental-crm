import { useCallback, useEffect, useRef, useState } from "react";
import type { ScheduleDayGroup } from "../scheduleDayGrouping";

export function useTimelineNavigation(visibleDayGroups: ScheduleDayGroup[]) {
	const [rowLimitByDay, setRowLimitByDay] = useState<Record<string, number>>(
		{},
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const initialScrollDoneRef = useRef(false);

	const handleRowLimitIncrease = useCallback((dateKey: string) => {
		setRowLimitByDay((prev) => ({
			...prev,
			[dateKey]: (prev[dateKey] ?? 30) + 30,
		}));
	}, []);

	const handleRowLimitShowAll = useCallback(
		(dateKey: string, total: number) => {
			setRowLimitByDay((prev) => ({
				...prev,
				[dateKey]: total,
			}));
		},
		[],
	);

	// Auto-scroll to today or first appointment
	useEffect(() => {
		if (initialScrollDoneRef.current || !visibleDayGroups?.length) return;
		const todayGroup = visibleDayGroups.find((g) => g.relation === "today");
		if (todayGroup) {
			const el = containerRef.current?.querySelector(
				`[data-testid="schedule-day-heading"]`,
			);
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "start" });
				initialScrollDoneRef.current = true;
			}
		}
	}, [visibleDayGroups]);

	return {
		rowLimitByDay,
		containerRef,
		handleRowLimitIncrease,
		handleRowLimitShowAll,
	};
}
