import type { Appointment } from "@dental/shared";

export type BookingIntent = "create" | "cancel" | "reschedule";

export interface AppointmentScheduleDraft {
	action?: BookingIntent;
	patientId: string;
	patientName?: string;
	patientPhone?: string;
	doctorUserId: string;
	assistantUserId: string;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason: string;
	comment: string;
}

export interface ParsedDateResult {
	targetDate: Date;
	dateFound: boolean;
	remainingText: string;
}

export interface ParsedTimeResult {
	hours: number;
	minutes: number;
	timeFound: boolean;
	durationMinutes?: number;
	explicitDurationFound?: boolean;
	remainingText: string;
}

export interface MatchScoreResult {
	id: string;
	score: number;
	matches?: number;
	indexes: number[];
}
