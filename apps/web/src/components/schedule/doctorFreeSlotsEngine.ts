/**
 * doctorFreeSlotsEngine.ts — Алгоритм быстрого поиска свободных окон у врача на 7–14 дней вперед.
 */

import {
	type Appointment,
	areIntervalsOverlapping,
	findFreeScheduleIntervals,
	type FreeScheduleInterval,
	type FindFreeScheduleIntervalsParams,
	findPreventiveInspectionCandidates,
	type PreventiveInspectionCandidate,
	type PreventiveInspectionCategory,
} from "@dental/shared";

export {
	findFreeScheduleIntervals,
	type FreeScheduleInterval,
	type FindFreeScheduleIntervalsParams,
	findPreventiveInspectionCandidates,
	type PreventiveInspectionCandidate,
	type PreventiveInspectionCategory,
};

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
	chairId?: string | null | undefined;
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
	perDayWorkingHours?: Readonly<
		Record<number, { startHour: number; endHour: number }>
	> | undefined; // точное окно врача на день недели из настроек сотрудника
	breakIntervals?: readonly DoctorBreakInterval[] | undefined; // e.g. [{ startTime: "13:00", endTime: "14:00" }]
}

export interface ClinicWorkingHoursWindow {
	clinicStartHour: number;
	clinicEndHour: number;
	workingDays?: number[] | undefined;
	perDayWorkingHours?: Record<number, { startHour: number; endHour: number }> | undefined;
}

function clockToHour(value: unknown): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(
		typeof value === "string" ? value.trim() : "",
	);
	if (!match) return null;
	const hour = Number(match[1]);
	return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

/**
 * Честное рабочее окно из реальных данных клиники, а не константа из головы:
 * расписание клиники берётся из настроек профиля (scheduleDefaults), а окно
 * выбранного врача — из его недельного графика в карточке сотрудника
 * (staff[].workingHours). Прежние вызовы передавали жёсткое 9:00–20:00, из-за
 * чего поиск свободных окон предлагал врачу часы, когда он физически не работает.
 */
