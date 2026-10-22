import type { DispatchReport, ReminderScheduleReport } from "./deliveryReportNotice.js";

export const cleanDispatch: DispatchReport = {
	claimed: 3,
	sent: 3,
	retried: 0,
	failed: 0,
	suppressed: 0,
	notConfigured: 0,
	deferred: 0,
	releasedStuck: 0,
	awaitingRetry: 0,
	awaitingSchedule: 0,
};

export const cleanReminders: ReminderScheduleReport = {
	organizations: 1,
	examined: 5,
	queued: 5,
	alreadyQueued: 0,
	skippedNoChannel: 0,
	skippedNoTemplateData: 0,
	skipped: [],
	problems: [],
};

export const latinRun = /[A-Za-z]{2,}/;
export const rawUuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
