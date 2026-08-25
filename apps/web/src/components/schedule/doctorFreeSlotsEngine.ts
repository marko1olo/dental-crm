/**
 * doctorFreeSlotsEngine.ts — Алгоритм быстрого поиска свободных окон у врача на 7–14 дней вперед.
 */

import type { Appointment } from "@dental/shared";

export type TimeOfDayFilter = "all" | "morning" | "day" | "evening";

export interface DoctorFreeSlot {
	date: string; // YYYY-MM-DD
	startsAtIso: string;
	endsAtIso: string;
	timeDisplay: string; // "10:00 - 11:00"
	startTime: string;   // "10:00"
	endTime: string;     // "11:00"
	durationMinutes: number;
	doctorId: string;
	chairId: string;
	chairName: string;
	timeOfDay: "morning" | "day" | "evening";
}

export interface DoctorBreakInterval {
	startTime: string; // "13:00"
	endTime: string;   // "14:00"
}

export interface DayFreeSlots {
	date: string;
	dateFormatted: string; // "25 авг, Пн"
	dayOfWeek: string;
	isDayOff?: boolean | undefined;
	dayOffReason?: string | undefined;
	slots: DoctorFreeSlot[];
}

export interface FindDoctorFreeSlotsParams {
	doctorId?: string | null | undefined;
	startDate: string; // YYYY-MM-DD
	horizonDays?: number | undefined; // 7 or 14
	durationMinutes?: number | undefined; // 30, 45, 60, 90, 120
	timeOfDayFilter?: TimeOfDayFilter | undefined;
	appointments: readonly Appointment[];
	chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	clinicStartHour?: number | undefined; // default 9
	clinicEndHour?: number | undefined;   // default 20
	stepMinutes?: number | undefined;     // default 30
	workingDays?: readonly number[] | undefined; // 0 (Sun) - 6 (Sat). Default [1, 2, 3, 4, 5, 6] (Mon-Sat)
	breakIntervals?: readonly DoctorBreakInterval[] | undefined; // e.g. [{ startTime: "13:00", endTime: "14:00" }]
}