export function deriveClinicWorkingHours(
	dashboard: unknown,
	doctorId?: string | null | undefined,
): ClinicWorkingHoursWindow {
	const settings = (
		dashboard as
			| { clinicSettings?: { profile?: unknown; staff?: unknown } | null }
			| null
			| undefined
	)?.clinicSettings;
	const profile = settings?.profile as
		| {
				scheduleDefaults?: {
					workdayStart?: string | null;
					workdayEnd?: string | null;
					workingDays?: number[] | null;
				} | null;
		  }
		| undefined;
	const parsedStart = clockToHour(profile?.scheduleDefaults?.workdayStart);
	const parsedEnd = clockToHour(profile?.scheduleDefaults?.workdayEnd);
	const clinicStartHour = parsedStart ?? 9;
	const clinicEndHour = parsedEnd && parsedEnd > clinicStartHour ? parsedEnd : 20;

	const result: ClinicWorkingHoursWindow = { clinicStartHour, clinicEndHour };
	const clinicWorkingDays = profile?.scheduleDefaults?.workingDays;
	if (Array.isArray(clinicWorkingDays) && clinicWorkingDays.length > 0) {
		result.workingDays = [...clinicWorkingDays];
	}

	if (!doctorId) return result;

	const staff = settings?.staff as
		| Array<{
				id?: string | null;
				workingHours?:
					| Array<{
							weekday?: number | null;
							enabled?: boolean | null;
							start?: string | null;
							end?: string | null;
					  }>
					| null;
		  }>
		| null
		| undefined;
	const doctor = staff?.find((member) => member?.id === doctorId);
	const doctorSchedule = doctor?.workingHours;
	if (!Array.isArray(doctorSchedule) || doctorSchedule.length === 0) {
		return result;
	}

	const perDay: Record<number, { startHour: number; endHour: number }> = {};
	for (const day of doctorSchedule) {
		if (!day || day.enabled === false) continue;
		const weekday = day.weekday;
		const dayStart = clockToHour(day.start);
		const dayEnd = clockToHour(day.end);
		if (
			typeof weekday !== "number" ||
			!Number.isInteger(weekday) ||
			weekday < 0 ||
			weekday > 6 ||
			dayStart === null ||
			dayEnd === null ||
			dayEnd <= dayStart
		) {
			continue;
		}
		perDay[weekday] = {
			startHour: Math.max(dayStart, clinicStartHour),
			endHour: Math.min(dayEnd, clinicEndHour),
		};
	}

	result.perDayWorkingHours = perDay;
	const configuredDays = Object.keys(perDay).map(Number);
	if (result.workingDays) {
		result.workingDays = result.workingDays.filter((d) => perDay[d] !== undefined);
	} else {
		result.workingDays = configuredDays;
	}
	return result;
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
	/*
	 * Честность слотов: свободные окна существуют только в реальных креслах
	 * клиники. Раньше при пустом списке кресел движок подставлял выдуманное
	 * «Кабинет 1» (id: "chair-1"), которого нет в базе, и рисовал администратору
	 * фейковую доступность: клик по такому окну упирался в отказ сервера.
	 * Нет активных кресел (или выбранное кресло не найдено) — честный ответ
	 * «нет окон», а не лестница из несуществующих слотов.
	 */
	const defaultChair = targetChairs[0] || activeChairs[0] || null;
	const hasRealChairs = defaultChair !== null;

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

		// Без реальных кресел клиники свободных окон не существует вовсе.
		if (!hasRealChairs) {
			result.push({
				date: dateKey,
				dateFormatted,
				dayOfWeek,
				isDayOff: true,
				dayOffReason: "В клинике нет активных кресел",
				slots: [],
			});
			continue;
		}

		// Check if the doctor has a day off on this day of week.
		// Пустой массив workingDays — явная настройка «врач не работает ни в
		// какой день недели» (администратор снимает все дни в графике перед
		// отпуском), а не «данные не заданы».
		if (workingDays && !workingDays.includes(dayOfWeekNum)) {
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

		const perDayWindow = perDayWorkingHours
			? perDayWorkingHours[dayOfWeekNum]
			: undefined;
		if (perDayWorkingHours && (!perDayWindow || perDayWindow.endHour <= perDayWindow.startHour)) {
			result.push({
				date: dateKey,
				dateFormatted,
				dayOfWeek,
				isDayOff: true,
				dayOffReason: "Врач не работает в этот день недели",
				slots: [],
			});
			continue;
		}

		const dayStartHour = perDayWindow
			? Math.max(perDayWindow.startHour, clinicStartHour)
			: clinicStartHour;
		const dayEndHour = perDayWindow
			? Math.min(perDayWindow.endHour, clinicEndHour)
			: clinicEndHour;

		const daySlots: DoctorFreeSlot[] = [];

		// Filter appointments for this date
		const dayAppts = activeAppointments.filter((a) => {
			const rawDate = a.startsAt || "";
			const apptDate = typeof rawDate === "string" ? rawDate.slice(0, 10) : "";
			return apptDate === dateKey;
		});

		// Pre-parse doctor break intervals in minutes once per day
		const parsedBreaks = breakIntervals.map((b) => {
			const [bStartH, bStartM] = b.startTime.split(":").map(Number);
			const [bEndH, bEndM] = b.endTime.split(":").map(Number);
			return {
				startMin: (bStartH ?? 0) * 60 + (bStartM ?? 0),
				endMin: (bEndH ?? 0) * 60 + (bEndM ?? 0),
			};
		});

		// Pre-parse day appointments once into numeric timestamps to eliminate thousands of Date allocations
		const parsedDayAppts = dayAppts.map((a) => {
			const aStart = new Date(a.startsAt || 0).getTime();
			const fallbackMinutes = (a as any).durationMinutes ? Number((a as any).durationMinutes) : 30;
			const aEnd =
				a.endsAt && !Number.isNaN(new Date(a.endsAt).getTime())
					? new Date(a.endsAt).getTime()
					: aStart + (fallbackMinutes > 0 ? fallbackMinutes : 30) * 60000;
			return {
				doctorUserId: a.doctorUserId,
				chairId: a.chairId,
				startMs: aStart,
				endMs: aEnd,
			};
		});

		// Iterate time slots
		const totalDayMinutes = (dayEndHour - dayStartHour) * 60;
		for (let offset = 0; offset + durationMinutes <= totalDayMinutes; offset += stepMinutes) {
			const startTotalMin = dayStartHour * 60 + offset;
			const endTotalMin = startTotalMin + durationMinutes;

			const startH = Math.floor(startTotalMin / 60);
			const startM = startTotalMin % 60;
			const endH = Math.floor(endTotalMin / 60);
			const endM = endTotalMin % 60;

			const timeCategory = getTimeOfDayCategory(startH);
			if (timeOfDayFilter !== "all" && timeCategory !== timeOfDayFilter) {
				continue;
			}

			// Check doctor break collisions (e.g. 13:00 - 14:00) using pre-parsed minutes
			const hasBreakConflict = parsedBreaks.some(
				(b) => startTotalMin < b.endMin && endTotalMin > b.startMin,
			);

			if (hasBreakConflict) {
				continue;
			}

			const startIso = `${dateKey}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00Z`;
			const endIso = `${dateKey}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00Z`;
			const startMs = new Date(startIso).getTime();
			const endMs = new Date(endIso).getTime();

			// Check doctor collision using pre-parsed timestamps via SSOT engine
			const hasDoctorConflict = doctorId
				? parsedDayAppts.some((a) => a.doctorUserId === doctorId && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs))
				: false;

			if (hasDoctorConflict) {
				continue;
			}

			// Find available chair using pre-parsed timestamps via SSOT engine.
			// Все кресла заняты на этот интервал — окна нет, выдумывать кабинет нельзя.
			const availableChair = targetChairs.find((chair) => {
				const hasChairConflict = parsedDayAppts.some(
					(a) => a.chairId === chair.id && areIntervalsOverlapping(startMs, endMs, a.startMs, a.endMs),
				);
				return !hasChairConflict;
			});
			if (!availableChair) {
				continue;
			}

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
	readonly clinicWorkdayLabel: string;
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
		const rawDate = a.startsAt || "";
		const apptDate = typeof rawDate === "string" ? rawDate.slice(0, 10) : "";
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

	// Index doctors for O(1) lookups
	const doctorsMap = new Map<string, (typeof doctors)[number]>();
	for (const doc of doctors) {
		if (doc.id) doctorsMap.set(doc.id, doc);
	}

	// Group day appointments by chair in a single pass O(N)
	const apptsByChair = new Map<string, typeof dayAppts>();
	for (const a of dayAppts) {
		const cId = a.chairId || "";
		let list = apptsByChair.get(cId);
		if (!list) {
			list = [];
			apptsByChair.set(cId, list);
		}
		list.push(a);
	}

	// Calculate per chair
	const chairStats: ChairDailyOccupancyStats[] = activeChairs.map((chair) => {
		const chairAppts = apptsByChair.get(chair.id) || [];
		let chairDurationMin = 0;
		let chairRevenue = 0;
		let completedCount = 0;
		const docIdSet = new Set<string>();

		for (const a of chairAppts) {
			const sMs = new Date(a.startsAt).getTime();
			const eMs =
				a.endsAt && !Number.isNaN(new Date(a.endsAt).getTime())
					? new Date(a.endsAt).getTime()
					: sMs + 30 * 60000;
			const durMin = Math.max(0, Math.round((eMs - sMs) / 60000));
			chairDurationMin += durMin;

			if (a.doctorUserId) docIdSet.add(a.doctorUserId);
			if (a.status === "completed") completedCount++;

			// Честная выручка: только реальные оплаченные счета из БД.
			// Прежняя оценка «50 ₽ за минуту / 2 500 ₽ за приём» рисовала
			// администратору выдуманные деньги за визиты без счетов.
			const invSum = invoiceRevenueByAppt.get(a.id);
			if (invSum !== undefined) {
				chairRevenue += invSum;
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
			const doc = doctorsMap.get(dId);
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
		const eMs =
			a.endsAt && !Number.isNaN(new Date(a.endsAt).getTime())
				? new Date(a.endsAt).getTime()
				: sMs + 30 * 60000;
		const durMin = Math.max(0, Math.round((eMs - sMs) / 60000));
		current.count++;
		current.durMin += durMin;
		if (a.chairId) current.chairs.add(a.chairId);

		// Только реальные счета: без синтетической оценки выручки.
		const invSum = invoiceRevenueByAppt.get(a.id);
		current.revenue += invSum !== undefined ? invSum : 0;
		doctorStatsMap.set(dId, current);
	}

	const doctorStats: DoctorDailyOccupancyStats[] = Array.from(doctorStatsMap.entries()).map(([dId, data]) => {
		const doc = doctorsMap.get(dId);
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
		clinicWorkdayLabel: `${String(clinicStartHour).padStart(2, "0")}:00–${String(clinicEndHour).padStart(2, "0")}:00`,
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
