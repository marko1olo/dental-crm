export * from './kanbanView/index.js';

import { dateInputValuePlusDays } from "../../AppHelpers";
import {
	type LeadScheduleWindowDashboardContext,
	resolveLeadVisitMinutes,
} from "./kanbanView/types";

export function resolveKanbanDefaultDayScheduleWindow(
	dashboard?: LeadScheduleWindowDashboardContext | null,
	appointmentDate?: string,
	appointmentTime = "10:00",
) {
	const clinicTimeZone = dashboard?.clinicSettings?.profile?.timezone ?? null;
	const targetDate =
		appointmentDate || dateInputValuePlusDays(1, clinicTimeZone);
	const startDateTime = new Date(`${targetDate}T${appointmentTime || "10:00"}:00`);
	const effectiveVisitMins = resolveLeadVisitMinutes(
		dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null,
	);
	const endDateTime = new Date(
		startDateTime.getTime() + effectiveVisitMins * 60000,
	);
	return {
		clinicTimeZone,
		targetDate,
		appointmentStart: startDateTime.toISOString(),
		appointmentEnd: endDateTime.toISOString(),
		delegatedActions: [
			"batchUpdateStage",
			"onOpenPatientCard",
			"quickReason",
		] as const,
	};
}
