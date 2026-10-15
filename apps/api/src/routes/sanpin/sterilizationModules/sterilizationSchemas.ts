import {
	createSterilizationLogDtoSchema,
	createSterilizerEquipmentDtoSchema,
	updateSterilizerEquipmentDtoSchema,
	type SterilizationPackagingType,
	type SterilizationCycleMode,
	type SterilizationIndicatorType,
} from "@dental/shared";
import { z } from "zod";

export function normalizeSterilizationBody(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== "object") return {};
	const body = { ...(raw as Record<string, unknown>) };

	if (body.sterilizerType) {
		const st = String(body.sterilizerType).toLowerCase();
		if (st.includes("autoclave") || st.includes("steam")) {
			body.sterilizerType = "autoclave_steam";
		} else if (st.includes("dry") || st.includes("gp")) {
			body.sterilizerType = "dry_heat";
		} else if (st.includes("plasma")) {
			body.sterilizerType = "plasma";
		} else if (st.includes("gas") || st.includes("eo")) {
			body.sterilizerType = "gas_eo";
		}
	}

	if (body.packagingType) {
		const pt = String(body.packagingType).toLowerCase();
		if (pt === "kraft_pouch" || pt === "kraft_bag" || pt === "kraft_heat_sealed") {
			body.packagingType = "kraft_heat_sealed";
		} else if (pt === "kraft_self_seal" || pt === "kraft_self_adhesive") {
			body.packagingType = "kraft_self_adhesive";
		} else if (pt.includes("laminat") || pt.includes("kombin")) {
			body.packagingType = "laminated_heat_sealed";
		} else if (pt.includes("casset") || pt.includes("kasset") || pt === "metal_cassette") {
			body.packagingType = "metal_cassette";
		} else if (pt.includes("unwrapped") || pt.includes("open") || pt === "unwrapped_open_tray") {
			body.packagingType = "unwrapped_open_tray";
		} else if (pt === "bix_no_filter") {
			body.packagingType = "bix_no_filter";
		} else if (pt === "bix_with_filter") {
			body.packagingType = "bix_with_filter";
		} else if (pt === "double_soft_crepe") {
			body.packagingType = "double_soft_crepe";
		} else {
			body.packagingType = "kraft_heat_sealed";
		}
	}

	if (body.temperatureCelsius === undefined && body.actualTemperature !== undefined) {
		body.temperatureCelsius = Number(body.actualTemperature);
	}
	if (body.pressureBar === undefined && body.actualPressure !== undefined) {
		body.pressureBar = Number(body.actualPressure);
	}
	if (body.durationMin === undefined && body.actualDuration !== undefined) {
		body.durationMin = Number(body.actualDuration);
	}
	if (body.indicatorType) {
		const ind = String(body.indicatorType).toLowerCase();
		if (ind.includes("4")) body.indicatorType = "class4_multivariable";
		else if (ind.includes("5")) body.indicatorType = "class5_integrating";
		else if (ind.includes("6")) body.indicatorType = "class6_emulating";
		else if (ind.includes("bio")) body.indicatorType = "biological";
		else if (ind.includes("bowie")) body.indicatorType = "bowie_dick";
		else body.indicatorType = "class5_integrating";
	} else {
		body.indicatorType = "class5_integrating";
	}
	if (typeof body.operatorId === "string") {
		const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRe.test(body.operatorId)) {
			delete body.operatorId;
		}
	}
	return body;
}

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

export const quickNormCycleSchema = z.object({
	regime: z.enum(["standard_134", "delicate_121", "prion_134"]).default("standard_134").optional(),
	autoclaveId: z.string().optional(),
	deviceName: z.string().optional(),
	packagingType: packagingTypeSchema.default("kraft_heat_sealed").optional(),
	itemsDescription: z.string().optional(),
	packagesCount: z.number().int().min(1).max(50).default(1).optional(),
	operatorId: z.string().uuid().optional().nullable(),
});

export const sanpinCycleCreateSchema = z
	.object({
		cycleNumber: z.union([z.number(), z.string()]).optional(),
		deviceName: z.string().optional(),
		sterilizerId: z.string().optional(),
		autoclaveId: z.string().optional(),
		temperatureCelsius: z.union([z.number(), z.string()]).optional(),
		pressureBar: z.union([z.number(), z.string()]).optional(),
		durationMin: z.number().optional(),
		exposureMinutes: z.number().optional(),
		itemsDescription: z.string().optional(),
		itemsDescriptionRu: z.string().optional(),
		packagingType: z.string().optional(),
		passedIndicator: z.boolean().optional(),
		status: z.enum(["passed", "failed"]).optional(),
		barcode: z.string().optional(),
		indicatorType: z.string().optional(),
		operatorId: z.string().uuid().nullable().optional(),
	})
	.passthrough();

export const sterilizationShiftBatchSchema = z
	.object({
		cyclesCount: z.union([z.number(), z.string()]).optional(),
		deviceName: z.string().optional(),
		autoclaveId: z.string().optional(),
		packagingType: z.string().optional(),
		itemsDescription: z.string().optional(),
	})
	.passthrough();

export type ScanInput = z.infer<typeof scanSchema>;
export type LinkInput = z.infer<typeof linkSchema>;
export type GenerateBarcodeInput = z.infer<typeof generateBarcodeBodySchema>;
export type UnsealBodyInput = z.infer<typeof unsealBodySchema>;
export type QuickNormCycleInput = z.infer<typeof quickNormCycleSchema>;
export type SanpinCycleCreateBody = z.infer<typeof sanpinCycleCreateSchema>;
export type SterilizationShiftBatchBody = z.infer<typeof sterilizationShiftBatchSchema>;

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
	errorCode?: string;
	errorMessage?: string;
	emergencyLogNote?: string;
}

export interface DiaryHashInput {
	visitId: string;
	patientId?: string | null;
	anamnesis?: string | null;
	statusLocalis?: string | null;
	treatmentDescription?: string | null;
	diagnosisIcd10?: string | null;
	diagnosisTooth?: string | null;
	complications?: string | null;
	comorbidities?: string | null;
	instrumentTrayBarcode?: string | null;
}

export interface UnsealKraftPackageParams {
	barcode: string;
	operatorName?: string | null | undefined;
	operatorId?: string | null | undefined;
	notes?: string | null | undefined;
	now?: Date | undefined;
}

export interface UnsealKraftPackageResponse {
	success: boolean;
	barcode: string;
	unsealedAt: string;
	commissionRequired: false;
	operatorName: string;
	operatorId: string | null;
	status: "unsealed";
	sanpinVerified: true;
	message: string;
}

export {
	createSterilizationLogDtoSchema,
	createSterilizerEquipmentDtoSchema,
	updateSterilizerEquipmentDtoSchema,
	type SterilizationPackagingType,
	type SterilizationCycleMode,
	type SterilizationIndicatorType,
};
