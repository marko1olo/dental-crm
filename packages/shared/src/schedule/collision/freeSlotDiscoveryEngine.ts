import type {
	DoctorShiftSchedule,
	FreeSlotInterval,
	ScheduledAppointment,
} from "./collisionSchemas.js";
import { calculateEmergencyReserveSlots } from "./overlapAndReserveEngine.js";

// ─── 5. FREE SLOT INTERVALS DISCOVERY ─────────────────────────────────────────

export interface FreeSlotDiscoveryOptions {
	readonly minDurationMinutes?: number;
	readonly excludeEmergencyReserves?: boolean;
}

/**
 * Finds available free slot intervals within a doctor's shift by subtracting
 * booked appointments, breaks, and emergency reserves.
 */
export function findAvailableSlots(
	shift: DoctorShiftSchedule,
	appointments: readonly ScheduledAppointment[],
	options: FreeSlotDiscoveryOptions = {},
): FreeSlotInterval[] {
	const { minDurationMinutes = 30, excludeEmergencyReserves = true } = options;

	const shiftStart = new Date(shift.startTime).getTime();
	const shiftEnd = new Date(shift.endTime).getTime();

	if (shiftEnd <= shiftStart) return [];

	interface BlockedSpan {
		start: number;
		end: number;
	}

	const busySpans: BlockedSpan[] = [];

	// 1. Shift break
	if (shift.breakStartTime && shift.breakEndTime) {
		const bStart = new Date(shift.breakStartTime).getTime();
		const bEnd = new Date(shift.breakEndTime).getTime();
		if (bEnd > bStart) {
			busySpans.push({ start: bStart, end: bEnd });
		}
	}

	// 2. Existing appointments for this doctor
	for (const apt of appointments) {
		if (apt.doctorId !== shift.doctorId) continue;
		if (apt.status === "cancelled" || apt.status === "no_show") continue;

		const aStart = new Date(apt.startTime).getTime();
		const aEnd = new Date(apt.endTime).getTime();

		const clampedStart = Math.max(shiftStart, aStart);
		const clampedEnd = Math.min(shiftEnd, aEnd);

		if (clampedEnd > clampedStart) {
			busySpans.push({ start: clampedStart, end: clampedEnd });
		}
	}

	// 3. Emergency reserve buffer
	const reserveMinutes = shift.emergencyReserveMinutes ?? 30;
	if (excludeEmergencyReserves && shift.isEmergencyReserveEnabled && reserveMinutes > 0) {
		const reserveMs = reserveMinutes * 60000;
		const rStart = Math.max(shiftStart, shiftEnd - reserveMs);
		busySpans.push({ start: rStart, end: shiftEnd });
	}

	// Merge overlapping busy intervals
	if (busySpans.length === 0) {
		const durationMin = Math.round((shiftEnd - shiftStart) / 60000);
		return [
			{
				startTime: new Date(shiftStart).toISOString(),
				endTime: new Date(shiftEnd).toISOString(),
				durationMinutes: durationMin,
				doctorId: shift.doctorId,
				cabinetId: shift.cabinetId,
				qualifiesForTargetDuration: durationMin >= minDurationMinutes,
			},
		];
	}

	busySpans.sort((a, b) => a.start - b.start);
	const mergedBusy: BlockedSpan[] = [];
	const firstSpan = busySpans[0];
	if (!firstSpan) return [];
	let current = { ...firstSpan };

	for (let i = 1; i < busySpans.length; i++) {
		const next = busySpans[i];
		if (!next) continue;
		if (next.start <= current.end) {
			current.end = Math.max(current.end, next.end);
		} else {
			mergedBusy.push(current);
			current = { ...next };
		}
	}
	mergedBusy.push(current);

	// Compute complement (free spans)
	const freeIntervals: FreeSlotInterval[] = [];
	let cursor = shiftStart;

	for (const b of mergedBusy) {
		if (b.start > cursor) {
			const dur = Math.round((b.start - cursor) / 60000);
			if (dur > 0) {
				freeIntervals.push({
					startTime: new Date(cursor).toISOString(),
					endTime: new Date(b.start).toISOString(),
					durationMinutes: dur,
					doctorId: shift.doctorId,
					cabinetId: shift.cabinetId,
					qualifiesForTargetDuration: dur >= minDurationMinutes,
				});
			}
		}
		cursor = Math.max(cursor, b.end);
	}

	if (cursor < shiftEnd) {
		const dur = Math.round((shiftEnd - cursor) / 60000);
		if (dur > 0) {
			freeIntervals.push({
				startTime: new Date(cursor).toISOString(),
				endTime: new Date(shiftEnd).toISOString(),
				durationMinutes: dur,
				doctorId: shift.doctorId,
				cabinetId: shift.cabinetId,
				qualifiesForTargetDuration: dur >= minDurationMinutes,
			});
		}
	}

	return freeIntervals;
}

