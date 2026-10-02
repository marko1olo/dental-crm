import { z } from "zod";

/**
 * CRM Component Knowledge Schemas & Types for AI Agents & Human Training
 * DENTE Dental CRM — Mandates 8l (Knowledge Inquisitor), 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty)
 */

export const crmComponentCategorySchema = z.enum([
	"clinical",
	"diagnostics",
	"finance",
	"warehouse",
	"patient_management",
	"laboratory",
	"sanpin",
	"analytics",
	"ai_assistant",
	"settings",
]);

export type CrmComponentCategory = z.infer<typeof crmComponentCategorySchema>;

export const crmUserRoleSchema = z.enum([
	"doctor",
	"admin",
	"nurse",
	"owner",
	"all",
]);

export type CrmUserRole = z.infer<typeof crmUserRoleSchema>;

export const crmActionKnowledgeSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	selector: z.string().min(1),
	hotkey: z.string().optional(),
	effect: z.string().min(1),
	requiresConfirmation: z.boolean().default(false),
	role: z.array(crmUserRoleSchema).default(["all"]),
});

export type CrmActionKnowledge = z.infer<typeof crmActionKnowledgeSchema>;

export const crmFaqItemSchema = z.object({
	question: z.string().min(1),
	answer: z.string().min(1),
	relatedActionId: z.string().optional(),
});

export type CrmFaqItem = z.infer<typeof crmFaqItemSchema>;

export const crmTroubleshootingItemSchema = z.object({
	symptom: z.string().min(1),
	cause: z.string().min(1),
	solution: z.string().min(1),
	recoverySelector: z.string().optional(),
});

export type CrmTroubleshootingItem = z.infer<typeof crmTroubleshootingItemSchema>;

export const crmVisualGuideSchema = z.object({
	element: z.string().min(1),
	selector: z.string().min(1),
	description: z.string().min(1),
	badgeText: z.string().optional(),
	highlightType: z
		.enum(["pulse", "outline", "arrow", "pill"])
		.default("outline"),
});

export type CrmVisualGuide = z.infer<typeof crmVisualGuideSchema>;

export const crmComponentKnowledgeSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	shortName: z.string().min(1),
	category: crmComponentCategorySchema,
	categoryRu: z.string().min(1),
	description: z.string().min(1),
	route: z.string().min(1),
	primaryRole: z.array(crmUserRoleSchema).min(1),
	tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
	primaryActions: z.array(crmActionKnowledgeSchema).default([]),
	selectors: z.record(z.string()).default({}),
	visualGuides: z.array(crmVisualGuideSchema).default([]),
	clinicalWorkflow: z.string().min(1),
	faq: z.array(crmFaqItemSchema).default([]),
	troubleshooting: z.array(crmTroubleshootingItemSchema).default([]),
	scaleAdaptability: z.string().min(1),
	complianceNotes: z.string().optional(),
	keywords: z.array(z.string()).min(1),
});

export type CrmComponentKnowledge = z.infer<typeof crmComponentKnowledgeSchema>;

export interface KnowledgeSearchOptions {
	role?: CrmUserRole;
	category?: CrmComponentCategory;
	limit?: number;
	minRelevance?: number;
}

export interface KnowledgeSearchResult {
	component: CrmComponentKnowledge;
	score: number;
	matchedTerms: string[];
	highlightSnippet?: string;
}
