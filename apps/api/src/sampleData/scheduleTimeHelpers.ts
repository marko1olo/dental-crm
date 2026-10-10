/**
 * @file scheduleTimeHelpers.ts
 * @description Layer 2: Timezone helpers, appointment time part calculations, and schedule capacity.
 */
import { inMemoryDomainState } from "./domainState.js";
import { defaultClinicTimezone, nowIso } from "./fixtureIds.js";
import { clinicProfile, defaultClinicScheduleDefaults, defaultStaffWorkingHours, normalizeClinicScheduleDefaults, clockToMinutes } from "./organizations.js";
import { normalizeStaffWorkingHours } from "./staff.js";

import type {
	Appointment,
	Chair,
	ClinicProfile,
	ClinicScheduleDefaults,
	Patient,
	StaffMember,
	StaffWorkingHours,
} from "@dental/shared";
import type { DomainState } from "../types/domainState.js";
import { appointments } from "./appointments.js";

const appointmentTimeFormatters = new Map<string, Intl.DateTimeFormat>();

export function validScheduleTimeZone(
	value: string | null | undefined,
): string {
	const timeZone = value?.trim() || defaultClinicTimezone;
	try {
		getAppointmentTimeFormatter(timeZone);
		return timeZone;
	} catch {
		return defaultClinicTimezone;
	}
}

/**
 * Сегодняшняя дата в часовом поясе клиники (YYYY-MM-DD).
 *
 * БЫЛО: buildDashboard() возвращал жёстко зашитое "2026-05-12". От этого
 * значения считается вся вкладка «Смена»: какие приёмы показать как сегодняшние,
 * что просрочено, что закрывать. То есть расписание всегда показывало «сегодня»
 * 12 мая 2026 года независимо от реальной даты.
 *
 * Дата берётся именно в часовом поясе клиники, а не сервера: в Самаре рабочий
 * день начинается на три часа раньше UTC, и по UTC-дате утренние приёмы
 * попадали бы во «вчера».
 */
function clinicTodayIso(timeZone: string = clinicProfile.timezone): string {
	const zone = validScheduleTimeZone(timeZone);
	try {
		const parts = new Map(
			getAppointmentTimeFormatter(zone)
				.formatToParts(new Date())
				.map((part) => [part.type, part.value]),
		);
		const year = parts.get("year");
		const month = parts.get("month");
		const day = parts.get("day");
		if (year && month && day) return `${year}-${month}-${day}`;
	} catch {
		// Ниже — запасной вариант по UTC.
	}
	return new Date().toISOString().slice(0, 10);
}

export function assertValidScheduleTimeZone(value: string): void {
	try {
		getAppointmentTimeFormatter(value);
	} catch {
		throw new Error(
			"Укажите реальный часовой пояс клиники, например Europe/Samara или Europe/Moscow.",
		);
	}
}

function getAppointmentTimeFormatter(timeZone: string): Intl.DateTimeFormat {
	const cached = appointmentTimeFormatters.get(timeZone);
	if (cached) return cached;
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});
	appointmentTimeFormatters.set(timeZone, formatter);
	return formatter;
}

function appointmentClinicTimeParts(
	value: string,
	sourceTimeZone?: string,
	state: DomainState = inMemoryDomainState,
): { weekday: number; minute: number; timeZone: string } {
	sourceTimeZone ??= state.clinicProfile.timezone;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return {
			weekday: 0,
			minute: 0,
			timeZone: validScheduleTimeZone(sourceTimeZone),
		};
	}
	const timeZone = validScheduleTimeZone(sourceTimeZone);
	const formatter = getAppointmentTimeFormatter(timeZone);
	const parts = new Map(
		formatter.formatToParts(date).map((part) => [part.type, part.value]),
	);
	const year = Number.parseInt(parts.get("year") ?? "", 10);
	const month = Number.parseInt(parts.get("month") ?? "", 10);
	const day = Number.parseInt(parts.get("day") ?? "", 10);
	const hour = Number.parseInt(parts.get("hour") ?? "", 10);
	const minute = Number.parseInt(parts.get("minute") ?? "", 10);

	if (![year, month, day, hour, minute].every(Number.isFinite)) {
		return {
			weekday: date.getDay(),
			minute: date.getHours() * 60 + date.getMinutes(),
			timeZone,
		};
	}

	return {
		weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
		minute: (hour % 24) * 60 + minute,
		timeZone,
	};
}

