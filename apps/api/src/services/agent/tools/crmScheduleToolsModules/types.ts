/**
 * types.ts — Layer 0: Contracts, Zod Schemas & Contexts for CRM Schedule Tools.
 *
 * Implements Mandate 8b modular hierarchy with zero runtime dependencies.
 */

import { z } from "zod";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

// ============================================================================
// SCHEDULE TOOL CONTEXT
// ============================================================================

export interface ScheduleToolContext extends AgentContext {
	// Reified context for scheduling operations
}

// ============================================================================
// 1. TOOL CONTRACT: book_appointment
// ============================================================================

export const bookAppointmentSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	doctorUserId: z.string().min(1, "doctorUserId обязателен"),
	startsAt: z.string().describe("Время начала приема в ISO 8601 (например, 2026-10-15T11:00:00Z)"),
	durationMinutes: z.number().int().min(5).max(480).default(30).optional(),
	endsAt: z.string().optional().describe("Время окончания приема в ISO 8601"),
	chairId: z.string().optional().describe("ID стоматологической установки"),
	assistantUserId: z.string().optional().describe("ID ассистента (опционально)"),
	reason: z.string().default("Консультация и лечение").optional().describe("Цель визита"),
	comment: z.string().optional(),
});

export type BookAppointmentInput = z.input<typeof bookAppointmentSchema>;

export interface BookAppointmentResult {
	success: true;
	appointmentId: string;
	patientId: string;
	doctorUserId: string;
	startsAt: string;
	endsAt: string;
	chairId: string | null;
	status: "planned";
	reason: string;
	assistantAssigned: boolean;
	message: string;
}

// ============================================================================
// 2. TOOL CONTRACT: reschedule_appointment
// ============================================================================

export const rescheduleAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "appointmentId обязателен"),
	newStartsAt: z.string().describe("Новое время начала приема (ISO 8601)"),
	durationMinutes: z.number().int().min(5).max(480).optional(),
	newEndsAt: z.string().optional().describe("Новое время окончания приема (ISO 8601)"),
	reason: z.string().optional().describe("Причина переноса записи"),
});

export type RescheduleAppointmentInput = z.input<typeof rescheduleAppointmentSchema>;

export interface RescheduleAppointmentResult {
	success: true;
	appointmentId: string;
	previousStartsAt?: string | undefined;
	newStartsAt: string;
	newEndsAt: string;
	message: string;
}

// ============================================================================
// 3. TOOL CONTRACT: cancel_appointment
// ============================================================================

export const cancelAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "appointmentId обязателен"),
	reason: z
		.string()
		.min(1, "Причина отмены обязательна")
		.describe("Клиническая или организационная причина отмены приёма"),
	cancelledBy: z
		.enum(["patient", "clinic", "doctor", "auto"])
		.default("patient")
		.optional(),
	notes: z.string().optional(),
});

export type CancelAppointmentInput = z.input<typeof cancelAppointmentSchema>;

export interface CancelAppointmentResult {
	success: true;
	appointmentId: string;
	status: "cancelled";
	reason: string;
	message: string;
}

// ============================================================================
// 4. TOOL CONTRACT: get_doctor_schedule
// ============================================================================

export const getDoctorScheduleSchema = z.object({
	doctorUserId: z.string().min(1, "doctorUserId обязателен"),
	date: z
		.string()
		.default(new Date().toISOString().slice(0, 10))
		.optional()
		.describe("Дата расписания в формате ГГГГ-ММ-ДД"),
	days: z.number().int().min(1).max(14).default(1).optional().describe("Количество дней"),
});

export type GetDoctorScheduleInput = z.input<typeof getDoctorScheduleSchema>;

export interface ScheduleSlot {
	appointmentId: string;
	patientId: string | null;
	startsAt: string;
	endsAt: string;
	status: string;
	reason: string | null;
}

export interface GetDoctorScheduleResult {
	success: true;
	doctorUserId: string;
	targetDate: string;
	totalAppointments: number;
	appointments: ScheduleSlot[];
	availableSlotsPreview: string[];
}

// ============================================================================
// 5. TOOL CONTRACT: get_daily_patients
// ============================================================================