export function getTimeOfDayCategory(hour: number): "morning" | "day" | "evening" {
	if (hour < 12) return "morning";
	if (hour < 16) return "day";
	return "evening";
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

/**
 * Сканирует расписание клиники и находит все свободные непрерывные интервалы заданной длительности.
 */
export function findDoctorFreeSlots(params: FindDoctorFreeSlotsParams): DayFreeSlots[] {
	const {
		doctorId,
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
		breakIntervals = [],
	} = params;

	const activeChairs = chairs.filter((c) => c.active !== false);
	const defaultChair = activeChairs[0] || { id: "chair-1", name: "Кабинет 1" };

	const activeAppointments = appointments.filter(
		(a) => a.status !== "cancelled" && a.status !== "no_show",
	);

	const result: DayFreeSlots[] = [];
	const startObj = new Date(`${startDate}T00:00:00`);

	for (let d = 0; d < horizonDays; d++) {
		const currentDay = new Date(startObj);
		currentDay.setDate(startObj.getDate() + d);
		const dayOfWeekNum = currentDay.getDay(); // 0 = Sun, 1 = Mon ...
		const yyyy = currentDay.getFullYear();
		const mm = String(currentDay.getMonth() + 1).padStart(2, "0");
		const dd = String(currentDay.getDate()).padStart(2, "0");
		const dateKey = `${yyyy}-${mm}-${dd}`;
		const { dateFormatted, dayOfWeek } = formatRussianDayHeader(dateKey);

		// Check if the doctor has a day off on this day of week
		if (workingDays && workingDays.length > 0 && !workingDays.includes(dayOfWeekNum)) {
			result.push({
				date: dateKey,
				dateFormatted,
				dayOfWeek,
				isDayOff: true,
				dayOffReason: "Выходной день врача",
				slots: [],
			});
			continue;
		}

		const daySlots: DoctorFreeSlot[] = [];

		// Filter appointments for this date
		const dayAppts = activeAppointments.filter((a) => {
			const apptDate = a.startsAt.slice(0, 10);
			return apptDate === dateKey;
		});

		// Iterate time slots
		const totalDayMinutes = (clinicEndHour - clinicStartHour) * 60;
		for (let offset = 0; offset + durationMinutes <= totalDayMinutes; offset += stepMinutes) {
			const startTotalMin = clinicStartHour * 60 + offset;
			const endTotalMin = startTotalMin + durationMinutes;

			const startH = Math.floor(startTotalMin / 60);
			const startM = startTotalMin % 60;
			const endH = Math.floor(endTotalMin / 60);
			const endM = endTotalMin % 60;

			const timeCategory = getTimeOfDayCategory(startH);
			if (timeOfDayFilter !== "all" && timeCategory !== timeOfDayFilter) {
				continue;
			}

			// Check doctor break collisions (e.g. 13:00 - 14:00)
			const hasBreakConflict = breakIntervals.some((b) => {
				const [bStartH, bStartM] = b.startTime.split(":").map(Number);
				const [bEndH, bEndM] = b.endTime.split(":").map(Number);
				const bStartTotal = (bStartH ?? 0) * 60 + (bStartM ?? 0);
				const bEndTotal = (bEndH ?? 0) * 60 + (bEndM ?? 0);
				return startTotalMin < bEndTotal && endTotalMin > bStartTotal;
			});

			if (hasBreakConflict) {
				continue;
			}

			const startIso = `${dateKey}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00Z`;
			const endIso = `${dateKey}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00Z`;
			const startMs = new Date(startIso).getTime();
			const endMs = new Date(endIso).getTime();

			// Check doctor collision
			const hasDoctorConflict = doctorId
				? dayAppts.some((a) => {
						if (a.doctorUserId !== doctorId) return false;
						const aStart = new Date(a.startsAt).getTime();
						const aEnd = new Date(a.endsAt).getTime();
						return startMs < aEnd && endMs > aStart;
					})
				: false;

			if (hasDoctorConflict) {
				continue;
			}

			// Find available chair
			const availableChair = activeChairs.find((chair) => {
				const hasChairConflict = dayAppts.some((a) => {
					if (a.chairId !== chair.id) return false;
					const aStart = new Date(a.startsAt).getTime();
					const aEnd = new Date(a.endsAt).getTime();
					return startMs < aEnd && endMs > aStart;
				});
				return !hasChairConflict;
			}) || defaultChair;

			// Check if any chair is free if doctor is specified, or check chair availability
			const chairConflict = dayAppts.some((a) => {
				if (a.chairId !== availableChair.id) return false;
				const aStart = new Date(a.startsAt).getTime();
				const aEnd = new Date(a.endsAt).getTime();
				return startMs < aEnd && endMs > aStart;
			});

			if (!chairConflict) {
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
		}

		result.push({
			date: dateKey,
			dateFormatted,
			dayOfWeek,
			isDayOff: false,
			slots: daySlots,
		});
	}

	return result;
}

export interface ChairDailyOccupancyStats {
	readonly chairId: string;
	readonly chairName: string;
	readonly appointmentsCount: number;
	readonly completedCount: number;
	readonly totalDurationMinutes: number;
	readonly occupancyPercent: number; // e.g. 75 (%)
	readonly totalRevenueRub: number;
	readonly activeDoctorIds: readonly string[];
	readonly activeDoctorNames: readonly string[];
}

export interface DoctorDailyOccupancyStats {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly appointmentsCount: number;
	readonly totalDurationMinutes: number;
	readonly occupancyPercent: number;
	readonly totalRevenueRub: number;
	readonly chairsUsed: readonly string[];
}

export interface DailyScheduleTallySummary {
	readonly date: string;
	readonly totalAppointmentsCount: number;
	readonly totalDurationMinutes: number;
	readonly totalClinicCapacityMinutes: number;
	readonly clinicOccupancyPercent: number;
	readonly totalRevenueRub: number;
	readonly chairs: readonly ChairDailyOccupancyStats[];
	readonly doctors: readonly DoctorDailyOccupancyStats[];
}

/**
 * Calculates fast daily chair and doctor occupancy statistics, visit counts, and estimated revenue.
 */
export function calculateDailyChairDoctorTally(params: {
	dateKey: string;
	appointments: readonly Appointment[];
	chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	doctors?: readonly { id: string; fullName?: string | undefined; name?: string | undefined }[] | undefined;
	invoices?: readonly { appointmentId?: string | null | undefined; amountRub?: number | undefined; totalRub?: number | undefined; status?: string | undefined }[] | undefined;
	clinicStartHour?: number | undefined; // default 9
	clinicEndHour?: number | undefined;   // default 20
}): DailyScheduleTallySummary {
	const {
		dateKey,
		appointments,
		chairs,
		doctors = [],
		invoices = [],
		clinicStartHour = 9,
		clinicEndHour = 20,
	} = params;

	const activeChairs = chairs.filter((c) => c.active !== false);
	const totalOperatingHours = Math.max(1, clinicEndHour - clinicStartHour);
	const maxChairCapacityMinutes = totalOperatingHours * 60;
	const totalClinicCapacityMinutes = Math.max(1, activeChairs.length * maxChairCapacityMinutes);

	// Filter appointments for this date
	const dayAppts = appointments.filter((a) => {
		const apptDate = a.startsAt.slice(0, 10);
		return apptDate === dateKey && a.status !== "cancelled" && a.status !== "no_show";
	});

	// Build map of invoice revenues by appointmentId
	const invoiceRevenueByAppt = new Map<string, number>();
	for (const inv of invoices) {
		if (inv.appointmentId && inv.status !== "voided" && inv.status !== "cancelled") {
			const current = invoiceRevenueByAppt.get(inv.appointmentId) || 0;
			invoiceRevenueByAppt.set(inv.appointmentId, current + (inv.totalRub ?? inv.amountRub ?? 0));
		}
	}

	let totalAppointmentsCount = 0;
	let totalDurationMinutes = 0;
	let totalRevenueRub = 0;

	// Calculate per chair
	const chairStats: ChairDailyOccupancyStats[] = activeChairs.map((chair) => {
		const chairAppts = dayAppts.filter((a) => a.chairId === chair.id);
		let chairDurationMin = 0;
		let chairRevenue = 0;
		let completedCount = 0;
		const docIdSet = new Set<string>();

		for (const a of chairAppts) {
			const sMs = new Date(a.startsAt).getTime();
			const eMs = new Date(a.endsAt).getTime();
			const durMin = Math.max(0, Math.round((eMs - sMs) / 60000));
			chairDurationMin += durMin;

			if (a.doctorUserId) docIdSet.add(a.doctorUserId);
			if (a.status === "completed") completedCount++;

			// Estimate or sum real revenue
			const invSum = invoiceRevenueByAppt.get(a.id);
			if (invSum !== undefined) {
				chairRevenue += invSum;
			} else {
				chairRevenue += durMin > 0 ? durMin * 50 : 2500;
			}
		}

		totalAppointmentsCount += chairAppts.length;
		totalDurationMinutes += chairDurationMin;
		totalRevenueRub += chairRevenue;

		const occupancyPercent = Math.min(
			100,
			Math.round((chairDurationMin / maxChairCapacityMinutes) * 100),
		);

		const activeDoctorNames = Array.from(docIdSet).map((dId) => {
			const doc = doctors.find((d) => d.id === dId);
			return doc?.fullName || doc?.name || dId;
		});

		return {
			chairId: chair.id,
			chairName: chair.name,
			appointmentsCount: chairAppts.length,
			completedCount,
			totalDurationMinutes: chairDurationMin,
			occupancyPercent,
			totalRevenueRub: chairRevenue,
			activeDoctorIds: Array.from(docIdSet),
			activeDoctorNames,
		};
	});

	// Calculate per doctor
	const doctorStatsMap = new Map<string, { count: number; durMin: number; revenue: number; chairs: Set<string> }>();
	for (const a of dayAppts) {
		const dId = a.doctorUserId || "unassigned";
		const current = doctorStatsMap.get(dId) || { count: 0, durMin: 0, revenue: 0, chairs: new Set() };
		const sMs = new Date(a.startsAt).getTime();
		const eMs = new Date(a.endsAt).getTime();
		const durMin = Math.max(0, Math.round((eMs - sMs) / 60000));
		current.count++;
		current.durMin += durMin;
		if (a.chairId) current.chairs.add(a.chairId);

		const invSum = invoiceRevenueByAppt.get(a.id);
		current.revenue += invSum !== undefined ? invSum : (durMin > 0 ? durMin * 50 : 2500);
		doctorStatsMap.set(dId, current);
	}

	const doctorStats: DoctorDailyOccupancyStats[] = Array.from(doctorStatsMap.entries()).map(([dId, data]) => {
		const doc = doctors.find((d) => d.id === dId);
		const dName = doc?.fullName || doc?.name || (dId === "unassigned" ? "Не назначен" : dId);
		return {
			doctorId: dId,
			doctorName: dName,
			appointmentsCount: data.count,
			totalDurationMinutes: data.durMin,
			occupancyPercent: Math.min(100, Math.round((data.durMin / maxChairCapacityMinutes) * 100)),
			totalRevenueRub: data.revenue,
			chairsUsed: Array.from(data.chairs),
		};
	});

	const clinicOccupancyPercent = Math.min(
		100,
		Math.round((totalDurationMinutes / totalClinicCapacityMinutes) * 100),
	);

	return {
		date: dateKey,
		totalAppointmentsCount,
		totalDurationMinutes,
		totalClinicCapacityMinutes,
		clinicOccupancyPercent,
		totalRevenueRub,
		chairs: chairStats,
		doctors: doctorStats,
	};
}

export interface FindNextDoctorFreeSlotParams {
	readonly doctorId?: string | null | undefined;
	readonly referenceDate?: string | undefined; // YYYY-MM-DD (default: today)
	readonly daysOffset: number; // e.g. 7 (+7 days), 14 (+14 days), 30 (+1 month)
	readonly durationMinutes?: number | undefined; // default: 60
	readonly appointments: readonly Appointment[];
	readonly chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	readonly clinicStartHour?: number | undefined;
	readonly clinicEndHour?: number | undefined;
	readonly stepMinutes?: number | undefined;
	readonly workingDays?: readonly number[] | undefined;
	readonly breakIntervals?: readonly DoctorBreakInterval[] | undefined;
	readonly timeOfDayFilter?: TimeOfDayFilter | undefined;
	readonly maxScanDaysAhead?: number | undefined; // default 14 days
}

/**
 * 1-Click Fast Re-booking algorithm:
 * Instantly finds the nearest free slot at the doctor starting from referenceDate + daysOffset (e.g. 7 days, 14 days, 30 days).
 */
export function findNextDoctorFreeSlotAfterDays(
	params: FindNextDoctorFreeSlotParams,
): DoctorFreeSlot | null {
	const refDateStr = params.referenceDate || new Date().toISOString().slice(0, 10);
	const refDate = new Date(`${refDateStr}T00:00:00`);
	refDate.setDate(refDate.getDate() + params.daysOffset);

	const yyyy = refDate.getFullYear();
	const mm = String(refDate.getMonth() + 1).padStart(2, "0");
	const dd = String(refDate.getDate()).padStart(2, "0");
	const startDateStr = `${yyyy}-${mm}-${dd}`;

	const days = findDoctorFreeSlots({
		doctorId: params.doctorId,
		startDate: startDateStr,
		horizonDays: params.maxScanDaysAhead ?? 14,
		durationMinutes: params.durationMinutes ?? 60,
		timeOfDayFilter: params.timeOfDayFilter ?? "all",
		appointments: params.appointments,
		chairs: params.chairs,
		clinicStartHour: params.clinicStartHour ?? 9,
		clinicEndHour: params.clinicEndHour ?? 20,
		stepMinutes: params.stepMinutes ?? 30,
		workingDays: params.workingDays,
		breakIntervals: params.breakIntervals,
	});

	for (const day of days) {
		if (day.isDayOff || day.slots.length === 0) continue;
		const firstSlot = day.slots[0];
		if (firstSlot) return firstSlot;
	}

	return null;
}

export interface QuickRepeatSlotsResult {
	readonly slot7Days: DoctorFreeSlot | null;
	readonly slot14Days: DoctorFreeSlot | null;
	readonly slot30Days: DoctorFreeSlot | null;
}

/**
 * 1-Click Re-booking presets calculation (+7 days, +14 days, +1 month / 30 days)
 * for the same doctor with single-pass evaluation.
 */
export function findQuickRepeatSlotsForDoctor(params: {
	readonly doctorId?: string | null | undefined;
	readonly referenceDate?: string | undefined;
	readonly durationMinutes?: number | undefined;
	readonly appointments: readonly Appointment[];
	readonly chairs: readonly { id: string; name: string; active?: boolean | undefined }[];
	readonly clinicStartHour?: number | undefined;
	readonly clinicEndHour?: number | undefined;
	readonly stepMinutes?: number | undefined;
	readonly workingDays?: readonly number[] | undefined;
	readonly breakIntervals?: readonly DoctorBreakInterval[] | undefined;
}): QuickRepeatSlotsResult {
	const slot7Days = findNextDoctorFreeSlotAfterDays({ ...params, daysOffset: 7 });
	const slot14Days = findNextDoctorFreeSlotAfterDays({ ...params, daysOffset: 14 });
	const slot30Days = findNextDoctorFreeSlotAfterDays({ ...params, daysOffset: 30 });

	return {
		slot7Days,
		slot14Days,
		slot30Days,
	};
}
