/**
 * freeIntervalsEngine.ts — Алгоритм быстрого поиска свободных окон расписания.
 * Parity with DentalPRO appointmentsFreeIntervals & IDENT IDENT_Intervals.
 *
 * Implements multi-day scanning, doctor/chair resolution, working hours,
 * break collisions, and 1-click slot booking payload generation.
 */

export interface WorkingHoursConfig {
	startHour?: number; // default 9
	endHour?: number;   // default 20
	stepMinutes?: number; // default 15
	workingDays?: readonly number[]; // e.g. [1, 2, 3, 4, 5, 6] (1=Mon..6=Sat, 0=Sun). Default: [1,2,3,4,5,6]
	breakIntervals?: readonly { startTime: string; endTime: string }[];
}

export interface FindFreeScheduleIntervalsParams {
	doctorId?: string | null | undefined;
	chairId?: string | null | undefined;
	dateFrom: string; // YYYY-MM-DD
	dateTo?: string | null | undefined; // YYYY-MM-DD
	durationMinutes: number; // e.g. 15, 30, 45, 60, 90, 120
	existingAppointments: readonly any[];
	chairs?: readonly { id: string; name: string; active?: boolean }[];
	doctors?: readonly { id: string; fullName: string; active?: boolean; specialties?: string[] }[];
	workingHours?: WorkingHoursConfig;
	timeOfDayFilter?: "all" | "morning" | "day" | "evening";
}

export interface FreeScheduleInterval {
	date: string; // YYYY-MM-DD
	startTime: string; // "10:00"
	endTime: string;   // "11:30"
	startsAtIso: string;
	endsAtIso: string;
	timeDisplay: string; // "10:00 – 11:30"
	durationMinutes: number;
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	chairId?: string | undefined;
	chairName?: string | undefined;
	timeOfDay: "morning" | "day" | "evening";
}

export function getTimeOfDayCategory(hour: number): "morning" | "day" | "evening" {
	if (hour < 12) return "morning";
	if (hour < 16) return "day";
	return "evening";
}

function parseTimeStringToMinutes(raw?: string | null): number {
	if (!raw) return 0;
	if (raw.includes("T")) {
		const timePart = raw.split("T")[1]?.slice(0, 5) || "00:00";
		const [h = 0, m = 0] = timePart.split(":").map(Number);
		return (h ?? 0) * 60 + (m ?? 0);
	}
	const [h = 0, m = 0] = raw.slice(0, 5).split(":").map(Number);
	return (h ?? 0) * 60 + (m ?? 0);
}

function formatMinutesToTime(totalMin: number): string {
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Rapidly finds free contiguous time intervals in clinic schedule across specified dates.
 */
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
	} = params;

	if (!dateFrom || durationMinutes <= 0) {
		return [];
	}

	const startHour = workingHours.startHour ?? 9;
	const endHour = workingHours.endHour ?? 20;
	const stepMinutes = workingHours.stepMinutes ?? 15;
	const workingDays = workingHours.workingDays ?? [1, 2, 3, 4, 5, 6]; // Default Mon-Sat
	const breakIntervals = (workingHours.breakIntervals ?? []).map((b) => ({
		startMin: parseTimeStringToMinutes(b.startTime),
		endMin: parseTimeStringToMinutes(b.endTime),
	}));

	const activeChairs = chairs.filter((c) => c.active !== false);
	const defaultChair = activeChairs[0] ?? { id: "chair-1", name: "Кабинет 1" };
	const activeDoctors = doctors.filter((d) => d.active !== false);

	// Pre-filter valid appointments
	const activeAppointments = existingAppointments.filter((a) => {
		const s = a?.status;
		return s !== "cancelled" && s !== "no_show";
	});

	// Parse date boundaries
	const fromObj = new Date(`${dateFrom}T00:00:00`);
	const toObj = new Date(`${dateTo}T00:00:00`);
	if (Number.isNaN(fromObj.getTime()) || Number.isNaN(toObj.getTime())) {
		return [];
	}

	// Limit to max 60 days scan for safety
	const diffDays = Math.min(60, Math.max(0, Math.round((toObj.getTime() - fromObj.getTime()) / 86400000)));

	const results: FreeScheduleInterval[] = [];

	for (let d = 0; d <= diffDays; d++) {
		const dayObj = new Date(fromObj);
		dayObj.setDate(fromObj.getDate() + d);
		const dayOfWeek = dayObj.getDay();

		if (workingDays.length > 0 && !workingDays.includes(dayOfWeek)) {
			continue; // Day off
		}

		const yyyy = dayObj.getFullYear();
		const mm = String(dayObj.getMonth() + 1).padStart(2, "0");
		const dd = String(dayObj.getDate()).padStart(2, "0");
		const dateKey = `${yyyy}-${mm}-${dd}`;

		// Pre-filter day appointments and convert to minute ranges
		const dayAppts = activeAppointments
			.filter((a) => {
				const raw = a.startsAt || a.startTime || a.startAt || "";
				return typeof raw === "string" && raw.slice(0, 10) === dateKey;
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

			// Check time-of-day filter
			const tod = getTimeOfDayCategory(startH);
			if (timeOfDayFilter !== "all" && tod !== timeOfDayFilter) {
				continue;
			}

			// Check break collision
			const hasBreak = breakIntervals.some((b) => startMin < b.endMin && endMin > b.startMin);
			if (hasBreak) {
				continue;
			}

			// Determine doctor availability
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
				// Any doctor: find first available doctor
				const freeDoctor = activeDoctors.find((doc) => {
					const conflict = dayAppts.some(
						(a) => a.doctorUserId === doc.id && startMin < a.endMin && endMin > a.startMin,
					);
					return !conflict;
				});
				if (!freeDoctor) {
					continue; // All doctors busy
				}
				assignedDoctorId = freeDoctor.id;
				assignedDoctorName = freeDoctor.fullName;
			}

			// Determine chair availability
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
				// Any chair: find first available chair
				const freeChair = (activeChairs.length > 0 ? activeChairs : [defaultChair]).find((chair) => {
					const conflict = dayAppts.some(
						(a) => a.chairId === chair.id && startMin < a.endMin && endMin > a.startMin,
					);
					return !conflict;
				});
				if (!freeChair) {
					continue; // All chairs occupied
				}
				assignedChairId = freeChair.id;
				assignedChairName = freeChair.name;
			}

			const startTimeStr = formatMinutesToTime(startMin);
			const endTimeStr = formatMinutesToTime(endMin);
			const startsAtIso = `${dateKey}T${startTimeStr}:00Z`;
			const endsAtIso = `${dateKey}T${endTimeStr}:00Z`;

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
