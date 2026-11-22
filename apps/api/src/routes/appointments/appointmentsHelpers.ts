import {
	APPOINTMENT_STATUS_ALIASES,
	DEFAULT_ASSISTANT_PLACEHOLDERS,
	DEFAULT_CHAIR_PLACEHOLDERS,
	DEFAULT_DOCTOR_PLACEHOLDERS,
} from "./appointmentsSchemas.js";
import type {
	AppointmentConflictContext,
	ExistingAppointmentRecord,
} from "./types.js";

export const DEFAULT_SCHEDULE_TIMEZONE = "Europe/Moscow";

export function getTimeZoneOffsetString(
	date: Date,
	timeZone: string = DEFAULT_SCHEDULE_TIMEZONE,
): string {
	try {
		const dtf = new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
		const parts = dtf.formatToParts(date);
		const p: Record<string, string> = {};
		for (const part of parts) {
			if (part.type !== "literal") p[part.type] = part.value;
		}
		const asLocalIso = `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}:${p.second}Z`;
		const targetTime = new Date(asLocalIso).getTime();
		const utcTime = date.getTime();
		const diffMinutes = Math.round((targetTime - utcTime) / 60000);
		const sign = diffMinutes >= 0 ? "+" : "-";
		const absMinutes = Math.abs(diffMinutes);
		const offsetHours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
		const offsetMins = String(absMinutes % 60).padStart(2, "0");
		return `${sign}${offsetHours}:${offsetMins}`;
	} catch {
		return "+03:00";
	}
}

export function normalizeIsoDateTimeString(
	value: string,
	timeZone: string = DEFAULT_SCHEDULE_TIMEZONE,
): string {
	let s = value.trim();
	if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
	if (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s) || /[+-]\d{4}$/.test(s)) {
		return s;
	}
	// Если дата без смещения (локальное время клиники),
	// определяем смещение клиники (по умолчанию Europe/Moscow) и прикрепляем его,
	// исключая потерю 3 часов.
	const probeDate = new Date(`${s}Z`);
	const safeProbe = Number.isNaN(probeDate.getTime()) ? new Date() : probeDate;
	const offset = getTimeZoneOffsetString(safeProbe, timeZone);
	return `${s}${offset}`;
}

export function normalizeAppointmentFieldAliases(
	rawBody: Record<string, unknown>,
	timeZone?: string | null,
): void {
	if (
		typeof rawBody.status === "string" &&
		rawBody.status in APPOINTMENT_STATUS_ALIASES
	) {
		rawBody.status = APPOINTMENT_STATUS_ALIASES[rawBody.status];
	}
	if (
		!rawBody.doctorUserId &&
		rawBody.doctorId &&
		typeof rawBody.doctorId === "string"
	) {
		rawBody.doctorUserId = rawBody.doctorId;
	}
	if (
		!rawBody.assistantUserId &&
		rawBody.assistantId &&
		typeof rawBody.assistantId === "string"
	) {
		rawBody.assistantUserId = rawBody.assistantId;
	}
	if (
		!rawBody.chairId &&
		rawBody.clinicRoomId &&
		typeof rawBody.clinicRoomId === "string"
	) {
		rawBody.chairId = rawBody.clinicRoomId;
	}
	if (
		!rawBody.chairId &&
		rawBody.roomId &&
		typeof rawBody.roomId === "string"
	) {
		rawBody.chairId = rawBody.roomId;
	}
	if (
		!rawBody.startsAt &&
		rawBody.startTime &&
		typeof rawBody.startTime === "string"
	) {
		rawBody.startsAt = rawBody.startTime;
	}
	if (
		!rawBody.endsAt &&
		rawBody.endTime &&
		typeof rawBody.endTime === "string"
	) {
		rawBody.endsAt = rawBody.endTime;
	}
	if (!rawBody.reason && rawBody.notes && typeof rawBody.notes === "string") {
		rawBody.reason = rawBody.notes;
	}
	if (
		!rawBody.comment &&
		rawBody.comments &&
		typeof rawBody.comments === "string"
	) {
		rawBody.comment = rawBody.comments;
	}

	if (typeof rawBody.startsAt === "string") {
		rawBody.startsAt = normalizeIsoDateTimeString(
			rawBody.startsAt,
			timeZone ?? DEFAULT_SCHEDULE_TIMEZONE,
		);
	}
	if (typeof rawBody.endsAt === "string") {
		rawBody.endsAt = normalizeIsoDateTimeString(
			rawBody.endsAt,
			timeZone ?? DEFAULT_SCHEDULE_TIMEZONE,
		);
	}

	if (
		typeof rawBody.patientId === "string" &&
		!rawBody.patientId.trim()
	) {
		rawBody.patientId = null;
	}

	if (
		(typeof rawBody.assistantUserId === "string" &&
			(DEFAULT_ASSISTANT_PLACEHOLDERS.has(rawBody.assistantUserId) ||
				!rawBody.assistantUserId.trim()))
	) {
		rawBody.assistantUserId = null;
	}
}

export function normalizeAppointmentUpdateRawBody(
	body: unknown,
	timeZone?: string | null,
): Record<string, unknown> | null {
	const rawBody =
		body && typeof body === "object"
			? { ...(body as Record<string, unknown>) }
			: null;

	if (rawBody) {
		if (
			typeof rawBody.status === "string" &&
			rawBody.status in APPOINTMENT_STATUS_ALIASES
		) {
			rawBody.status = APPOINTMENT_STATUS_ALIASES[rawBody.status];
		}
		normalizeAppointmentFieldAliases(rawBody, timeZone);
	}

	return rawBody;
}

