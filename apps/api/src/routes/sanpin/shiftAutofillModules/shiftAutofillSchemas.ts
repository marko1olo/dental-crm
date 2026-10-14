import { z } from "zod";

export const psoBatchItemSchema = z.object({
	instrumentName: z.string(),
	batchItemCount: z.number().int().nonnegative().optional(),
	testedSampleCount: z.number().int().nonnegative().optional(),
	detergentBrand: z.string().optional(),
	notes: z.string().optional(),
});

export const sterilizationBatchItemSchema = z.object({
	sterilizerBrandModel: z.string().optional(),
	sterilizerId: z.string().optional(),
	cycleNumber: z.number().int().positive().optional(),
	temperatureC: z.number().optional(),
	actualTemperatureCelsius: z.string().optional(),
	pressureBar: z.number().optional(),
	actualPressureBar: z.string().optional(),
	exposureMinutes: z.number().int().positive().optional(),
	actualExposureMinutes: z.number().int().positive().optional(),
	chemicalIndicatorControlPassed: z.boolean().optional(),
	sterilizedPacksSummary: z.string().optional(),
	itemsDescription: z.string().optional(),
	itemsDescriptionRu: z.string().optional(),
	packagingType: z.string().optional(),
});

export const autofillShiftSchema = z
	.object({
		date: z.string().optional(),
		psoRecords: z.array(psoBatchItemSchema).optional(),
		sterilizationRecords: z.array(sterilizationBatchItemSchema).optional(),
		form257: z.array(z.any()).optional(),
		bactericidalDurationMinutes: z.number().int().positive().optional(),
		operatingMode: z.string().optional(),
		temperatures: z.record(z.string(), z.number()).optional(),
		humidities: z.record(z.string(), z.number()).optional(),
		batchDays: z.array(z.any()).optional(),
	})
	.passthrough();

export const autofillMonthSchema = z
	.object({
		year: z.number().int().min(2020).max(2050).optional(),
		month: z.number().int().min(1).max(12).optional(),
		nurseFullName: z.string().optional(),
		operatorFullName: z.string().optional(),
		batchDays: z.array(z.any()).optional(),
	})
	.passthrough();

export type AutofillShiftInput = z.infer<typeof autofillShiftSchema>;
export type AutofillMonthInput = z.infer<typeof autofillMonthSchema>;
export type PsoBatchItem = z.infer<typeof psoBatchItemSchema>;
export type SterilizationBatchItem = z.infer<typeof sterilizationBatchItemSchema>;
