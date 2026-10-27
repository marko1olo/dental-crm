/**
 * freeSlotsTypes.ts — Type definitions for schedule free slots and occupancy calculation.
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

export interface QuickRepeatSlotsResult {
	readonly slot7Days: DoctorFreeSlot | null;
	readonly slot14Days: DoctorFreeSlot | null;
	readonly slot30Days: DoctorFreeSlot | null;
}
