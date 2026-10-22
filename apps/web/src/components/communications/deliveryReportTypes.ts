/**
 * Types & Core Voice Engines for Delivery Report Notices
 */

export type Notice = { kind: "done" | "fail"; text: string };

export function failNotice(error: unknown, hint: string): Notice {
	const reason = error instanceof Error ? error.message : String(error);
	return { kind: "fail", text: `${hint} Причина: ${reason}` };
}

export function formatMoment(value: string | null): string {
	if (!value) return "—";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "—";
	return parsed.toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export type DispatchReport = {
	readonly claimed: number;
	readonly sent: number;
	readonly retried: number;
	readonly failed: number;
	readonly suppressed: number;
	readonly notConfigured: number;
	readonly deferred: number;
	readonly releasedStuck: number;
	readonly awaitingRetry: number;
	readonly awaitingSchedule: number;
};

export type ReminderSkipReason = "no_channel" | "no_template_data";

export type ReminderSkip = {
	readonly patientName: string;
	readonly reason: ReminderSkipReason;
	readonly appointmentAt: string;
};

export type ReminderScheduleReport = {
	readonly organizations: number;
	readonly examined: number;
	readonly queued: number;
	readonly alreadyQueued: number;
	readonly skippedNoChannel: number;
	readonly skippedNoTemplateData: number;
	readonly skipped: readonly ReminderSkip[];
	readonly problems: readonly string[];
};

export type CounterRole = "total" | "delivered" | "undelivered" | "detail";

export type ReportVoice<TReport> = {
	readonly [Field in keyof TReport]: {
		readonly role: CounterRole;
		readonly order: number;
		readonly say: (value: TReport[Field], report: TReport) => string | null;
	};
};

export type SpokenPart = { readonly role: CounterRole; readonly text: string };

export function speakField<TReport extends object, Field extends keyof TReport>(
	report: TReport,
	voice: ReportVoice<TReport>,
	field: Field,
): { readonly order: number; readonly part: SpokenPart | null } {
	const entry = voice[field];
	const text = entry.say(report[field], report);
	return {
		order: entry.order,
		part: text === null ? null : { role: entry.role, text },
	};
}

export function speak<TReport extends object>(
	report: TReport,
	voice: ReportVoice<TReport>,
): SpokenPart[] {
	const fields = Object.keys(voice) as (keyof TReport)[];
	return fields
		.map((field) => speakField(report, voice, field))
		.sort((left, right) => left.order - right.order)
		.flatMap((spoken) => (spoken.part === null ? [] : [spoken.part]));
}

export function noticeFrom(parts: SpokenPart[]): Notice {
	return {
		kind: parts.some((part) => part.role === "undelivered") ? "fail" : "done",
		text: parts.map((part) => part.text).join(" "),
	};
}
