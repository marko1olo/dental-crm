import type { Dashboard } from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { sliceDomList } from "../../utils/domVirtualizationHelper";
import {
	calculateTreatmentPlanProgress,
	createPatientJourneyEvents,
} from "./journeyEventBuilders";
import type { JourneyEvent } from "./journeyTypes";

export function usePatientJourneyEvents(
	patientId: string,
	dashboard: Dashboard | null | undefined,
) {
	const staffById = useMemo(() => {
		return new Map<string, { fullName?: string }>(
			(dashboard?.clinicSettings?.staff ?? [])?.map((member) => [
				member.id,
				member,
			]),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const events = useMemo<JourneyEvent[]>(
		() => createPatientJourneyEvents(patientId, dashboard, staffById),
		[patientId, dashboard, staffById],
	);

	const progress = useMemo(
		() =>
			calculateTreatmentPlanProgress(
				dashboard?.treatmentPlanItems,
				patientId,
			),
		[dashboard?.treatmentPlanItems, patientId],
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [displayLimit, setDisplayLimit] = useState(15);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on filter change
	useEffect(() => {
		setDisplayLimit(15);
	}, [patientId, searchQuery]);

	const filteredEvents = useMemo(() => {
		if (!searchQuery.trim()) return events;
		const q = searchQuery.trim().toLowerCase();
		return events.filter(
			(evt) =>
				evt.title.toLowerCase().includes(q) ||
				evt.description.toLowerCase().includes(q) ||
				(evt.status ?? "").toLowerCase().includes(q),
		);
	}, [events, searchQuery]);

	const eventsSlice = useMemo(
		() => sliceDomList(filteredEvents, displayLimit, 0),
		[filteredEvents, displayLimit],
	);

	return {
		searchQuery,
		setSearchQuery,
		displayLimit,
		setDisplayLimit,
		filteredEvents,
		eventsSlice,
		...progress,
	};
}
