import { z } from "zod";
import {
	kopecksToNumericString,
	leadPriorityEnum,
	leadStatusEnum,
	parseKopecks,
	rublesToKopecks,
} from "@dental/shared";

export { leadStatusEnum, leadPriorityEnum };
export { DEMO_SHOWCASE_SEED_LEADS } from "./demoSeedLeads.js";

/**
 * Безопасный парсинг expectedRevenue (Мандат 8bm):
 * Принимает число рублей или строку (с пробелами/запятыми),
 * переводит в целочисленные копейки без потери точности и float-арифметики
 * и форматирует в строку вида "12345.00" для Postgres numeric(12, 2).
 */
export const expectedRevenueSchema = z
	.union([z.string(), z.number()])
	.optional()
	.nullable()
	.transform((val) => {
		if (val === null || val === undefined) return null;
		if (typeof val === "string" && val.trim() === "") return null;
		try {
			const kopecks =
				typeof val === "number"
					? rublesToKopecks(val)
					: parseKopecks(val.replace(/\s+/g, "").replace(",", "."));
			return kopecksToNumericString(kopecks);
		} catch {
			return null;
		}
	});

export const leadSchema = z.object({
	name: z.string().min(1),
	patientName: z.string().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: expectedRevenueSchema,
	status: leadStatusEnum.optional(),
	notes: z.string().optional().nullable(),
	dropReason: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
	metadata: z.record(z.unknown()).optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const patchLeadSchema = z.object({
	name: z.string().min(1).optional(),
	patientName: z.string().optional().nullable(),
	patientId: z.string().uuid().optional().nullable(),
	phone: z.string().optional().nullable(),
	source: z.string().optional().nullable(),
	expectedRevenue: expectedRevenueSchema,
	status: leadStatusEnum.optional(),
	notes: z.string().optional().nullable(),
	dropReason: z.string().optional().nullable(),
	assignedDoctorId: z.string().uuid().optional().nullable(),
	priority: leadPriorityEnum.optional(),
	clinicalTags: z.array(z.string()).optional(),
	audioRecordUrl: z.string().optional().nullable(),
	transcriptionSnippet: z.string().optional().nullable(),
	metadata: z.record(z.unknown()).optional().nullable(),
});

export type PatchLeadInput = z.infer<typeof patchLeadSchema>;

export const patchLeadStatusSchema = z.object({
	status: leadStatusEnum,
	reason: z.string().optional().nullable(),
	dropReason: z.string().optional().nullable(),
});

export type PatchLeadStatusInput = z.infer<typeof patchLeadStatusSchema>;
