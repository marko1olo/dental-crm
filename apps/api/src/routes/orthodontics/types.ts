import { z } from "zod";
import { ArchwireChangePayloadSchema, type ArchwireChangePayload } from "@dental/shared";

export const patientParamsSchema = z.object({
	patientId: z.string().min(1),
});

export const issueAlignerSetSchema = z.object({
	alignerCount: z.number().int().min(1).max(20).default(2),
	wearDaysPerAligner: z.number().int().min(3).max(30).default(14),
	totalAligners: z.number().int().min(1).max(100).optional(),
	note: z.string().max(300).optional(),
	visitId: z.string().optional(),
	soapSummary: z.string().optional(),
	applianceId: z.string().optional(),
	applianceName: z.string().optional(),
	selectedElasticId: z.string().nullable().optional(),
	selectedActionIds: z.array(z.string()).optional(),
});

export const archwireChangeSchema = ArchwireChangePayloadSchema;
export type { ArchwireChangePayload };

export const ligatureActivateSchema = z.object({
	powerChain: z.boolean().default(false),
	powerChainSpan: z.string().max(50).optional(),
	applianceCategory: z.enum(["brackets", "aligners", "plate"]).optional(),
	note: z.string().max(300).optional(),
});

export const stageAdvanceSchema = z.object({
	nextStage: z.number().int().min(1).max(10),
	stageTitle: z.string().max(120).optional(),
	note: z.string().max(300).optional(),
	visitId: z.string().optional(),
	soapSummary: z.string().optional(),
	applianceId: z.string().optional(),
	applianceName: z.string().optional(),
	selectedElasticId: z.string().nullable().optional(),
	selectedActionIds: z.array(z.string()).optional(),
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

export const cephPointSchema = z
	.object({
		x: z.number().min(0, "Координата X не может быть отрицательной").max(10000, "Координата X превышает допустимый размер кадра"),
		y: z.number().min(0, "Координата Y не может быть отрицательной").max(10000, "Координата Y превышает допустимый размер кадра"),
	})
	.strict();

export const cephMeasurementSchema = z
	.object({
		id: z.string().min(1).max(64),
		nameRu: z.string().min(1).max(128),
		normMin: z.number(),
		normMax: z.number(),
		unit: z.enum(["deg", "mm"]),
		value: z.number().nullable(),
		status: z.enum(["normal", "deviation_high", "deviation_low", "unmeasured"]),
		clinicalInterpretation: z.string().max(500),
		category: z.enum([
			"skeletal_sagittal",
			"skeletal_vertical",
			"dental_upper",
			"dental_lower",
			"dental_interincisal",
			"soft_tissue",
		]),
	})
	.strict();

export const cephAnalysisPayloadSchema = z
	.object({
		measurements: z.array(cephMeasurementSchema).optional(),
		diagnosis: z.record(z.string(), z.unknown()).optional(),
		summaryRu: z.string().max(4000).optional(),
		protocol043Text: z.string().max(8000).optional(),
	})
	.passthrough();

export const cephAnalysisSaveSchema = z
	.object({
		id: z.string().max(128).optional(),
		imagingStudyId: z.string().uuid("Идентификатор снимка ТРГ должен быть UUID").optional(),
		patientName: z.string().max(150).optional(),
		imageUrl: z.string().nullable().optional(),
		landmarks: z.record(z.string(), cephPointSchema).optional(),
		scaleMmPerPixel: z.number().positive().max(10).optional(),
		analysis: cephAnalysisPayloadSchema.optional(),
		source: z.string().max(64).optional(),
		backendUsed: z.string().max(64).optional(),
		isCalibratedFallback: z.boolean().optional(),
		placedCount: z.number().int().min(0).max(100).optional(),
		latencyMs: z.number().min(0).max(60000).optional(),
		createdAt: z.string().optional(),
	})
	.strict();

export interface OrthoMaterialDeductionResult {
	success: boolean;
	itemId?: string | undefined;
	itemName?: string | undefined;
	deductedQty: number;
	remainingStock?: number | undefined;
	isOverdraft: boolean;
	unitCostKopecks?: number | undefined;
	error?: string | undefined;
}

export interface OrthodonticProgressRecord extends Record<string, unknown> {
	applianceId?: string | undefined;
	applianceName?: string | undefined;
	applianceCategory?: "brackets" | "aligners" | "plate" | undefined;
	selectedElasticId?: string | null | undefined;
	selectedActionIds?: string[] | undefined;
	currentAligner?: number | undefined;
	totalAligners?: number | undefined;
	startDate: string;
	currentStage: number;
	stageTitle?: string | undefined;
	archwire?: string | undefined;
	upperArchwire?: string | undefined;
	lowerArchwire?: string | undefined;
	elastics?: string | undefined;
	lastActionDate?: string | undefined;
	lastActionSummary?: string | undefined;
	lastSoapSummary?: string | undefined;
	wearDaysPerAligner?: number | undefined;
	nextVisitRecommendedDate?: string | undefined;
}