export const getDailyPatientsSchema = z.object({
	doctorUserId: z
		.string()
		.optional()
		.describe("ID врача (если не указан, используется ID активного пользователя/врача)"),
	date: z
		.string()
		.default(new Date().toISOString().slice(0, 10))
		.optional()
		.describe("Дата в формате ГГГГ-ММ-ДД (по умолчанию сегодня)"),
	statusFilter: z
		.enum(["all", "planned", "in_progress", "completed", "cancelled"])
		.default("all")
		.optional()
		.describe("Фильтр по статусу приема"),
});

export type GetDailyPatientsInput = z.input<typeof getDailyPatientsSchema>;

export interface DailyPatientItem {
	appointmentId: string;
	patientId: string;
	patientFullName: string;
	phone: string | null;
	timeSlot: string;
	startsAt: string;
	endsAt: string;
	status: string;
	reason: string;
	card043Number: string;
	hasOpenVisit: boolean;
	doctorName: string;
}

export interface GetDailyPatientsResult {
	success: true;
	date: string;
	doctorUserId: string;
	totalPatients: number;
	activePatientsCount: number;
	patients: DailyPatientItem[];
	summaryRu: string;
}

// ============================================================================
// 6. TOOL CONTRACT: get_doctor_shifts
// ============================================================================

export const getDoctorShiftsSchema = z.object({
	doctorUserId: z.string().optional().describe("ID врача (по умолчанию текущий врач)"),
	startDate: z
		.string()
		.default(new Date().toISOString().slice(0, 10))
		.optional()
		.describe("Дата начала обзора в формате ГГГГ-ММ-ДД"),
	days: z.number().int().min(1).max(31).default(7).optional().describe("Количество дней обзора (по умолчанию 7)"),
});

export type GetDoctorShiftsInput = z.input<typeof getDoctorShiftsSchema>;

export interface DoctorDayShift {
	date: string;
	dayOfWeekRu: string;
	isWorkingDay: boolean;
	shiftType: "morning" | "evening" | "full_day" | "off";
	shiftHours: string;
	bookedAppointmentsCount: number;
	totalBookedMinutes: number;
	freeWindowsPreview: string[];
}

export interface GetDoctorShiftsResult {
	success: true;
	doctorUserId: string;
	startDate: string;
	daysCount: number;
	shifts: DoctorDayShift[];
	summaryRu: string;
}

export const RU_DAYS = [
	"Воскресенье",
	"Понедельник",
	"Вторник",
	"Среда",
	"Четверг",
	"Пятница",
	"Суббота",
];

// ============================================================================
// 7. TOOL CONTRACT: slot_search (Dedicated slot discovery)
// ============================================================================

export const slotSearchSchema = z.object({
	date: z
		.string()
		.default(new Date().toISOString().slice(0, 10))
		.optional()
		.describe("Дата поиска слотов в формате ГГГГ-ММ-ДД (по умолчанию сегодня)"),
	days: z.number().int().min(1).max(14).default(1).optional().describe("Количество дней поиска"),
	doctorUserId: z.string().optional().describe("ID врача для фильтрации"),
	chairId: z.string().optional().describe("ID стоматологической установки/кресла"),
	specialty: z.string().optional().describe("Специализация врача (терапевт, ортопед, хирург и т.д.)"),
	minDurationMinutes: z.number().int().min(5).max(480).default(30).optional().describe("Минимальная длительность окна в минутах"),
});

export type SlotSearchInput = z.input<typeof slotSearchSchema>;

export interface AvailableSlotWindow {
	date: string;
	startsAt: string;
	endsAt: string;
	durationMinutes: number;
	doctorUserId?: string | undefined;
	chairId?: string | null | undefined;
	formatted: string;
}

export interface SlotSearchResult {
	success: true;
	targetDate: string;
	days: number;
	availableSlots: AvailableSlotWindow[];
	totalSlotsFound: number;
	summaryRu: string;
}

// ============================================================================
// 8. CONFLICT CHECK CONTRACTS (Layer 1)
// ============================================================================

export interface ConflictCheckParams {
	organizationId: string;
	doctorUserId: string;
	startsAt: Date;
	endsAt: Date;
	chairId?: string | null;
	excludeAppointmentId?: string;
}

export interface ConflictCheckResult {
	hasConflict: boolean;
	conflictType?: "doctor_overlap" | "chair_conflict" | null;
	message?: string;
}
