/**
 * packages/shared/src/clinical/playbooks/playbookTypes.ts
 * Core briefs and Zod schemas for smart clinical playbooks (Wave 132 / Mandates 8b, 8e, 8x, 8ap).
 */

import { z } from "zod";

export const playbookRecallPrioritySchema = z.enum(["low", "medium", "normal", "high", "urgent"]);
export type PlaybookRecallPriority = z.infer<typeof playbookRecallPrioritySchema>;

export const recallPathologyUrgencySchema = z.enum(["acute", "high", "routine"]);
export type RecallPathologyUrgency = z.infer<typeof recallPathologyUrgencySchema>;

export const playbookRecallItemSchema = z.object({
	id: z.string().optional(),
	organizationId: z.string().optional(),
	patientId: z.string(),
	patientFullName: z.string().min(1),
	patientPhone: z.string().optional().nullable(),
	recallType: z.string().optional().default("hygiene_recall"),
	reasonNote: z.string().optional().nullable(),
	dueDate: z.string(),
	priority: playbookRecallPrioritySchema.default("normal"),
	diagnosis: z.string().optional().nullable(),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	estimatedDurationMinutes: z.number().int().positive().optional().default(30),
	pathologyUrgency: recallPathologyUrgencySchema.optional().default("routine"),
	status: z.enum(["pending", "scheduled", "completed", "cancelled", "overdue"]).optional().default("pending"),
	assignedDoctorId: z.string().optional().nullable(),
	assignedDoctorName: z.string().optional().nullable(),
});
export type PlaybookRecallItem = z.input<typeof playbookRecallItemSchema>;

export const appointmentBriefSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	patientFullName: z.string().min(1),
	patientPhone: z.string().optional().nullable(),
	time: z.string(),
	chairName: z.string(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	durationMinutes: z.number().int().positive().optional().default(30),
	reason: z.string(),
	criticalAllergies: z.array(z.string()).optional().default([]),
	somaticRiskFactors: z.array(z.string()).optional().default([]),
	isFirstVisit: z.boolean().optional().default(false),
	unpaidKopecks: z.number().int().optional().default(0),
});
export type AppointmentBrief = z.input<typeof appointmentBriefSchema>;

export const budgetBriefStageSchema = z.object({
	stageNumber: z.number().int().positive(),
	title: z.string(),
	status: z.enum(["draft", "proposed", "sent", "accepted", "in_progress", "completed", "declined"]),
	totalPriceKopecks: z.number().int().nonnegative(),
	category: z.string().optional(),
});
export type BudgetBriefStage = z.infer<typeof budgetBriefStageSchema>;

export const budgetBriefSchema = z.object({
	id: z.string(),
	patientId: z.string(),
	patientFullName: z.string().optional(),
	title: z.string(),
	status: z.enum(["draft", "proposed", "sent", "accepted", "in_progress", "completed", "declined"]),
	totalKopecks: z.number().int().nonnegative(),
	createdAt: z.string(),
	stages: z.array(budgetBriefStageSchema).optional().default([]),
	notes: z.string().optional().nullable(),
});
export type BudgetBrief = z.input<typeof budgetBriefSchema>;

export const patientBriefSchema = z.object({
	id: z.string(),
	fullName: z.string().min(1),
	birthDate: z.string().optional(),
	phone: z.string().optional().nullable(),
	gender: z.enum(["male", "female", "unspecified"]).optional(),
	cardRecordNumber: z.string().optional(),
	criticalAllergies: z.array(z.string()).optional().default([]),
	somaticRiskFactors: z.array(z.string()).optional().default([]),
	somaticNorm: z.boolean().optional().default(false),
	bloodCoagulationRisk: z.boolean().optional().default(false),
	anestheticToleranceRisk: z.boolean().optional().default(false),
});
export type PatientBrief = z.input<typeof patientBriefSchema>;

export const visitCompletedServiceSchema = z.object({
	code804n: z.string().optional().nullable(),
	serviceCode: z.string().optional().nullable(),
	name: z.string(),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	totalPriceKopecks: z.number().int().nonnegative().optional(),
});
export type VisitCompletedService = z.infer<typeof visitCompletedServiceSchema>;

export const visitBriefSchema = z.object({
	id: z.string().optional(),
	visitDate: z.string(),
	doctorName: z.string(),
	diagnosis: z.string().optional(),
	diagnosisCodeMkb10: z.string().optional(),
	completedServices: z.array(visitCompletedServiceSchema).default([]),
	clinicalNotes: z.string().optional(),
});
export type VisitBrief = z.infer<typeof visitBriefSchema>;

export function calculateDaysBetween(fromDateStr: string, toDateStr: string): number {
	const fromMs = Date.parse(`${fromDateStr.slice(0, 10)}T00:00:00Z`);
	const toMs = Date.parse(`${toDateStr.slice(0, 10)}T00:00:00Z`);
	if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0;
	return Math.max(0, Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)));
}
