/**
 * apps/api/src/services/periodontogramService.ts
 *
 * Unified SSOT facade for periodontogram services, schemas, and helpers.
 * Decomposed into modular query and mutation services (Mandate 8b: < 150 lines).
 */

import { z } from "zod";

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ───────────────────────────────────────────────────────────────────────────

export const patchToothBodySchema = z
	.object({
		toothNumber: z.number().int().min(11).max(48).optional(),
		tooth_number: z.number().int().min(11).max(48).optional(),
		isPresent: z.boolean().optional(),
		is_present: z.boolean().optional(),
		isImplant: z.boolean().optional(),
		is_implant: z.boolean().optional(),
		mobility: z.number().int().min(0).max(3).nullable().optional(),
		prognosis: z
			.enum(["good", "fair", "poor", "hopeless"])
			.nullable()
			.optional(),
		furcationBuccal: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		furcation_buccal: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		furcationLingual: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		furcation_lingual: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		keratinizedGingivaMm: z.number().int().min(0).max(20).nullable().optional(),
		keratinized_gingiva_mm: z
			.number()
			.int()
			.min(0)
			.max(20)
			.nullable()
			.optional(),
	})
	.strict();

export type PatchToothInput = z.infer<typeof patchToothBodySchema>;

export const patchTeethPayloadSchema = z.union([
	z.array(patchToothBodySchema),
	z.object({ teeth: z.array(patchToothBodySchema) }).strict(),
]);

export const perioSiteCodeInputSchema = z
	.enum(["MV", "V", "DV", "ML", "L", "DL", "MB", "B", "DB"])
	.transform((val) => {
		if (val === "MB") return "MV";
		if (val === "B") return "V";
		if (val === "DB") return "DV";
		return val;
	});

export const siteItemSchema = z
	.object({
		toothNumber: z.number().int().min(11).max(48).optional(),
		tooth_number: z.number().int().min(11).max(48).optional(),
		siteCode: perioSiteCodeInputSchema.optional(),
		site_code: perioSiteCodeInputSchema.optional(),
		probingDepthMm: z.number().int().min(0).max(15).nullable().optional(),
		probing_depth_mm: z.number().int().min(0).max(15).nullable().optional(),
		gingivalMarginMm: z.number().int().min(-5).max(10).nullable().optional(),
		gingival_margin_mm: z.number().int().min(-5).max(10).nullable().optional(),
		calMm: z.number().int().min(0).max(30).nullable().optional(),
		cal_mm: z.number().int().min(0).max(30).nullable().optional(),
		bleedingOnProbing: z.boolean().optional(),
		bleeding_on_probing: z.boolean().optional(),
		plaque: z.boolean().optional(),
		suppuration: z.boolean().optional(),
		calculus: z.boolean().optional(),
	})
	.strict();

export type SiteItemInput = z.infer<typeof siteItemSchema>;

export const patchSitesPayloadSchema = z.union([
	z.array(siteItemSchema),
	z.object({ sites: z.array(siteItemSchema) }).strict(),
	siteItemSchema,
]);

export const closeSnapshotBodySchema = z
	.object({
		notes: z.string().max(4000).nullable().optional(),
	})
	.strict()
	.optional();

export const psrSextantEntrySchema = z.object({
	code: z.number().int().min(0).max(4),
	asterisk: z.boolean().optional(),
	hasAsterisk: z.boolean().optional(),
	highestPocketDepthMm: z.number().optional(),
	teethCount: z.number().optional(),
}).strict();
export type PsrSextantEntry = z.infer<typeof psrSextantEntrySchema>;

export const psrDataSchema = z.record(z.string(), psrSextantEntrySchema);
export type PsrData = z.infer<typeof psrDataSchema>;

export const upsertPatientFullPeriodontogramBodySchema = z
	.object({
		visitId: z.string().optional(),
		teeth: z.array(patchToothBodySchema).optional(),
		sites: z.array(siteItemSchema).optional(),
		notes: z.string().max(4000).nullable().optional(),
		status: z.enum(["draft", "closed"]).optional(),
		autoClose: z.boolean().optional(),
		psrData: psrDataSchema.optional(),
		psrCode: z.number().int().min(0).max(4).optional(),
		hasAsterisk: z.boolean().optional(),
		indices: z.record(z.unknown()).optional(),
	})
	.strict();

export type UpsertPatientFullPeriodontogramBodyInput = z.infer<
	typeof upsertPatientFullPeriodontogramBodySchema
>;

// ───────────────────────────────────────────────────────────────────────────
// RE-EXPORTS FROM MODULAR SERVICES (MANDATE 8b)
// ───────────────────────────────────────────────────────────────────────────

export * from "./periodontogram/periodontogramDemoHelper.js";
export * from "./periodontogram/periodontogramQueryService.js";
export * from "./periodontogram/periodontogramMutationService.js";
