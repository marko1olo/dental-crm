/**
 * DENTE Dental CRM — Leads Default Schedule Window Helper
 * Mandate 8b (<= 120 lines)
 */

import { dateInputValuePlusDays } from "../../../AppHelpers";
import { resolveLeadVisitMinutes } from "../leadsKanbanTypes";

export interface LeadScheduleWindowDashboardContext {
	clinicSettings?: {
		profile?: {
			timezone?: string | null;
			defaultVisitMinutes?: number | null;
		} | null;
	} | null;
}

/**
 * Resolves the default lead appointment scheduling window in the clinic's timezone
 * and exposes canonical action identifiers for kanban coordination.
 */
export function resolveLeadDefaultScheduleWindow(
	dashboard?: LeadScheduleWindowDashboardContext | null,
	appointmentDate?: string,
	appointmentTime = "10:00",
) {
	const clinicTimeZone = dashboard?.clinicSettings?.profile?.timezone ?? null;
	const targetDate =
		appointmentDate || dateInputValuePlusDays(1, clinicTimeZone);
	const startDateTime = new Date(
		`${targetDate}T${appointmentTime || "10:00"}:00`,
	);
	const effectiveVisitMins = resolveLeadVisitMinutes(
		dashboard?.clinicSettings?.profile?.defaultVisitMinutes ?? null,
	);
	const endDateTime = new Date(
		startDateTime.getTime() + effectiveVisitMins * 60000,
	);
	return {
		clinicTimeZone,
		targetDate,
		startDateTime,
		endDateTime,
		appointmentStart: startDateTime.toISOString(),
		appointmentEnd: endDateTime.toISOString(),
		delegatedActions: [
			"batchUpdateStage",
			"onOpenPatientCard",
			"quickReason",
		] as const,
	};
}
