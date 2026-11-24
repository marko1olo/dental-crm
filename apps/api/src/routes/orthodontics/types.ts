import { z } from "zod";
import { ArchwireChangePayloadSchema, type ArchwireChangePayload } from "@dental/shared";

export const patientParamsSchema = z.object({
	patientId: z.string().uuid(),
});

export const issueAlignerSetSchema = z
	.object({
		alignerCount: z.number().int().min(1).max(20).default(2),
		wearDaysPerAligner: z.number().int().min(3).max(30).default(14),
		totalAligners: z.number().int().min(1).max(100).optional(),
		note: z.string().max(300).optional(),
		visitId: z.string().uuid().optional(),
		soapSummary: z.string().optional(),
		applianceId: z.string().optional(),
		applianceName: z.string().optional(),
		selectedElasticId: z.string().nullable().optional(),
		selectedActionIds: z.array(z.string()).optional(),
		angleClass: z.string().optional(),
		verticalBite: z.string().optional(),
		overjetMm: z.number().optional(),
		overbitePercent: z.number().optional(),
		anbAngle: z.number().optional(),
		skeletalClass: z.string().optional(),
		treatmentPlanId: z.string().uuid().optional(),
	})
	.strict();

export const archwireChangeSchema = ArchwireChangePayloadSchema.superRefine((val, ctx) => {
	if (val.visitId !== undefined && !z.string().uuid().safeParse(val.visitId).success) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["visitId"],
			message: "Идентификатор визита должен быть UUID",
		});
	}
});
export const archwireChangePayloadSchema = archwireChangeSchema;
export type { ArchwireChangePayload };

export const ligatureActivateSchema = z
	.object({
		powerChain: z.boolean().default(false),
		powerChainSpan: z.string().max(50).optional(),
		applianceCategory: z.enum(["brackets", "aligners", "plate"]).optional(),
		note: z.string().max(300).optional(),
		visitId: z.string().uuid().optional(),
		soapSummary: z.string().max(4000).optional(),
	})
	.strict();

export const stageAdvanceSchema = z
	.object({
		nextStage: z.number().int().min(1).max(10),
		stageTitle: z.string().max(120).optional(),
		note: z.string().max(300).optional(),
		visitId: z.string().uuid().optional(),
		soapSummary: z.string().optional(),
		applianceId: z.string().optional(),
		applianceName: z.string().optional(),
		selectedElasticId: z.string().nullable().optional(),
		selectedActionIds: z.array(z.string()).optional(),
		angleClass: z.string().optional(),
		verticalBite: z.string().optional(),
		overjetMm: z.number().optional(),
		overbitePercent: z.number().optional(),
		anbAngle: z.number().optional(),
		skeletalClass: z.string().optional(),
		treatmentPlanId: z.string().uuid().optional(),
	})
	.strict();

export const rebracketSchema = z
	.object({
		toothNumber: z.number().int().min(11).max(48).optional(),
		bracketType: z.string().max(80).default("металл / замок"),
		note: z.string().max(300).optional(),
	})
	.strict();

export const deductOrthoMaterialsSchema = z
	.object({
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
		visitId: z.string().uuid().optional(),
		notes: z.string().max(300).optional(),
	})
	.strict();

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
		symbol: z.string().max(32).optional(),
		category: z.enum([
			"skeletal_sagittal",
			"skeletal_vertical",
			"dental_upper",
			"dental_lower",
			"dental_interincisal",
			"interincisal",
			"soft_tissue",
		]),
	})
	.strict();

export const cephDiagnosisSchema = z
	.object({
		skeletalClass: z.string().max(64).optional(),
		skeletalClassRu: z.string().max(500).optional(),
		maxillaryPosition: z.string().max(64).optional(),
		maxillaryPositionRu: z.string().max(500).optional(),
		mandibularPosition: z.string().max(64).optional(),
		mandibularPositionRu: z.string().max(500).optional(),
		growthPattern: z.string().max(64).optional(),
		growthPatternRu: z.string().max(500).optional(),
		upperIncisorInclination: z.string().max(64).optional(),
		upperIncisorInclinationRu: z.string().max(500).optional(),
		lowerIncisorInclination: z.string().max(64).optional(),
		lowerIncisorInclinationRu: z.string().max(500).optional(),
		rickettsELineRu: z.string().max(500).optional(),
		witsRelationshipRu: z.string().max(500).optional(),
		downsConvexityRu: z.string().max(500).optional(),
		mcnamaraRelationshipRu: z.string().max(500).optional(),
		u1NaRelationshipRu: z.string().max(500).optional(),
		l1NbRelationshipRu: z.string().max(500).optional(),
		summaryRu: z.string().max(4000).optional(),
		clinicalProtocolText: z.string().max(8000).optional(),
		protocol043Text: z.string().max(8000).optional(),
	})
	.strict();

export const cephAnalysisPayloadSchema = z
	.object({
		measurements: z.array(cephMeasurementSchema).optional(),
		diagnosis: cephDiagnosisSchema.optional(),
		landmarks: z.record(z.string(), cephPointSchema).optional(),
		scaleMmPerPixel: z.number().positive().max(10).optional(),
		isComplete: z.boolean().optional(),
		placedCount: z.number().int().min(0).max(100).optional(),
		totalCount: z.number().int().min(0).max(100).optional(),
		completionPercentage: z.number().min(0).max(100).optional(),
		summaryRu: z.string().max(4000).optional(),
		clinicalProtocolText: z.string().max(8000).optional(),
		protocol043Text: z.string().max(8000).optional(),
		sna: z.number().optional(),
		snb: z.number().optional(),
		anb: z.number().optional(),
		witsMm: z.number().optional(),
		skeletalClass: z.string().max(64).optional(),
		u1NaDeg: z.number().optional(),
		l1NbDeg: z.number().optional(),
		fmaDeg: z.number().optional(),
	})
	.strict();

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
	angleClass?: string | undefined;
	verticalBite?: string | undefined;
	overjetMm?: number | undefined;
	overbitePercent?: number | undefined;
	anbAngle?: number | undefined;
	skeletalClass?: string | undefined;
	treatmentPlanId?: string | undefined;
}
