import type { ScheduledAppointment } from "./collisionSchemas.js";
import { areIntervalsOverlapping, type ScheduleOverlapItem } from "./overlapAndReserveEngine.js";
import {
	buildZonedIsoString,
	formatMinutesToTime,
	getTimeOfDayCategory,
	parseTimeStringToMinutes,
	timeZoneOffsetMinutes,
	type TimeOfDayFilter,
} from "./freeSlotDiscoveryEngine.js";

export interface WorkingHoursConfig {
	startHour?: number;
	endHour?: number;
	stepMinutes?: number;
	workingDays?: readonly number[];
	breakIntervals?: readonly { startTime: string; endTime: string }[];
	timezone?: string | null;
}

export interface FindFreeScheduleIntervalsParams {
	doctorId?: string | null | undefined;
	chairId?: string | null | undefined;
	dateFrom: string;
	dateTo?: string | null | undefined;
	durationMinutes: number;
	existingAppointments: readonly ScheduleOverlapItem[];
	chairs?: readonly { id: string; name: string; active?: boolean }[];
	doctors?: readonly { id: string; fullName: string; active?: boolean; specialties?: string[] }[];
	workingHours?: WorkingHoursConfig;
	timeOfDayFilter?: "all" | "morning" | "day" | "evening";
	timezone?: string | null;
}

export interface FreeScheduleInterval {
	date: string;
	startTime: string;
	endTime: string;
	startsAtIso: string;
	endsAtIso: string;
	timeDisplay: string;
	durationMinutes: number;
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	chairId?: string | undefined;
	chairName?: string | undefined;
	timeOfDay: "morning" | "day" | "evening";
}

export function findFreeScheduleIntervals(
	params: FindFreeScheduleIntervalsParams,
): FreeScheduleInterval[] {
	const {
		doctorId,
		chairId,
		dateFrom,
		dateTo = dateFrom,
		durationMinutes,
		existingAppointments = [],
		chairs = [],
		doctors = [],
		workingHours = {},
		timeOfDayFilter = "all",
		timezone = workingHours.timezone ?? null,
	} = params;

	if (!dateFrom || durationMinutes <= 0) {
		return [];
	}

	const startHour = workingHours.startHour ?? 9;
	const endHour = workingHours.endHour ?? 20;
	const stepMinutes = workingHours.stepMinutes ?? 15;
	const workingDays = workingHours.workingDays ?? [1, 2, 3, 4, 5, 6];
	const breakIntervals = (workingHours.breakIntervals ?? []).map((b) => ({
		startMin: parseTimeStringToMinutes(b.startTime),
		endMin: parseTimeStringToMinutes(b.endTime),
	}));

	const activeChairs = chairs.filter((c) => c.active !== false);
	const defaultChair = activeChairs[0] ?? { id: "chair-1", name: "Кабинет 1" };
	const activeDoctors = doctors.filter((d) => d.active !== false);

	const activeAppointments = existingAppointments.filter((a) => {
		const s = a?.status;
		return s !== "cancelled" && s !== "no_show";
	});

	const fromObj = new Date(`${dateFrom}T00:00:00`);
	const toObj = new Date(`${dateTo}T00:00:00`);
	if (Number.isNaN(fromObj.getTime()) || Number.isNaN(toObj.getTime())) {
		return [];
	}

	const diffDays = Math.min(60, Math.max(0, Math.round((toObj.getTime() - fromObj.getTime()) / 86400000)));
	const results: FreeScheduleInterval[] = [];

	for (let d = 0; d <= diffDays; d++) {
		const dayObj = new Date(fromObj);
		dayObj.setDate(fromObj.getDate() + d);
		const dayOfWeek = dayObj.getDay();

		if (workingDays.length > 0 && !workingDays.includes(dayOfWeek)) {
			continue;
		}

		const yyyy = dayObj.getFullYear();
		const mm = String(dayObj.getMonth() + 1).padStart(2, "0");
		const dd = String(dayObj.getDate()).padStart(2, "0");
		const dateKey = `${yyyy}-${mm}-${dd}`;

		const dayAppts = activeAppointments
			.filter((a) => {
				const raw = a.startsAt || a.startTime || a.startAt || "";
				const str = typeof raw === "string" ? raw : raw instanceof Date ? raw.toISOString() : "";
				return str.slice(0, 10) === dateKey;
			})
			.map((a) => {
				const startRaw = a.startsAt || a.startTime || a.startAt || "";
				const aStartMin = parseTimeStringToMinutes(startRaw);

				const aDur = Number(a.durationMinutes) || 30;
				let aEndMin = aStartMin + aDur;
				const endRaw = a.endsAt || a.endTime || "";
				if (endRaw) {
					aEndMin = parseTimeStringToMinutes(endRaw);
				}

				return {
					doctorUserId: a.doctorUserId || a.doctorId,
					chairId: a.chairId,
					startMin: aStartMin,
					endMin: aEndMin,
				};
			});

		const dayStartMin = startHour * 60;
		const dayEndMin = endHour * 60;

		for (let startMin = dayStartMin; startMin + durationMinutes <= dayEndMin; startMin += stepMinutes) {
			const endMin = startMin + durationMinutes;
			const startH = Math.floor(startMin / 60);

			const tod = getTimeOfDayCategory(startH);
			if (timeOfDayFilter !== "all" && tod !== timeOfDayFilter) {
				continue;
			}

			const hasBreak = breakIntervals.some((b) => startMin < b.endMin && endMin > b.startMin);
			if (hasBreak) {
				continue;
			}

			let assignedDoctorId = doctorId || undefined;
			let assignedDoctorName: string | undefined;

			if (doctorId) {
				const doctorConflict = dayAppts.some(
					(a) => a.doctorUserId === doctorId && startMin < a.endMin && endMin > a.startMin,
				);
				if (doctorConflict) {
					continue;
				}
				const doc = activeDoctors.find((d) => d.id === doctorId);
				if (doc) assignedDoctorName = doc.fullName;
			} else if (activeDoctors.length > 0) {
				const freeDoctor = activeDoctors.find((doc) => {
					const conflict = dayAppts.some(
						(a) => a.doctorUserId === doc.id && startMin < a.endMin && endMin > a.startMin,
					);
					return !conflict;
				});
				if (!freeDoctor) {
					continue;
				}
				assignedDoctorId = freeDoctor.id;
				assignedDoctorName = freeDoctor.fullName;
			}

			let assignedChairId = chairId || undefined;
			let assignedChairName: string | undefined;

			if (chairId) {
				const chairConflict = dayAppts.some(
					(a) => a.chairId === chairId && startMin < a.endMin && endMin > a.startMin,
				);
				if (chairConflict) {
					continue;
				}
				const ch = activeChairs.find((c) => c.id === chairId);
				assignedChairName = ch?.name ?? defaultChair.name;
			} else {
				const freeChair = (activeChairs.length > 0 ? activeChairs : [defaultChair]).find((chair) => {
					const conflict = dayAppts.some(
						(a) => a.chairId === chair.id && startMin < a.endMin && endMin > a.startMin,
					);
					return !conflict;
				});
				if (!freeChair) {
					continue;
				}
				assignedChairId = freeChair.id;
				assignedChairName = freeChair.name;
			}

			const startTimeStr = formatMinutesToTime(startMin);
			const endTimeStr = formatMinutesToTime(endMin);
			const startsAtIso = buildZonedIsoString(dateKey, startTimeStr, timezone);
			const endsAtIso = buildZonedIsoString(dateKey, endTimeStr, timezone);

			results.push({
				date: dateKey,
				startTime: startTimeStr,
				endTime: endTimeStr,
				startsAtIso,
				endsAtIso,
				timeDisplay: `${startTimeStr} – ${endTimeStr}`,
				durationMinutes,
				doctorId: assignedDoctorId,
				doctorName: assignedDoctorName,
				chairId: assignedChairId,
				chairName: assignedChairName,
				timeOfDay: tod,
			});
		}
	}

	return results;
}

