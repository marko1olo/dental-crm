import type { Dashboard } from "@dental/shared";
import type { CommunicationEvent, CommunicationTask } from "./types";

export function defaultFormatDateTime(value: string): string {
	return new Date(value).toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function hasCommunicationSummaryNumbers(
	dashboard: Dashboard | undefined,
): boolean {
	return Boolean(
		(dashboard?.communicationSummary?.openTasks ?? 0) ||
			(dashboard?.communicationSummary?.dueToday ?? 0) ||
			(dashboard?.communicationSummary?.overdue ?? 0) ||
			(dashboard?.communicationSummary?.urgentTasks ?? 0) ||
			(dashboard?.communicationSummary?.appointmentConfirmations ?? 0) ||
			(dashboard?.communicationSummary?.postVisitInstructions ?? 0),
	);
}

export function resolveEffectiveCommunicationEvents(
	dashboard: Dashboard | undefined,
	_isDemo?: boolean,
): CommunicationEvent[] | undefined {
	return dashboard?.communicationEvents;
}

export function resolveEffectiveCommunicationTasks(
	sortedCommunicationTasks: CommunicationTask[] | undefined,
	dashboard: Dashboard | undefined,
	_isDemo?: boolean,
): CommunicationTask[] {
	if (Array.isArray(sortedCommunicationTasks) && sortedCommunicationTasks.length > 0) {
		return sortedCommunicationTasks;
	}
	return dashboard?.communicationTasks ?? [];
}
