/**
 * packages/shared/src/perio/typesSummary.ts
 *
 * Diagnostic stages, risk categories and summary schemas.
 * Mandate 8b: File <= 120 lines.
 */

import { z } from "zod";
import { perioToothRecordSchema } from "./typesTeeth.js";

export const aapStageSchema = z.enum([
	"health",
	"gingivitis",
	"stage_1",
	"stage_2",
	"stage_3",
	"stage_4",
]);
export type AapStage = z.infer<typeof aapStageSchema>;

export const aapGradeSchema = z.enum(["grade_a", "grade_b", "grade_c"]);
export type AapGrade = z.infer<typeof aapGradeSchema>;

export const praRiskLevelSchema = z.enum(["low", "moderate", "high"]);
export type PraRiskLevel = z.infer<typeof praRiskLevelSchema>;

export const smokingStatusSchema = z.enum(["non_smoker", "light", "heavy"]);
export type SmokingStatus = z.infer<typeof smokingStatusSchema>;

export const diabetesStatusSchema = z.enum(["none", "controlled", "uncontrolled"]);
export type DiabetesStatus = z.infer<typeof diabetesStatusSchema>;

export const perioChartSummarySchema = z.object({
	totalTeethExamined: z.number().int().nonnegative(),
	totalSitesProbed: z.number().int().nonnegative(),
	fmbsPercent: z.number().min(0).max(100),
	fmpsPercent: z.number().min(0).max(100),
	deepPocketsCount: z.number().int().nonnegative(),
	moderatePocketsCount: z.number().int().nonnegative(),
	sitesWithSuppurationCount: z.number().int().nonnegative(),
	sitesWithCalculusCount: z.number().int().nonnegative(),
	teethWithMobilityCount: z.number().int().nonnegative(),
	teethWithFurcationCount: z.number().int().nonnegative(),
	maxPocketDepthMm: z.number().int().nonnegative(),
	meanPocketDepthMm: z.number().nonnegative(),
	maxCalMm: z.number().int().nonnegative(),
	meanCalMm: z.number().nonnegative(),
	riskCategory: praRiskLevelSchema,
	aapStage: aapStageSchema.optional(),
	aapGrade: aapGradeSchema.optional(),
});
export type PerioChartSummary = z.infer<typeof perioChartSummarySchema>;

export const perioChartDataSchema = z.object({
	id: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	visitId: z.string().uuid().optional().nullable(),
	doctorId: z.string().uuid().optional().nullable(),
	chartDate: z.string(),
	teeth: z.array(perioToothRecordSchema),
	summary: perioChartSummarySchema.optional(),
	notes: z.string().optional().nullable(),
	praRisk: praRiskLevelSchema.optional(),
});
export type PerioChartData = z.infer<typeof perioChartDataSchema>;
