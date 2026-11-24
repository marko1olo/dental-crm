import { z } from "zod";

export const psoBatchItemSchema = z
	.object({
		instrumentName: z.string(),
		batchItemCount: z.number().int().nonnegative().optional(),
		testedSampleCount: z.number().int().nonnegative().optional(),
		detergentBrand: z.string().optional(),
		notes: z.string().optional(),
	})
	.strict();

export const sterilizationBatchItemSchema = z
	.object({
		sterilizerBrandModel: z.string().optional(),
		sterilizerId: z.string().optional(),
		cycleNumber: z.number().int().positive().optional(),
		temperatureC: z.number().optional(),
		temperatureCelsius: z.union([z.number(), z.string()]).optional(),
		actualTemperatureCelsius: z.string().optional(),
		pressureBar: z.union([z.number(), z.string()]).optional(),
		actualPressureBar: z.string().optional(),
		durationMin: z.number().int().positive().optional(),
		exposureMinutes: z.number().int().positive().optional(),
		actualExposureMinutes: z.number().int().positive().optional(),
		chemicalIndicatorControlPassed: z.boolean().optional(),
		sterilizedPacksSummary: z.string().optional(),
		itemsDescription: z.string().optional(),
		itemsDescriptionRu: z.string().optional(),
		packagingType: z.string().optional(),
		packagedItemsCount: z.number().int().positive().optional(),
		count: z.number().int().positive().optional(),
	})
	.strict();

export const autofillShiftSchema = z
	.object({
		date: z.string().optional(),
		shiftDate: z.string().optional(),
		operatorId: z.string().optional(),
		forceOverwrite: z.boolean().optional(),
		autoclaveId: z.string().optional(),
		packagedItemsCount: z.number().int().positive().optional(),
		psoRecords: z.array(psoBatchItemSchema).optional(),
		sterilizationRecords: z.array(sterilizationBatchItemSchema).optional(),
		autoclaveCycles: z.array(sterilizationBatchItemSchema).optional(),
		autoclaveCycle: z.array(sterilizationBatchItemSchema).optional(),
		form257: z.array(sterilizationBatchItemSchema).optional(),
		bactericidalDurationMinutes: z.number().int().positive().optional(),
		operatingMode: z.string().optional(),
		temperatures: z.record(z.string(), z.number()).optional(),
		humidities: z.record(z.string(), z.number()).optional(),
		batchDays: z.array(z.record(z.string(), z.unknown())).optional(),
	})
	.strict();

export const autofillMonthSchema = z
	.object({
		year: z.number().int().min(2020).max(2050).optional(),
		month: z.number().int().min(1).max(12).optional(),
		nurseFullName: z.string().optional(),
		operatorFullName: z.string().optional(),
		batchDays: z.array(z.record(z.string(), z.unknown())).optional(),
	})
	.strict();

export type AutofillShiftInput = z.infer<typeof autofillShiftSchema>;
export type AutofillMonthInput = z.infer<typeof autofillMonthSchema>;
export type PsoBatchItem = z.infer<typeof psoBatchItemSchema>;
export type SterilizationBatchItem = z.infer<typeof sterilizationBatchItemSchema>;