export function isMissingOrDefaultChairId(chairId: unknown): boolean {
	return (
		!chairId ||
		(typeof chairId === "string" &&
			(DEFAULT_CHAIR_PLACEHOLDERS.has(chairId) || !chairId.trim()))
	);
}

export function isMissingOrDefaultDoctorId(doctorUserId: unknown): boolean {
	return (
		!doctorUserId ||
		(typeof doctorUserId === "string" &&
			(DEFAULT_DOCTOR_PLACEHOLDERS.has(doctorUserId) || !doctorUserId.trim()))
	);
}

export function buildNextStageCreatePayload(
	parent: ExistingAppointmentRecord,
	rawBody: Record<string, unknown>,
) {
	const stageIndex =
		typeof rawBody.stageIndex === "number" && rawBody.stageIndex > 0
			? rawBody.stageIndex
			: (parent.stageIndex ?? 1) + 1;

	const clinicalStage =
		typeof rawBody.clinicalStage === "string" && rawBody.clinicalStage.trim()
			? rawBody.clinicalStage.trim()
			: `Этап ${stageIndex}`;

	const intervalDays =
		typeof rawBody.intervalDays === "number" && rawBody.intervalDays > 0
			? rawBody.intervalDays
			: 7;

	const durationMinutes =
		typeof rawBody.durationMinutes === "number" && rawBody.durationMinutes > 0
			? rawBody.durationMinutes
			: 30;

	let startsAtDate: Date;
	let endsAtDate: Date;

	if (typeof rawBody.startsAt === "string" && rawBody.startsAt.trim()) {
		startsAtDate = new Date(rawBody.startsAt);
	} else if (
		typeof rawBody.startTime === "string" &&
		rawBody.startTime.trim()
	) {
		startsAtDate = new Date(rawBody.startTime);
	} else {
		const baseDate = parent.startsAt ? new Date(parent.startsAt) : new Date();
		startsAtDate = new Date(
			baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000,
		);
	}

	if (typeof rawBody.endsAt === "string" && rawBody.endsAt.trim()) {
		endsAtDate = new Date(rawBody.endsAt);
	} else if (typeof rawBody.endTime === "string" && rawBody.endTime.trim()) {
		endsAtDate = new Date(rawBody.endTime);
	} else {
		endsAtDate = new Date(
			startsAtDate.getTime() + durationMinutes * 60 * 1000,
		);
	}

	const toothNumber =
		typeof rawBody.toothNumber === "number"
			? rawBody.toothNumber
			: (parent.toothNumber ?? null);

	const diagnosisMkb10 =
		typeof rawBody.diagnosisMkb10 === "string" && rawBody.diagnosisMkb10.trim()
			? rawBody.diagnosisMkb10.trim()
			: (parent.diagnosisMkb10 ?? null);

	const doctorUserId =
		typeof rawBody.doctorUserId === "string" && rawBody.doctorUserId.trim()
			? rawBody.doctorUserId.trim()
			: parent.doctorUserId;

	const chairId =
		typeof rawBody.chairId === "string" && rawBody.chairId.trim()
			? rawBody.chairId.trim()
			: parent.chairId;

	const defaultReason = parent.reason
		? `${parent.reason} — ${clinicalStage}`
		: `Повторный приём — ${clinicalStage}`;

	const reason =
		typeof rawBody.reason === "string" && rawBody.reason.trim()
			? rawBody.reason.trim()
			: typeof rawBody.title === "string" && rawBody.title.trim()
				? rawBody.title.trim()
				: defaultReason;

	return {
		patientId: parent.patientId,
		doctorUserId,
		chairId,
		assistantUserId:
			(typeof rawBody.assistantUserId === "string"
				? rawBody.assistantUserId
				: parent.assistantUserId ?? null),
		startsAt: startsAtDate.toISOString(),
		endsAt: endsAtDate.toISOString(),
		status: "planned" as const,
		reason,
		comment:
			(typeof rawBody.comment === "string"
				? rawBody.comment
				: parent.comment
					? `Наследован от приёма ${parent.id}`
					: null),
		parentAppointmentId: parent.id,
		stageIndex,
		clinicalStage,
		toothNumber,
		diagnosisMkb10,
	};
}

export function buildConflictContext(
	orgId: string,
	input: {
		doctorUserId?: string | null | undefined;
		chairId?: string | null | undefined;
		startsAt?: Date | string | undefined;
		endsAt?: Date | string | null | undefined;
	},
): AppointmentConflictContext {
	return {
		orgId,
		doctorUserId: input.doctorUserId ?? null,
		chairId: input.chairId ?? null,
		startsAt: input.startsAt ?? new Date(),
		endsAt: input.endsAt ?? null,
	};
}

export function resolveUpdateAuditAction(input: {
	status?: string | undefined;
	startsAt?: Date | string | undefined;
	endsAt?: Date | string | null | undefined;
}) {
	return input.status === "cancelled"
		? "appointment_cancel"
		: input.startsAt || input.endsAt
			? "appointment_reschedule"
			: "appointment_update";
}
