import { z } from "zod";
import {
	leadPriorityEnum,
	leadStatusEnum,
} from "@dental/shared";

export { leadStatusEnum, leadPriorityEnum };
export { DEMO_SHOWCASE_SEED_LEADS } from "./demoSeedLeads.js";

export const leadSchema = z.object({
	name: z.string().min(1),
	patientName: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
	dropReason: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const patchLeadSchema = z.object({
	name: z.string().min(1).optional(),
	patientName: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: z.string().optional().nullable(),
	status: leadStatusEnum.optional(),
	notes: z.string().optional().nullable(),
	dropReason: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
});

export type PatchLeadInput = z.infer<typeof patchLeadSchema>;

export const patchLeadStatusSchema = z.object({
	status: leadStatusEnum,
	reason: z.string().optional().nullable(),
	dropReason: z.string().optional().nullable(),
});

export type PatchLeadStatusInput = z.infer<typeof patchLeadStatusSchema>;