// ─── 6. CANONICAL TIMEZONE HELPERS & FREE SLOTS SCANNER ──────────────────────

export function timeZoneOffsetMinutes(
	timeZone: string | null | undefined,
	at: Date,
): number {
	if (!timeZone || timeZone === "UTC" || timeZone === "GMT") return 0;
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			timeZoneName: "shortOffset",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		}).formatToParts(at);
		const value =
			parts.find((part) => part.type === "timeZoneName")?.value ?? "";
		if (value === "GMT" || value === "UTC") return 0;
		const match = /(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/.exec(value);
		if (!match) return 0;
		const sign = match[1] === "-" ? -1 : 1;
		return sign * (Number(match[2]) * 60 + Number(match[3] ?? "0"));
	} catch {
		return 0;
	}
}

export function timeZoneOffsetSuffix(offsetMinutes: number): string {
	const sign = offsetMinutes < 0 ? "-" : "+";
	const absolute = Math.abs(offsetMinutes);
	const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
	const minutes = String(absolute % 60).padStart(2, "0");
	return `${sign}${hours}:${minutes}`;
}

export function buildZonedIsoString(
	dateKey: string,
	timeStr: string,
	timeZone?: string | null,
): string {
	const cleanDate = dateKey.slice(0, 10);
	const [hStr = "00", mStr = "00"] = timeStr.slice(0, 5).split(":");
	const h = Number(hStr) || 0;
	const m = Number(mStr) || 0;
	const padH = String(h).padStart(2, "0");
	const padM = String(m).padStart(2, "0");

	if (!timeZone || timeZone === "UTC" || timeZone === "GMT") {
		return `${cleanDate}T${padH}:${padM}:00.000Z`;
	}

	const [yStr, monStr, dStr] = cleanDate.split("-");
	const year = Number(yStr) || 2026;
	const month = Number(monStr) || 1;
	const day = Number(dStr) || 1;

	const utcGuess = new Date(Date.UTC(year, month - 1, day, h, m, 0));
	let offsetMinutes = timeZoneOffsetMinutes(timeZone, utcGuess);
	const correctedInstant = new Date(utcGuess.getTime() - offsetMinutes * 60_000);
	const correctedOffsetMinutes = timeZoneOffsetMinutes(timeZone, correctedInstant);
	if (correctedOffsetMinutes !== offsetMinutes) {
		offsetMinutes = correctedOffsetMinutes;
	}

	return new Date(utcGuess.getTime() - offsetMinutes * 60_000).toISOString();
}

export type TimeOfDayFilter = "all" | "morning" | "day" | "evening";

export function getTimeOfDayCategory(hour: number): "morning" | "day" | "evening" {
	if (hour < 12) return "morning";
	if (hour < 16) return "day";
	return "evening";
}

export function parseTimeStringToMinutes(raw?: string | Date | null): number {
	if (!raw) return 0;
	const str = typeof raw === "string" ? raw : raw.toISOString();
	if (str.includes("T")) {
		const timePart = str.split("T")[1]?.slice(0, 5) || "00:00";
		const [h = 0, m = 0] = timePart.split(":").map(Number);
		return (h ?? 0) * 60 + (m ?? 0);
	}
	const [h = 0, m = 0] = str.slice(0, 5).split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

export function formatMinutesToTime(totalMin: number): string {
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
