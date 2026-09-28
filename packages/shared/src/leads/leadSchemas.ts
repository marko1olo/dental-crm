import { z } from "zod";

export const leadStatusEnum = z.enum([
	"new",
	"contacted",
	"consult_booked",
	"showed_up",
	"no_answer",
	"trash",
]);

export type LeadStatus = z.infer<typeof leadStatusEnum>;

export const LEAD_STATUSES: readonly LeadStatus[] = leadStatusEnum.options;

export const leadPriorityEnum = z.enum([
	"urgent",
	"high",
	"normal",
	"low",
]);

export type LeadPriority = z.infer<typeof leadPriorityEnum>;

export const LEAD_PRIORITIES: readonly LeadPriority[] = leadPriorityEnum.options;

export const clinicalTagCatalog = [
	{ id: "acute_pain", labelRu: "Острая боль ⚡", severity: "urgent" },
	{ id: "all_on_4", labelRu: "Имплантация All-on-4", severity: "high" },
	{ id: "implants", labelRu: "Имплантация", severity: "high" },
	{ id: "braces_aligners", labelRu: "Брекеты / Элайнеры", severity: "normal" },
	{ id: "total_prosthetics", labelRu: "Тотальное протезирование", severity: "high" },
	{ id: "therapy_caries", labelRu: "Терапия / Кариес", severity: "normal" },
	{ id: "hygiene", labelRu: "Профгигиена", severity: "low" },
	{ id: "pediatric", labelRu: "Детский приём", severity: "normal" },
] as const;

export type ClinicalTagId = (typeof clinicalTagCatalog)[number]["id"];

export const batchUpdateLeadStageSchema = z.object({
	leadIds: z.array(z.string().uuid()).min(1, "Необходимо выбрать хотя бы одно обращение"),
	toStage: leadStatusEnum,
	reason: z.string().optional(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
});

export type BatchUpdateLeadStageInput = z.infer<typeof batchUpdateLeadStageSchema>;

export const patchLeadStageSchema = z.object({
	toStage: leadStatusEnum,
	notes: z.string().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
});

export type PatchLeadStageInput = z.infer<typeof patchLeadStageSchema>;

export const leadStageHistoryEntrySchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	leadId: z.string().uuid(),
	fromStage: z.string().nullable().optional(),
	toStage: z.string(),
	changedByUserId: z.string().uuid().nullable().optional(),
	durationSeconds: z.number().int().nonnegative().nullable().optional(),
	createdAt: z.union([z.string().datetime(), z.date()]),
});

export type LeadStageHistoryEntry = z.infer<typeof leadStageHistoryEntrySchema>;
