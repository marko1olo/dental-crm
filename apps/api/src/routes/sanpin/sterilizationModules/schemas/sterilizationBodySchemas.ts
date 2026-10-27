import { z } from "zod";
import {
	cycleModeSchema,
	indicatorTypeSchema,
	packagingTypeSchema,
} from "./sterilizationEnums.js";

export const scanSchema = z.object({
	barcode: z.string().trim().optional().nullable().default(""),
	autoclaveId: z.string().trim().optional().nullable().default("АК-01"),
	operatorId: z.string().uuid("Некорректный ID оператора стерилизации.").optional().nullable(),
	status: z.enum(["passed", "failed", "quarantined"]).default("passed"),
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
	barcode: z.string().trim().optional().nullable().default(""),
});

export const generateBarcodeBodySchema = z.object({
	cycleId: z.union([z.string(), z.number()]),
	trayCode: z.string().trim().min(1).max(50),
	packagingType: packagingTypeSchema.default("kraft_heat_sealed"),
});

export const unsealBodySchema = z.object({
	barcode: z.string().trim().optional().nullable().default(""),
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
		batchSize: z.union([z.number(), z.string()]).optional(),
		deviceName: z.string().optional(),
		autoclaveId: z.string().optional(),
		packagingType: z.string().optional(),
		itemsDescription: z.string().optional(),
		regime: z.enum(["standard_134", "delicate_121", "prion_134"]).optional(),
		operatorId: z.string().uuid().nullable().optional(),
		operatorName: z.string().optional(),
	})
	.passthrough();