function appointmentClinicDateKey(
	value: string,
	sourceTimeZone?: string,
	state: DomainState = inMemoryDomainState,
): string {
	sourceTimeZone ??= state.clinicProfile.timezone;
	const date = new Date(value);
	const fallbackDateKey = value.slice(0, 10) || nowIso.slice(0, 10);
	if (Number.isNaN(date.getTime())) return fallbackDateKey;

	const timeZone = validScheduleTimeZone(sourceTimeZone);
	const formatter = getAppointmentTimeFormatter(timeZone);
	const parts = new Map(
		formatter.formatToParts(date).map((part) => [part.type, part.value]),
	);
	const year = parts.get("year");
	const month = parts.get("month");
	const day = parts.get("day");

	return year && month && day ? `${year}-${month}-${day}` : fallbackDateKey;
}

export function appointmentsShareClinicDate(
	left: Appointment,
	right: Appointment,
): boolean {
	return (
		appointmentClinicDateKey(left.startsAt) ===
		appointmentClinicDateKey(right.startsAt)
	);
}

function appointmentWeekday(
	appointment: Appointment,
	timeZone?: string,
	state: DomainState = inMemoryDomainState,
): number {
	return appointmentClinicTimeParts(appointment.startsAt, timeZone, state)
		.weekday;
}

function appointmentStartMinute(
	appointment: Appointment,
	timeZone?: string,
	state: DomainState = inMemoryDomainState,
): number {
	return appointmentClinicTimeParts(appointment.startsAt, timeZone, state)
		.minute;
}

function appointmentEndMinute(
	appointment: Appointment,
	timeZone?: string,
	state: DomainState = inMemoryDomainState,
): number {
	return appointmentClinicTimeParts(appointment.endsAt, timeZone, state).minute;
}

function appointmentWithinClinicScheduleDefaults(
	appointment: Appointment,
	scheduleDefaults: ClinicProfile["scheduleDefaults"],
	timezone: string,
): { ready: boolean; detail: string } {
	const schedule = normalizeClinicScheduleDefaults(scheduleDefaults);
	const timeZone = validScheduleTimeZone(timezone);
	const weekday = appointmentWeekday(appointment, timeZone);
	const start = appointmentStartMinute(appointment, timeZone);
	const end = appointmentEndMinute(appointment, timeZone);
	const opensAt = clockToMinutes(schedule.workdayStart);
	const closesAt = clockToMinutes(schedule.workdayEnd);
	if (!schedule.workingDays.includes(weekday)) {
		return {
			ready: false,
			detail: `прием стоит на нерабочий день клиники (${timeZone})`,
		};
	}
	if (start < opensAt || end > closesAt) {
		return {
			ready: false,
			detail: `прием вне окна клиники ${schedule.workdayStart}-${schedule.workdayEnd} (${timeZone})`,
		};
	}
	return {
		ready: true,
		detail: `окно клиники ${schedule.workdayStart}-${schedule.workdayEnd} (${timeZone})`,
	};
}

function appointmentWithinClinicSchedule(
	appointment: Appointment,
	state: DomainState = inMemoryDomainState,
): {
	ready: boolean;
	detail: string;
} {
	const { clinicProfile } = state;
	return appointmentWithinClinicScheduleDefaults(
		appointment,
		clinicProfile.scheduleDefaults,
		clinicProfile.timezone,
	);
}

function appointmentWithinStaffSchedule(
	appointment: Appointment,
	staff: StaffMember | undefined | null,
	label = "врач",
	state: DomainState = inMemoryDomainState,
): { ready: boolean; detail: string } {
	const { clinicProfile } = state;
	if (!staff)
		return { ready: false, detail: `нет ${label} для проверки расписания` };
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	const workingHours = normalizeStaffWorkingHours(staff.workingHours ?? null);
	const weekday = appointmentWeekday(appointment);
	const workingDay = workingHours.find((day) => day.weekday === weekday);
	if (!workingDay?.enabled)
		return {
			ready: false,
			detail: `${label} не работает в этот день (${timeZone})`,
		};
	const start = appointmentStartMinute(appointment);
	const end = appointmentEndMinute(appointment);
	const opensAt = clockToMinutes(workingDay.start);
	const closesAt = clockToMinutes(workingDay.end);
	if (start < opensAt || end > closesAt) {
		return {
			ready: false,
			detail: `прием вне окна ${label} ${workingDay.start}-${workingDay.end} (${timeZone})`,
		};
	}
	return {
		ready: true,
		detail: `окно ${label} ${workingDay.start}-${workingDay.end} (${timeZone})`,
	};
}