export interface DoctorBreakInterval {
	startTime: string;
	endTime: string;
}

export interface DoctorFreeSlot {
	date: string;
	startsAtIso: string;
	endsAtIso: string;
	timeDisplay: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	doctorId: string;
	chairId: string;
	chairName: string;
	timeOfDay: "morning" | "day" | "evening";
}

export interface DayFreeSlots {
	date: string;
	dateFormatted: string;
	dayOfWeek: string;
	isDayOff?: boolean | undefined;
	dayOffReason?: string | undefined;
	slots: DoctorFreeSlot[];
}

export interface FindDoctorFreeSlotsParams {
	doctorId?: string | null | undefined;
	chairId?: string | null | undefined;
	startDate: string;
	horizonDays?: number | undefined;
	durationMinutes?: number | undefined;
	timeOfDayFilter?: TimeOfDayFilter | undefined;
	appointments: readonly ScheduleOverlapItem[];
	chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	clinicStartHour?: number | undefined;
	clinicEndHour?: number | undefined;
	stepMinutes?: number | undefined;
	workingDays?: readonly number[] | undefined;
	perDayWorkingHours?: Readonly<
		Record<number, { startHour: number; endHour: number }>
	> | undefined;
	breakIntervals?: readonly DoctorBreakInterval[] | undefined;
	timezone?: string | null | undefined;
}

export function formatRussianDayHeader(dateStr: string): { dateFormatted: string; dayOfWeek: string } {
	const dateObj = new Date(`${dateStr}T12:00:00Z`);
	const formatted = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "short",
		weekday: "short",
	});
	const parts = formatted.split(",");
	return {
		dateFormatted: formatted,
		dayOfWeek: parts[0]?.trim() || "",
	};
}

