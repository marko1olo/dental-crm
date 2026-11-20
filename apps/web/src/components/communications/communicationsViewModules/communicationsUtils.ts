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

const DEMO_COMMUNICATION_TASKS: CommunicationTask[] = [
	{
		id: "demo-comm-task-1",
		organizationId: "demo-org",
		patientId: "demo-pat-1",
		appointmentId: null,
		visitId: null,
		documentId: null,
		assignedRole: "administrator",
		title: "Подтверждение записи: Смирнова Анна Сергеевна",
		body: "Подтверждение записи на приём (+7 (999) 123-45-67)",
		intent: "appointment_confirmation",
		channel: "whatsapp",
		priority: "normal",
		status: "scheduled",
		dueAt: "2026-05-15T12:00:00.000Z",
		lastEventAt: null,
		createdAt: "2026-05-15T08:00:00.000Z",
	},
];

export function resolveEffectiveCommunicationTasks(
	sortedCommunicationTasks: CommunicationTask[] | undefined,
	dashboard: Dashboard | undefined,
	isDemo?: boolean,
): CommunicationTask[] {
	if (Array.isArray(sortedCommunicationTasks) && sortedCommunicationTasks.length > 0) {
		return sortedCommunicationTasks;
	}
	const tasks = dashboard?.communicationTasks ?? [];
	return tasks.length > 0 ? tasks : isDemo ? DEMO_COMMUNICATION_TASKS : [];
}
