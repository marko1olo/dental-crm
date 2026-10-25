/**
 * patientCasePresenterSchemas.ts — Zod-схемы презентаций клинических кейсов для пациентов DENTE.
 */

import { z } from "zod";

export const rawPlanItemSchema = z.object({
	code: z.string().optional(),
	name: z.string().min(2),
	tooth: z.number().int().min(11).max(85).optional(),
	quantity: z.number().int().min(1).default(1),
	priceRub: z.number().positive(),
	category: z.enum(["diagnostics", "therapy", "surgery_implant", "prosthetics", "hygiene", "other"]).default("other"),
});
export type RawPlanItem = z.infer<typeof rawPlanItemSchema>;

export const patientCasePresenterInputSchema = z.object({
	patientFullName: z.string().min(2),
	doctorFullName: z.string().min(2),
	clinicName: z.string().default("Стоматологическая клиника"),
	clinicPhone: z.string().default("+7 (000) 000-00-00"),
	planTitle: z.string().default("Комплексный план лечения"),
	items: z.array(rawPlanItemSchema).min(1),
	patientMainConcern: z.string().optional(),
	installmentAvailable: z.boolean().default(true),
	maxInstallmentMonths: z.number().int().min(3).max(36).default(12),
});
export type PatientCasePresenterInput = z.infer<typeof patientCasePresenterInputSchema>;

export const slideDiagnosisSchema = z.object({
	slideType: z.literal("diagnosis"),
	title: z.string(),
	headlineRu: z.string(),
	summaryRu: z.string(),
	bulletPointsRu: z.array(z.string()),
	primaryFocusAreas: z.array(z.string()),
});
export type SlideDiagnosis = z.infer<typeof slideDiagnosisSchema>;

export const slideRisksSchema = z.object({
	slideType: z.literal("risks"),
	title: z.string(),
	headlineRu: z.string(),
	costOfInactionHeadlineRu: z.string(),
	timelineProgression: z.array(
		z.object({
			timeframeRu: z.string(),
			clinicalConsequenceRu: z.string(),
			financialRiskRu: z.string(),
		}),
	),
	escalatedCostEstimateRub: z.number().positive(),
});
export type SlideRisks = z.infer<typeof slideRisksSchema>;

export const roadmapStageSchema = z.object({
	stageNumber: z.number().int().min(1),
	stageTitleRu: z.string(),
	durationRu: z.string(),
	goalRu: z.string(),
	costRub: z.number().nonnegative(),
	itemsSummaryRu: z.array(z.string()),
});
export type RoadmapStage = z.infer<typeof roadmapStageSchema>;

export const slideRoadmapSchema = z.object({
	slideType: z.literal("roadmap"),
	title: z.string(),
	headlineRu: z.string(),
	totalPlanCostRub: z.number().positive(),
	stages: z.array(roadmapStageSchema),
	installmentOfferRu: z.string().optional(),
	monthlyPaymentEstimateRub: z.number().optional(),
});
export type SlideRoadmap = z.infer<typeof slideRoadmapSchema>;

export const patientCasePresentationSchema = z.object({
	presentationId: z.string(),
	shareToken: z.string(),
	patientDisplayName: z.string(),
	doctorFullName: z.string(),
	clinicName: z.string(),
	clinicPhone: z.string(),
	slides: z.object({
		diagnosis: slideDiagnosisSchema,
		risks: slideRisksSchema,
		roadmap: slideRoadmapSchema,
	}),
	createdAt: z.string().datetime(),
});
export type PatientCasePresentation = z.infer<typeof patientCasePresentationSchema>;