export function findDoctorFreeSlots(params: FindDoctorFreeSlotsParams): DayFreeSlots[] {
	const {
		doctorId,
		chairId,
		startDate,
		horizonDays = 7,
		durationMinutes = 60,
		timeOfDayFilter = "all",
		appointments,
		chairs,
		clinicStartHour = 9,
		clinicEndHour = 20,
		stepMinutes = 30,
		workingDays,
		perDayWorkingHours,
		breakIntervals = [],
		timezone = "UTC",
	} = params;

	const activeChairs = chairs.filter((c) => c.active !== false);
	const targetChairs = chairId ? activeChairs.filter((c) => c.id === chairId) : activeChairs;
	const hasRealChairs = (targetChairs[0] || activeChairs[0]) !== undefined;

	const activeAppointments = appointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");
	const result: DayFreeSlots[] = [];
	const startObj = new Date(`${startDate}T00:00:00`);

	for (let d = 0; d < horizonDays; d++) {
		const currentDay = new Date(startObj);
		currentDay.setDate(startObj.getDate() + d);
		const dayOfWeekNum = currentDay.getDay();
		const dateKey = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, "0")}-${String(currentDay.getDate()).padStart(2, "0")}`;
		const { dateFormatted, dayOfWeek } = formatRussianDayHeader(dateKey);

		if (!hasRealChairs) {
			result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: true, dayOffReason: "В клинике нет активных кресел", slots: [] });
			continue;
		}

		if (workingDays && !workingDays.includes(dayOfWeekNum)) {
			result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: true, dayOffReason: "Выходной день врача", slots: [] });
			continue;
		}

		const perDayWindow = perDayWorkingHours ? perDayWorkingHours[dayOfWeekNum] : undefined;
		if (perDayWorkingHours && (!perDayWindow || perDayWindow.endHour <= perDayWindow.startHour)) {
			result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: true, dayOffReason: "Врач не работает в этот день недели", slots: [] });
			continue;
		}

		const dayStartHour = perDayWindow ? Math.max(perDayWindow.startHour, clinicStartHour) : clinicStartHour;
		const dayEndHour = perDayWindow ? Math.min(perDayWindow.endHour, clinicEndHour) : clinicEndHour;

		const daySlots: DoctorFreeSlot[] = [];
		const dayAppts = activeAppointments.filter((a) => (typeof a.startsAt === "string" ? a.startsAt.slice(0, 10) : "") === dateKey);
		const parsedBreaks = breakIntervals.map((b) => {
			const [bStartH, bStartM] = b.startTime.split(":").map(Number);
			const [bEndH, bEndM] = b.endTime.split(":").map(Number);
			return { startMin: (bStartH ?? 0) * 60 + (bStartM ?? 0), endMin: (bEndH ?? 0) * 60 + (bEndM ?? 0) };
		});

		const parsedDayAppts = dayAppts.map((a) => {
			const aStart = new Date(a.startsAt || 0).getTime();
			const fallbackMin = a.durationMinutes ? Number(a.durationMinutes) : 30;
			const aEnd = a.endsAt && !Number.isNaN(new Date(a.endsAt).getTime()) ? new Date(a.endsAt).getTime() : aStart + (fallbackMin > 0 ? fallbackMin : 30) * 60000;
			return { doctorUserId: a.doctorUserId, chairId: a.chairId, startMs: aStart, endMs: aEnd };
		});

		const totalDayMinutes = (dayEndHour - dayStartHour) * 60;
		for (let offset = 0; offset + durationMinutes <= totalDayMinutes; offset += stepMinutes) {
			const startMin = dayStartHour * 60 + offset;
			const endMin = startMin + durationMinutes;
			const startH = Math.floor(startMin / 60);
			const startM = startMin % 60;
			const endH = Math.floor(endMin / 60);
			const endM = endMin % 60;

			const timeCategory = getTimeOfDayCategory(startH);
			if (timeOfDayFilter !== "all" && timeCategory !== timeOfDayFilter) continue;

			const hasBreak = parsedBreaks.some((b) => startMin < b.endMin && endMin > b.startMin);
			if (hasBreak) continue;

			const timeStartStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
			const timeEndStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

			const startIso = buildZonedIsoString(dateKey, timeStartStr, timezone);
			const endIso = buildZonedIsoString(dateKey, timeEndStr, timezone);
			const startMs = new Date(startIso).getTime();
			const endMs = new Date(endIso).getTime();

			const hasDoctorConflict = doctorId ? parsedDayAppts.some((a) => a.doctorUserId === doctorId && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs)) : false;
			if (hasDoctorConflict) continue;

			const availableChair = targetChairs.find((chair) => !parsedDayAppts.some((a) => a.chairId === chair.id && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs)));
			if (!availableChair) continue;

			daySlots.push({
				date: dateKey,
				startsAtIso: startIso,
				endsAtIso: endIso,
				startTime: timeStartStr,
				endTime: timeEndStr,
				timeDisplay: `${timeStartStr} – ${timeEndStr}`,
				durationMinutes,
				doctorId: doctorId || "",
				chairId: availableChair.id,
				chairName: availableChair.name,
				timeOfDay: timeCategory,
			});
		}

		result.push({ date: dateKey, dateFormatted, dayOfWeek, isDayOff: false, slots: daySlots });
	}

	return result;
}