function appointmentWithinChairSchedule(
	appointment: Appointment,
	chair: Chair | undefined | null,
	state: DomainState = inMemoryDomainState,
): { ready: boolean; detail: string } {
	const { clinicProfile } = state;
	if (!chair)
		return { ready: false, detail: "нет кресла для проверки расписания" };
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	const workingHours = normalizeStaffWorkingHours(chair.workingHours ?? null);
	const weekday = appointmentWeekday(appointment);
	const workingDay = workingHours.find((day) => day.weekday === weekday);
	if (!workingDay?.enabled)
		return {
			ready: false,
			detail: `кресло не работает в этот день (${timeZone})`,
		};
	const start = appointmentStartMinute(appointment);
	const end = appointmentEndMinute(appointment);
	const opensAt = clockToMinutes(workingDay.start);
	const closesAt = clockToMinutes(workingDay.end);
	if (start < opensAt || end > closesAt) {
		return {
			ready: false,
			detail: `прием вне окна кресла ${workingDay.start}-${workingDay.end} (${timeZone})`,
		};
	}
	return {
		ready: true,
		detail: `окно кресла ${workingDay.start}-${workingDay.end} (${timeZone})`,
	};
}

function appointmentWithinPatientPreference(
	appointment: Appointment,
	patient: Patient | undefined | null,
	state: DomainState = inMemoryDomainState,
): { ready: boolean; detail: string } {
	const { clinicProfile } = state;
	const preference = patient?.administrativeProfile;
	if (!preference)
		return {
			ready: true,
			detail: "предпочтения пациента по времени не заданы",
		};
	const weekdays = preference.preferredAppointmentWeekdays ?? [];
	const weekday = appointmentWeekday(appointment);
	const timeZone = validScheduleTimeZone(clinicProfile.timezone);
	if (weekdays.length && !weekdays.includes(weekday)) {
		return {
			ready: false,
			detail: `пациент предпочитает другие дни записи (${timeZone})`,
		};
	}
	if (
		preference.preferredAppointmentStart &&
		preference.preferredAppointmentEnd
	) {
		const start = appointmentStartMinute(appointment);
		const end = appointmentEndMinute(appointment);
		const opensAt = clockToMinutes(preference.preferredAppointmentStart);
		const closesAt = clockToMinutes(preference.preferredAppointmentEnd);
		if (start < opensAt || end > closesAt) {
			return {
				ready: false,
				detail: `прием вне удобного окна пациента ${preference.preferredAppointmentStart}-${preference.preferredAppointmentEnd} (${timeZone})`,
			};
		}
		return {
			ready: true,
			detail: `окно пациента ${preference.preferredAppointmentStart}-${preference.preferredAppointmentEnd} (${timeZone})`,
		};
	}
	return weekdays.length
		? {
				ready: true,
				detail: `день подходит под предпочтения пациента (${timeZone})`,
			}
		: {
				ready: true,
				detail: "предпочтения пациента по времени не ограничивают запись",
			};
}

function clinicDailyCapacityMinutes(
	state: DomainState = inMemoryDomainState,
): number {
	const schedule = normalizeClinicScheduleDefaults(
		state.clinicProfile.scheduleDefaults,
	);
	return Math.max(
		60,
		clockToMinutes(schedule.workdayEnd) - clockToMinutes(schedule.workdayStart),
	);
}

function workingHoursDailyCapacityMinutes(
	workingHoursInput?: StaffWorkingHours | null,
): number {
	const workingHours = normalizeStaffWorkingHours(
		workingHoursInput ?? null,
	).filter((day) => day.enabled);
	if (!workingHours.length) return clinicDailyCapacityMinutes();
	const total = workingHours.reduce(
		(sum, day) =>
			sum + Math.max(0, clockToMinutes(day.end) - clockToMinutes(day.start)),
		0,
	);
	return Math.max(60, Math.round(total / workingHours.length));
}

export function staffDailyCapacityMinutes(staff: StaffMember): number {
	return workingHoursDailyCapacityMinutes(staff.workingHours ?? null);
}


function appointmentIntervalsOverlap(
	left: Appointment,
	right: Appointment,
): boolean {
	const leftStart = Date.parse(left.startsAt);
	const leftEnd = Date.parse(left.endsAt);
	const rightStart = Date.parse(right.startsAt);
	const rightEnd = Date.parse(right.endsAt);
	return (
		Number.isFinite(leftStart) &&
		Number.isFinite(leftEnd) &&
		Number.isFinite(rightStart) &&
		Number.isFinite(rightEnd) &&
		leftStart < rightEnd &&
		rightStart < leftEnd
	);
}


export { appointmentIntervalsOverlap };

export { appointmentClinicDateKey, appointmentClinicTimeParts, appointmentEndMinute, appointmentStartMinute, appointmentWithinClinicScheduleDefaults, appointmentWithinStaffSchedule, workingHoursDailyCapacityMinutes, appointmentWithinChairSchedule, appointmentWithinClinicSchedule, appointmentWithinPatientPreference, clinicDailyCapacityMinutes, clinicTodayIso };
