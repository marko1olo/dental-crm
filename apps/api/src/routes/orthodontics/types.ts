import { z } from "zod";

export const patientParamsSchema = z.object({
	patientId: z.string().min(1),
});

export const issueAlignerSetSchema = z.object({
	alignerCount: z.number().int().min(1).max(20).default(2),
	wearDaysPerAligner: z.number().int().min(3).max(30).default(14),
	totalAligners: z.number().int().min(1).max(100).optional(),
	note: z.string().max(300).optional(),
});

export const archwireChangeSchema = z.object({
	material: z.enum(["NiTi", "CuNiTi", "SS", "TMA"]),
	section: z.string().min(1).max(30),
	arch: z.enum(["upper", "lower", "both"]).default("both"),
	note: z.string().max(300).optional(),
});

export const ligatureActivateSchema = z.object({
	powerChain: z.boolean().default(false),
	powerChainSpan: z.string().max(50).optional(),
	note: z.string().max(300).optional(),
});

export const stageAdvanceSchema = z.object({
	nextStage: z.number().int().min(1).max(10),
	stageTitle: z.string().max(120).optional(),
	note: z.string().max(300).optional(),
});

export const rebracketSchema = z.object({
	toothNumber: z.number().int().min(11).max(48).optional(),
	bracketType: z.string().max(80).default("металл / замок"),
	note: z.string().max(300).optional(),
});

export const deductOrthoMaterialsSchema = z.object({
	action: z.enum([
		"wire_change",
		"spring_activation",
		"separation_rings",
		"bonding",
		"rebracket",
		"power_chain",
		"elastics",
		"custom",
	]),
	materialName: z.string().optional(),
	materialCategory: z.string().default("other"),
	quantity: z.number().positive().default(1),
	unit: z.string().default("шт."),
	arch: z.enum(["upper", "lower", "both"]).default("both"),
	visitId: z.string().optional(),
	notes: z.string().max(300).optional(),
});

export interface OrthoMaterialDeductionResult {
	success: boolean;
	itemId?: string | undefined;
	itemName?: string | undefined;
	deductedQty: number;
	remainingStock?: number | undefined;
	isOverdraft: boolean;
	error?: string | undefined;
}

export interface OrthodonticProgressRecord {
	currentAligner: number;
	totalAligners: number;
	startDate: string;
	currentStage: number;
	stageTitle?: string | undefined;
	archwire?: string | undefined;
	elastics?: string | undefined;
	lastActionDate?: string | undefined;
	lastActionSummary?: string | undefined;
	wearDaysPerAligner?: number | undefined;
	nextVisitRecommendedDate?: string | undefined;
}
