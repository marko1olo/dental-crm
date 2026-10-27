/**
 * slotAvailabilityFilters.ts — Fast scanner for continuous free slots across chairs and doctors.
 */

import { areIntervalsOverlapping } from "@dental/shared";
import type { DayFreeSlots, DoctorFreeSlot, FindDoctorFreeSlotsParams } from "./freeSlotsTypes";
import { formatRussianDayHeader, getTimeOfDayCategory } from "./intervalIntersectionMath";

interface ParsedDayAppt {
	doctorUserId?: string | null;
	chairId?: string | null;
	startMs: number;
	endMs: number;
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

		const parsedDayAppts: ParsedDayAppt[] = dayAppts.map((a) => {
			const aStart = new Date(a.startsAt || 0).getTime();
			const fallbackMin = (a as { durationMinutes?: number }).durationMinutes ? Number((a as { durationMinutes?: number }).durationMinutes) : 30;
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

			const startIso = `${dateKey}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00Z`;
			const endIso = `${dateKey}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00Z`;
			const startMs = new Date(startIso).getTime();
			const endMs = new Date(endIso).getTime();

			const hasDoctorConflict = doctorId ? parsedDayAppts.some((a) => a.doctorUserId === doctorId && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs)) : false;
			if (hasDoctorConflict) continue;

			const availableChair = targetChairs.find((chair) => !parsedDayAppts.some((a) => a.chairId === chair.id && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs)));
			if (!availableChair) continue;

			const timeStartStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
			const timeEndStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
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
