/**
 * DENTE Dental CRM — Statutory Doctor Schedule Shift Roster Types
 * Compliance: TK RF Article 350 & 2026 Production Calendar
 */

export type MedicalStaffRole =
	| "therapist"
	| "surgeon"
	| "orthopedist"
	| "orthodontist"
	| "pediatric"
	| "hygienist"
	| "assistant";

export type ShiftArchetypeId =
	| "morning_shift"
	| "evening_shift"
	| "saturday_shift"
	| "sunday_duty"
	| "night_duty"
	| "day_off"
	| "sick_leave"
	| "vacation";

export type T13TimeCode = "Я" | "Н" | "В" | "Б" | "ОТ" | "Р" | "ПР";

export interface ShiftArchetype {
	id: ShiftArchetypeId;
	name: string;
	shortName: string;
	startTime: string;
	endTime: string;
	durationHours: number;
	breakMinutes: number;
	isNight: boolean;
	nightHours: number;
	nightMultiplier: number;
	color: string;
	t13Code: T13TimeCode;
	description: string;
}

export interface StaffRoleDefinition {
	role: MedicalStaffRole;
	code: string;
	nameRu: string;
	isDoctor: boolean;
	isAssistant: boolean;
	standardWeeklyHours: number;
	requiresAssistant: boolean;
}

export interface CabinetDefinition {
	id: string;
	number: number;
	name: string;
	specialty: string;
	chairs: Array<{
		id: string;
		name: string;
		equipment: string;
	}>;
}

export interface StaffMember {
	id: string;
	fullName: string;
	shortName: string;
	role: MedicalStaffRole;
	tabNumber: string;
	isDoctor: boolean;
	isAssistant: boolean;
	preferredChairId?: string | undefined;
	defaultAssistantId?: string | undefined;
	preferredAssistantId?: string | undefined;
	weeklyHourLimit: number;
	avatarColor: string;
}

export interface MonthProductionCalendarNorm2026 {
	month: number;
	nameRu: string;
	workingDays: number;
	preHolidayDays: number;
	holidaysAndWeekends: number;
	normHours33: number;
	normHours39: number;
	normHours40: number;
}

export type DoctorChairRosterTemplateId =
	| "mon_wed_fri_morning"
	| "tue_thu_sat_evening"
	| "two_two_full"
	| "two_two_full_day"
	| "five_day_standard"
	| "five_day_week"
	| "seven_day_full"
	| "even_odd_month"
	| "even_days_morning"
	| "odd_days_evening"
	| "daily_morning";

export interface DoctorChairRosterTemplate {
	id: DoctorChairRosterTemplateId;
	title: string;
	shortTitle: string;
	daysDescription: string;
	hours: string;
	startTime: string;
	endTime: string;
	durationHours: number;
	breakMinutes: number;
	archetypeId: ShiftArchetypeId;
	daysOfWeekIndices: number[]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
	dayOfMonthFilter?: "even_odd_split" | "even" | "odd" | "all" | undefined;
}
