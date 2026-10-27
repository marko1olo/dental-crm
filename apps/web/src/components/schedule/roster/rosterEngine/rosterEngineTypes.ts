import type { MedicalStaffRole, ShiftArchetypeId } from "../doctorShiftRosterPresets";

export interface DoctorShift {
	id: string;
	doctorId: string;
	doctorName: string;
	doctorRole: MedicalStaffRole;
	assistantId: string | null;
	assistantName: string | null;
	cabinetId: string;
	chairId: string;
	dateIso: string; // YYYY-MM-DD
	archetypeId: ShiftArchetypeId;
	startTime: string; // HH:MM
	endTime: string; // HH:MM
	durationHours: number;
	breakMinutes: number;
	isNight: boolean;
	nightHours: number;
	customNotes?: string | undefined;
	status: "scheduled" | "confirmed" | "completed" | "cancelled" | "absence";
	absenceReason?: "sick_leave" | "vacation" | "unpaid_leave" | "training" | undefined;
}

export type ConflictType =
	| "doctor_double_booking"
	| "assistant_double_booking"
	| "chair_double_booking"
	| "weekly_overtime_tk_rf"
	| "no_assistant_for_surgery";

export interface RosterConflict {
	id: string;
	type: ConflictType;
	severity: "error" | "warning" | "info";
	message: string;
	dateIso: string;
	shiftIds: string[];
	staffIds: string[];
}

export interface StaffRosterStats {
	staffId: string;
	staffName: string;
	role: MedicalStaffRole;
	isDoctor: boolean;
	totalShifts: number;
	totalScheduledHours: number;
	monthNormHours: number;
	deltaHours: number;
	overtimeHours: number;
	undertimeHours: number;
	nightHoursTotal: number;
	complianceStatus: "normal" | "overtime" | "undertime" | "warning";
}

export type ChairHeatLevel = "empty" | "cold" | "optimal" | "peak" | "overload";

export interface ChairUtilizationMetric {
	cabinetId: string;
	cabinetName: string;
	chairId: string;
	chairName: string;
	dateIso: string;
	totalShiftMinutes: number;
	bookedAppointmentMinutes: number;
	utilizationRatePercent: number;
	heatLevel: ChairHeatLevel;
}

export interface DetectRosterConflictOptions {
	practiceType?: "private_outpatient" | "hospital_statutory";
	allowWeeklyOvertime?: boolean;
	checkSurgeryAssistant?: boolean;
	checkWeeklyOvertime?: boolean;
	isPrivatePractice?: boolean;
}
