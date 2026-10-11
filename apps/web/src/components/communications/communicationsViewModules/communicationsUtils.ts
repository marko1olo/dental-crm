import type { Dashboard } from "@dental/shared";
import {
	DEMO_COMMUNICATION_EVENTS,
	DEMO_COMMUNICATION_TASKS,
} from "./communicationsConstants";
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
	isDemo: boolean,
): CommunicationEvent[] | undefined {
	if (dashboard?.communicationEvents !== undefined) {
		return dashboard.communicationEvents.length > 0 || !isDemo
			? dashboard.communicationEvents
			: DEMO_COMMUNICATION_EVENTS;
	}
	return isDemo ? DEMO_COMMUNICATION_EVENTS : undefined;
}

export function resolveEffectiveCommunicationTasks(
	sortedCommunicationTasks: CommunicationTask[] | undefined,
	dashboard: Dashboard | undefined,
	isDemo: boolean,
): CommunicationTask[] {
	const rawTasks =
		Array.isArray(sortedCommunicationTasks) &&
		sortedCommunicationTasks.length > 0
			? sortedCommunicationTasks
			: (dashboard?.communicationTasks ?? []);
	return rawTasks.length > 0 ? rawTasks : isDemo ? DEMO_COMMUNICATION_TASKS : [];
}
