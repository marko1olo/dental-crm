import { z } from "zod";
import type {
	SterilizationCycleMode,
	SterilizationIndicatorType,
	SterilizationPackagingType,
} from "@dental/shared";

export const packagingTypeSchema = z
	.enum([
		"kraft_heat_sealed",
		"kraft_self_adhesive",
		"laminated_heat_sealed",
		"metal_cassette",
		"bix_filter",
		"unpacked",
		"other",
	])
	.optional()
	.nullable();

export const indicatorTypeSchema = z
	.enum([
		"class4_multivariable",
		"class5_integrating",
		"class6_emulating",
		"biological",
		"bowie_dick",
		"helix",
	])
	.optional()
	.nullable();

export const cycleModeSchema = z
	.enum([
		"B",
		"S",
		"N",
		"dry_heat_180",
		"dry_heat_160",
		"plasma_vh2o2",
		"ethylene_oxide",
	])
	.optional()
	.nullable();

export const scanSchema = z.object({
	barcode: z.string().trim().min(1, "Штрихкод упаковки обязателен."),
	autoclaveId: z.string().trim().min(1, "Идентификатор стерилизатора/автоклава обязателен."),
	operatorId: z.string().uuid("Некорректный ID оператора стерилизации.").optional().nullable(),
	status: z.enum(["passed", "failed", "quarantined"]),
	deviceName: z.string().trim().max(120).optional().nullable(),
	cycleNumber: z.number().int().min(1).optional().nullable(),
	temperatureCelsius: z.number().min(50).max(300).optional().nullable(),
	pressureBar: z.number().min(0).max(10).optional().nullable(),
	itemsDescription: z.string().trim().max(500).optional().nullable(),
	packagingType: packagingTypeSchema,
	indicatorType: indicatorTypeSchema,
	cycleMode: cycleModeSchema,
	durationMin: z.number().int().min(1).max(300).optional().nullable(),
});

export const linkSchema = z.object({
	visitId: z.string().uuid("Некорректный ID визита."),
	barcode: z.string().trim().min(1, "Штрихкод обязателен."),
});

export const generateBarcodeBodySchema = z.object({
	cycleId: z.union([z.string(), z.number()]),
	trayCode: z.string().trim().min(1).max(50),
	packagingType: packagingTypeSchema.default("kraft_heat_sealed"),
});

export const unsealBodySchema = z.object({
	barcode: z.string().trim().min(1, "Штрихкод крафт-пакета обязателен."),
	operatorName: z.string().trim().optional().nullable(),
	operatorId: z.string().uuid().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	notes: z.string().trim().optional().nullable(),
});

export type ScanInput = z.infer<typeof scanSchema>;
export type LinkInput = z.infer<typeof linkSchema>;
export type GenerateBarcodeInput = z.infer<typeof generateBarcodeBodySchema>;
export type UnsealBodyInput = z.infer<typeof unsealBodySchema>;

export interface AutoProvisionSterilizationLogParams {
	organizationId: string;
	barcode: string;
	operatorId?: string | null;
	now?: Date;
}

export interface EvaluateSterilizationLogInput {
	status: string;
	passedIndicator: boolean;
	expiresAt?: Date | string | null;
	itemsDescription?: string | null;
}

export interface EvaluateSterilizationLogResult {
	allowed: boolean;
	isExpired: boolean;
	errorCode?: "FailedSterilizationBarcode";
	errorMessage?: string;
	emergencyLogNote?: string;
}

export interface UnsealKraftPackageParams {
	barcode: string;
	operatorName?: string | null | undefined;
	operatorId?: string | null | undefined;
	notes?: string | null | undefined;
	now?: Date;
}

export interface UnsealKraftPackageResponse {
	success: true;
	barcode: string;
	unsealedAt: string;
	commissionRequired: false;
	operatorName: string;
	operatorId: string | null;
	status: "unsealed";
	sanpinVerified: true;
	message: string;
}

export interface DiaryHashInput {
	visitId: string;
	patientId: string | null;
	anamnesis: string | null;
	statusLocalis: string | null;
	treatmentDescription: string | null;
	diagnosisIcd10: string | null;
	diagnosisTooth: string | null;
	complications: string | null;
	comorbidities: string | null;
	instrumentTrayBarcode: string | null;
}
